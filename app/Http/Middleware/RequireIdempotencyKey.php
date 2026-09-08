<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyKey;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RequireIdempotencyKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = trim((string) $request->header('Idempotency-Key'));

        abort_unless(
            preg_match('/^[A-Za-z0-9._:-]{16,128}$/', $key) === 1,
            400,
            'A valid Idempotency-Key header is required.'
        );

        $userId = (string) $request->user()->id;
        $route = $request->method().' '.$request->route()->uri();
        $requestHash = hash('sha256', $route."\n".$request->getContent());

        $existing = IdempotencyKey::query()
            ->where('user_id', $userId)
            ->where('key', $key)
            ->where('expires_at', '>', now())
            ->first();

        if ($existing) {
            abort_if(!hash_equals($existing->request_hash, $requestHash), 409, 'Idempotency key was reused with a different request.');
            abort_if($existing->status_code === null, 409, 'An identical request is already being processed.');

            return response($existing->response_body, $existing->status_code)
                ->header('Content-Type', 'application/json')
                ->header('Idempotency-Replayed', 'true');
        }

        try {
            $record = IdempotencyKey::create([
                'user_id' => $userId,
                'key' => $key,
                'route' => $route,
                'request_hash' => $requestHash,
                'expires_at' => now()->addHour(),
            ]);
        } catch (QueryException) {
            abort(409, 'An identical request is already being processed.');
        }

        try {
            $response = $next($request);

            if ($response->getStatusCode() < 500) {
                $record->update([
                    'status_code' => $response->getStatusCode(),
                    'response_body' => $response->getContent(),
                ]);
            } else {
                $record->delete();
            }

            return $response->header('Idempotency-Replayed', 'false');
        } catch (Throwable $exception) {
            $record->delete();
            throw $exception;
        }
    }
}

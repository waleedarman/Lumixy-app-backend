<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SecurityAuditService
{
    public function identifier(string $value): string
    {
        return hash_hmac('sha256', mb_strtolower(trim($value)), (string) config('app.key'));
    }

    public function record(Request $request, string $event, string $outcome, array $context = []): void
    {
        Log::channel('daily')->notice('security_audit', [
            'event' => $event,
            'outcome' => $outcome,
            'actor_id' => $request->user()?->id,
            'actor_role' => $request->user()?->role,
            'ip' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            'request_id' => $request->headers->get('X-Request-ID'),
            'method' => $request->method(),
            'path' => $request->path(),
            'context' => $context,
        ]);
    }
}

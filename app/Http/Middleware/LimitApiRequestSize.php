<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LimitApiRequestSize
{
    public function handle(Request $request, Closure $next): Response
    {
        $contentLength = max(
            (int) $request->server('CONTENT_LENGTH', 0),
            strlen($request->getContent())
        );
        $limit = str_starts_with(strtolower((string) $request->header('Content-Type')), 'multipart/form-data')
            ? 3 * 1024 * 1024
            : 1024 * 1024;

        abort_if($contentLength > $limit, 413, 'Request body too large.');

        return $next($request);
    }
}

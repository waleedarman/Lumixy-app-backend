<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (
            !$user
            || !in_array($user->role, $roles, true)
            || !$user->tokenCan($user->role)
            || $user->status === 'suspended'
            || ($user->role === 'admin' && $user->status !== 'active')
        ) {
            abort(403, 'Unauthorized');
        }

        return $next($request);
    }
}

<?php

namespace App\Services;

use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\RateLimiter;

class LoginProtectionService
{
    protected function keys(string $scope, string $email, string $ip): array
    {
        $emailHash = hash('sha256', mb_strtolower(trim($email)));
        $ipHash = hash('sha256', $ip);

        return [
            'pair' => "login-pair:{$scope}:{$emailHash}:{$ipHash}",
            'ip' => "login-ip:{$scope}:{$ipHash}",
            'account' => "login-account:{$scope}:{$emailHash}",
        ];
    }

    public function ensureAllowed(string $scope, string $email, string $ip): void
    {
        if (app()->environment('local')) {
            return;
        }

        $keys = $this->keys($scope, $email, $ip);
        $blockedKey = collect([
            [$keys['pair'], 5],
            [$keys['ip'], 30],
            [$keys['account'], 50],
        ])->first(fn (array $limit) => RateLimiter::tooManyAttempts($limit[0], $limit[1]));

        if ($blockedKey) {
            throw new ThrottleRequestsException(
                'Too many failed login attempts. Try again later.',
                null,
                ['Retry-After' => RateLimiter::availableIn($blockedKey[0])]
            );
        }
    }

    public function failed(string $scope, string $email, string $ip): void
    {
        if (app()->environment('local')) {
            return;
        }

        foreach ($this->keys($scope, $email, $ip) as $key) {
            RateLimiter::hit($key, 15 * 60);
        }
    }

    public function succeeded(string $scope, string $email, string $ip): void
    {
        $keys = $this->keys($scope, $email, $ip);
        RateLimiter::clear($keys['pair']);
        RateLimiter::clear($keys['account']);
    }
}

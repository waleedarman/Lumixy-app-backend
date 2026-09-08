<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProviderProfile;
use App\Services\AdminStatsCache;
use App\Support\SubscriptionPeriod;

class AdminDashboardController extends Controller
{
    protected function json($data, int $status = 200)
    {
        return response()->json($data, $status, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public function stats()
    {
        $payload = AdminStatsCache::rememberStats(function () {
            $base = ProviderProfile::query()
                ->whereHas('user', function ($query) {
                    $query->where('role', 'provider');
                });

            $total = (clone $base)->count();

            $active = (clone $base)
                ->where('is_publicly_visible', true)
                ->count();

            $pending = (clone $base)
                ->whereHas('latestApplication', function ($query) {
                    $query->where('application_status', 'pending');
                })
                ->whereHas('user', function ($query) {
                    $query->whereNotIn('status', ['deactivated', 'disabled', 'suspended']);
                })
                ->count();

            $deactivated = (clone $base)
                ->where(function ($query) {
                    $query
                        ->whereHas('user', function ($userQuery) {
                            $userQuery->whereIn('status', ['deactivated', 'disabled', 'suspended']);
                        })
                        ->orWhereHas('latestApplication', function ($applicationQuery) {
                            $applicationQuery->where('application_status', 'rejected');
                        });
                })
                ->count();

            $expired = (clone $base)
                ->whereNotNull('subscription_ends_at')
                ->where('subscription_ends_at', '<', now())
                ->count();

            $featured = (clone $base)
                ->where('is_featured', true)
                ->count();

            $now = now();
            $monthStart = $now->copy()->startOfMonth();
            $monthEnd = $now->copy()->endOfMonth();
            $yearStart = $now->copy()->startOfYear();
            $expiringSoonEnd = $now->copy()->addDays(SubscriptionPeriod::expiringSoonDays())->endOfDay();

            $subscriptionActive = (clone $base)
                ->whereNotNull('subscription_ends_at')
                ->where('subscription_ends_at', '>=', $now)
                ->count();

            $expiringSoon = (clone $base)
                ->whereNotNull('subscription_ends_at')
                ->where('subscription_ends_at', '>=', $now)
                ->where('subscription_ends_at', '<=', $expiringSoonEnd)
                ->count();

            $endingThisMonth = (clone $base)
                ->whereNotNull('subscription_ends_at')
                ->whereBetween('subscription_ends_at', [$monthStart, $monthEnd])
                ->count();

            $startedThisMonth = (clone $base)
                ->whereNotNull('subscription_started_at')
                ->whereBetween('subscription_started_at', [$monthStart, $monthEnd])
                ->count();

            $startedThisYear = (clone $base)
                ->whereNotNull('subscription_started_at')
                ->where('subscription_started_at', '>=', $yearStart)
                ->count();

            $validNow = (clone $base)
                ->whereNotNull('subscription_ends_at')
                ->where('subscription_ends_at', '>=', $now)
                ->count();

            return [
                'total' => $total,
                'active' => $active,
                'pending' => $pending,
                'deactivated' => $deactivated,
                'expired' => $expired,
                'featured' => $featured,
                'subscription_active' => $subscriptionActive,
                'expiring_soon' => $expiringSoon,
                'ending_this_month' => $endingThisMonth,
                'started_this_month' => $startedThisMonth,
                'started_this_year' => $startedThisYear,
                'valid_now' => $validNow,
            ];
        });

        return $this->json($payload);
    }
}

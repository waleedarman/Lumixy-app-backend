<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;

class HealthController extends Controller
{
    public function test()
    {
        return response()->json(['ok' => true]);
    }

    public function adminSetupStatus()
    {
        abort_unless(app()->environment('local'), 404);

        $activeAdmins = User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->count();

        return response()->json([
            'has_active_admins' => $activeAdmins > 0,
            'active_admin_count' => $activeAdmins,
            'total_users' => User::query()->count(),
        ]);
    }
}

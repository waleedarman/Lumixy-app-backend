<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use App\Services\FirebaseNotificationService;
use Illuminate\Http\Request;

class DeviceTokenController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:5000'],
            'platform' => ['nullable', 'string', 'max:20'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $tokenHash = hash('sha256', $data['token']);
        $existing = DeviceToken::where('token_hash', $tokenHash)->first();
        abort_if($existing && $existing->user_id !== $request->user()->id, 409, 'Device token is already registered to another account.');

        $deviceToken = DeviceToken::updateOrCreate(
            ['token_hash' => $tokenHash, 'user_id' => $request->user()->id],
            [
                'token' => $data['token'],
                'platform' => $data['platform'] ?? null,
                'device_name' => $data['device_name'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Device token registered successfully.',
            'device_token' => $deviceToken,
        ]);
    }

    public function unregister(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:5000'],
        ]);

        DeviceToken::query()
            ->where('user_id', $request->user()->id)
            ->where('token_hash', hash('sha256', $data['token']))
            ->delete();

        return response()->json([
            'message' => 'Device token unregistered successfully.',
        ]);
    }

    public function test(Request $request, FirebaseNotificationService $firebase): \Illuminate\Http\JsonResponse
    {
        $result = $firebase->sendToUser(
            $request->user(),
            'Lumixy Test',
            'إذا وصلك هذا الإشعار فربط Firebase صار شغال.',
            [
                'type' => 'general',
                'title' => 'Lumixy Test',
                'body' => 'إذا وصلك هذا الإشعار فربط Firebase صار شغال.',
            ]
        );

        return response()->json([
            'message' => 'Test notification attempt completed.',
            'result' => $result,
        ]);
    }
}

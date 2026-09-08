<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
    protected function json($data, int $status = 200)
    {
        return response()->json($data, $status, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public function index(Request $request)
    {
        $retentionDays = max(1, (int) config('lumixy.notification_retention_days', 7));
        $cutoff = now()->subDays($retentionDays);

        // Lazy cleanup for this user so old rows disappear without waiting for the cron.
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('created_at', '<', $cutoff)
            ->delete();

        $notifications = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('created_at', '>=', $cutoff)
            ->latest('created_at')
            ->limit(100)
            ->get()
            ->map(fn (UserNotification $notification) => [
                'id' => $notification->id,
                'user_id' => $notification->user_id,
                'type' => $notification->type,
                'title' => $notification->title,
                'message' => $notification->message,
                'created_at' => optional($notification->created_at)->toISOString(),
                'read' => $notification->read_at !== null,
            ]);

        return $this->json([
            'notifications' => $notifications,
        ]);
    }

    public function markRead(Request $request, string $id)
    {
        $notification = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        if (!$notification->read_at) {
            $notification->update([
                'read_at' => now(),
            ]);
        }

        return $this->json([
            'message' => 'Notification marked as read',
        ]);
    }

    public function clearAll(Request $request)
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->delete();

        return $this->json([
            'message' => 'Notifications cleared',
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('id', $id)
            ->delete();

        return $this->json([
            'message' => 'Notification deleted',
        ]);
    }
}

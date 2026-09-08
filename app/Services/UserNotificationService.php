<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Collection;

class UserNotificationService
{
    public function retentionDays(): int
    {
        return max(1, (int) config('lumixy.notification_retention_days', 7));
    }

    public function retentionCutoff()
    {
        return now()->subDays($this->retentionDays());
    }

    public function createForUser(
        User $user,
        string $type,
        string $message,
        ?string $title = null
    ): UserNotification {
        return UserNotification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
        ]);
    }

    public function createForUsers(
        Collection|array $users,
        string $type,
        string $message,
        ?string $title = null
    ): void {
        collect($users)
            ->filter(fn ($user) => $user instanceof User)
            ->unique('id')
            ->each(function (User $user) use ($type, $message, $title) {
                $this->createForUser($user, $type, $message, $title);
            });
    }

    /**
     * Permanently delete notifications older than the retention window.
     */
    public function purgeExpired(?int $days = null): int
    {
        $cutoff = now()->subDays(max(1, $days ?? $this->retentionDays()));

        return UserNotification::query()
            ->where('created_at', '<', $cutoff)
            ->delete();
    }
}

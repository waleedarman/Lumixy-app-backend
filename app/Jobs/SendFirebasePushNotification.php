<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\FirebaseNotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends FCM pushes outside the HTTP request lifecycle.
 * In-app UserNotification rows should already be created by the caller.
 */
class SendFirebasePushNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 30, 60];

    /**
     * @param  list<string>  $userIds
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public readonly array $userIds,
        public readonly string $title,
        public readonly string $body,
        public readonly array $data = [],
    ) {}

    public function handle(FirebaseNotificationService $firebase): void
    {
        $userIds = array_values(array_unique(array_filter($this->userIds)));

        if ($userIds === []) {
            return;
        }

        $users = User::query()
            ->with('deviceTokens')
            ->whereIn('id', $userIds)
            ->get()
            ->filter(fn (User $user) => $user->deviceTokens->isNotEmpty())
            ->values();

        if ($users->isEmpty()) {
            return;
        }

        $firebase->sendToUsers($users, $this->title, $this->body, $this->data);
    }

    public function failed(?Throwable $exception): void
    {
        Log::warning('Queued Firebase push failed after retries.', [
            'user_ids' => $this->userIds,
            'title' => $this->title,
            'error' => $exception?->getMessage(),
        ]);
    }
}

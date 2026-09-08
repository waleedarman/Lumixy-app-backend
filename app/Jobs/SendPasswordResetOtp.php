<?php

namespace App\Jobs;

use App\Mail\PasswordResetOtpMail;
use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendPasswordResetOtp implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [10, 30, 60];

    public function __construct(public readonly string $email) {}

    public function handle(): void
    {
        $userExists = User::query()
            ->where('email', $this->email)
            ->exists();

        if (! $userExists) {
            return;
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        PasswordResetOtp::query()
            ->where('email', $this->email)
            ->delete();

        PasswordResetOtp::create([
            'email' => $this->email,
            'otp_hash' => hash_hmac('sha256', $otp, (string) config('app.key')),
            'expires_at' => now()->addMinutes(10),
            'used' => false,
            'attempts' => 0,
        ]);

        Mail::to($this->email)->send(new PasswordResetOtpMail($otp));
    }
}

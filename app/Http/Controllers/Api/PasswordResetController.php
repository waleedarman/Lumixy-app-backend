<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendPasswordResetOtp;
use App\Models\PasswordResetOtp;
use App\Models\User;
use App\Services\SecurityAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    public function __construct(protected SecurityAuditService $securityAudit) {}

    protected function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    protected function normalizeOtp(string $otp): string
    {
        $otp = strtr(trim($otp), [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);

        return preg_replace('/\D+/', '', $otp) ?? '';
    }

    protected function hashOtp(string $otp): string
    {
        return hash_hmac('sha256', $otp, (string) config('app.key'));
    }

    protected function invalidOtp(): never
    {
        throw ValidationException::withMessages([
            'otp' => ['The reset code is invalid or expired.'],
        ]);
    }

    public function sendOtp(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email:rfc']]);
        $email = $this->normalizeEmail($data['email']);
        $emailHash = hash('sha256', $email);

        if (! User::where('email', $email)->exists()) {
            $this->securityAudit->record($request, 'password_reset.requested', 'rejected', [
                'email_hash' => $emailHash,
                'reason' => 'unknown_email',
            ]);

            return response()->json([
                'message' => 'This email address is not registered.',
            ], 404);
        }

        $this->securityAudit->record($request, 'password_reset.requested', 'accepted', [
            'email_hash' => $emailHash,
        ]);
        SendPasswordResetOtp::dispatch($email);

        return response()->json([
            'message' => 'A reset code has been sent.',
        ], 202);
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
            'otp' => ['required', 'string'],
        ]);

        $email = $this->normalizeEmail($data['email']);
        $otp = $this->normalizeOtp($data['otp']);

        if (strlen($otp) !== 6) {
            $this->invalidOtp();
        }

        $record = PasswordResetOtp::where('email', $email)->latest()->first();
        $matches = $record
            && $record->attempts < 5
            && hash_equals((string) $record->otp_hash, $this->hashOtp($otp));

        if (! $matches || ! $record->isValid()) {
            if ($record && ! $record->used) {
                $record->increment('attempts');
            }
            $this->invalidOtp();
        }

        $this->securityAudit->record($request, 'password_reset.otp_verified', 'success', [
            'email_hash' => hash('sha256', $email),
        ]);

        return response()->json(['message' => 'Reset code verified.', 'valid' => true]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
            'otp' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);

        $email = $this->normalizeEmail($data['email']);
        $otp = $this->normalizeOtp($data['otp']);

        if (strlen($otp) !== 6) {
            $this->invalidOtp();
        }

        DB::transaction(function () use ($email, $otp, $data) {
            $record = PasswordResetOtp::where('email', $email)
                ->latest()
                ->lockForUpdate()
                ->first();

            $matches = $record
                && $record->attempts < 5
                && hash_equals((string) $record->otp_hash, $this->hashOtp($otp));

            if (! $matches || ! $record->isValid()) {
                if ($record && ! $record->used) {
                    $record->increment('attempts');
                }
                $this->invalidOtp();
            }

            $user = User::where('email', $email)->lockForUpdate()->first();
            if (! $user) {
                $this->invalidOtp();
            }

            // Plain value — User::$casts['password' => 'hashed'] hashes once.
            // Do not Hash::make() here or login can fail after a "successful" reset.
            $user->password = $data['password'];
            $user->save();
            $record->update(['used' => true]);
            $user->tokens()->delete();
        });

        $this->securityAudit->record($request, 'password_reset.completed', 'success', [
            'email_hash' => hash('sha256', $email),
        ]);

        return response()->json(['message' => 'Password changed successfully.']);
    }
}

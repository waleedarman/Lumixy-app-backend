<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    protected function deepLinkBase(): string
    {
        return rtrim((string) config('services.google.deep_link', 'lumixy://auth/google'), '?&');
    }

    protected function deepLinkRedirect(array $query)
    {
        $base = $this->deepLinkBase();
        $separator = str_contains($base, '?') ? '&' : '?';

        return redirect()->away($base.$separator.http_build_query($query));
    }

    protected function loadProviderUser(User $user): User
    {
        return $user->load([
            'providerProfile.gallery',
            'providerProfile.city',
            'providerProfile.category',
            'providerProfile.subServices',
            'providerProfile.applications',
        ]);
    }

    protected function providerAuthResponse(User $user, bool $isNewUser = false)
    {
        if ($user->status === 'suspended') {
            abort(403, 'هذا الحساب موقوف.');
        }

        $loadedUser = $this->loadProviderUser($user);
        $profile = $loadedUser->providerProfile;
        $onboardingStep = (int) ($profile?->onboarding_step ?? 1);
        $requiresProfileCompletion = $onboardingStep < 4;

        $tokenLifetime = config('lumixy.provider_token_lifetime_minutes');
        $expiresAt = is_numeric($tokenLifetime) && (int) $tokenLifetime > 0
            ? now()->addMinutes((int) $tokenLifetime)
            : null;

        $token = $user->createToken(
            'provider-token',
            ['provider'],
            $expiresAt
        )->plainTextToken;

        return response()->json([
            'message' => $isNewUser
                ? 'Provider registered successfully. Please complete your profile.'
                : 'Logged in successfully',
            'token' => $token,
            'user' => $loadedUser,
            'is_new_user' => $isNewUser,
            'requires_profile_completion' => $requiresProfileCompletion,
            'is_active' => $user->status === 'active',
        ], $isNewUser ? 201 : 200);
    }

    public function redirect()
    {
        return Socialite::driver('google')
            ->stateless()
            ->scopes(['openid', 'email', 'profile'])
            ->redirect();
    }

    public function callback()
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            $googleId = (string) $googleUser->getId();
            $email = mb_strtolower(trim((string) $googleUser->getEmail()));
            $fullName = trim((string) ($googleUser->getName() ?: 'Google User')) ?: 'Google User';
            $avatarUrl = $googleUser->getAvatar() ?: null;

            if ($email === '' || $googleId === '') {
                return $this->deepLinkRedirect(['error' => 'google_auth_failed']);
            }

            $isNewUser = false;

            $user = DB::transaction(function () use ($googleId, $email, $fullName, $avatarUrl, &$isNewUser) {
                $user = User::where('google_id', $googleId)
                    ->where('role', 'provider')
                    ->first();

                if (! $user) {
                    $user = User::where('email', $email)
                        ->where('role', 'provider')
                        ->first();
                }

                if ($user) {
                    $updates = [
                        'auth_provider' => 'google',
                    ];

                    if (empty($user->google_id)) {
                        $updates['google_id'] = $googleId;
                    }

                    if ($avatarUrl && empty($user->avatar_url)) {
                        $updates['avatar_url'] = $avatarUrl;
                    }

                    if ($fullName && empty($user->full_name)) {
                        $updates['full_name'] = $fullName;
                    }

                    $user->forceFill($updates)->save();

                    if (! $user->providerProfile) {
                        $user->providerProfile()->create([
                            'provider_name' => $user->full_name,
                            'profile_image' => $avatarUrl,
                            'onboarding_step' => 1,
                        ]);
                    }

                    return $user;
                }

                $isNewUser = true;

                $user = new User([
                    'full_name' => $fullName,
                    'email' => $email,
                    'password' => Str::random(40),
                    'auth_provider' => 'google',
                    'google_id' => $googleId,
                    'avatar_url' => $avatarUrl,
                ]);
                $user->forceFill([
                    'role' => 'provider',
                    'status' => 'inactive',
                ])->save();

                $user->providerProfile()->create([
                    'provider_name' => $user->full_name,
                    'profile_image' => $avatarUrl,
                    'onboarding_step' => 1,
                ]);

                return $user;
            });

            $code = Str::random(64);
            Cache::put('google_oauth_code:'.$code, [
                'user_id' => $user->id,
                'is_new_user' => $isNewUser,
            ], now()->addMinutes(2));

            return $this->deepLinkRedirect(['code' => $code]);
        } catch (Throwable $e) {
            Log::warning('Google OAuth callback failed', [
                'message' => $e->getMessage(),
            ]);

            return $this->deepLinkRedirect(['error' => 'google_auth_failed']);
        }
    }

    public function exchange(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $code = (string) $data['code'];
        $payload = Cache::pull('google_oauth_code:'.$code);

        if (! is_array($payload) || empty($payload['user_id'])) {
            return response()->json(['message' => 'Invalid or expired code'], 401);
        }

        $user = User::where('id', $payload['user_id'])
            ->where('role', 'provider')
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Invalid or expired code'], 401);
        }

        return $this->providerAuthResponse($user, (bool) ($payload['is_new_user'] ?? false));
    }
}

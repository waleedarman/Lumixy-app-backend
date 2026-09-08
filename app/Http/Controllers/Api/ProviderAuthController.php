<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\FirebaseIdentityService;
use App\Services\LoginProtectionService;
use App\Services\SecurityAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class ProviderAuthController extends Controller
{
    public function __construct(
        protected FirebaseIdentityService $firebaseIdentityService,
        protected LoginProtectionService $loginProtection,
        protected SecurityAuditService $securityAudit,
    ) {}

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
        // Only force the multi-step form when onboarding is incomplete.
        // Completed profiles that were never submitted land on PendingActivation, which re-submits.
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

    public function register(Request $request)
    {
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::defaults(),
            ],
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = new User([
                'full_name' => $data['full_name'],
                'email' => mb_strtolower(trim($data['email'])),
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
            ]);
            $user->forceFill([
                'role' => 'provider',
                'status' => 'inactive',
            ])->save();

            $user->providerProfile()->create([
                'provider_name' => $user->full_name,
                'onboarding_step' => 1,
            ]);

            return $user;
        });

        $this->securityAudit->record($request, 'provider.registered', 'success', ['user_id' => $user->id]);

        return $this->providerAuthResponse($user, true);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        $this->loginProtection->ensureAllowed('provider', $email, $request->ip());

        $user = User::where('email', $email)
            ->where('role', 'provider')
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            $this->loginProtection->failed('provider', $email, $request->ip());
            $this->securityAudit->record($request, 'provider.login', 'failed', ['email_hash' => hash('sha256', $email)]);

            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        if ($user->status === 'suspended') {
            $this->securityAudit->record($request, 'provider.login', 'blocked', ['user_id' => $user->id]);

            return response()->json([
                'message' => 'هذا الحساب موقوف.',
                'code' => 'account_suspended',
            ], 403);
        }

        $this->loginProtection->succeeded('provider', $email, $request->ip());
        $this->securityAudit->record($request, 'provider.login', 'success', ['user_id' => $user->id]);

        return $this->providerAuthResponse($user);
    }

    public function google(Request $request)
    {
        $data = $request->validate([
            'id_token' => ['required', 'string'],
        ]);

        $firebaseUser = $this->firebaseIdentityService->verifyIdToken($data['id_token']);

        if (
            ! ($firebaseUser['email_verified'] ?? false)
            || ! in_array('google.com', $firebaseUser['provider_ids'] ?? [], true)
        ) {
            return response()->json([
                'message' => 'Google account must have a verified email address.',
            ], 422);
        }

        $isNewUser = false;

        $user = DB::transaction(function () use ($firebaseUser, &$isNewUser) {
            $user = User::where('firebase_uid', $firebaseUser['firebase_uid'])
                ->where('role', 'provider')
                ->first();

            if (! $user) {
                $user = User::where('email', $firebaseUser['email'])
                    ->where('role', 'provider')
                    ->first();
            }

            if ($user) {
                $user->forceFill([
                    'full_name' => $firebaseUser['full_name'] ?: $user->full_name,
                    'phone' => $firebaseUser['phone'] ?: $user->phone,
                    'firebase_uid' => $firebaseUser['firebase_uid'],
                    'avatar_url' => $firebaseUser['avatar_url'] ?: $user->avatar_url,
                    'auth_provider' => 'google',
                ])->save();

                if (! $user->providerProfile) {
                    $user->providerProfile()->create([
                        'provider_name' => $user->full_name,
                        'profile_image' => $firebaseUser['avatar_url'] ?: null,
                        'onboarding_step' => 1,
                    ]);
                }

                return $user;
            }

            $isNewUser = true;

            $user = new User([
                'full_name' => $firebaseUser['full_name'] ?: 'Google User',
                'email' => mb_strtolower(trim($firebaseUser['email'])),
                'phone' => $firebaseUser['phone'],
                'password' => Str::random(40),
                'auth_provider' => 'google',
                'firebase_uid' => $firebaseUser['firebase_uid'],
                'avatar_url' => $firebaseUser['avatar_url'],
            ]);
            $user->forceFill([
                'role' => 'provider',
                'status' => 'inactive',
            ])->save();

            $user->providerProfile()->create([
                'provider_name' => $user->full_name,
                'profile_image' => $firebaseUser['avatar_url'] ?: null,
                'onboarding_step' => 1,
            ]);

            return $user;
        });

        $this->securityAudit->record($request, 'provider.google_login', 'success', [
            'user_id' => $user->id,
            'new_user' => $isNewUser,
        ]);

        return $this->providerAuthResponse($user, $isNewUser);
    }

    public function me(Request $request)
    {
        return response()->json(
            $request->user()->load([
                'providerProfile.gallery',
                'providerProfile.city',
                'providerProfile.category',
                'providerProfile.subServices',
                'providerProfile.applications',
            ])
        );
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        $this->securityAudit->record($request, 'provider.logout', 'success');

        return response()->json(['message' => 'Logged out successfully']);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LoginProtectionService;
use App\Services\SecurityAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    public function __construct(
        protected LoginProtectionService $loginProtection,
        protected SecurityAuditService $securityAudit,
    ) {}

    public function admins()
    {
        return response()->json([
            'admins' => User::query()
                ->where('role', 'admin')
                ->orderByDesc('created_at')
                ->get(['id', 'full_name', 'email', 'status', 'created_at']),
        ]);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        $this->loginProtection->ensureAllowed('admin', $email, $request->ip());

        $user = User::where('email', $email)
            ->where('role', 'admin')
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            $this->loginProtection->failed('admin', $email, $request->ip());
            $this->securityAudit->record($request, 'admin.login', 'failed', ['email_hash' => $this->securityAudit->identifier($email)]);

            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        if ($user->status !== 'active') {
            $this->securityAudit->record($request, 'admin.login', 'blocked', ['user_id' => $user->id]);

            return response()->json(['message' => 'Account inactive'], 403);
        }

        $this->loginProtection->succeeded('admin', $email, $request->ip());

        $token = $user->createToken('admin-token', ['admin'], now()->addHours(8))->plainTextToken;
        $this->securityAudit->record($request, 'admin.login', 'success', ['user_id' => $user->id]);

        return response()->json([
            'message' => 'Admin logged in successfully',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        $this->securityAudit->record($request, 'admin.logout', 'success');

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', Rule::unique('users', 'email')->ignore($user)],
            'current_password' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'confirmed', Password::defaults()],
        ]);

        $normalizedEmail = mb_strtolower(trim($data['email']));
        $emailChanged = strcasecmp($user->email, $normalizedEmail) !== 0;
        $passwordChanged = filled($data['password'] ?? null);

        if (($emailChanged || $passwordChanged) && ! Hash::check($data['current_password'] ?? '', $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        DB::transaction(function () use ($user, $data, $normalizedEmail, $passwordChanged, $emailChanged) {
            $user->full_name = $data['full_name'];
            $user->email = $normalizedEmail;

            if ($passwordChanged) {
                $user->password = $data['password'];
            }

            $user->save();

            if ($emailChanged || $passwordChanged) {
                $currentTokenId = $user->currentAccessToken()?->id;
                $tokens = $user->tokens();

                if ($currentTokenId) {
                    $tokens->whereKeyNot($currentTokenId);
                }

                $tokens->delete();
            }
        });
        $this->securityAudit->record($request, 'admin.profile_updated', 'success');

        return response()->json([
            'message' => 'Admin profile updated successfully',
            'user' => $user,
        ]);
    }

    public function storeAdmin(Request $request)
    {
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'status' => ['nullable', 'in:active,inactive'],
        ]);

        $admin = new User([
            'full_name' => $data['full_name'],
            'email' => mb_strtolower(trim($data['email'])),
            'password' => $data['password'],
        ]);
        $admin->forceFill([
            'role' => 'admin',
            'status' => $data['status'] ?? 'active',
            'is_super_admin' => false,
        ])->save();
        $this->securityAudit->record($request, 'admin.created', 'success', ['target_user_id' => $admin->id]);

        return response()->json([
            'message' => 'Admin created successfully',
            'admin' => $admin->only(['id', 'full_name', 'email', 'status', 'created_at']),
        ], 201);
    }

    public function updateAdmin(Request $request, string $id)
    {
        $admin = User::query()
            ->whereKey($id)
            ->where('role', 'admin')
            ->first();

        if (! $admin) {
            return response()->json(['message' => 'Admin account not found.'], 404);
        }

        if ($request->user()->id === $admin->id) {
            return response()->json(['message' => 'You cannot modify your own admin account here.'], 422);
        }

        $data = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $admin->status = $data['status'];
        $admin->save();

        if ($admin->status !== 'active') {
            $admin->tokens()->delete();
        }

        $this->securityAudit->record($request, 'admin.updated', 'success', [
            'target_user_id' => $admin->id,
            'status' => $admin->status,
        ]);

        return response()->json([
            'message' => 'Admin account updated successfully',
            'admin' => $admin->only(['id', 'full_name', 'email', 'status', 'created_at']),
        ]);
    }

    public function destroyAdmin(Request $request, string $id)
    {
        $admin = User::query()
            ->whereKey($id)
            ->where('role', 'admin')
            ->first();

        if (! $admin) {
            return response()->json(['message' => 'Admin account not found.'], 404);
        }

        if ($request->user()->id === $admin->id) {
            return response()->json(['message' => 'You cannot delete your own admin account.'], 422);
        }

        $targetUserId = $admin->id;

        DB::transaction(function () use ($admin) {
            $admin->tokens()->delete();
            $admin->delete();
        });

        $this->securityAudit->record($request, 'admin.deleted', 'success', [
            'target_user_id' => $targetUserId,
        ]);

        return response()->json([
            'message' => 'Admin account deleted successfully',
        ]);
    }
}

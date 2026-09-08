<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceSubcategory;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProviderProfileController extends Controller
{
    protected function profile(Request $request)
    {
        return $request->user()->providerProfile;
    }

    public function show(Request $request)
    {
        return response()->json(
            $this->profile($request)->load([
                'gallery',
                'city.parent',
                'category.subcategories',
                'subServices',
                'applications',
            ])
        );
    }

    public function updateBasic(Request $request)
    {
        $data = $request->validate([
            'provider_name' => ['required', 'string', 'max:255'],
            'full_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'onboarding_step' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $profile = $this->profile($request);
        $user = $request->user();

        DB::transaction(function () use ($profile, $user, $data) {
            $profile->update([
                'provider_name' => $data['provider_name'],
                'bio' => $data['bio'] ?? null,
                'onboarding_step' => $data['onboarding_step'] ?? $profile->onboarding_step,
            ]);

            $user->update([
                'full_name' => $data['full_name'] ?? $data['provider_name'],
                'phone' => array_key_exists('phone', $data) ? ($data['phone'] ?: null) : $user->phone,
            ]);
        });
        PublicApiCache::flushProviders();

        return response()->json([
            'message' => 'Basic profile updated',
            'profile' => $profile->fresh(),
            'user' => $user->fresh(),
        ]);
    }

    public function updateLocation(Request $request)
    {
        $data = $request->validate([
            'city_id' => ['required', 'uuid', 'exists:cities,id'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'onboarding_step' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $profile = $this->profile($request);
        $profile->update($data);
        PublicApiCache::flushProviders();

        return response()->json([
            'message' => 'Location updated',
            'profile' => $profile->fresh()->load('city.parent'),
        ]);
    }

    public function updateContact(Request $request)
    {
        $data = $request->validate([
            'whatsapp_number' => ['required', 'string', 'max:50'],
            'instagram_username' => ['nullable', 'string', 'max:255'],
            'facebook_url' => ['nullable', 'url:http,https', 'max:500'],
            'onboarding_step' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $profile = $this->profile($request);
        $profile->update($data);
        PublicApiCache::flushProviders();

        return response()->json([
            'message' => 'Contact info updated',
            'profile' => $profile->fresh(),
        ]);
    }

    public function updateBusiness(Request $request)
    {
        $validated = $request->validate([
            'provider_name' => ['required', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'category_id' => ['required', 'uuid', 'exists:service_categories,id'],
            'sub_service_ids' => ['required', 'array', 'min:1', 'max:20'],
            'sub_service_ids.*' => ['required', 'uuid', 'distinct', 'exists:service_subcategories,id'],
            'onboarding_step' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $profile = $this->profile($request);

        if (!$profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $this->assertSubServicesBelongToCategory(
            $validated['category_id'],
            $validated['sub_service_ids']
        );

        $updateData = [
            'provider_name' => $validated['provider_name'],
            'bio' => $validated['bio'] ?? null,
            'category_id' => $validated['category_id'],
        ];

        if (isset($validated['onboarding_step'])) {
            $updateData['onboarding_step'] = $validated['onboarding_step'];
        }

        DB::transaction(function () use ($profile, $updateData, $validated) {
            $profile->update($updateData);
            $profile->subServices()->sync($validated['sub_service_ids']);
        });
        PublicApiCache::flushProviders();

        return response()->json([
            'message' => 'Business info updated successfully.',
            'data' => $profile->fresh()->load(['category.subcategories', 'subServices']),
        ]);
    }

    public function updateImage(Request $request)
    {
        $request->validate([
            'profile_image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
            'onboarding_step' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $profile = $this->profile($request);

        if (!$profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        try {
            $uploaded = app(\App\Services\BunnyStorageService::class)->uploadUploadedFile(
                $request->file('profile_image'),
                "uploads/providers/{$profile->id}"
            );
        } catch (\App\Services\BunnyStorageException $e) {
            return response()->json(['message' => $e->getMessage()], $e->status >= 400 ? $e->status : 502);
        }

        $oldPath = $profile->getRawOriginal('profile_image_path');
        $oldUrl = $profile->getRawOriginal('profile_image');

        $updateData = [
            'profile_image' => $uploaded['url'],
            'profile_image_path' => $uploaded['path'],
        ];

        if ($request->filled('onboarding_step')) {
            $updateData['onboarding_step'] = $request->onboarding_step;
        }

        $profile->update($updateData);

        if ($oldPath && $oldPath !== $uploaded['path']) {
            app(\App\Services\ProviderMediaService::class)->deleteProfileImage($profile, $oldUrl, $oldPath);
        } elseif ($oldUrl && ! preg_match('/^https?:\/\//i', $oldUrl)) {
            Storage::disk('public')->delete($oldUrl);
        }
        PublicApiCache::flushProviders();

        return response()->json([
            'message' => 'Profile image updated successfully.',
            'profile' => $profile->fresh(),
        ]);
    }

    public function updateLocationSchedule(Request $request)
    {
        $data = $request->validate([
            'city_id' => ['required', 'uuid', 'exists:cities,id'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'onboarding_step' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $profile = $this->profile($request);

        $payload = [
            'city_id' => $data['city_id'],
            'onboarding_step' => $data['onboarding_step'] ?? $profile->onboarding_step,
        ];

        // Omitting the coordinates keeps a previously pinned location intact.
        if (array_key_exists('latitude', $data) && array_key_exists('longitude', $data)) {
            $payload['latitude'] = $data['latitude'];
            $payload['longitude'] = $data['longitude'];
        }

        $profile->update($payload);
        PublicApiCache::flushProviders();

        return response()->json([
            'message' => 'Location updated successfully.',
            'profile' => $profile->fresh()->load(['city.parent']),
        ]);
    }

    protected function assertSubServicesBelongToCategory(string $categoryId, array $subServiceIds): void
    {
        $count = ServiceSubcategory::where('service_category_id', $categoryId)
            ->whereIn('id', $subServiceIds)
            ->count();

        if ($count !== count($subServiceIds)) {
            throw ValidationException::withMessages([
                'sub_service_ids' => ['Selected sub services must belong to the chosen category.'],
            ]);
        }
    }
}

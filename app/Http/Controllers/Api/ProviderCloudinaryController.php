<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProviderGallery;
use App\Services\BunnyStorageException;
use App\Services\BunnyStorageService;
use App\Services\ProviderMediaService;
use App\Support\ProviderGalleryLimit;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;

/**
 * Provider media uploads go to Bunny via the backend (API key never leaves the server).
 * Route paths keep the historical /cloudinary suffix so existing clients only change the body shape.
 */
class ProviderCloudinaryController extends Controller
{
    public function __construct(
        protected BunnyStorageService $bunny,
        protected ProviderMediaService $mediaService,
    ) {}

    protected function profile(Request $request)
    {
        return $request->user()->providerProfile;
    }

    public function saveProfileImage(Request $request)
    {
        if ($request->hasFile('profile_image') && ! $request->hasFile('image')) {
            $request->files->set('image', $request->file('profile_image'));
        }

        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
            'onboarding_step' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $profile = $this->profile($request);
        abort_unless($profile, 404);

        try {
            $uploaded = $this->bunny->uploadUploadedFile(
                $request->file('image'),
                "uploads/providers/{$profile->id}"
            );
        } catch (BunnyStorageException $e) {
            return response()->json(['message' => $e->getMessage()], $e->status >= 400 ? $e->status : 502);
        }

        $oldPath = $profile->getRawOriginal('profile_image_path');
        $oldUrl = $profile->getRawOriginal('profile_image');

        $updateData = [
            'profile_image' => $uploaded['url'],
            'profile_image_path' => $uploaded['path'],
        ];

        if ($request->filled('onboarding_step')) {
            $updateData['onboarding_step'] = $request->integer('onboarding_step');
        }

        $profile->update($updateData);
        PublicApiCache::flushProviders();

        if ($oldPath && $oldPath !== $uploaded['path']) {
            $this->mediaService->deleteProfileImage($profile, $oldUrl, $oldPath);
        }

        return response()->json([
            'message' => 'Profile image saved successfully.',
            'profile' => $profile->fresh(),
            'url' => $uploaded['url'],
            'path' => $uploaded['path'],
        ]);
    }

    public function saveGalleryImage(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $profile = $this->profile($request);
        abort_unless($profile, 404);

        try {
            $gallery = ProviderGalleryLimit::transaction(function () use ($request, $profile) {
                ProviderGalleryLimit::assertCanAddLocked($profile);

                $uploaded = $this->bunny->uploadUploadedFile(
                    $request->file('image'),
                    "uploads/providers/{$profile->id}/gallery"
                );

                return ProviderGallery::create([
                    'provider_profile_id' => $profile->id,
                    'image_url' => $uploaded['url'],
                    'image_path' => $uploaded['path'],
                    'sort_order' => $request->integer('sort_order', 0),
                ]);
            });
        } catch (BunnyStorageException $e) {
            return response()->json(['message' => $e->getMessage()], $e->status >= 400 ? $e->status : 502);
        }

        PublicApiCache::flushProviders();

        return response()->json([
            'message' => 'Image saved successfully.',
            'item' => $gallery,
        ], 201);
    }
}

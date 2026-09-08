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
use Illuminate\Support\Facades\Storage;

class ProviderGalleryController extends Controller
{
    public function __construct(
        protected BunnyStorageService $bunny,
        protected ProviderMediaService $mediaService,
    ) {}

    protected function profile(Request $request)
    {
        return $request->user()->providerProfile;
    }

    public function index(Request $request)
    {
        return response()->json(
            $this->profile($request)->gallery()->orderBy('sort_order')->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $profile = $this->profile($request);

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
                    'sort_order' => $request->sort_order ?? 0,
                ]);
            });
        } catch (BunnyStorageException $e) {
            return response()->json(['message' => $e->getMessage()], $e->status >= 400 ? $e->status : 502);
        }

        PublicApiCache::flushProviders();

        return response()->json([
            'message' => 'Image added',
            'item' => $gallery,
        ], 201);
    }

    public function destroy(Request $request, string $id)
    {
        $profile = $this->profile($request);
        $item = $profile->gallery()->where('id', $id)->firstOrFail();
        $imageUrl = $item->getRawOriginal('image_url');
        $imagePath = $item->getRawOriginal('image_path') ?: $this->bunny->extractPathFromUrl($imageUrl);

        if ($imagePath) {
            try {
                if ($this->bunny->isConfigured()) {
                    $this->bunny->delete_file($imagePath);
                }
            } catch (BunnyStorageException $e) {
                return response()->json([
                    'message' => $e->getMessage() ?: 'Failed to delete image from Bunny Storage.',
                ], $e->status >= 400 ? $e->status : 502);
            }
        } elseif ($imageUrl && ! preg_match('/^https?:\/\//i', $imageUrl)) {
            Storage::disk('public')->delete($imageUrl);
        }

        $item->delete();
        PublicApiCache::flushProviders();

        return response()->json(['message' => 'Image deleted']);
    }
}

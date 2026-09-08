<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Services\BunnyStorageException;
use App\Services\BunnyStorageService;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminPromotionController extends Controller
{
    public function __construct(
        protected BunnyStorageService $bunny,
    ) {}

    protected function json($data, int $status = 200)
    {
        return response()->json($data, $status, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    protected function promotionRules(bool $creating = false): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image' => [$creating ? 'required' : 'nullable', 'string', 'max:2048'],
            'mobile_image' => ['nullable', 'string', 'max:2048'],
            'image_path' => ['nullable', 'string', 'max:512'],
            'mobile_image_path' => ['nullable', 'string', 'max:512'],
            // Compatibility aliases from older admin forms.
            'image_public_id' => ['nullable', 'string', 'max:512'],
            'mobile_image_public_id' => ['nullable', 'string', 'max:512'],
            'button_text' => ['nullable', 'string', 'max:80'],
            'action_type' => ['nullable', 'string', Rule::in(Promotion::actionTypes())],
            'action_value' => ['nullable', 'string', 'max:2048'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'show_sponsored_badge' => ['nullable', 'boolean'],
            'show_section_title' => ['nullable', 'boolean'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ];
    }

    protected function nextDisplayOrder(): int
    {
        return ((int) Promotion::query()->max('display_order')) + 1;
    }

    protected function assertValidImage(string $value, string $field = 'image'): void
    {
        $trimmed = trim($value);
        $isUrl = filter_var($trimmed, FILTER_VALIDATE_URL) !== false;
        $isPath = str_starts_with($trimmed, '/storage/');

        if (! $isUrl && ! $isPath) {
            throw ValidationException::withMessages([
                $field => ['A valid image URL or storage path is required.'],
            ]);
        }
    }

    protected function resolvePath(array $validated, string $pathKey, string $legacyKey): ?string
    {
        $path = $validated[$pathKey] ?? $validated[$legacyKey] ?? null;

        return is_string($path) && trim($path) !== '' ? trim($path) : null;
    }

    protected function deleteStoredImage(?string $url, ?string $path): void
    {
        $resolved = $path ?: $this->bunny->extractPathFromUrl($url);
        if (! $resolved || ! $this->bunny->isConfigured()) {
            return;
        }

        $this->bunny->delete_file($resolved);
    }

    public function index()
    {
        return $this->json(
            Promotion::query()->ordered()->get()
        );
    }

    public function uploadMedia(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=4096,max_height=4096'],
        ]);

        try {
            $uploaded = $this->bunny->uploadUploadedFile(
                $request->file('image'),
                'uploads/promotions'
            );
        } catch (BunnyStorageException $e) {
            return $this->json(['message' => $e->getMessage()], $e->status >= 400 ? $e->status : 502);
        }

        return $this->json([
            'url' => $uploaded['url'],
            'path' => $uploaded['path'],
            'secure_url' => $uploaded['secure_url'],
            'public_id' => $uploaded['public_id'],
        ], 201);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->promotionRules(true));
        $this->assertValidImage($validated['image']);

        if (! empty($validated['mobile_image'])) {
            $this->assertValidImage($validated['mobile_image'], 'mobile_image');
        }

        $promotion = Promotion::create([
            'title' => $validated['title'] ?? null,
            'description' => $validated['description'] ?? null,
            'image' => trim($validated['image']),
            'mobile_image' => isset($validated['mobile_image']) ? trim($validated['mobile_image']) : null,
            'image_path' => $this->resolvePath($validated, 'image_path', 'image_public_id'),
            'mobile_image_path' => $this->resolvePath($validated, 'mobile_image_path', 'mobile_image_public_id'),
            'button_text' => $validated['button_text'] ?? null,
            'action_type' => $validated['action_type'] ?? Promotion::ACTION_NONE,
            'action_value' => $validated['action_value'] ?? null,
            'display_order' => $validated['display_order'] ?? $this->nextDisplayOrder(),
            'is_active' => $validated['is_active'] ?? true,
            'show_sponsored_badge' => $validated['show_sponsored_badge'] ?? true,
            'show_section_title' => $validated['show_section_title'] ?? true,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
        ]);

        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'Promotion created successfully',
            'promotion' => $promotion->fresh(),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $validated = $request->validate($this->promotionRules(false));
        $promotion = Promotion::findOrFail($id);

        if (array_key_exists('image', $validated) && $validated['image'] !== null) {
            $this->assertValidImage($validated['image']);
        }

        if (! empty($validated['mobile_image'])) {
            $this->assertValidImage($validated['mobile_image'], 'mobile_image');
        }

        $oldImageUrl = $promotion->getRawOriginal('image');
        $oldImagePath = $promotion->getRawOriginal('image_path');
        $oldMobileUrl = $promotion->getRawOriginal('mobile_image');
        $oldMobilePath = $promotion->getRawOriginal('mobile_image_path');

        $nextImage = array_key_exists('image', $validated) && $validated['image'] !== null
            ? trim($validated['image'])
            : $oldImageUrl;
        $nextMobile = array_key_exists('mobile_image', $validated)
            ? ($validated['mobile_image'] ? trim($validated['mobile_image']) : null)
            : $oldMobileUrl;
        $nextImagePath = array_key_exists('image_path', $validated) || array_key_exists('image_public_id', $validated)
            ? $this->resolvePath($validated, 'image_path', 'image_public_id')
            : $oldImagePath;
        $nextMobilePath = array_key_exists('mobile_image_path', $validated) || array_key_exists('mobile_image_public_id', $validated)
            ? $this->resolvePath($validated, 'mobile_image_path', 'mobile_image_public_id')
            : $oldMobilePath;

        $promotion->fill([
            'title' => $validated['title'] ?? $promotion->title,
            'description' => $validated['description'] ?? $promotion->description,
            'image' => $nextImage,
            'mobile_image' => $nextMobile,
            'image_path' => $nextImagePath,
            'mobile_image_path' => $nextMobilePath,
            'button_text' => $validated['button_text'] ?? $promotion->button_text,
            'action_type' => $validated['action_type'] ?? $promotion->action_type,
            'action_value' => array_key_exists('action_value', $validated)
                ? $validated['action_value']
                : $promotion->action_value,
            'display_order' => $validated['display_order'] ?? $promotion->display_order,
            'is_active' => $validated['is_active'] ?? $promotion->is_active,
            'show_sponsored_badge' => $validated['show_sponsored_badge'] ?? $promotion->show_sponsored_badge,
            'show_section_title' => $validated['show_section_title'] ?? $promotion->show_section_title,
            'start_date' => array_key_exists('start_date', $validated)
                ? $validated['start_date']
                : $promotion->start_date,
            'end_date' => array_key_exists('end_date', $validated)
                ? $validated['end_date']
                : $promotion->end_date,
        ])->save();

        PublicApiCache::flushLookups();

        try {
            if ($oldImagePath && $oldImagePath !== $nextImagePath) {
                $this->deleteStoredImage($oldImageUrl, $oldImagePath);
            }
            if ($oldMobilePath && $oldMobilePath !== $nextMobilePath) {
                $this->deleteStoredImage($oldMobileUrl, $oldMobilePath);
            }
        } catch (BunnyStorageException $e) {
            // DB already updated with the new image; report cleanup failure without rolling back.
            return $this->json([
                'message' => 'Promotion updated, but failed to delete the previous Bunny image: '.$e->getMessage(),
                'promotion' => $promotion->fresh(),
            ]);
        }

        return $this->json([
            'message' => 'Promotion updated successfully',
            'promotion' => $promotion->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $promotion = Promotion::findOrFail($id);
        $imageUrl = $promotion->getRawOriginal('image');
        $imagePath = $promotion->getRawOriginal('image_path');
        $mobileUrl = $promotion->getRawOriginal('mobile_image');
        $mobilePath = $promotion->getRawOriginal('mobile_image_path');

        try {
            $this->deleteStoredImage($imageUrl, $imagePath);
            $this->deleteStoredImage($mobileUrl, $mobilePath);
        } catch (BunnyStorageException $e) {
            return $this->json([
                'message' => $e->getMessage() ?: 'Failed to delete promotion image from Bunny Storage.',
            ], $e->status >= 400 ? $e->status : 502);
        }

        $promotion->delete();
        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'Promotion deleted successfully',
        ]);
    }

    public function toggle(string $id)
    {
        $promotion = Promotion::findOrFail($id);
        $promotion->update(['is_active' => ! $promotion->is_active]);
        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'Promotion status updated',
            'promotion' => $promotion->fresh(),
        ]);
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'ordered_ids' => ['required', 'array', 'min:1'],
            'ordered_ids.*' => ['required', 'uuid'],
        ]);

        $ids = $validated['ordered_ids'];

        foreach ($ids as $index => $promotionId) {
            Promotion::whereKey($promotionId)->update(['display_order' => $index]);
        }

        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'Promotion order updated',
            'promotions' => Promotion::query()->ordered()->get(),
        ]);
    }

    public function duplicate(string $id)
    {
        $source = Promotion::findOrFail($id);
        $copy = $source->replicate([
            'click_count',
        ]);
        $copy->fill([
            'title' => $source->title ? $source->title.' (نسخة)' : null,
            'display_order' => $this->nextDisplayOrder(),
            'is_active' => false,
            'click_count' => 0,
        ])->save();

        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'Promotion duplicated',
            'promotion' => $copy->fresh(),
        ], 201);
    }
}

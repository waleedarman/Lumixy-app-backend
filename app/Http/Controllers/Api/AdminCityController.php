<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Services\PcbsCitySyncService;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminCityController extends Controller
{
    protected function json($data, int $status = 200)
    {
        return response()->json($data, $status, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    protected function treeQuery()
    {
        return City::query()
            ->whereNull('parent_id')
            ->with(['children' => function ($query) {
                $query->orderBy('sort_order')
                    ->orderBy('name');
            }])
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    protected function uniqueNameRule(?string $parentId, ?string $ignoreId = null)
    {
        $rule = Rule::unique('cities', 'name')->where(function ($query) use ($parentId) {
            if ($parentId) {
                $query->where('parent_id', $parentId);
                return;
            }

            $query->whereNull('parent_id');
        });

        if ($ignoreId) {
            $rule->ignore($ignoreId);
        }

        return $rule;
    }

    protected function assertValidParent(?string $parentId, ?string $cityId = null): void
    {
        if (!$parentId || !$cityId) {
            return;
        }

        if ($parentId === $cityId) {
            throw ValidationException::withMessages([
                'parent_id' => ['A city cannot be its own parent.'],
            ]);
        }

        $currentParentId = $parentId;

        while ($currentParentId) {
            if ($currentParentId === $cityId) {
                throw ValidationException::withMessages([
                    'parent_id' => ['A city cannot be moved under one of its descendants.'],
                ]);
            }

            $currentParentId = City::query()->whereKey($currentParentId)->value('parent_id');
        }
    }

    public function index()
    {
        return $this->json($this->treeQuery()->get());
    }

    public function syncFromPcbs(PcbsCitySyncService $service)
    {
        try {
            $result = $service->sync();
        } catch (\Throwable $exception) {
            report($exception);

            return $this->json([
                'message' => 'تعذر الاستيراد من مصدر PCBS/ArcGIS. تحقق من الاتصال أو إعداد PCBS_VERIFY_SSL.',
            ], 502);
        }

        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'تم استيراد المدن والقرى الفلسطينية من PCBS',
            'result' => $result,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                $this->uniqueNameRule($request->input('parent_id')),
            ],
            'parent_id' => ['nullable', 'uuid', 'exists:cities,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $city = City::create([
            'name' => $validated['name'],
            'parent_id' => $validated['parent_id'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);
        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'City added successfully',
            'city' => $city->load(['parent', 'children']),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $city = City::findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                $this->uniqueNameRule($request->input('parent_id'), $city->id),
            ],
            'parent_id' => ['nullable', 'uuid', 'exists:cities,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $this->assertValidParent($validated['parent_id'] ?? null, $city->id);

        $city->update([
            'name' => $validated['name'],
            'parent_id' => $validated['parent_id'] ?? null,
            'sort_order' => $validated['sort_order'] ?? $city->sort_order,
            'is_active' => $validated['is_active'] ?? $city->is_active,
        ]);
        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'City updated successfully',
            'city' => $city->fresh()->load(['parent', 'children']),
        ]);
    }

    public function destroy(string $id)
    {
        $city = City::findOrFail($id);

        if ($city->children()->exists()) {
            return $this->json([
                'message' => 'Delete the villages under this city first.',
            ], 422);
        }

        if ($city->providerProfiles()->exists()) {
            return $this->json([
                'message' => 'This city is linked to provider accounts and cannot be deleted yet.',
            ], 422);
        }

        $city->delete();
        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'City deleted successfully',
        ]);
    }
}

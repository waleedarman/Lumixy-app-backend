<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceCategory;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;

class AdminCategoryController extends Controller
{
    protected function json($data, int $status = 200)
    {
        return response()->json($data, $status, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public function index()
    {
        return $this->json(
            ServiceCategory::with(['subcategories' => function ($query) {
                $query->orderBy('sort_order')
                    ->orderBy('name');
            }])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'url:http,https', 'max:2048'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $category = ServiceCategory::create([
            'name' => $validated['name'],
            'icon' => $validated['icon'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);
        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'Category added successfully',
            'category' => $category->load('subcategories'),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'url:http,https', 'max:2048'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $category = ServiceCategory::findOrFail($id);

        $category->update([
            'name' => $validated['name'],
            'icon' => $validated['icon'] ?? $category->icon,
            'sort_order' => $validated['sort_order'] ?? $category->sort_order,
            'is_active' => $validated['is_active'] ?? $category->is_active,
        ]);
        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'Category updated successfully',
            'category' => $category->fresh()->load('subcategories'),
        ]);
    }

    public function destroy(string $id)
    {
        $category = ServiceCategory::findOrFail($id);
        $category->delete();
        PublicApiCache::flushLookups();

        return $this->json([
            'message' => 'Category deleted successfully',
        ]);
    }
}

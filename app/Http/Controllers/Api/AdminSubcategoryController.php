<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceSubcategory;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;

class AdminSubcategoryController extends Controller
{
    public function index()
    {
        return response()->json(
            ServiceSubcategory::with('category')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_category_id' => ['required', 'uuid', 'exists:service_categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $subcategory = ServiceSubcategory::create([
            'service_category_id' => $validated['service_category_id'],
            'name' => $validated['name'],
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);
        PublicApiCache::flushLookups();

        return response()->json([
            'message' => 'Subcategory added successfully',
            'subcategory' => $subcategory->load('category'),
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $subcategory = ServiceSubcategory::findOrFail($id);

        $validated = $request->validate([
            'service_category_id' => ['required', 'uuid', 'exists:service_categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $subcategory->update([
            'service_category_id' => $validated['service_category_id'],
            'name' => $validated['name'],
            'sort_order' => $validated['sort_order'] ?? $subcategory->sort_order,
            'is_active' => $validated['is_active'] ?? $subcategory->is_active,
        ]);
        PublicApiCache::flushLookups();

        return response()->json([
            'message' => 'Subcategory updated successfully',
            'subcategory' => $subcategory->fresh()->load('category'),
        ]);
    }

    public function destroy(string $id)
    {
        $subcategory = ServiceSubcategory::findOrFail($id);
        $subcategory->delete();
        PublicApiCache::flushLookups();

        return response()->json([
            'message' => 'Subcategory deleted successfully',
        ]);
    }
}

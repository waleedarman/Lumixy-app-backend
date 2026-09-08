<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProviderProfile;
use App\Services\CatalogBootstrapService;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;

class PublicProviderController extends Controller
{
    public function __construct(
        protected CatalogBootstrapService $catalog,
    ) {}

    protected function visibleProvidersQuery()
    {
        return $this->catalog->visibleProvidersQuery();
    }

    public function cities()
    {
        return response()->json($this->catalog->cities());
    }

    public function villages(string $id)
    {
        $city = \App\Models\City::where('is_active', true)
            ->whereNull('parent_id')
            ->findOrFail($id);

        return response()->json(PublicApiCache::rememberLookup("villages:{$id}", fn () =>
            $city->children()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
        ));
    }

    public function categories()
    {
        return response()->json($this->catalog->categories());
    }

    public function providers(Request $request)
    {
        $request->validate([
            'city_id' => ['nullable', 'uuid'],
            'category_id' => ['nullable', 'uuid'],
            'sub_service_id' => ['nullable', 'uuid'],
            'page' => ['nullable', 'integer', 'min:1', 'max:10000'],
        ]);

        $page = max(1, (int) $request->query('page', 1));

        return response()->json($this->catalog->providersPage(
            $page,
            $request->filled('city_id') ? $request->string('city_id')->toString() : null,
            $request->filled('category_id') ? $request->string('category_id')->toString() : null,
            $request->filled('sub_service_id') ? $request->string('sub_service_id')->toString() : null,
        ));
    }

    public function show(string $id)
    {
        return response()->json(PublicApiCache::rememberProviders(
            "provider:{$id}",
            fn () => $this->visibleProvidersQuery()->findOrFail($id)
        ));
    }

    public function featured()
    {
        return response()->json(PublicApiCache::rememberProviders('featured', fn () =>
            $this->visibleProvidersQuery()
                ->where('is_featured', true)
                ->latest()
                ->limit(100)
                ->get()
        ));
    }
}

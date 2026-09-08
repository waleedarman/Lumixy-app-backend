<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Services\CatalogBootstrapService;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;

class PublicPromotionController extends Controller
{
    public function __construct(
        protected CatalogBootstrapService $catalog,
    ) {}

    protected function json($data, int $status = 200)
    {
        return response()->json($data, $status, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public function index()
    {
        return $this->json($this->catalog->promotionsPayload());
    }

    public function click(Request $request, string $id)
    {
        $promotion = Promotion::query()->publiclyVisible()->find($id);

        if (! $promotion) {
            return $this->json(['message' => 'Promotion not found'], 404);
        }

        $promotion->increment('click_count');

        return $this->json([
            'message' => 'Click recorded',
            'click_count' => $promotion->fresh()->click_count,
        ]);
    }
}

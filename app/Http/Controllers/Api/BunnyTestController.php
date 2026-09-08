<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BunnyStorageException;
use App\Services\BunnyStorageService;
use Illuminate\Http\Request;

/**
 * Temporary local-only Bunny Storage probe endpoints.
 * Not for production clients — useful for Swagger/Postman verification.
 */
class BunnyTestController extends Controller
{
    public function __construct(
        protected BunnyStorageService $bunny,
    ) {}

    public function upload(Request $request)
    {
        abort_unless(app()->environment('local'), 404);

        $request->validate([
            'file' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
                'dimensions:max_width=4096,max_height=4096',
            ],
        ]);

        try {
            $path = $this->bunny->upload_image($request->file('file'), 'images');
        } catch (BunnyStorageException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], $this->statusFor($e));
        }

        $payload = [
            'message' => 'Image uploaded successfully',
            'file_path' => $path,
        ];

        if ($this->bunny->hasCdn()) {
            $payload['cdn_url'] = $this->bunny->cdnUrl($path);
        }

        return response()->json($payload, 201);
    }

    public function destroy(string $file_path)
    {
        abort_unless(app()->environment('local'), 404);

        $file_path = rawurldecode($file_path);

        if ($file_path === '' || str_contains($file_path, '..')) {
            return response()->json([
                'message' => 'Invalid file path.',
            ], 422);
        }

        try {
            $this->bunny->delete_image($file_path);
        } catch (BunnyStorageException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], $this->statusFor($e));
        }

        return response()->json([
            'message' => 'Image deleted successfully',
            'file_path' => ltrim(str_replace('\\', '/', $file_path), '/'),
        ]);
    }

    private function statusFor(BunnyStorageException $e): int
    {
        if ($e->status >= 400 && $e->status < 600) {
            return $e->status;
        }

        return 502;
    }
}

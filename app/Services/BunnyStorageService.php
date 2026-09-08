<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class BunnyStorageException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 0,
        public readonly ?string $bunnyCode = null,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, $status, $previous);
    }
}

class BunnyStorageService
{
    public function isConfigured(): bool
    {
        return $this->storageZone() !== ''
            && $this->apiKey() !== '';
    }

    public function hasCdn(): bool
    {
        return $this->cdnBaseUrl() !== '';
    }

    /**
     * Upload an image (UploadFile) under images/ and return the Bunny storage path.
     */
    public function upload_image(UploadedFile $file, string $directory = 'images'): string
    {
        return $this->uploadUploadedFile($file, $directory)['path'];
    }

    /**
     * Physically delete an image from Bunny Storage by its stored path.
     */
    public function delete_image(string $path): bool
    {
        return $this->delete_file($path);
    }

    /**
     * Upload raw bytes/file contents to Bunny Storage and return the public CDN URL.
     *
     * @param  string  $path  Storage object key, e.g. uploads/providers/{id}/{uuid}.jpg
     * @param  string|resource  $contents
     */
    public function upload_file(string $path, mixed $contents, ?string $contentType = null): string
    {
        return $this->uploadFile($path, $contents, $contentType);
    }

    /**
     * Delete a file from Bunny Storage by its storage path/key.
     */
    public function delete_file(string $path): bool
    {
        return $this->deleteFile($path);
    }

    public function uploadFile(string $path, mixed $contents, ?string $contentType = null): string
    {
        $this->assertConfigured();
        $path = $this->normalizePath($path);

        if ($path === '') {
            throw new BunnyStorageException('Bunny storage path is required.', 422);
        }

        try {
            $request = Http::withHeaders($this->authHeaders())
                ->connectTimeout(10)
                ->timeout(60)
                ->withBody(
                    is_resource($contents) ? stream_get_contents($contents) ?: '' : (string) $contents,
                    $contentType ?: 'application/octet-stream'
                );

            if (! $this->shouldVerifySsl()) {
                $request = $request->withoutVerifying();
            }

            $response = $request->put($this->storageObjectUrl($path));
        } catch (ConnectionException $e) {
            throw new BunnyStorageException('Unable to reach Bunny Storage (network error).', 0, 'network', $e);
        } catch (Throwable $e) {
            throw new BunnyStorageException('Bunny upload failed: '.$e->getMessage(), 0, 'upload', $e);
        }

        if ($response->status() === 401 || $response->status() === 403) {
            throw new BunnyStorageException('Invalid Bunny Storage credentials.', $response->status(), 'auth');
        }

        if (! $response->successful()) {
            throw new BunnyStorageException(
                'Bunny upload failed (HTTP '.$response->status().').',
                $response->status(),
                'upload'
            );
        }

        return $this->cdnUrl($path);
    }

    public function deleteFile(string $path): bool
    {
        $this->assertConfigured();
        $path = $this->normalizePath($path);

        if ($path === '') {
            return true;
        }

        try {
            $request = Http::withHeaders($this->authHeaders())
                ->connectTimeout(10)
                ->timeout(30);

            if (! $this->shouldVerifySsl()) {
                $request = $request->withoutVerifying();
            }

            $response = $request->delete($this->storageObjectUrl($path));
        } catch (ConnectionException $e) {
            throw new BunnyStorageException('Unable to reach Bunny Storage (network error).', 0, 'network', $e);
        } catch (Throwable $e) {
            throw new BunnyStorageException('Bunny delete failed: '.$e->getMessage(), 0, 'delete', $e);
        }

        if ($response->status() === 401 || $response->status() === 403) {
            throw new BunnyStorageException('Invalid Bunny Storage credentials.', $response->status(), 'auth');
        }

        // 404 = already gone — treat as success so DB cleanup can proceed safely.
        if ($response->status() === 404) {
            return true;
        }

        if (! $response->successful()) {
            throw new BunnyStorageException(
                'Bunny delete failed (HTTP '.$response->status().').',
                $response->status(),
                'delete'
            );
        }

        return true;
    }

    /**
     * @return array{url: string, path: string, secure_url: string, public_id: string}
     */
    public function uploadUploadedFile(UploadedFile $file, string $directory): array
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $extension = preg_replace('/[^a-z0-9]/', '', $extension) ?: 'jpg';
        $path = trim($directory, '/').'/'.Str::uuid()->toString().'.'.$extension;
        $contentType = $file->getMimeType() ?: 'application/octet-stream';
        $this->uploadFile($path, file_get_contents($file->getRealPath()) ?: '', $contentType);
        $url = $this->hasCdn() ? $this->cdnUrl($path) : '';

        return [
            'url' => $url,
            'path' => $path,
            // Compatibility aliases for existing admin/mobile forms.
            'secure_url' => $url,
            'public_id' => $path,
        ];
    }

    public function cdnUrl(string $path): string
    {
        $path = $this->normalizePath($path);
        $base = $this->cdnBaseUrl();

        if ($base === '') {
            throw new BunnyStorageException(
                'BUNNY_CDN_URL is not configured.',
                500,
                'config'
            );
        }

        return rtrim($base, '/').'/'.$path;
    }

    public function isBunnyUrl(?string $url): bool
    {
        if (! $url) {
            return false;
        }

        $cdnHost = parse_url($this->cdnBaseUrl(), PHP_URL_HOST);
        $urlHost = parse_url($url, PHP_URL_HOST);

        if ($cdnHost && $urlHost && strcasecmp((string) $cdnHost, (string) $urlHost) === 0) {
            return true;
        }

        return str_contains(strtolower($url), 'b-cdn.net');
    }

    /**
     * Best-effort path extraction for legacy rows that only stored a CDN URL.
     */
    public function extractPathFromUrl(?string $url): ?string
    {
        if (! $url || ! $this->isBunnyUrl($url)) {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path) || $path === '' || $path === '/') {
            return null;
        }

        return $this->normalizePath(rawurldecode($path));
    }

    private function assertConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new BunnyStorageException('Bunny Storage is not configured.', 500, 'config');
        }
    }

    private function authHeaders(): array
    {
        return [
            'AccessKey' => $this->apiKey(),
            'Accept' => 'application/json',
        ];
    }

    private function storageObjectUrl(string $path): string
    {
        $host = rtrim($this->storageHost(), '/');
        $zone = rawurlencode($this->storageZone());
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $path)));

        return "https://{$host}/{$zone}/{$encodedPath}";
    }

    private function normalizePath(string $path): string
    {
        $path = str_replace('\\', '/', trim($path));
        $path = ltrim($path, '/');

        if (str_contains($path, '..')) {
            throw new BunnyStorageException('Invalid Bunny storage path.', 422);
        }

        return $path;
    }

    private function shouldVerifySsl(): bool
    {
        return (bool) config('bunny.verify_ssl', true);
    }

    private function storageZone(): string
    {
        return trim((string) config('bunny.storage_zone'));
    }

    private function apiKey(): string
    {
        return trim((string) config('bunny.storage_api_key'));
    }

    private function storageHost(): string
    {
        $host = trim((string) config('bunny.storage_host', 'storage.bunnycdn.com'));

        return $host !== '' ? $host : 'storage.bunnycdn.com';
    }

    private function cdnBaseUrl(): string
    {
        return rtrim(trim((string) config('bunny.cdn_url')), '/');
    }
}

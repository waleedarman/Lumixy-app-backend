<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Client\PendingRequest;
use RuntimeException;

class FirebaseNotificationService
{
    protected ?string $cachedAccessToken = null;
    protected ?int $cachedAccessTokenExpiresAt = null;

    public function isConfigured(): bool
    {
        return filled(config('services.firebase.project_id'))
            && filled(config('services.firebase.client_email'))
            && filled(config('services.firebase.private_key'));
    }

    /**
     * Public HTTPS image URL for Android large icon / rich notification image.
     * FCM servers must be able to fetch this — localhost / private hosts are skipped.
     */
    protected function notificationImageUrl(): ?string
    {
        $configured = trim((string) config('services.firebase.notification_image_url'));
        $candidate = $configured !== ''
            ? $configured
            : rtrim((string) config('app.url'), '/').'/lumixy-logo.png';

        if (!filter_var($candidate, FILTER_VALIDATE_URL)) {
            return null;
        }

        $parts = parse_url($candidate);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));

        if ($scheme !== 'https') {
            return null;
        }

        if (
            $host === ''
            || $host === 'localhost'
            || $host === '127.0.0.1'
            || str_ends_with($host, '.local')
            || str_starts_with($host, '192.168.')
            || str_starts_with($host, '10.')
        ) {
            return null;
        }

        return $candidate;
    }

    public function sendToUser(
        User $user,
        string $title,
        string $body,
        array $data = []
    ): array {
        $tokens = $user->deviceTokens()->pluck('token');

        return $this->sendToTokens($tokens, $title, $body, $data);
    }

    public function sendToUsers(
        Collection|array $users,
        string $title,
        string $body,
        array $data = []
    ): array {
        $tokens = collect($users)
            ->flatMap(function ($user) {
                return $user->deviceTokens->pluck('token');
            });

        return $this->sendToTokens($tokens, $title, $body, $data);
    }

    public function sendToTokens(
        Collection|array $tokens,
        string $title,
        string $body,
        array $data = []
    ): array {
        if (!$this->isConfigured()) {
            Log::warning('Firebase notification skipped because Firebase service account is not configured.');

            return [
                'sent' => 0,
                'failed' => 0,
                'errors' => ['Firebase is not configured.'],
            ];
        }

        $tokenList = collect($tokens)
            ->filter(fn ($token) => filled($token))
            ->unique()
            ->values();

        if ($tokenList->isEmpty()) {
            return [
                'sent' => 0,
                'failed' => 0,
                'errors' => [],
            ];
        }

        $accessToken = $this->getAccessToken();
        $url = sprintf(
            'https://fcm.googleapis.com/v1/projects/%s/messages:send',
            config('services.firebase.project_id')
        );

        $results = [
            'sent' => 0,
            'failed' => 0,
            'errors' => [],
        ];
        $invalidTokenHashes = [];

        foreach ($tokenList as $token) {
            $messageData = collect($data)
                ->mapWithKeys(fn ($value, $key) => [(string) $key => is_scalar($value) ? (string) $value : json_encode($value)])
                ->all();

            $notificationPayload = [
                'title' => $title,
                'body' => $body,
            ];

            $androidNotification = [
                'channel_id' => 'lumixy-general',
                'sound' => 'default',
                // Drawable resource name (no extension) — white silhouette small icon.
                'icon' => 'notification_icon',
                'color' => '#7C3AED',
            ];

            $imageUrl = $this->notificationImageUrl();
            if ($imageUrl !== null) {
                $notificationPayload['image'] = $imageUrl;
                $androidNotification['image'] = $imageUrl;
            }

            $response = $this->pendingRequest()
                ->withToken($accessToken)
                ->acceptJson()
                ->post($url, [
                    'message' => [
                        'token' => $token,
                        'notification' => $notificationPayload,
                        'data' => $messageData,
                        'android' => [
                            'priority' => 'high',
                            'notification' => $androidNotification,
                        ],
                        'apns' => [
                            'headers' => [
                                'apns-priority' => '10',
                            ],
                            'payload' => [
                                'aps' => [
                                    'sound' => 'default',
                                ],
                            ],
                        ],
                    ],
                ]);

            if ($response->successful()) {
                $results['sent']++;
                continue;
            }

            $results['failed']++;
            $errorPayload = $response->json('error') ?? [];
            $errorMessage = (string) ($response->json('error.message') ?: 'Firebase rejected the notification.');

            $results['errors'][] = $errorMessage;

            if ($this->isInvalidTokenError($errorPayload, $errorMessage)) {
                $invalidTokenHashes[] = hash('sha256', (string) $token);
            }
        }

        if ($invalidTokenHashes !== []) {
            DeviceToken::query()
                ->whereIn('token_hash', array_values(array_unique($invalidTokenHashes)))
                ->delete();
        }

        return $results;
    }

    protected function getAccessToken(): string
    {
        if (
            $this->cachedAccessToken
            && $this->cachedAccessTokenExpiresAt
            && now()->timestamp < ($this->cachedAccessTokenExpiresAt - 60)
        ) {
            return $this->cachedAccessToken;
        }

        $clientEmail = config('services.firebase.client_email');
        $privateKey = str_replace('\n', "\n", (string) config('services.firebase.private_key'));
        $now = now()->timestamp;

        $claims = [
            'iss' => $clientEmail,
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ];

        $jwt = $this->createJwt($claims, $privateKey);

        $response = $this->pendingRequest()
            ->asForm()
            ->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        if (!$response->successful()) {
            throw new RuntimeException('Unable to fetch Firebase access token (HTTP '.$response->status().').');
        }

        $this->cachedAccessToken = $response->json('access_token');
        $this->cachedAccessTokenExpiresAt = $now + (int) $response->json('expires_in', 3600);

        return (string) $this->cachedAccessToken;
    }

    protected function pendingRequest(): PendingRequest
    {
        $request = Http::acceptJson()->connectTimeout(5)->timeout(15);

        if (!config('services.firebase.verify_ssl')) {
            $request = $request->withoutVerifying();
        }

        return $request;
    }

    protected function createJwt(array $claims, string $privateKey): string
    {
        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT',
        ]));

        $payload = $this->base64UrlEncode(json_encode($claims));
        $signatureInput = $header . '.' . $payload;

        $signature = '';
        $key = openssl_pkey_get_private($privateKey);

        if (!$key || !openssl_sign($signatureInput, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Unable to sign Firebase JWT.');
        }

        return $signatureInput . '.' . $this->base64UrlEncode($signature);
    }

    protected function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    protected function isInvalidTokenError(array $errorPayload, ?string $errorMessage = null): bool
    {
        $status = strtoupper((string) ($errorPayload['status'] ?? ''));
        $normalizedMessage = strtoupper((string) $errorMessage);
        $detailCodes = collect($errorPayload['details'] ?? [])
            ->filter(fn ($detail) => is_array($detail))
            ->map(fn ($detail) => strtoupper((string) ($detail['errorCode'] ?? '')))
            ->filter()
            ->values()
            ->all();

        if ($status === 'UNREGISTERED' || in_array('UNREGISTERED', $detailCodes, true)) {
            return true;
        }

        return str_contains($normalizedMessage, 'UNREGISTERED')
            || str_contains($normalizedMessage, 'REGISTRATION TOKEN IS NOT A VALID FCM REGISTRATION TOKEN')
            || (
                in_array('INVALID_ARGUMENT', $detailCodes, true)
                && str_contains($normalizedMessage, 'REGISTRATION TOKEN')
            );
    }
}

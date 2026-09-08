<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class FirebaseIdentityService
{
    public function verifyIdToken(string $idToken): array
    {
        $apiKey = (string) config('services.firebase.api_key');

        if ($apiKey === '') {
            throw new RuntimeException('Firebase API key is not configured.');
        }

        $response = $this->http()
            ->post(sprintf('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=%s', $apiKey), [
                'idToken' => $idToken,
            ]);

        if ($response->failed()) {
            throw new RuntimeException($response->json('error.message') ?: 'Failed to verify Firebase identity.');
        }

        $user = $response->json('users.0');

        if (!is_array($user) || empty($user['localId']) || empty($user['email'])) {
            throw new RuntimeException('Invalid Firebase user payload.');
        }

        return [
            'firebase_uid' => (string) $user['localId'],
            'email' => (string) $user['email'],
            'full_name' => (string) ($user['displayName'] ?? ''),
            'avatar_url' => isset($user['photoUrl']) ? (string) $user['photoUrl'] : null,
            'phone' => isset($user['phoneNumber']) ? (string) $user['phoneNumber'] : null,
            'email_verified' => (bool) ($user['emailVerified'] ?? false),
            'provider_ids' => array_values(
                array_filter(
                    array_map(
                        static fn ($entry) => is_array($entry) ? ($entry['providerId'] ?? null) : null,
                        $user['providerUserInfo'] ?? []
                    )
                )
            ),
        ];
    }

    protected function http(): PendingRequest
    {
        $request = Http::acceptJson()->asJson()->timeout(20);

        if (!config('services.firebase.verify_ssl', true)) {
            $request = $request->withoutVerifying();
        }

        return $request;
    }
}

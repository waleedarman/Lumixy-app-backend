<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CatalogBootstrapService;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class BootstrapController extends Controller
{
    public function __construct(
        protected CatalogBootstrapService $catalog,
    ) {}

    /**
     * Combined app startup payload. Public catalog is cache-backed;
     * private user/notification data is never shared across users.
     */
    public function __invoke(Request $request)
    {
        $user = $this->resolveBearerUser($request);
        $role = $this->resolveRole($user);

        $providers = $this->catalog->providersPage(1);
        $providersArray = is_array($providers)
            ? $providers
            : (method_exists($providers, 'toArray') ? $providers->toArray() : (array) $providers);

        $public = [
            'cities' => $this->catalog->cities(),
            'categories' => $this->catalog->categories(),
            'promotions' => $this->catalog->promotionsPayload(),
            'providers' => $providersArray['data'] ?? [],
            'providers_meta' => [
                'current_page' => (int) ($providersArray['current_page'] ?? 1),
                'last_page' => (int) ($providersArray['last_page'] ?? 1),
                'per_page' => (int) ($providersArray['per_page'] ?? 12),
                'total' => (int) ($providersArray['total'] ?? 0),
                'has_more' => ((int) ($providersArray['current_page'] ?? 1)) < ((int) ($providersArray['last_page'] ?? 1)),
            ],
            'app_contact' => $this->catalog->appContact(),
        ];

        $etagSeed = [
            'v' => $this->catalog->publicCatalogVersionToken(),
            'role' => $role,
            'user_id' => $user?->id,
        ];

        $payload = [
            'role' => $role,
            'server_time' => now()->toISOString(),
            'catalog' => $public,
            'user' => null,
            'notifications' => [],
            'unread_count' => 0,
        ];

        if ($user && $role === 'provider' && $user->tokenCan('provider')) {
            $payload['user'] = $this->catalog->slimProviderUser($user);
            $notifications = $this->catalog->notificationsPayload($user);
            $payload['notifications'] = $notifications['notifications'];
            $payload['unread_count'] = $notifications['unread_count'];
            $etagSeed['notif'] = $notifications['unread_count'].':'.count($notifications['notifications']);
            if ($notifications['notifications'] !== []) {
                $etagSeed['notif_latest'] = $notifications['notifications'][0]['created_at'] ?? null;
            }
        } elseif ($user && $role === 'admin' && $user->tokenCan('admin')) {
            $payload['user'] = $this->catalog->slimAdminUser($user);
            $notifications = $this->catalog->notificationsPayload($user);
            $payload['notifications'] = $notifications['notifications'];
            $payload['unread_count'] = $notifications['unread_count'];
            $etagSeed['notif'] = $notifications['unread_count'].':'.count($notifications['notifications']);
            if ($notifications['notifications'] !== []) {
                $etagSeed['notif_latest'] = $notifications['notifications'][0]['created_at'] ?? null;
            }
            // Admins still get public catalog for mobile consistency; private admin trees stay on admin endpoints.
        }

        $etag = '"'.hash('sha256', json_encode($etagSeed)).'"';

        if ($request->headers->get('If-None-Match') === $etag) {
            return response('', 304)->setEtag(trim($etag, '"'));
        }

        return response()
            ->json($payload, 200, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
            ->setEtag(trim($etag, '"'));
    }

    protected function resolveBearerUser(Request $request): ?\App\Models\User
    {
        $header = (string) $request->header('Authorization', '');
        if (! str_starts_with($header, 'Bearer ')) {
            return null;
        }

        $plain = trim(substr($header, 7));
        if ($plain === '') {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($plain);
        if (! $accessToken) {
            return null;
        }

        $tokenable = $accessToken->tokenable;
        if (! $tokenable instanceof \App\Models\User) {
            return null;
        }

        // Attach token so tokenCan() works for role abilities.
        $tokenable->withAccessToken($accessToken);

        return $tokenable;
    }

    protected function resolveRole(?\App\Models\User $user): string
    {
        if (! $user) {
            return 'guest';
        }

        return match ($user->role) {
            'provider' => 'provider',
            'admin' => 'admin',
            default => 'guest',
        };
    }
}

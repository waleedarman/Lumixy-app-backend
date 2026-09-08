<?php

namespace App\Services;

use App\Models\City;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class PcbsCitySyncService
{
    private const ARCGIS_GOVERNORATES_URL = 'https://services8.arcgis.com/x3OYmfTujNHGdoex/ArcGIS/rest/services/Dissmenation_layer/FeatureServer/1/query';

    private const ARCGIS_LOCALITIES_URL = 'https://services8.arcgis.com/x3OYmfTujNHGdoex/ArcGIS/rest/services/Dissmenation_layer/FeatureServer/0/query';

    private const LOCALITIES_PAGE_SIZE = 2000;

    private const GOVERNORATE_NAME_ALIASES = [
        'رام الله والبيرة' => ['رام الله والبيرة', 'رام الله'],
        'أريحا والأغوار' => ['أريحا والأغوار', 'أريحا'],
    ];

    public function sync(): array
    {
        $governorates = $this->fetchGovernorates();
        $localities = $this->fetchAllLocalities()->groupBy('gov_code');

        $results = [
            'parents_created' => 0,
            'parents_updated' => 0,
            'localities_created' => 0,
            'localities_updated' => 0,
            'villages_created' => 0,
            'villages_updated' => 0,
            'total_governorates' => count($governorates),
            'total_localities' => $localities->flatten(1)->count(),
            'source' => 'pcbs-arcgis',
        ];

        DB::transaction(function () use ($governorates, $localities, &$results) {
            foreach ($governorates as $index => $governorate) {
                $parent = $this->syncGovernorateParent($governorate, $index, $results);

                foreach ($localities->get($governorate['code'], collect()) as $locality) {
                    $this->syncLocality($parent, $locality, $results);
                }
            }
        });

        $results['villages_created'] = $results['localities_created'];
        $results['villages_updated'] = $results['localities_updated'];

        return $results;
    }

    /**
     * @return list<array{code:string,name_ar:string,name_en:?string}>
     */
    private function fetchGovernorates(): array
    {
        $payload = $this->httpJson(self::ARCGIS_GOVERNORATES_URL, [
            'where' => '1=1',
            'outFields' => 'NAME_AR,NAME_EN,GOV_CODE',
            'returnGeometry' => 'false',
            'f' => 'json',
        ]);

        $features = $payload['features'] ?? [];

        return array_map(function (array $feature) {
            $attributes = $feature['attributes'] ?? [];

            return [
                'code' => trim((string) ($attributes['GOV_CODE'] ?? '')),
                'name_ar' => trim((string) ($attributes['NAME_AR'] ?? '')),
                'name_en' => trim((string) ($attributes['NAME_EN'] ?? '')) ?: null,
            ];
        }, array_values(array_filter($features, function (array $feature) {
            $attributes = $feature['attributes'] ?? [];

            return ! empty($attributes['GOV_CODE']) && ! empty($attributes['NAME_AR']);
        })));
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{external_code:string,name_ar:string,name_en:?string,gov_code:string}>
     */
    private function fetchAllLocalities(): Collection
    {
        $rows = collect();
        $offset = 0;

        while (true) {
            $payload = $this->httpJson(self::ARCGIS_LOCALITIES_URL, [
                'where' => '1=1',
                'outFields' => 'LOCCODE,NAMEAR,NAMEEN,GOVCODE',
                'returnGeometry' => 'false',
                'f' => 'json',
                'resultOffset' => $offset,
                'resultRecordCount' => self::LOCALITIES_PAGE_SIZE,
            ]);

            $features = $payload['features'] ?? [];
            if ($features === []) {
                break;
            }

            $pageRows = collect($features)
                ->map(function (array $feature) {
                    $attributes = $feature['attributes'] ?? [];

                    return [
                        'external_code' => trim((string) ($attributes['LOCCODE'] ?? '')),
                        'name_ar' => trim((string) ($attributes['NAMEAR'] ?? '')),
                        'name_en' => trim((string) ($attributes['NAMEEN'] ?? '')) ?: null,
                        'gov_code' => trim((string) ($attributes['GOVCODE'] ?? '')),
                    ];
                })
                ->filter(fn (array $row) => $row['external_code'] !== '' && $row['name_ar'] !== '' && $row['gov_code'] !== '');

            $rows = $rows->concat($pageRows);

            if (count($features) < self::LOCALITIES_PAGE_SIZE) {
                break;
            }

            $offset += self::LOCALITIES_PAGE_SIZE;
        }

        return $rows
            ->unique('external_code')
            ->values();
    }

    /**
     * @param array{code:string,name_ar:string,name_en:?string} $governorate
     */
    private function syncGovernorateParent(array $governorate, int $index, array &$results): City
    {
        $city = City::query()
            ->whereNull('parent_id')
            ->where('external_code', $governorate['code'])
            ->first();

        if (! $city) {
            $aliases = $this->governorateAliases($governorate['name_ar']);

            $city = City::query()
                ->whereNull('parent_id')
                ->whereIn('name', $aliases)
                ->first();
        }

        $isNew = ! $city;

        if ($isNew) {
            $city = new City();
            $city->sort_order = $index;
            $city->is_active = true;
            $results['parents_created'] += 1;
        } else {
            $results['parents_updated'] += 1;
        }

        if (! $city->exists || $city->external_code !== $governorate['code']) {
            $city->external_code = $governorate['code'];
        }

        if (! $city->exists) {
            $city->name = $this->preferredGovernorateDisplayName($governorate['name_ar']);
        }

        $city->is_active = true;
        $city->save();

        return $city;
    }

    /**
     * @param array{external_code:string,name_ar:string,name_en:?string,gov_code:string} $locality
     */
    private function syncLocality(City $parent, array $locality, array &$results): void
    {
        $city = City::query()
            ->where('external_code', $locality['external_code'])
            ->first();

        if (! $city) {
            $city = City::query()
                ->where('parent_id', $parent->id)
                ->where('name', $locality['name_ar'])
                ->first();
        }

        $isNew = ! $city;

        if ($isNew) {
            $city = new City();
            $results['localities_created'] += 1;
        } else {
            $results['localities_updated'] += 1;
        }

        $city->name = $locality['name_ar'];
        $city->parent_id = $parent->id;
        $city->external_code = $locality['external_code'];
        $city->is_active = true;

        if (! $city->exists) {
            $city->sort_order = 0;
        }

        $city->save();
    }

    private function preferredGovernorateDisplayName(string $name): string
    {
        return $this->governorateAliases($name)[0] ?? $name;
    }

    /**
     * @return list<string>
     */
    private function governorateAliases(string $name): array
    {
        return self::GOVERNORATE_NAME_ALIASES[$name] ?? [$name];
    }

    /**
     * @return array<string, mixed>
     */
    private function httpJson(string $url, array $query): array
    {
        $response = $this->httpClient()
            ->acceptJson()
            ->timeout(60)
            ->retry(2, 750)
            ->get($url, $query)
            ->throw();

        $payload = $response->json();

        if (! is_array($payload)) {
            throw new RuntimeException("Invalid JSON payload from {$url}");
        }

        return $payload;
    }

    private function httpClient()
    {
        return Http::withOptions([
            'verify' => (bool) config('services.pcbs.verify_ssl', true),
        ]);
    }
}

<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\ProviderApplication;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\ServiceSubcategory;
use App\Models\User;
use App\Support\ProviderAvatar;
use App\Support\PublicApiCache;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProviderDemoSeeder extends Seeder
{
    /**
     * @return array{
     *   categories: list<ServiceCategory>,
     *   cities: list<City>,
     *   subcategories: list<ServiceSubcategory>
     * }
     */
    protected function ensureReferenceData(): array
    {
        $categoryDefinitions = [
            ['name' => 'تنظيف المنازل', 'icon' => null, 'services' => ['تنظيف عميق', 'تنظيف أسبوعي', 'تنظيف ما بعد البناء']],
            ['name' => 'صيانة كهربائية', 'icon' => null, 'services' => ['تمديدات كهربائية', 'إصلاح أعطال', 'تركيب إنارة']],
            ['name' => 'سباكة', 'icon' => null, 'services' => ['كشف تسربات', 'تركيب مواسير', 'صيانة سخانات']],
            ['name' => 'نجارة', 'icon' => null, 'services' => ['أثاث مخصص', 'تركيب أبواب', 'صيانة خشب']],
            ['name' => 'دهان', 'icon' => null, 'services' => ['دهان داخلي', 'دهان خارجي', 'ديكور جدران']],
        ];

        $categories = [];
        $subcategories = [];

        foreach ($categoryDefinitions as $index => $definition) {
            $category = ServiceCategory::query()->firstOrCreate(
                ['name' => $definition['name']],
                [
                    'icon' => $definition['icon'],
                    'is_active' => true,
                    'sort_order' => $index + 1,
                ]
            );

            $categories[] = $category;

            foreach ($definition['services'] as $serviceIndex => $serviceName) {
                $subcategories[] = ServiceSubcategory::query()->firstOrCreate(
                    [
                        'service_category_id' => $category->id,
                        'name' => $serviceName,
                    ],
                    [
                        'is_active' => true,
                        'sort_order' => $serviceIndex + 1,
                    ]
                );
            }
        }

        $cityDefinitions = [
            ['name' => 'رام الله', 'children' => ['البيرة', 'بيتونيا']],
            ['name' => 'نابلس', 'children' => ['بلاطة', 'عسكر']],
            ['name' => 'الخليل', 'children' => ['حالة', 'دورا']],
            ['name' => 'بيت لحم', 'children' => ['بيت جالا', 'الخضر']],
        ];

        $cities = [];

        foreach ($cityDefinitions as $index => $definition) {
            $parent = City::query()->firstOrCreate(
                ['name' => $definition['name'], 'parent_id' => null],
                [
                    'is_active' => true,
                    'sort_order' => $index + 1,
                ]
            );

            $cities[] = $parent;

            foreach ($definition['children'] as $childIndex => $childName) {
                $cities[] = City::query()->firstOrCreate(
                    ['name' => $childName, 'parent_id' => $parent->id],
                    [
                        'is_active' => true,
                        'sort_order' => $childIndex + 1,
                    ]
                );
            }
        }

        return [
            'categories' => $categories,
            'cities' => $cities,
            'subcategories' => $subcategories,
        ];
    }

    /**
     * @param  list<string>  $names
     * @return list<array<string, mixed>>
     */
    protected function buildProviderDefinitions(array $names): array
    {
        $definitions = [];

        foreach ($names as $index => $name) {
            $number = $index + 1;
            $slug = str_pad((string) $number, 2, '0', STR_PAD_LEFT);

            $definitions[] = [
                'full_name' => $name,
                'email' => "provider{$slug}@lumixy.test",
                'phone' => '059'.str_pad((string) (7000000 + $number), 7, '0', STR_PAD_LEFT),
                'status' => $index < 16 ? 'active' : 'inactive',
                'application_status' => match (true) {
                    $index < 16 => 'approved',
                    $index < 20 => 'pending',
                    default => 'rejected',
                },
                'is_featured' => $index % 5 === 0,
                'subscription_active' => $index < 14,
                'bio' => "مزود خدمات محترف في Lumixy — {$name}.",
            ];
        }

        return $definitions;
    }

    public function run(int $count = 20, string $password = 'LumixyProvider123!'): void
    {
        $reference = $this->ensureReferenceData();
        $categories = $reference['categories'];
        $cities = collect($reference['cities'])->filter(fn (City $city) => $city->parent_id !== null)->values();
        $subcategories = collect($reference['subcategories']);
        $reviewerId = User::query()->where('role', 'admin')->value('id');

        $names = [
            'محمود الخطيب',
            'أحمد ناصر',
            'سارة عودة',
            'يوسف حمدان',
            'ليلى برغوث',
            'كريم سلامة',
            'نور الدين جابر',
            'رنا المصري',
            'طارق قاسم',
            'هبة الشريف',
            'وليد عمر',
            'ميساء زيدان',
            'بلال حجazi',
            'دiana freij',
            'عمر خليل',
            'فاطمة نجار',
            'زياد عوad',
            'سماح رimawi',
            'إيad barakat',
            'حسام abu khalil',
        ];

        $definitions = $this->buildProviderDefinitions(array_slice($names, 0, $count));
        $created = 0;
        $skipped = 0;

        DB::transaction(function () use (
            $definitions,
            $password,
            $categories,
            $cities,
            $subcategories,
            $reviewerId,
            &$created,
            &$skipped,
        ) {
            foreach ($definitions as $index => $definition) {
                if (User::query()->where('email', mb_strtolower($definition['email']))->exists()) {
                    $skipped++;
                    continue;
                }

                $category = $categories[$index % count($categories)];
                $city = $cities[$index % max(1, $cities->count())];
                $service = $subcategories
                    ->where('service_category_id', $category->id)
                    ->values()
                    ->get($index % max(1, $subcategories->where('service_category_id', $category->id)->count()));

                if (! $service) {
                    $service = $subcategories->get($index % max(1, $subcategories->count()));
                }

                $user = new User([
                    'full_name' => $definition['full_name'],
                    'email' => mb_strtolower($definition['email']),
                    'phone' => $definition['phone'],
                    'password' => Hash::make($password),
                ]);
                $user->forceFill([
                    'role' => 'provider',
                    'status' => $definition['status'],
                ])->save();

                $startAt = now()->startOfDay();
                $endAt = $startAt->copy()->addMonthNoOverflow()->endOfDay();

                $profile = $user->providerProfile()->create([
                    'provider_name' => $definition['full_name'],
                    'profile_image' => ProviderAvatar::placeholderUrl($definition['full_name']),
                    'bio' => $definition['bio'],
                    'category_id' => $category->id,
                    'city_id' => $city->id,
                    'whatsapp_number' => $definition['phone'],
                    'instagram_username' => 'lumixy_provider_'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT),
                    'latitude' => 31.9 + (($index % 10) * 0.01),
                    'longitude' => 35.2 + (($index % 10) * 0.01),
                    'onboarding_step' => 4,
                ]);

                $profile->forceFill([
                    'is_featured' => $definition['is_featured'],
                    'subscription_type' => $definition['is_featured'] ? 'featured' : 'standard',
                    'subscription_started_at' => $definition['subscription_active'] ? $startAt : $startAt->copy()->subMonths(3),
                    'subscription_ends_at' => $definition['subscription_active']
                        ? $endAt
                        : $startAt->copy()->subMonth()->endOfDay(),
                    'is_profile_completed' => true,
                ])->save();

                if ($service) {
                    $profile->subServices()->syncWithoutDetaching([$service->id]);
                }

                ProviderApplication::query()->create([
                    'provider_profile_id' => $profile->id,
                    'application_status' => $definition['application_status'],
                    'submitted_at' => now()->subDays($index + 1),
                    'reviewed_at' => $definition['application_status'] === 'pending'
                        ? null
                        : now()->subDays($index),
                    'reviewed_by' => $definition['application_status'] === 'pending' ? null : $reviewerId,
                    'notes' => $definition['application_status'] === 'rejected'
                        ? 'بيانات غير مكتملة'
                        : null,
                ]);

                $created++;
            }
        });

        PublicApiCache::flushProviders();

        $this->command?->info("Created {$created} provider account(s).");
        if ($skipped > 0) {
            $this->command?->warn("Skipped {$skipped} existing email(s).");
        }
        $this->command?->line('Default password: '.$password);
        $this->command?->line('Emails: provider01@lumixy.test … provider'.str_pad((string) $count, 2, '0', STR_PAD_LEFT).'@lumixy.test');
    }
}

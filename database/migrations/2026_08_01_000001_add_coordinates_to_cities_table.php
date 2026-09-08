<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Approximate centroids for Palestinian governorates. Villages inherit their
     * parent governorate coordinates until a more precise value is provided.
     */
    private const GOVERNORATE_COORDINATES = [
        'أريحا والأغوار' => [31.8611, 35.4597],
        'الخليل' => [31.5326, 35.0998],
        'القدس' => [31.7683, 35.2137],
        'بيت لحم' => [31.7054, 35.2024],
        'جنين' => [32.4597, 35.3000],
        'خانيونس' => [31.3400, 34.3060],
        'دير البلح' => [31.4183, 34.3517],
        'رام الله' => [31.9038, 35.2034],
        'رفح' => [31.2969, 34.2436],
        'سلفيت' => [32.0850, 35.1800],
        'شمال غزة' => [31.5500, 34.5000],
        'طوباس' => [32.3211, 35.3689],
        'طولكرم' => [32.3104, 35.0286],
        'غزة' => [31.5017, 34.4668],
        'قلقيلية' => [32.1897, 34.9706],
        'نابلس' => [32.2211, 35.2544],
    ];

    public function up(): void
    {
        Schema::table('cities', function (Blueprint $table) {
            $table->double('latitude')->nullable()->after('name');
            $table->double('longitude')->nullable()->after('latitude');
        });

        foreach (self::GOVERNORATE_COORDINATES as $name => [$latitude, $longitude]) {
            DB::table('cities')
                ->where('name', $name)
                ->whereNull('parent_id')
                ->update([
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                ]);
        }

        // Copy parent coordinates to children. Avoid MySQL-only UPDATE...JOIN aliases
        // so sqlite (phpunit) and MySQL both succeed.
        $parents = DB::table('cities')
            ->whereNull('parent_id')
            ->whereNotNull('latitude')
            ->get(['id', 'latitude', 'longitude']);

        foreach ($parents as $parent) {
            DB::table('cities')
                ->where('parent_id', $parent->id)
                ->whereNull('latitude')
                ->update([
                    'latitude' => $parent->latitude,
                    'longitude' => $parent->longitude,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('cities', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
};

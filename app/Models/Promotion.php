<?php

namespace App\Models;

use App\Support\MediaUrl;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    public const ACTION_NONE = 'none';
    public const ACTION_EXTERNAL_URL = 'external_url';
    public const ACTION_IN_APP = 'in_app_screen';
    public const ACTION_PROVIDER = 'provider_profile';
    public const ACTION_CATEGORY = 'category';
    public const ACTION_SUB_SERVICE = 'sub_service';

    protected $fillable = [
        'title',
        'description',
        'image',
        'mobile_image',
        'image_path',
        'mobile_image_path',
        'button_text',
        'action_type',
        'action_value',
        'display_order',
        'is_active',
        'show_sponsored_badge',
        'show_section_title',
        'start_date',
        'end_date',
        'click_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'show_sponsored_badge' => 'boolean',
        'show_section_title' => 'boolean',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'display_order' => 'integer',
        'click_count' => 'integer',
    ];

    protected $hidden = [
        'image_path',
        'mobile_image_path',
    ];

    public function getImageAttribute($value): ?string
    {
        return MediaUrl::publicAsset($value);
    }

    public function getMobileImageAttribute($value): ?string
    {
        return MediaUrl::publicAsset($value);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('display_order')->orderByDesc('created_at');
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        $now = now();

        return $query
            ->where('is_active', true)
            ->whereNotNull('image')
            ->where('image', '!=', '')
            ->where(function (Builder $inner) use ($now) {
                $inner->whereNull('start_date')->orWhere('start_date', '<=', $now);
            })
            ->where(function (Builder $inner) use ($now) {
                $inner->whereNull('end_date')->orWhere('end_date', '>=', $now);
            });
    }

    public function isCurrentlyVisible(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $rawImage = $this->getRawOriginal('image');
        if (! is_string($rawImage) || trim($rawImage) === '') {
            return false;
        }

        $now = now();

        if ($this->start_date instanceof Carbon && $this->start_date->isFuture()) {
            return false;
        }

        if ($this->end_date instanceof Carbon && $this->end_date->isPast()) {
            return false;
        }

        return true;
    }

    public static function actionTypes(): array
    {
        return [
            self::ACTION_NONE,
            self::ACTION_EXTERNAL_URL,
            self::ACTION_IN_APP,
            self::ACTION_PROVIDER,
            self::ACTION_CATEGORY,
            self::ACTION_SUB_SERVICE,
        ];
    }
}

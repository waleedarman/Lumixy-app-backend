<?php

namespace App\Models;

use App\Support\MediaUrl;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProviderProfile extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'provider_name',
        'profile_image',
        'profile_image_path',
        'bio',
        'category_id',
        'city_id',
        'latitude',
        'longitude',
        'whatsapp_number',
        'instagram_username',
        'facebook_url',
        'onboarding_step',
    ];

    protected $hidden = [
        'profile_image_path',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_publicly_visible' => 'boolean',
        'subscription_started_at' => 'datetime',
        'subscription_ends_at' => 'datetime',
        'is_profile_completed' => 'boolean',
    ];

    protected $appends = [
        'subscription_status',
        'is_subscription_active',
        'subscription_days_remaining',
        'is_subscription_expired',
        'is_currently_featured',
        'needs_subscription_renewal',
        'gallery_limit',
    ];

    public function getProfileImageAttribute($value)
    {
        return MediaUrl::publicAsset($value);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function gallery()
    {
        return $this->hasMany(ProviderGallery::class);
    }

    public function applications()
    {
        return $this->hasMany(ProviderApplication::class);
    }

    public function latestApplication()
    {
        return $this->hasOne(ProviderApplication::class)->latestOfMany('submitted_at');
    }

    public function category()
    {
        return $this->belongsTo(ServiceCategory::class, 'category_id');
    }

    public function city()
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function subServices()
    {
        return $this->belongsToMany(
            ServiceSubcategory::class,
            'provider_profile_service_subcategory'
        )->withTimestamps();
    }

    public function getSubscriptionStatusAttribute(): string
    {
        if (
            ! ($this->subscription_started_at instanceof Carbon)
            && ! ($this->subscription_ends_at instanceof Carbon)
        ) {
            return 'not_subscribed';
        }

        if ($this->subscription_started_at instanceof Carbon && $this->subscription_started_at->isFuture()) {
            return 'scheduled';
        }

        if ($this->subscription_ends_at instanceof Carbon && $this->subscription_ends_at->isPast()) {
            return 'expired';
        }

        return 'active';
    }

    public function getIsSubscriptionActiveAttribute(): bool
    {
        return $this->subscription_status === 'active';
    }

    public function getSubscriptionDaysRemainingAttribute(): ?int
    {
        if (! $this->is_subscription_active || ! ($this->subscription_ends_at instanceof Carbon)) {
            return null;
        }

        return max(
            0,
            now()->startOfDay()->diffInDays($this->subscription_ends_at->copy()->startOfDay(), false)
        );
    }

    public function getIsSubscriptionExpiredAttribute(): bool
    {
        return $this->subscription_status === 'expired';
    }

    public function getIsCurrentlyFeaturedAttribute(): bool
    {
        return $this->is_featured && $this->is_subscription_active;
    }

    public function getNeedsSubscriptionRenewalAttribute(): bool
    {
        return $this->is_subscription_expired;
    }

    public function getGalleryLimitAttribute(): int
    {
        return \App\Support\ProviderGalleryLimit::maxFor($this);
    }
}

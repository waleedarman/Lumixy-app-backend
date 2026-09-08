<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Support\MediaUrl;
use App\Support\ProviderGalleryLimit;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Validation\ValidationException;

class ProviderGallery extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $table = 'provider_gallery';

    protected $fillable = [
        'provider_profile_id',
        'image_url',
        'image_path',
        'sort_order',
    ];

    protected $hidden = [
        'image_path',
    ];

    protected static function booted(): void
    {
        static::creating(function (ProviderGallery $gallery): void {
            $profile = ProviderProfile::find($gallery->provider_profile_id);
            $max = ProviderGalleryLimit::maxFor($profile);
            $count = static::query()
                ->where('provider_profile_id', $gallery->provider_profile_id)
                ->count();

            if ($count >= $max) {
                throw ValidationException::withMessages([
                    'image' => [ProviderGalleryLimit::message($max)],
                ]);
            }
        });
    }

    public function getImageUrlAttribute($value)
    {
        return MediaUrl::publicAsset($value);
    }

    public function providerProfile()
    {
        return $this->belongsTo(ProviderProfile::class);
    }
}

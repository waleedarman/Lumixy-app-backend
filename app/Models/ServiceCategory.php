<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ServiceCategory extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['name', 'icon', 'is_active', 'sort_order'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function providerProfiles()
    {
        return $this->hasMany(ProviderProfile::class, 'category_id');
    }

    public function subcategories()
    {
        return $this->hasMany(ServiceSubcategory::class, 'service_category_id');
    }
}

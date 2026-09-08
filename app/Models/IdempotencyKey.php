<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdempotencyKey extends Model
{
    protected $fillable = [
        'user_id', 'key', 'route', 'request_hash', 'status_code', 'response_body', 'expires_at',
    ];

    protected $casts = [
        'response_body' => 'encrypted',
        'expires_at' => 'datetime',
    ];
}

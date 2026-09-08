<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppContactSetting extends Model
{
    protected $fillable = [
        'whatsapp_number',
        'phone_number',
        'instagram_username',
        'whatsapp_activation_message',
        'whatsapp_renewal_message',
    ];
}

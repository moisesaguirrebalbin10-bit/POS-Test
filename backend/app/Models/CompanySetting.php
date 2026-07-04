<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    protected $fillable = [
        'name', 'ruc', 'phone', 'address', 'slogan', 'logo_path', 'igv_percent',
        'tip_enabled', 'default_tip', 'voucher_series', 'voucher_start_number', 'ticket_width',
    ];

    protected $casts = [
        'igv_percent' => 'decimal:2',
        'tip_enabled' => 'boolean',
        'default_tip' => 'decimal:2',
    ];
}


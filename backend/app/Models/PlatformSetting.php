<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = ['default_currency', 'default_igv_percent', 'trial_days'];

    protected $casts = [
        'default_igv_percent' => 'decimal:2',
        'trial_days' => 'integer',
    ];

    public static function current(): self
    {
        return self::firstOrCreate(['id' => 1], ['default_currency' => 'PEN', 'default_igv_percent' => 18, 'trial_days' => 14]);
    }
}

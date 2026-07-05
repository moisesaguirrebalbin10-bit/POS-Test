<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformActivityLog extends Model
{
    const UPDATED_AT = null;

    protected $fillable = ['platform_admin_id', 'admin_name', 'module', 'action', 'description'];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(PlatformAdmin::class, 'platform_admin_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    const UPDATED_AT = null;

    protected $fillable = ['user_id', 'user_name', 'module', 'action', 'description'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

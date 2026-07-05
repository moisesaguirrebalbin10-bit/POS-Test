<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use BelongsToCompany;

    const UPDATED_AT = null;

    protected $fillable = ['user_id', 'user_name', 'module', 'action', 'description'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PlatformPermission extends Model
{
    protected $fillable = ['key', 'module', 'label'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(PlatformRole::class, 'platform_role_permission', 'platform_permission_id', 'platform_role_id');
    }
}

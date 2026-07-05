<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PlatformRole extends Model
{
    protected $fillable = ['name', 'description'];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(PlatformPermission::class, 'platform_role_permission', 'platform_role_id', 'platform_permission_id');
    }

    public function admins(): BelongsToMany
    {
        return $this->belongsToMany(PlatformAdmin::class, 'platform_admin_role', 'platform_role_id', 'platform_admin_id');
    }
}

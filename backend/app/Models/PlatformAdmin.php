<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class PlatformAdmin extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'active'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['active' => 'boolean', 'password' => 'hashed'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(PlatformRole::class, 'platform_admin_role', 'platform_admin_id', 'platform_role_id');
    }

    public function hasPermission(string $key): bool
    {
        return $this->roles()->whereHas('permissions', fn ($query) => $query->where('key', $key))->exists();
    }
}

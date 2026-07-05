<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use BelongsToCompany, HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = ['name', 'email', 'password', 'active'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['active' => 'boolean', 'password' => 'hashed'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function hasPermission(string $key): bool
    {
        return $this->roles()
            ->where('roles.active', true)
            ->whereHas('permissions', fn ($query) => $query->where('key', $key))
            ->exists();
    }
}


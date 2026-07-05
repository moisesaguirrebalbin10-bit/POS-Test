<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = ['key', 'name', 'price', 'billing_period', 'max_users', 'max_warehouses', 'active'];

    protected $casts = [
        'price' => 'decimal:2',
        'active' => 'boolean',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function companies(): HasMany
    {
        return $this->hasMany(Company::class);
    }

    public function hasFeature(string $key): bool
    {
        return $this->permissions()->where('key', $key)->exists();
    }
}

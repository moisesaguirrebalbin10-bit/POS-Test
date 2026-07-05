<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Role extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = ['name', 'description', 'active'];
    protected $casts = ['active' => 'boolean'];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }
}


<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IngredientCategory extends Model
{
    use BelongsToCompany;

    protected $fillable = ['name', 'icon'];

    public function ingredients(): HasMany
    {
        return $this->hasMany(Ingredient::class);
    }
}

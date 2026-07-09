<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Recipe extends Model
{
    use BelongsToCompany;

    protected $fillable = ['product_id', 'kind', 'is_general'];

    protected $casts = ['is_general' => 'boolean'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function recipeIngredients(): HasMany
    {
        return $this->hasMany(RecipeIngredient::class);
    }

    public function costTotal(): float
    {
        return round((float) $this->recipeIngredients->sum(fn (RecipeIngredient $ri) => (float) $ri->quantity * (float) $ri->ingredient->cost), 2);
    }

    public function foodCostPercent(): ?float
    {
        $price = (float) $this->product->sale_price;

        return $price > 0 ? round($this->costTotal() / $price * 100, 1) : null;
    }

    public function margin(): float
    {
        return round((float) $this->product->sale_price - $this->costTotal(), 2);
    }
}

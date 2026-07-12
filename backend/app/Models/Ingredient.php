<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ingredient extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'ingredient_category_id', 'sku', 'name', 'unit', 'stock', 'min_stock', 'cost', 'is_composite', 'active',
    ];

    protected $casts = [
        'stock' => 'decimal:3',
        'min_stock' => 'decimal:3',
        'cost' => 'decimal:4',
        'is_composite' => 'boolean',
        'active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::updated(function (Ingredient $ingredient) {
            if ($ingredient->wasChanged('stock')) {
                NotificationService::syncStockAlert($ingredient, 'ingredient');
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(IngredientCategory::class, 'ingredient_category_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function recipeIngredients(): HasMany
    {
        return $this->hasMany(RecipeIngredient::class);
    }

    public function status(): string
    {
        if ($this->stock <= 0) {
            return 'agotado';
        }

        return $this->stock <= $this->min_stock ? 'bajo' : 'ok';
    }
}

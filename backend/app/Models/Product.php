<?php

namespace App\Models;

use App\Events\LowStockAlert;
use App\Events\StockUpdated;
use App\Models\Concerns\BelongsToCompany;
use App\Support\Broadcaster;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'sku', 'name', 'category_id', 'warehouse_id', 'sale_price', 'cost',
        'stock', 'min_stock', 'active', 'image_path',
    ];

    protected $casts = [
        'sale_price' => 'decimal:2',
        'cost' => 'decimal:2',
        'stock' => 'decimal:3',
        'min_stock' => 'decimal:3',
        'active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::updated(function (Product $product) {
            if (!$product->wasChanged('stock')) {
                return;
            }

            Broadcaster::send(fn () => broadcast(new StockUpdated($product))->toOthers());

            if ($product->stock <= $product->min_stock) {
                Broadcaster::send(fn () => broadcast(new LowStockAlert($product))->toOthers());
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
}


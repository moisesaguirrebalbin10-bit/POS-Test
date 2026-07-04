<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

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

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
}


<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RestaurantTableOrderItem extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'restaurant_table_order_round_id', 'product_id', 'product_name', 'quantity', 'unit_price', 'notes', 'delivered_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'delivered_at' => 'datetime',
    ];

    public function round(): BelongsTo
    {
        return $this->belongsTo(RestaurantTableOrderRound::class, 'restaurant_table_order_round_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

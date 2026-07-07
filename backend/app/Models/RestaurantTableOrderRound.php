<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RestaurantTableOrderRound extends Model
{
    use BelongsToCompany;

    protected $fillable = ['restaurant_table_order_id', 'sent_at', 'completed_at'];

    protected $casts = [
        'sent_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function tableOrder(): BelongsTo
    {
        return $this->belongsTo(RestaurantTableOrder::class, 'restaurant_table_order_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RestaurantTableOrderItem::class, 'restaurant_table_order_round_id');
    }
}

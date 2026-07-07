<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RestaurantTableOrder extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'restaurant_table_id', 'status', 'customer_name', 'tip', 'sale_id', 'opened_at', 'closed_at',
    ];

    protected $casts = [
        'tip' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'restaurant_table_id');
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(RestaurantTableOrderRound::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function allItemsDelivered(): bool
    {
        return !$this->rounds()->whereHas('items', fn ($q) => $q->whereNull('delivered_at'))->exists();
    }
}

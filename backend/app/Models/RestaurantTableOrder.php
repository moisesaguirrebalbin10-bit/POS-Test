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
        'restaurant_table_id', 'type', 'status', 'customer_name', 'customer_phone',
        'delivery_address', 'notes', 'tip', 'amount_paid', 'sale_id', 'created_by', 'opened_at', 'closed_at',
    ];

    protected $casts = [
        'tip' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public const TYPE_LABELS = ['mesa' => 'Mesa', 'para_llevar' => 'Para llevar', 'delivery' => 'Delivery'];

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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function typeLabel(): string
    {
        return self::TYPE_LABELS[$this->type] ?? $this->type;
    }

    public function allItemsDelivered(): bool
    {
        return !$this->rounds()->whereHas('items', fn ($q) => $q->whereNull('delivered_at'))->exists();
    }

    public function calculatedTotal(): float
    {
        $itemsTotal = $this->rounds->flatMap->items->sum(fn ($item) => (float) $item->quantity * (float) $item->unit_price);

        return round($itemsTotal + (float) $this->tip, 2);
    }

    public function balanceDue(): float
    {
        return round($this->calculatedTotal() - (float) $this->amount_paid, 2);
    }
}

<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RestaurantTable extends Model
{
    use BelongsToCompany;

    protected $fillable = ['name', 'status', 'capacity'];

    public function orders(): HasMany
    {
        return $this->hasMany(RestaurantTableOrder::class);
    }

    public function activeOrder(): ?RestaurantTableOrder
    {
        return $this->orders()
            ->whereIn('status', ['open', 'awaiting_payment'])
            ->with(['rounds.items'])
            ->latest('opened_at')
            ->first();
    }
}

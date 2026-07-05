<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegister extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'date', 'user_id', 'opening_amount', 'counted_amount', 'difference',
        'observations', 'opened_at', 'closed_at', 'status',
    ];

    protected $casts = ['date' => 'date', 'opened_at' => 'datetime', 'closed_at' => 'datetime'];

    public function movements(): HasMany
    {
        return $this->hasMany(CashMovement::class);
    }
}


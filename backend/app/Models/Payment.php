<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'subscription_id', 'amount', 'currency', 'method', 'status',
        'paid_at', 'period_start', 'period_end', 'external_reference',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'period_start' => 'date',
        'period_end' => 'date',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}

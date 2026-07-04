<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'voucher_number', 'cash_register_id', 'user_id', 'customer_name',
        'subtotal', 'igv', 'tip', 'total', 'payment_method', 'mixed_payments',
        'customer_pdf_path', 'local_pdf_path',
    ];

    protected $casts = ['mixed_payments' => 'array'];

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}


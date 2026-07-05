<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class CashMovement extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'cash_register_id', 'user_id', 'source_type', 'source_id', 'type',
        'category', 'description', 'amount', 'payment_method',
    ];
}


<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseIncome extends Model
{
    use SoftDeletes;

    protected $table = 'expenses_income';
    protected $fillable = [
        'cash_register_id', 'user_id', 'type', 'category', 'description',
        'amount', 'date', 'payment_method', 'receipt_path', 'observation',
    ];
}


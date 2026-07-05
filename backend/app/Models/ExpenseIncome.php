<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseIncome extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $table = 'expenses_income';
    protected $fillable = [
        'cash_register_id', 'user_id', 'type', 'category', 'description',
        'amount', 'date', 'payment_method', 'receipt_path', 'observation',
    ];
}


<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'sale_id', 'product_id', 'product_name', 'quantity', 'unit_price', 'unit_cost', 'total',
    ];
}


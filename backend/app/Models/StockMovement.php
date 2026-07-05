<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'product_id', 'from_warehouse_id', 'to_warehouse_id', 'user_id',
        'type', 'quantity', 'note',
    ];
}


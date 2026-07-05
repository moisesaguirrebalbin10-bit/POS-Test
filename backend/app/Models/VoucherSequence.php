<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class VoucherSequence extends Model
{
    use BelongsToCompany;

    protected $fillable = ['series', 'current_number'];
}


<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoucherSequence extends Model
{
    protected $fillable = ['series', 'current_number'];
}


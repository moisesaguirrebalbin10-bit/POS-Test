<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'type', 'severity', 'title', 'message', 'link', 'source_type', 'source_id', 'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];
}

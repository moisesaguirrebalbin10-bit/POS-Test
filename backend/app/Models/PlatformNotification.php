<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformNotification extends Model
{
    protected $fillable = ['type', 'title', 'message', 'link', 'read_at'];

    protected $casts = ['read_at' => 'datetime'];
}

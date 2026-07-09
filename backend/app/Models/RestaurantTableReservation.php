<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class RestaurantTableReservation extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'customer_name', 'customer_phone', 'customer_dni', 'party_size',
        'reserved_at', 'status', 'notes', 'created_by',
    ];

    protected $casts = [
        'reserved_at' => 'datetime',
        'party_size' => 'integer',
    ];

    public const STATUS_LABELS = [
        'pending' => 'Pendiente', 'seated' => 'Sentados', 'completed' => 'Completada',
        'cancelled' => 'Cancelada', 'no_show' => 'No llego',
    ];

    public function tables(): BelongsToMany
    {
        return $this->belongsToMany(RestaurantTable::class, 'reservation_tables', 'reservation_id', 'restaurant_table_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

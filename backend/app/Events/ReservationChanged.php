<?php

namespace App\Events;

use App\Models\RestaurantTableReservation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReservationChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $reservationId;
    public array $tableIds;
    public string $status;
    public int $companyId;

    public function __construct(RestaurantTableReservation $reservation)
    {
        $this->reservationId = $reservation->id;
        $this->tableIds = $reservation->tables->pluck('id')->all();
        $this->status = $reservation->status;
        $this->companyId = $reservation->company_id;
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('company.' . $this->companyId);
    }

    public function broadcastAs(): string
    {
        return 'reservation.changed';
    }
}

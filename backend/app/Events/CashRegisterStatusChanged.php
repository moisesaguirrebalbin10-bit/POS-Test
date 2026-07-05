<?php

namespace App\Events;

use App\Models\CashRegister;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CashRegisterStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $status;
    public string $userName;
    public int $companyId;

    public function __construct(CashRegister $cashRegister, string $userName)
    {
        $this->status = $cashRegister->status;
        $this->userName = $userName;
        $this->companyId = $cashRegister->company_id;
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('company.' . $this->companyId);
    }

    public function broadcastAs(): string
    {
        return 'cash-register.status-changed';
    }
}

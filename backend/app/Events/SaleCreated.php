<?php

namespace App\Events;

use App\Models\Sale;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SaleCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $voucherNumber;
    public float $total;
    public ?string $cashierName;
    public int $companyId;

    public function __construct(Sale $sale)
    {
        $this->voucherNumber = $sale->voucher_number;
        $this->total = (float) $sale->total;
        $this->cashierName = $sale->cashier?->name;
        $this->companyId = $sale->company_id;
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('company.' . $this->companyId);
    }

    public function broadcastAs(): string
    {
        return 'sale.created';
    }
}

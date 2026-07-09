<?php

namespace App\Events;

use App\Models\RestaurantTableOrderItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TableItemDelivered implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public ?int $tableId;
    public int $tableOrderId;
    public int $itemId;
    public bool $allDelivered;
    public int $companyId;

    public function __construct(RestaurantTableOrderItem $item, bool $allDelivered)
    {
        $tableOrder = $item->round->tableOrder;
        $this->tableId = $tableOrder->restaurant_table_id;
        $this->tableOrderId = $tableOrder->id;
        $this->itemId = $item->id;
        $this->allDelivered = $allDelivered;
        $this->companyId = $item->company_id;
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('company.' . $this->companyId);
    }

    public function broadcastAs(): string
    {
        return 'table.item-delivered';
    }
}

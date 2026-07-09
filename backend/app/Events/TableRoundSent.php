<?php

namespace App\Events;

use App\Models\RestaurantTableOrderRound;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TableRoundSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public ?int $tableId;
    public ?string $tableName;
    public int $tableOrderId;
    public int $roundId;
    public int $companyId;
    public string $orderType;

    public function __construct(RestaurantTableOrderRound $round)
    {
        $tableOrder = $round->tableOrder;
        $this->tableId = $tableOrder->restaurant_table_id;
        $this->tableName = $tableOrder->table?->name;
        $this->tableOrderId = $tableOrder->id;
        $this->roundId = $round->id;
        $this->companyId = $round->company_id;
        $this->orderType = $tableOrder->type;
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('company.' . $this->companyId);
    }

    public function broadcastAs(): string
    {
        return 'table.round-sent';
    }
}

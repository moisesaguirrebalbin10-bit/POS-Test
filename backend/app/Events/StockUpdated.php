<?php

namespace App\Events;

use App\Models\Product;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StockUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $productId;
    public string $name;
    public float $stock;
    public int $companyId;

    public function __construct(Product $product)
    {
        $this->productId = $product->id;
        $this->name = $product->name;
        $this->stock = (float) $product->stock;
        $this->companyId = $product->company_id;
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('company.' . $this->companyId);
    }

    public function broadcastAs(): string
    {
        return 'stock.updated';
    }
}

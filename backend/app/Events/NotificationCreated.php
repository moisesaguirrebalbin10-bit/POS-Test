<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $id;
    public string $type;
    public string $severity;
    public string $title;
    public string $message;
    public ?string $link;
    public string $createdAt;
    public int $companyId;

    public function __construct(Notification $notification)
    {
        $this->id = $notification->id;
        $this->type = $notification->type;
        $this->severity = $notification->severity;
        $this->title = $notification->title;
        $this->message = $notification->message;
        $this->link = $notification->link;
        $this->createdAt = $notification->created_at->toIso8601String();
        $this->companyId = $notification->company_id;
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('company.' . $this->companyId);
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }
}

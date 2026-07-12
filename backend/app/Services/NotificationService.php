<?php

namespace App\Services;

use App\Events\NotificationCreated;
use App\Models\Ingredient;
use App\Models\Notification;
use App\Models\Product;
use App\Models\RestaurantTableOrderRound;
use App\Support\Broadcaster;

class NotificationService
{
    // Un pedido enviado a cocina que lleva mas de este tiempo sin entregarse por
    // completo se considera demorado.
    private const ORDER_DELAY_MINUTES = 20;

    /**
     * Crea, actualiza o resuelve la alerta de stock bajo/agotado de un producto o
     * insumo. Idempotente: mientras el item se mantenga por debajo del minimo no
     * se duplican filas ni se vuelve a emitir el broadcast salvo que la severidad
     * suba (de "bajo" a "agotado"); si el stock se recupera, la alerta pendiente
     * se elimina sola.
     */
    public static function syncStockAlert(Product|Ingredient $item, string $sourceType): void
    {
        $stock = (float) $item->stock;
        $minStock = (float) $item->min_stock;

        $type = $stock <= 0 ? 'out_of_stock' : ($stock <= $minStock ? 'low_stock' : null);

        $existing = Notification::where('source_type', $sourceType)
            ->where('source_id', $item->id)
            ->whereNull('read_at')
            ->whereIn('type', ['low_stock', 'out_of_stock'])
            ->first();

        if (!$type) {
            $existing?->delete();
            return;
        }

        if ($existing && $existing->type === $type) {
            $existing->touch();
            return;
        }

        $existing?->delete();

        $link = $sourceType === 'ingredient'
            ? '/app/inventory'
            : (($item->company?->business_type === 'restaurant') ? '/app/inventory' : '/app/products');

        $label = $sourceType === 'ingredient' ? 'Insumo' : 'Producto';
        $title = $type === 'out_of_stock' ? "Sin stock: {$item->name}" : "Stock bajo: {$item->name}";
        $message = $type === 'out_of_stock'
            ? "{$label} sin unidades disponibles (minimo {$minStock})."
            : "Quedan {$stock} unidades (minimo {$minStock}).";

        $notification = Notification::create([
            'company_id' => $item->company_id,
            'type' => $type,
            'severity' => $type === 'out_of_stock' ? 'critical' : 'warning',
            'title' => $title,
            'message' => $message,
            'link' => $link,
            'source_type' => $sourceType,
            'source_id' => $item->id,
        ]);

        Broadcaster::send(fn () => broadcast(new NotificationCreated($notification))->toOthers());
    }

    /**
     * Revisa las rondas de cocina sin entregar por completo y crea/resuelve las
     * alertas de "pedido demorado". Se invoca de forma perezosa (al consultar las
     * notificaciones) en lugar de depender de un scheduler, ya que este entorno no
     * garantiza que `php artisan schedule:run` este corriendo.
     */
    public static function reconcileOrderDelays(int $companyId): void
    {
        $threshold = now()->subMinutes(self::ORDER_DELAY_MINUTES);

        $delayedRounds = RestaurantTableOrderRound::where('company_id', $companyId)
            ->where('sent_at', '<=', $threshold)
            ->whereHas('items', fn ($q) => $q->whereNull('delivered_at'))
            ->whereHas('tableOrder', fn ($q) => $q->whereIn('status', ['open', 'awaiting_payment']))
            ->with('tableOrder.table:id,name')
            ->get();

        // filter() descarta ordenes eliminadas (relacion nula) para no romper el
        // whereNotIn de abajo: un NULL en la lista anula toda la clausula en SQL.
        $delayedOrderIds = $delayedRounds->pluck('tableOrder.id')->filter()->unique();

        foreach ($delayedRounds->unique('restaurant_table_order_id') as $round) {
            $order = $round->tableOrder;
            if (!$order) {
                continue;
            }

            $exists = Notification::where('source_type', 'table_order')
                ->where('source_id', $order->id)
                ->whereNull('read_at')
                ->where('type', 'order_delay')
                ->exists();

            if ($exists) {
                continue;
            }

            $label = $order->table->name ?? $order->typeLabel();
            // Se evita diffInMinutes() a proposito: en Carbon 3 su signo/redondeo por
            // defecto cambio entre versiones y llego a dar valores negativos con
            // decimales aqui; calcular sobre timestamps crudos es inequivoco.
            $minutes = (int) floor(abs(now()->timestamp - $round->sent_at->timestamp) / 60);

            $notification = Notification::create([
                'company_id' => $companyId,
                'type' => 'order_delay',
                'severity' => 'warning',
                'title' => "Pedido demorado: {$label}",
                'message' => "Lleva {$minutes} min esperando en cocina sin entregarse por completo.",
                'link' => '/app/kitchen',
                'source_type' => 'table_order',
                'source_id' => $order->id,
            ]);

            Broadcaster::send(fn () => broadcast(new NotificationCreated($notification))->toOthers());
        }

        // Si el pedido ya no esta demorado (se entrego o se cerro), resolvemos la alerta.
        Notification::where('company_id', $companyId)
            ->where('type', 'order_delay')
            ->whereNull('read_at')
            ->whereNotIn('source_id', $delayedOrderIds->isEmpty() ? [0] : $delayedOrderIds)
            ->delete();
    }
}

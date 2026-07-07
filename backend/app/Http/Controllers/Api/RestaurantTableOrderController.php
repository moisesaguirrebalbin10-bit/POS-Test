<?php

namespace App\Http\Controllers\Api;

use App\Events\TableFreed;
use App\Events\TableItemDelivered;
use App\Events\TableRoundSent;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\RestaurantTable;
use App\Models\RestaurantTableOrder;
use App\Models\RestaurantTableOrderItem;
use App\Services\ActivityLogger;
use App\Services\SaleService;
use App\Support\Broadcaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RestaurantTableOrderController extends Controller
{
    public function storeRound(Request $request, RestaurantTable $table)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('company_id', app('currentCompanyId'))],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $round = DB::transaction(function () use ($data, $table) {
            $order = $table->orders()->whereIn('status', ['open', 'awaiting_payment'])->latest('opened_at')->first();
            if (!$order) {
                $order = $table->orders()->create(['status' => 'open', 'opened_at' => now()]);
            } elseif ($order->status === 'awaiting_payment') {
                $order->update(['status' => 'open']);
            }

            $round = $order->rounds()->create(['sent_at' => now()]);

            foreach ($data['items'] as $line) {
                $product = Product::findOrFail($line['product_id']);
                $round->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $line['quantity'],
                    'unit_price' => $product->sale_price,
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            $table->update(['status' => 'occupied']);

            return $round;
        });

        $round->load('items', 'tableOrder.table');
        Broadcaster::send(fn () => broadcast(new TableRoundSent($round))->toOthers());
        ActivityLogger::log($request->user(), 'tables', 'round-sent', "Envio un pedido a cocina para la mesa {$table->name}.");

        return response()->json($round, 201);
    }

    public function deliverItem(Request $request, RestaurantTableOrderItem $item)
    {
        $item->load('round.tableOrder.table');
        $item->update(['delivered_at' => $item->delivered_at ? null : now()]);

        $order = $item->round->tableOrder;
        $round = $item->round;
        $round->update(['completed_at' => $round->items()->whereNull('delivered_at')->doesntExist() ? now() : null]);

        $allDelivered = $order->allItemsDelivered();
        $order->update(['status' => $allDelivered ? 'awaiting_payment' : 'open']);
        $order->table->update(['status' => $allDelivered ? 'awaiting_payment' : 'occupied']);

        Broadcaster::send(fn () => broadcast(new TableItemDelivered($item, $allDelivered))->toOthers());

        return ['item' => $item->fresh(), 'all_delivered' => $allDelivered];
    }

    public function charge(Request $request, RestaurantTableOrder $tableOrder, SaleService $service)
    {
        $data = $request->validate([
            'customer_name' => ['nullable', 'string'],
            'payment_method' => ['required', 'in:cash,yape,plin,card,transfer,mixed'],
            'mixed_payments' => ['nullable', 'array'],
            'tip' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($tableOrder->status === 'paid') {
            abort(422, 'Esta mesa ya fue cobrada.');
        }

        $tableOrder->load('rounds.items', 'table');
        $items = collect($tableOrder->rounds)->flatMap->items
            ->groupBy('product_id')
            ->map(fn ($group) => ['product_id' => $group->first()->product_id, 'quantity' => (float) $group->sum('quantity')])
            ->values()->all();

        if (!count($items)) {
            abort(422, 'Esta mesa no tiene items para cobrar.');
        }

        $sale = $service->create([
            'customer_name' => $data['customer_name'] ?? $tableOrder->customer_name,
            'table_name' => $tableOrder->table->name,
            'payment_method' => $data['payment_method'],
            'mixed_payments' => $data['mixed_payments'] ?? null,
            'tip' => $data['tip'] ?? 0,
            'items' => $items,
        ], $request->user()->id);

        $tableOrder->update(['status' => 'paid', 'sale_id' => $sale->id, 'tip' => $data['tip'] ?? 0, 'closed_at' => now()]);
        $tableOrder->table->update(['status' => 'free']);

        Broadcaster::send(fn () => broadcast(new TableFreed($tableOrder->table))->toOthers());
        ActivityLogger::log($request->user(), 'tables', 'charge', "Cobro la mesa {$tableOrder->table->name} por S/ {$sale->total}.");

        return response()->json($sale, 201);
    }
}

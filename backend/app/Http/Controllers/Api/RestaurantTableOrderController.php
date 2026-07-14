<?php

namespace App\Http\Controllers\Api;

use App\Events\TableFreed;
use App\Events\TableItemDelivered;
use App\Events\TableRoundSent;
use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\Product;
use App\Models\RestaurantTable;
use App\Models\RestaurantTableOrder;
use App\Models\RestaurantTableOrderItem;
use App\Models\RestaurantTableOrderRound;
use App\Services\ActivityLogger;
use App\Services\SaleService;
use App\Support\Broadcaster;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RestaurantTableOrderController extends Controller
{
    public function index(Request $request)
    {
        $statuses = $request->status ? explode(',', $request->status) : null;

        return RestaurantTableOrder::with(['table:id,name,capacity,zone', 'rounds.items', 'creator:id,name', 'canceller:id,name'])
            ->when($statuses, fn ($q, $v) => $q->whereIn('status', $v))
            ->when($request->type, fn ($q, $v) => $q->where('type', $v))
            ->when($request->created_by, fn ($q, $v) => $q->where('created_by', $v))
            ->when($request->from, fn ($q, $v) => $q->whereDate('opened_at', '>=', $v))
            ->when($request->to, fn ($q, $v) => $q->whereDate('opened_at', '<=', $v))
            ->latest('opened_at')
            ->paginate($request->integer('per_page') ?: 20)
            ->through(fn (RestaurantTableOrder $order) => $this->presentOrder($order));
    }

    public function stats()
    {
        $todayStart = now()->startOfDay();
        $orders = RestaurantTableOrder::where('opened_at', '>=', $todayStart)->get(['id', 'status', 'tip', 'sale_id']);
        $total = $orders->count();
        $paid = $orders->where('status', 'paid');
        $pending = $orders->where('status', 'awaiting_payment');

        $totalSales = $paid->isNotEmpty()
            ? (float) \App\Models\Sale::whereIn('id', $paid->pluck('sale_id')->filter())->sum('total')
            : 0.0;

        return [
            'total_orders' => $total,
            'paid_count' => $paid->count(),
            'paid_percent' => $total > 0 ? round(($paid->count() / $total) * 100, 1) : null,
            'pending_payment_count' => $pending->count(),
            'pending_payment_percent' => $total > 0 ? round(($pending->count() / $total) * 100, 1) : null,
            'total_sales' => $totalSales,
            'avg_ticket' => $paid->count() > 0 ? round($totalSales / $paid->count(), 2) : null,
        ];
    }

    public function kitchen()
    {
        $orders = RestaurantTableOrder::with(['table:id,name', 'creator:id,name', 'rounds' => function ($q) {
            $q->whereHas('items', fn ($i) => $i->whereNull('delivered_at'))->with('items');
        }])
            ->whereIn('status', ['open', 'awaiting_payment'])
            ->whereHas('rounds.items', fn ($q) => $q->whereNull('delivered_at'))
            ->orderBy('opened_at')
            ->get();

        return $orders->map(fn (RestaurantTableOrder $order) => [
            'id' => $order->id,
            'type' => $order->type,
            'type_label' => $order->typeLabel(),
            'table_name' => $order->table->name ?? null,
            'creator' => $order->creator ? ['id' => $order->creator->id, 'name' => $order->creator->name] : null,
            'opened_at' => $order->opened_at,
            'rounds' => $order->rounds->map(fn ($round) => [
                'id' => $round->id,
                'sent_at' => $round->sent_at,
                'items' => $round->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'notes' => $item->notes,
                    'delivered_at' => $item->delivered_at,
                ]),
            ]),
        ]);
    }

    public function mostOrdered(Request $request)
    {
        $days = $request->integer('days') ?: 30;

        $rows = RestaurantTableOrderItem::selectRaw('product_id, SUM(quantity) as total_qty')
            ->whereHas('round', fn ($q) => $q->where('sent_at', '>=', now()->subDays($days)))
            ->groupBy('product_id')
            ->orderByDesc('total_qty')
            ->limit(8)
            ->get();

        return $rows->map(function ($row) {
            $product = Product::find($row->product_id);
            return $product && $product->active ? [
                'product_id' => $product->id,
                'name' => $product->name,
                'sale_price' => $product->sale_price,
                'image_path' => $product->image_path,
                'total_qty' => (float) $row->total_qty,
            ] : null;
        })->filter()->values();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'in:mesa,para_llevar,delivery'],
            'restaurant_table_id' => ['required_if:type,mesa', 'nullable', Rule::exists('restaurant_tables', 'id')->where('company_id', app('currentCompanyId'))],
            'customer_name' => ['required_if:type,delivery', 'nullable', 'string', 'max:150'],
            'customer_phone' => ['required_if:type,delivery', 'nullable', 'string', 'max:30'],
            'delivery_address' => ['required_if:type,delivery', 'nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('company_id', app('currentCompanyId'))],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $table = null;
        if ($data['type'] === 'mesa') {
            $table = RestaurantTable::findOrFail($data['restaurant_table_id']);
            abort_if($table->status !== 'free', 422, 'La mesa ya tiene un pedido abierto.');
        }

        $order = DB::transaction(function () use ($data, $table, $request) {
            $order = RestaurantTableOrder::create([
                'restaurant_table_id' => $table?->id,
                'type' => $data['type'],
                'status' => 'open',
                'customer_name' => $data['customer_name'] ?? null,
                'customer_phone' => $data['customer_phone'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
                'opened_at' => now(),
            ]);

            $this->appendRound($order, $data['items']);

            return $order;
        });

        $order->load('rounds.items', 'table', 'creator');
        $round = $order->rounds->first();
        Broadcaster::send(fn () => broadcast(new TableRoundSent($round))->toOthers());
        ActivityLogger::log($request->user(), 'orders', 'create', "Creo una orden de tipo \"{$order->typeLabel()}\"" . ($table ? " para la mesa {$table->name}." : '.'));

        return response()->json($this->presentOrder($order), 201);
    }

    public function storeRound(Request $request, RestaurantTable $table)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('company_id', app('currentCompanyId'))],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $round = DB::transaction(function () use ($data, $table, $request) {
            $order = $table->orders()->whereIn('status', ['open', 'awaiting_payment'])->latest('opened_at')->first();
            if (!$order) {
                $order = $table->orders()->create(['type' => 'mesa', 'status' => 'open', 'created_by' => $request->user()->id, 'opened_at' => now()]);
            }

            return $this->appendRound($order, $data['items']);
        });

        $round->load('items', 'tableOrder.table');
        Broadcaster::send(fn () => broadcast(new TableRoundSent($round))->toOthers());
        ActivityLogger::log($request->user(), 'tables', 'round-sent', "Envio un pedido a cocina para la mesa {$table->name}.");

        return response()->json($round, 201);
    }

    public function addRound(Request $request, RestaurantTableOrder $tableOrder)
    {
        abort_if($tableOrder->status === 'paid', 422, 'Esta orden ya fue cobrada.');

        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('company_id', app('currentCompanyId'))],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $round = DB::transaction(fn () => $this->appendRound($tableOrder, $data['items']));

        $round->load('items', 'tableOrder.table');
        Broadcaster::send(fn () => broadcast(new TableRoundSent($round))->toOthers());
        ActivityLogger::log($request->user(), 'orders', 'round-sent', "Agrego productos a la orden #{$tableOrder->id}.");

        return response()->json($this->presentOrder($tableOrder->fresh()->load('rounds.items', 'table', 'creator')), 201);
    }

    private function appendRound(RestaurantTableOrder $order, array $items): RestaurantTableOrderRound
    {
        if ($order->status === 'awaiting_payment') {
            $order->update(['status' => 'open']);
        }

        $round = $this->createRound($order, $items);
        $order->table?->update(['status' => 'occupied']);

        return $round;
    }

    private function createRound(RestaurantTableOrder $order, array $items): RestaurantTableOrderRound
    {
        $round = $order->rounds()->create(['sent_at' => now()]);

        foreach ($items as $line) {
            $product = Product::findOrFail($line['product_id']);
            $round->items()->create([
                'product_id' => $product->id,
                'product_name' => $product->name,
                'quantity' => $line['quantity'],
                'unit_price' => $product->sale_price,
                'notes' => $line['notes'] ?? null,
            ]);
        }

        return $round;
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
        $order->table?->update(['status' => $allDelivered ? 'awaiting_payment' : 'occupied']);

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
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        if ($tableOrder->status === 'paid') {
            abort(422, 'Esta orden ya fue cobrada.');
        }

        $tableOrder->load('rounds.items', 'table');
        $items = collect($tableOrder->rounds)->flatMap->items
            ->groupBy('product_id')
            ->map(fn ($group) => ['product_id' => $group->first()->product_id, 'quantity' => (float) $group->sum('quantity')])
            ->values()->all();

        if (!count($items)) {
            abort(422, 'Esta orden no tiene items para cobrar.');
        }

        $sale = $service->create([
            'customer_name' => $data['customer_name'] ?? $tableOrder->customer_name,
            'table_name' => $tableOrder->table->name ?? $tableOrder->typeLabel(),
            'payment_method' => $data['payment_method'],
            'mixed_payments' => $data['mixed_payments'] ?? null,
            'tip' => $data['tip'] ?? 0,
            'discount_percent' => $data['discount_percent'] ?? 0,
            'items' => $items,
            'already_collected' => (float) $tableOrder->amount_paid,
        ], $request->user()->id);

        $tableOrder->update(['status' => 'paid', 'sale_id' => $sale->id, 'tip' => $data['tip'] ?? 0, 'closed_at' => now()]);

        if ($tableOrder->table) {
            $tableOrder->table->update(['status' => 'free']);
            Broadcaster::send(fn () => broadcast(new TableFreed($tableOrder->table))->toOthers());
        }

        ActivityLogger::log($request->user(), 'orders', 'charge', 'Cobro la orden #' . $tableOrder->id . ($tableOrder->table ? " (mesa {$tableOrder->table->name})" : '') . " por S/ {$sale->total}.");

        return response()->json($sale, 201);
    }

    public function cancel(Request $request, RestaurantTableOrder $tableOrder)
    {
        abort_if($tableOrder->status === 'paid', 422, 'No se puede cancelar una orden que ya fue cobrada.');
        abort_if($tableOrder->status === 'cancelled', 422, 'Esta orden ya esta cancelada.');
        abort_if((float) $tableOrder->amount_paid > 0, 422, 'Esta orden ya tiene un cobro anticipado registrado; no se puede cancelar directamente.');

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $tableOrder->load('table');

        $tableOrder->update([
            'status' => 'cancelled',
            'cancel_reason' => $data['reason'],
            'cancelled_at' => now(),
            'cancelled_by' => $request->user()->id,
            'closed_at' => now(),
        ]);

        if ($tableOrder->table) {
            $tableOrder->table->update(['status' => 'free']);
            Broadcaster::send(fn () => broadcast(new TableFreed($tableOrder->table))->toOthers());
        }

        ActivityLogger::log($request->user(), 'orders', 'cancel', 'Cancelo la orden #' . $tableOrder->id . ($tableOrder->table ? " (mesa {$tableOrder->table->name})" : '') . ". Motivo: {$data['reason']}");

        return $this->presentOrder($tableOrder->fresh()->load('rounds.items', 'table', 'creator', 'canceller'));
    }

    public function advancePayment(Request $request, RestaurantTableOrder $tableOrder)
    {
        abort_if($tableOrder->status === 'paid', 422, 'Esta orden ya fue cobrada.');

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,yape,plin,card,transfer'],
        ]);

        $tableOrder->load('rounds.items', 'table');
        $balanceDue = $tableOrder->balanceDue();
        abort_if($data['amount'] > $balanceDue + 0.01, 422, 'El monto supera el saldo pendiente de la orden.');

        $cashRegister = CashRegister::where('status', 'open')->where('user_id', $request->user()->id)->latest()->first();
        abort_if(!$cashRegister, 422, 'Debe abrir caja diaria antes de registrar un cobro anticipado.');

        DB::transaction(function () use ($tableOrder, $data, $cashRegister, $request) {
            $tableOrder->increment('amount_paid', $data['amount']);
            CashMovement::create([
                'cash_register_id' => $cashRegister->id,
                'user_id' => $request->user()->id,
                'source_type' => RestaurantTableOrder::class,
                'source_id' => $tableOrder->id,
                'type' => 'income',
                'category' => 'Cobro anticipado',
                'description' => 'Cobro anticipado orden #' . $tableOrder->id . ($tableOrder->table ? " (mesa {$tableOrder->table->name})" : ''),
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'],
            ]);
        });

        ActivityLogger::log($request->user(), 'orders', 'advance-payment', "Registro un cobro anticipado de S/ {$data['amount']} para la orden #{$tableOrder->id}.");

        return $this->presentOrder($tableOrder->fresh()->load('rounds.items', 'table', 'creator'));
    }

    public function comandaPdf(Request $request, RestaurantTableOrder $tableOrder)
    {
        $tableOrder->load('rounds.items', 'table', 'creator');
        $company = app('currentCompany');
        $items = $tableOrder->rounds->flatMap->items->values();

        $widthMm = $company->ticket_width === '58' ? 58 : 80;
        $heightMm = max(80, 90 + $items->count() * 5);
        $mmToPt = 2.83465;

        $pdf = Pdf::loadView('comanda-pdf', compact('tableOrder', 'company', 'items'));
        $pdf->setPaper([0, 0, $widthMm * $mmToPt, $heightMm * $mmToPt]);

        ActivityLogger::log($request->user(), 'orders', 'comanda-pdf', "Reimprimio la comanda de la orden #{$tableOrder->id}.");

        return response($pdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="comanda-' . $tableOrder->id . '.pdf"');
    }

    public function precuentaPdf(Request $request, RestaurantTableOrder $tableOrder)
    {
        $tableOrder->load('rounds.items', 'table', 'creator');
        $company = app('currentCompany');

        $items = $tableOrder->rounds->flatMap->items
            ->groupBy('product_id')
            ->map(function ($group) {
                $first = $group->first();
                $quantity = $group->sum('quantity');

                return (object) [
                    'product_name' => $first->product_name,
                    'quantity' => $quantity,
                    'unit_price' => $first->unit_price,
                    'total' => round($quantity * $first->unit_price, 2),
                ];
            })->values();

        $grossTotal = round((float) $items->sum('total'), 2);
        $igvPercent = (float) $company->igv_percent;
        $subtotal = round($grossTotal / (1 + $igvPercent / 100), 2);
        $igv = round($grossTotal - $subtotal, 2);
        $amountPaid = (float) $tableOrder->amount_paid;
        $balanceDue = round($grossTotal - $amountPaid, 2);

        $widthMm = $company->ticket_width === '58' ? 58 : 80;
        $lineCount = $items->count() + ($amountPaid > 0 ? 2 : 0);
        $heightMm = max(90, 108 + $lineCount * 5);
        $mmToPt = 2.83465;

        $pdf = Pdf::loadView('precuenta-pdf', compact('tableOrder', 'company', 'items', 'subtotal', 'igv', 'grossTotal', 'amountPaid', 'balanceDue'));
        $pdf->setPaper([0, 0, $widthMm * $mmToPt, $heightMm * $mmToPt]);

        ActivityLogger::log($request->user(), 'orders', 'precuenta-pdf', "Genero la pre-cuenta de la orden #{$tableOrder->id}.");

        return response($pdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="precuenta-' . $tableOrder->id . '.pdf"');
    }

    private function presentOrder(RestaurantTableOrder $order): array
    {
        return [
            'id' => $order->id,
            'type' => $order->type,
            'type_label' => $order->typeLabel(),
            'status' => $order->status,
            'table' => $order->table ? ['id' => $order->table->id, 'name' => $order->table->name, 'capacity' => $order->table->capacity, 'zone' => $order->table->zone] : null,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'delivery_address' => $order->delivery_address,
            'notes' => $order->notes,
            'tip' => $order->tip,
            'total' => $order->calculatedTotal(),
            'amount_paid' => (float) $order->amount_paid,
            'balance_due' => $order->balanceDue(),
            'sale_id' => $order->sale_id,
            'creator' => $order->creator ? ['id' => $order->creator->id, 'name' => $order->creator->name] : null,
            'opened_at' => $order->opened_at,
            'closed_at' => $order->closed_at,
            'cancel_reason' => $order->cancel_reason,
            'cancelled_at' => $order->cancelled_at,
            'canceller' => $order->canceller ? ['id' => $order->canceller->id, 'name' => $order->canceller->name] : null,
            'rounds' => $order->rounds->map(fn ($round) => [
                'id' => $round->id,
                'sent_at' => $round->sent_at,
                'completed_at' => $round->completed_at,
                'items' => $round->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'notes' => $item->notes,
                    'delivered_at' => $item->delivered_at,
                ]),
            ]),
        ];
    }
}

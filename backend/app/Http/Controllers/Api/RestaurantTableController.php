<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RestaurantTable;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RestaurantTableController extends Controller
{
    public function index()
    {
        $tables = RestaurantTable::with(['orders' => function ($q) {
            $q->whereIn('status', ['open', 'awaiting_payment'])
                ->with(['rounds.items'])
                ->latest('opened_at');
        }])->orderBy('name')->get();

        return $tables->map(function (RestaurantTable $table) {
            $order = $table->orders->first();
            return [
                'id' => $table->id,
                'name' => $table->name,
                'status' => $table->status,
                'capacity' => $table->capacity,
                'active_order' => $order ? $this->presentOrder($order) : null,
            ];
        });
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('restaurant_tables', 'name')->where('company_id', app('currentCompanyId'))],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:99'],
        ]);

        $table = RestaurantTable::create($data);
        ActivityLogger::log($request->user(), 'tables', 'create', "Creo la mesa {$table->name}.");

        return response()->json($table, 201);
    }

    public function update(Request $request, RestaurantTable $table)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('restaurant_tables', 'name')->where('company_id', app('currentCompanyId'))->ignore($table->id)],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:99'],
        ]);

        $table->update($data);
        ActivityLogger::log($request->user(), 'tables', 'update', "Edito la mesa {$table->name}.");

        return $table;
    }

    public function destroy(Request $request, RestaurantTable $table)
    {
        if ($table->status !== 'free') {
            abort(422, 'No se puede eliminar una mesa con un pedido en curso.');
        }

        $name = $table->name;
        $table->delete();
        ActivityLogger::log($request->user(), 'tables', 'delete', "Elimino la mesa {$name}.");

        return response()->noContent();
    }

    public function show(RestaurantTable $table)
    {
        $order = $table->activeOrder();

        return [
            'id' => $table->id,
            'name' => $table->name,
            'status' => $table->status,
            'capacity' => $table->capacity,
            'active_order' => $order ? $this->presentOrder($order) : null,
        ];
    }

    private function presentOrder($order): array
    {
        return [
            'id' => $order->id,
            'status' => $order->status,
            'opened_at' => $order->opened_at,
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

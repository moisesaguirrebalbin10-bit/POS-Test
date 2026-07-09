<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        return Warehouse::withCount('products')->withSum('products', 'stock')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('description', 'like', "%$s%")))
            ->when($request->filled('active'), fn ($q) => $q->where('active', $request->boolean('active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page') ?: 8);
    }

    public function stats()
    {
        return [
            'total_warehouses' => Warehouse::count(),
            'total_stock' => (float) Product::sum('stock'),
            'movements_today' => StockMovement::whereDate('created_at', now()->toDateString())->count(),
        ];
    }

    public function store(Request $request)
    {
        $maxWarehouses = app('currentCompany')->plan?->max_warehouses;
        if ($maxWarehouses !== null && Warehouse::count() >= $maxWarehouses) {
            $label = $maxWarehouses === 1 ? 'almacen' : 'almacenes';
            abort(422, "Tu plan permite hasta {$maxWarehouses} {$label}. Actualiza tu plan para agregar mas.");
        }

        $warehouse = Warehouse::create($request->validate(['name' => ['required', Rule::unique('warehouses', 'name')->where('company_id', app('currentCompanyId'))], 'description' => ['nullable'], 'active' => ['boolean']]));
        ActivityLogger::log($request->user(), 'warehouses', 'create', "Creo el almacen \"{$warehouse->name}\".");
        return response()->json($warehouse, 201);
    }

    public function show(Warehouse $warehouse)
    {
        return $warehouse->load('products.category');
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $warehouse->update($request->validate(['name' => ['sometimes', Rule::unique('warehouses', 'name')->where('company_id', app('currentCompanyId'))->ignore($warehouse->id)], 'description' => ['nullable'], 'active' => ['boolean']]));
        ActivityLogger::log($request->user(), 'warehouses', 'update', "Edito el almacen \"{$warehouse->name}\".");
        return $warehouse;
    }

    public function destroy(Request $request, Warehouse $warehouse)
    {
        $warehouse->update(['active' => false]);
        $warehouse->delete();
        ActivityLogger::log($request->user(), 'warehouses', 'delete', "Elimino el almacen \"{$warehouse->name}\".");
        return response()->noContent();
    }

    public function transfer(Request $request)
    {
        $companyId = app('currentCompanyId');
        $data = $request->validate(['product_id' => ['required', Rule::exists('products', 'id')->where('company_id', $companyId)], 'to_warehouse_id' => ['required', Rule::exists('warehouses', 'id')->where('company_id', $companyId)], 'quantity' => ['required', 'numeric', 'min:0.001'], 'note' => ['nullable']]);
        return DB::transaction(function () use ($data, $request) {
            $product = Product::lockForUpdate()->findOrFail($data['product_id']);
            abort_if($product->stock < $data['quantity'], 422, 'Stock insuficiente.');
            $from = $product->warehouse_id;
            $product->update(['warehouse_id' => $data['to_warehouse_id']]);
            $movement = StockMovement::create([
                'product_id' => $product->id, 'from_warehouse_id' => $from,
                'to_warehouse_id' => $data['to_warehouse_id'], 'user_id' => $request->user()->id,
                'type' => 'transfer', 'quantity' => $data['quantity'], 'note' => $data['note'] ?? null,
            ]);
            ActivityLogger::log($request->user(), 'warehouses', 'transfer', "Transfirio {$data['quantity']} de \"{$product->name}\" a otro almacen.");
            return $movement;
        });
    }
}


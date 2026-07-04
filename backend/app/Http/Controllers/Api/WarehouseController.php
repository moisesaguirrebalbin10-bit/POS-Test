<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarehouseController extends Controller
{
    public function index()
    {
        return Warehouse::withCount('products')->get();
    }

    public function store(Request $request)
    {
        $warehouse = Warehouse::create($request->validate(['name' => ['required', 'unique:warehouses,name'], 'description' => ['nullable'], 'active' => ['boolean']]));
        ActivityLogger::log($request->user(), 'warehouses', 'create', "Creo el almacen \"{$warehouse->name}\".");
        return response()->json($warehouse, 201);
    }

    public function show(Warehouse $warehouse)
    {
        return $warehouse->load('products.category');
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $warehouse->update($request->validate(['name' => ['sometimes', 'unique:warehouses,name,' . $warehouse->id], 'description' => ['nullable'], 'active' => ['boolean']]));
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
        $data = $request->validate(['product_id' => ['required', 'exists:products,id'], 'to_warehouse_id' => ['required', 'exists:warehouses,id'], 'quantity' => ['required', 'numeric', 'min:0.001'], 'note' => ['nullable']]);
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


<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockMovement;
use Illuminate\Http\Request;

class KardexController extends Controller
{
    private const TYPE_LABELS = ['entry' => 'Entrada', 'sale' => 'Salida (Venta)', 'transfer' => 'Transferencia', 'adjustment' => 'Ajuste'];

    public function index(Request $request)
    {
        return StockMovement::with(['product', 'ingredient', 'user'])
            ->when($request->kind === 'insumo', fn ($q) => $q->whereNotNull('ingredient_id'))
            ->when($request->kind === 'articulo', fn ($q) => $q->whereNotNull('product_id'))
            ->when($request->ingredient_id, fn ($q, $v) => $q->where('ingredient_id', $v))
            ->when($request->product_id, fn ($q, $v) => $q->where('product_id', $v))
            ->when($request->type, fn ($q, $v) => $q->where('type', $v))
            ->when($request->from, fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to, fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w
                ->whereHas('ingredient', fn ($i) => $i->where('name', 'like', "%$s%"))
                ->orWhereHas('product', fn ($p) => $p->where('name', 'like', "%$s%"))))
            ->latest()
            ->paginate($request->integer('per_page') ?: 30)
            ->through(fn (StockMovement $m) => [
                'id' => $m->id,
                'item_name' => $m->ingredient?->name ?? $m->product?->name ?? '-',
                'item_kind' => $m->ingredient_id ? 'insumo' : 'articulo',
                'unit' => $m->ingredient?->unit,
                'type' => $m->type,
                'type_label' => self::TYPE_LABELS[$m->type] ?? $m->type,
                'quantity' => $m->quantity,
                'note' => $m->note,
                'user' => $m->user?->name,
                'created_at' => $m->created_at,
            ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Carbon;

class InventorySummaryController extends Controller
{
    private const TYPE_LABELS = ['entry' => 'Entrada', 'sale' => 'Salida (Venta)', 'transfer' => 'Transferencia', 'adjustment' => 'Ajuste'];

    public function __invoke()
    {
        $ingredients = Ingredient::where('active', true)->get();
        $articulos = Product::where('type', 'articulo')->where('active', true)->get();

        $valorInventario = round(
            (float) $ingredients->sum(fn ($i) => (float) $i->stock * (float) $i->cost)
            + (float) $articulos->sum(fn ($p) => (float) $p->stock * (float) $p->cost),
            2
        );

        $totalItems = $ingredients->count() + $articulos->count();
        $okCount = $ingredients->filter(fn ($i) => $i->status() === 'ok')->count()
            + $articulos->filter(fn ($p) => $p->stock > $p->min_stock)->count();
        $saludStock = $totalItems > 0 ? round($okCount / $totalItems * 100) : null;

        $criticalIngredients = $ingredients->filter(fn ($i) => $i->status() !== 'ok');
        $criticalArticulos = $articulos->filter(fn ($p) => $p->stock <= $p->min_stock);
        $alertasCriticas = $criticalIngredients->count() + $criticalArticulos->count();

        $rotacion = $this->averageRotationDays();

        $stockCritico = $criticalIngredients->map(fn (Ingredient $i) => [
            'kind' => 'insumo', 'id' => $i->id, 'name' => $i->name, 'category' => $i->category?->name, 'icon' => $i->category?->icon,
            'stock' => (float) $i->stock, 'unit' => $i->unit, 'status' => $i->status(),
        ])->concat($criticalArticulos->map(fn (Product $p) => [
            'kind' => 'articulo', 'id' => $p->id, 'name' => $p->name, 'category' => $p->category?->name, 'icon' => null,
            'stock' => (float) $p->stock, 'unit' => 'und', 'status' => $p->stock <= 0 ? 'agotado' : 'bajo',
        ]))->sortBy('name')->values();

        $actividad = StockMovement::with(['product', 'ingredient', 'user'])
            ->latest()->limit(10)->get()
            ->map(fn (StockMovement $m) => [
                'id' => $m->id,
                'item_name' => $m->ingredient?->name ?? $m->product?->name ?? '-',
                'item_kind' => $m->ingredient_id ? 'insumo' : 'articulo',
                'type' => $m->type,
                'type_label' => self::TYPE_LABELS[$m->type] ?? $m->type,
                'quantity' => $m->quantity,
                'user' => $m->user?->name,
                'created_at' => $m->created_at,
            ]);

        return [
            'valor_inventario' => $valorInventario,
            'salud_stock_percent' => $saludStock,
            'alertas_criticas' => $alertasCriticas,
            'rotacion_dias' => $rotacion,
            'stock_critico' => $stockCritico,
            'actividad_reciente' => $actividad,
        ];
    }

    private function averageRotationDays(): ?int
    {
        $gaps = [];

        StockMovement::where('type', 'sale')
            ->whereNotNull('ingredient_id')
            ->orderBy('ingredient_id')->orderBy('created_at')
            ->get(['ingredient_id', 'created_at'])
            ->groupBy('ingredient_id')
            ->each(function ($movements) use (&$gaps) {
                $dates = $movements->pluck('created_at')->values();
                for ($i = 1; $i < $dates->count(); $i++) {
                    $gaps[] = Carbon::parse($dates[$i])->diffInHours(Carbon::parse($dates[$i - 1])) / 24;
                }
            });

        return count($gaps) > 0 ? (int) round(array_sum($gaps) / count($gaps)) : null;
    }
}

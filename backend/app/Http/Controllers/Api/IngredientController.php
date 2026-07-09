<?php

namespace App\Http\Controllers\Api;

use App\Exports\IngredientsExport;
use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use App\Services\ActivityLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;

class IngredientController extends Controller
{
    public function index(Request $request)
    {
        return Ingredient::with('category')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('sku', 'like', "%$s%")))
            ->when($request->ingredient_category_id, fn ($q, $v) => $q->where('ingredient_category_id', $v))
            ->when($request->filled('is_composite'), fn ($q) => $q->where('is_composite', $request->boolean('is_composite')))
            ->when(!$request->boolean('show_inactive'), fn ($q) => $q->where('active', true))
            ->orderBy('name')
            ->paginate($request->integer('per_page') ?: 50);
    }

    public function store(Request $request)
    {
        $ingredient = Ingredient::create($this->validated($request));
        ActivityLogger::log($request->user(), 'inventory', 'create', "Creo el insumo \"{$ingredient->name}\".");

        return response()->json($ingredient->load('category'), 201);
    }

    public function update(Request $request, Ingredient $ingredient)
    {
        $ingredient->update($this->validated($request, $ingredient->id));
        ActivityLogger::log($request->user(), 'inventory', 'update', "Edito el insumo \"{$ingredient->name}\".");

        return $ingredient->load('category');
    }

    public function destroy(Request $request, Ingredient $ingredient)
    {
        abort_if($ingredient->recipeIngredients()->exists(), 422, 'No se puede eliminar un insumo usado en recetas.');

        $ingredient->update(['active' => false]);
        $ingredient->delete();
        ActivityLogger::log($request->user(), 'inventory', 'delete', "Elimino el insumo \"{$ingredient->name}\".");

        return response()->noContent();
    }

    public function exportPdf(Request $request)
    {
        $ingredients = $this->filteredForExport($request);
        $company = app('currentCompany');

        $pdf = Pdf::loadView('inventory-list-pdf', [
            'title' => 'Insumos',
            'company' => $company,
            'columns' => ['Insumo', 'Categoria', 'Unidad', 'Stock', 'Minimo', 'Costo'],
            'rows' => $ingredients->map(fn (Ingredient $i) => [
                $i->name, $i->category?->name ?? '-', $i->unit,
                number_format((float) $i->stock, 2), number_format((float) $i->min_stock, 2), 'S/ ' . number_format((float) $i->cost, 2),
            ]),
        ]);

        ActivityLogger::log($request->user(), 'inventory', 'export-pdf', 'Exporto el listado de insumos a PDF.');

        return response($pdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="insumos.pdf"');
    }

    public function exportExcel(Request $request)
    {
        $ingredients = $this->filteredForExport($request);
        ActivityLogger::log($request->user(), 'inventory', 'export-excel', 'Exporto el listado de insumos a Excel.');

        return response(Excel::raw(new IngredientsExport($ingredients), \Maatwebsite\Excel\Excel::XLSX))
            ->header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            ->header('Content-Disposition', 'attachment; filename="insumos.xlsx"');
    }

    public function import(Request $request)
    {
        $data = $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:2048']]);

        $handle = fopen($data['file']->getRealPath(), 'r');
        $header = fgetcsv($handle);
        $header = array_map(fn ($h) => Str::of($h)->trim()->lower()->toString(), $header ?: []);

        $created = 0;
        $updated = 0;
        $companyId = app('currentCompanyId');

        DB::transaction(function () use ($handle, $header, &$created, &$updated, $companyId) {
            while (($row = fgetcsv($handle)) !== false) {
                $line = array_combine($header, array_pad($row, count($header), null));
                if (empty($line['name'])) {
                    continue;
                }

                $categoryId = null;
                if (!empty($line['categoria'])) {
                    $categoryId = \App\Models\IngredientCategory::firstOrCreate(
                        ['company_id' => $companyId, 'name' => trim($line['categoria'])]
                    )->id;
                }

                $payload = [
                    'name' => trim($line['name']),
                    'sku' => $line['sku'] ?? null,
                    'unit' => $line['unit'] ?? 'und',
                    'stock' => is_numeric($line['stock'] ?? null) ? (float) $line['stock'] : 0,
                    'min_stock' => is_numeric($line['min_stock'] ?? null) ? (float) $line['min_stock'] : 0,
                    'cost' => is_numeric($line['cost'] ?? null) ? (float) $line['cost'] : 0,
                    'ingredient_category_id' => $categoryId,
                ];

                $existing = Ingredient::where('company_id', $companyId)
                    ->where(fn ($q) => $q->where('name', $payload['name'])->orWhere(fn ($w) => $w->whereNotNull('sku')->where('sku', $payload['sku'])))
                    ->first();

                if ($existing) {
                    $existing->update($payload);
                    $updated++;
                } else {
                    Ingredient::create($payload);
                    $created++;
                }
            }
        });

        fclose($handle);
        ActivityLogger::log($request->user(), 'inventory', 'import', "Importo insumos desde CSV ({$created} creados, {$updated} actualizados).");

        return ['created' => $created, 'updated' => $updated];
    }

    private function filteredForExport(Request $request)
    {
        return Ingredient::with('category')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%$s%"))
            ->when($request->ingredient_category_id, fn ($q, $v) => $q->where('ingredient_category_id', $v))
            ->when(!$request->boolean('show_inactive'), fn ($q) => $q->where('active', true))
            ->orderBy('name')->get();
    }

    private function validated(Request $request, ?int $id = null): array
    {
        $companyId = app('currentCompanyId');
        $req = $id === null ? 'required' : 'sometimes';

        return $request->validate([
            'name' => [$req, 'string', 'max:150'],
            'sku' => ['nullable', 'string', 'max:60', Rule::unique('ingredients', 'sku')->where('company_id', $companyId)->ignore($id)],
            'ingredient_category_id' => ['nullable', Rule::exists('ingredient_categories', 'id')->where('company_id', $companyId)],
            'unit' => [$req, 'string', 'max:20'],
            'stock' => ['nullable', 'numeric'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'is_composite' => ['boolean'],
            'active' => ['boolean'],
        ]);
    }
}

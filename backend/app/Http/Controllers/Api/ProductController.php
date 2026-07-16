<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Imports\ProductsImport;
use App\Imports\ProductsTemplateExport;
use App\Models\Category;
use App\Models\Product;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        return Product::with('category', 'warehouse')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")
                ->orWhere('sku', 'like', "%$s%")
                ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%$s%"))))
            ->when($request->category_id, fn ($q, $v) => $q->where('category_id', $v))
            ->when($request->warehouse_id, fn ($q, $v) => $q->where('warehouse_id', $v))
            ->when($request->low_stock, fn ($q) => $q->where(fn ($w) => $w->whereNull('type')->orWhere('type', '!=', 'plato'))->whereColumn('stock', '<=', 'min_stock'))
            ->when($request->type, fn ($q, $v) => $q->where('type', $v))
            ->when($request->area_preparacion, fn ($q, $v) => $q->where('area_preparacion', $v))
            ->when($request->filled('active'), fn ($q) => $q->where('active', $request->boolean('active')))
            ->when($request->min_price, fn ($q, $v) => $q->where('sale_price', '>=', $v))
            ->when($request->max_price, fn ($q, $v) => $q->where('sale_price', '<=', $v))
            ->paginate($request->integer('per_page') ?: ($request->search ? 60 : 30));
    }

    public function stats()
    {
        $categories = Category::withCount('products')->orderByDesc('products_count')->get();

        return [
            'top_categories' => $categories->take(2)->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'count' => $c->products_count])->values(),
            'low_stock' => Product::where(fn ($q) => $q->whereNull('type')->orWhere('type', '!=', 'plato'))->whereColumn('stock', '<=', 'min_stock')->count(),
            'categories_count' => $categories->count(),
            'platos_count' => Product::where('type', 'plato')->count(),
            'articulos_count' => Product::where('type', 'articulo')->count(),
            'max_price' => (float) (Product::max('sale_price') ?? 0),
        ];
    }

    public function store(Request $request)
    {
        $product = Product::create($this->validated($request));
        ActivityLogger::log($request->user(), 'products', 'create', "Creo el producto \"{$product->name}\".");
        return response()->json($product, 201);
    }

    public function show(Product $product)
    {
        return $product->load('category', 'warehouse');
    }

    public function update(Request $request, Product $product)
    {
        $product->update($this->validated($request, $product->id));
        ActivityLogger::log($request->user(), 'products', 'update', "Edito el producto \"{$product->name}\".");
        return $product->load('category', 'warehouse');
    }

    public function destroy(Request $request, Product $product)
    {
        $product->update(['active' => false]);
        $product->delete();
        ActivityLogger::log($request->user(), 'products', 'delete', "Elimino el producto \"{$product->name}\".");
        return response()->noContent();
    }


    public function uploadImage(Request $request)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $file = $data['image'];
        $directory = public_path('assets/products');
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $name = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $filename = $name . '-' . now()->format('YmdHis') . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
        $file->move($directory, $filename);

        return response()->json([
            'path' => 'assets/products/' . $filename,
            'url' => url('assets/products/' . $filename),
        ], 201);
    }
    public function lowStock()
    {
        return Product::with('category', 'warehouse')
            ->where(fn ($q) => $q->whereNull('type')->orWhere('type', '!=', 'plato'))
            ->whereColumn('stock', '<=', 'min_stock')->get();
    }

    public function importTemplate(Request $request)
    {
        ActivityLogger::log($request->user(), 'products', 'import-template', 'Descargo la plantilla de carga masiva de carta.');

        return response(Excel::raw(new ProductsTemplateExport, \Maatwebsite\Excel\Excel::XLSX))
            ->header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            ->header('Content-Disposition', 'attachment; filename="plantilla-carta.xlsx"');
    }

    public function importPreview(Request $request)
    {
        $data = $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls', 'max:2048']]);

        $import = new ProductsImport;
        Excel::import($import, $data['file']);

        return response()->json(['rows' => $import->parsedRows]);
    }

    public function importConfirm(Request $request)
    {
        $data = $request->validate([
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.name' => ['required', 'string'],
            'rows.*.category_name' => ['nullable', 'string'],
            'rows.*.area_preparacion' => ['nullable', 'in:cocina,bar'],
            'rows.*.sale_price' => ['required', 'numeric', 'min:0'],
            'rows.*.cost' => ['required', 'numeric', 'min:0'],
            'rows.*.active' => ['boolean'],
        ]);

        $companyId = app('currentCompanyId');
        $created = 0;
        $updated = 0;
        $skipped = 0;

        DB::transaction(function () use ($data, $companyId, &$created, &$updated, &$skipped) {
            foreach ($data['rows'] as $row) {
                $name = trim($row['name'] ?? '');
                $categoryName = trim($row['category_name'] ?? '');
                if ($name === '' || $categoryName === '') {
                    $skipped++;
                    continue;
                }

                $categoryId = Category::firstOrCreate(
                    ['company_id' => $companyId, 'name' => $categoryName],
                    ['active' => true]
                )->id;

                $payload = [
                    'name' => $name,
                    'category_id' => $categoryId,
                    'area_preparacion' => in_array($row['area_preparacion'] ?? null, ['cocina', 'bar'], true) ? $row['area_preparacion'] : 'cocina',
                    'sale_price' => (float) $row['sale_price'],
                    'cost' => (float) $row['cost'],
                    'active' => (bool) ($row['active'] ?? true),
                    'type' => 'plato',
                ];

                $existing = Product::where('type', 'plato')->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first();

                if ($existing) {
                    $existing->update($payload);
                    $updated++;
                } else {
                    $payload['sku'] = Str::upper(Str::slug($name, '')) . '-' . now()->format('YmdHis') . Str::upper(Str::random(3));
                    Product::create($payload);
                    $created++;
                }
            }
        });

        ActivityLogger::log($request->user(), 'products', 'import', "Cargo la carta completa ({$created} creados, {$updated} actualizados, {$skipped} omitidos).");

        return response()->json(['created' => $created, 'updated' => $updated, 'skipped' => $skipped]);
    }

    private function validated(Request $request, ?int $id = null): array
    {
        $companyId = app('currentCompanyId');
        $isCreate = $id === null;
        $isDish = $request->input('type') === 'plato';
        $req = fn (string $rule) => $isCreate ? $rule : 'sometimes';

        return $request->validate([
            'sku' => [$req('required'), Rule::unique('products', 'sku')->where('company_id', $companyId)->ignore($id)],
            'name' => [$req('required')], 'category_id' => [$req('required'), Rule::exists('categories', 'id')->where('company_id', $companyId)],
            'warehouse_id' => [$isDish ? 'nullable' : $req('required'), Rule::exists('warehouses', 'id')->where('company_id', $companyId)],
            'sale_price' => [$req('required'), 'numeric', 'min:0'],
            'cost' => [$req('required'), 'numeric', 'min:0'],
            'stock' => [$isDish ? 'nullable' : $req('required'), 'numeric', 'min:0'],
            'min_stock' => [$isDish ? 'nullable' : $req('required'), 'numeric', 'min:0'],
            'active' => ['boolean'], 'image_path' => ['nullable'],
            'type' => ['nullable', 'in:plato,articulo'],
            'area_preparacion' => ['nullable', 'in:cocina,bar'],
        ]);
    }
}



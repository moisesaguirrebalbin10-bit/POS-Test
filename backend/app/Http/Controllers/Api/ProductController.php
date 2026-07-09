<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

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



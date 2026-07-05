<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            ->when($request->low_stock, fn ($q) => $q->whereColumn('stock', '<=', 'min_stock'))
            ->paginate($request->search ? 60 : 30);
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
        return Product::with('category', 'warehouse')->whereColumn('stock', '<=', 'min_stock')->get();
    }

    private function validated(Request $request, ?int $id = null): array
    {
        $companyId = app('currentCompanyId');
        return $request->validate([
            'sku' => ['required', Rule::unique('products', 'sku')->where('company_id', $companyId)->ignore($id)],
            'name' => ['required'], 'category_id' => ['required', Rule::exists('categories', 'id')->where('company_id', $companyId)],
            'warehouse_id' => ['required', Rule::exists('warehouses', 'id')->where('company_id', $companyId)], 'sale_price' => ['required', 'numeric', 'min:0'],
            'cost' => ['required', 'numeric', 'min:0'], 'stock' => ['required', 'numeric', 'min:0'],
            'min_stock' => ['required', 'numeric', 'min:0'], 'active' => ['boolean'], 'image_path' => ['nullable'],
        ]);
    }
}



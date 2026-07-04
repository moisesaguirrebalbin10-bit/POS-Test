<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return Category::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $category = Category::create($request->validate(['name' => ['required', 'unique:categories,name'], 'active' => ['boolean']]));
        ActivityLogger::log($request->user(), 'categories', 'create', "Creo la categoria \"{$category->name}\".");
        return response()->json($category, 201);
    }

    public function show(Category $category)
    {
        return $category;
    }

    public function update(Request $request, Category $category)
    {
        $category->update($request->validate(['name' => ['sometimes', 'unique:categories,name,' . $category->id], 'active' => ['boolean']]));
        ActivityLogger::log($request->user(), 'categories', 'update', "Edito la categoria \"{$category->name}\".");
        return $category;
    }

    public function destroy(Request $request, Category $category)
    {
        $category->update(['active' => false]);
        $category->delete();
        ActivityLogger::log($request->user(), 'categories', 'delete', "Elimino la categoria \"{$category->name}\".");
        return response()->noContent();
    }
}

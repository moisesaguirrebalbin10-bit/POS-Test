<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IngredientCategory;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IngredientCategoryController extends Controller
{
    public function index()
    {
        return IngredientCategory::withCount('ingredients')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('ingredient_categories', 'name')->where('company_id', app('currentCompanyId'))],
            'icon' => ['nullable', 'string', 'max:10'],
        ]);

        $category = IngredientCategory::create($data);
        ActivityLogger::log($request->user(), 'inventory', 'create', "Creo la categoria de insumo \"{$category->name}\".");

        return response()->json($category, 201);
    }

    public function update(Request $request, IngredientCategory $ingredientCategory)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('ingredient_categories', 'name')->where('company_id', app('currentCompanyId'))->ignore($ingredientCategory->id)],
            'icon' => ['nullable', 'string', 'max:10'],
        ]);

        $ingredientCategory->update($data);
        ActivityLogger::log($request->user(), 'inventory', 'update', "Edito la categoria de insumo \"{$ingredientCategory->name}\".");

        return $ingredientCategory;
    }

    public function destroy(Request $request, IngredientCategory $ingredientCategory)
    {
        abort_if($ingredientCategory->ingredients()->exists(), 422, 'No se puede eliminar una categoria con insumos asignados.');

        $name = $ingredientCategory->name;
        $ingredientCategory->delete();
        ActivityLogger::log($request->user(), 'inventory', 'delete', "Elimino la categoria de insumo \"{$name}\".");

        return response()->noContent();
    }
}

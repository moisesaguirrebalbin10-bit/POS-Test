<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Recipe;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        return Recipe::with(['product.category', 'recipeIngredients.ingredient'])
            ->when($request->kind, fn ($q, $v) => $q->where('kind', $v))
            ->when($request->search, fn ($q, $s) => $q->whereHas('product', fn ($p) => $p->where('name', 'like', "%$s%")))
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page') ?: 30)
            ->through(fn (Recipe $recipe) => $this->present($recipe));
    }

    public function stats()
    {
        $totalDishes = Product::where('type', 'plato')->where('active', true)->count();
        $withRecipe = Recipe::count();

        return [
            'total_dishes' => $totalDishes,
            'with_recipe' => $withRecipe,
            'coverage_percent' => $totalDishes > 0 ? round($withRecipe / $totalDishes * 100) : null,
        ];
    }

    public function availableProducts()
    {
        $usedIds = Recipe::pluck('product_id');

        return Product::where('type', 'plato')->where('active', true)
            ->whereNotIn('id', $usedIds)
            ->orderBy('name')->get(['id', 'name', 'sale_price', 'category_id']);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        abort_if(Recipe::where('product_id', $data['product_id'])->exists(), 422, 'Este plato ya tiene una receta.');

        $recipe = DB::transaction(function () use ($data) {
            $recipe = Recipe::create([
                'product_id' => $data['product_id'],
                'kind' => $data['kind'],
                'is_general' => $data['is_general'] ?? true,
            ]);
            $this->syncIngredients($recipe, $data['ingredients']);

            return $recipe;
        });

        $recipe->load(['product.category', 'recipeIngredients.ingredient']);
        ActivityLogger::log($request->user(), 'inventory', 'create', "Creo la receta de \"{$recipe->product->name}\".");

        return response()->json($this->present($recipe), 201);
    }

    public function update(Request $request, Recipe $recipe)
    {
        $data = $request->validate([
            'kind' => ['sometimes', 'in:receta,extra'],
            'is_general' => ['boolean'],
            'ingredients' => ['required', 'array', 'min:1'],
            'ingredients.*.ingredient_id' => ['required', Rule::exists('ingredients', 'id')->where('company_id', app('currentCompanyId'))],
            'ingredients.*.quantity' => ['required', 'numeric', 'min:0.001'],
        ]);

        DB::transaction(function () use ($recipe, $data) {
            $recipe->update(array_filter([
                'kind' => $data['kind'] ?? null,
                'is_general' => $data['is_general'] ?? null,
            ], fn ($v) => $v !== null));
            $this->syncIngredients($recipe, $data['ingredients']);
        });

        $recipe->load(['product.category', 'recipeIngredients.ingredient']);
        ActivityLogger::log($request->user(), 'inventory', 'update', "Edito la receta de \"{$recipe->product->name}\".");

        return $this->present($recipe);
    }

    public function destroy(Request $request, Recipe $recipe)
    {
        $name = $recipe->product->name;
        $recipe->recipeIngredients()->delete();
        $recipe->delete();
        ActivityLogger::log($request->user(), 'inventory', 'delete', "Elimino la receta de \"{$name}\".");

        return response()->noContent();
    }

    private function syncIngredients(Recipe $recipe, array $ingredients): void
    {
        $recipe->recipeIngredients()->delete();
        foreach ($ingredients as $line) {
            $recipe->recipeIngredients()->create([
                'ingredient_id' => $line['ingredient_id'],
                'quantity' => $line['quantity'],
            ]);
        }
    }

    private function validated(Request $request): array
    {
        $companyId = app('currentCompanyId');

        return $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('company_id', $companyId)->where('type', 'plato')],
            'kind' => ['required', 'in:receta,extra'],
            'is_general' => ['boolean'],
            'ingredients' => ['required', 'array', 'min:1'],
            'ingredients.*.ingredient_id' => ['required', Rule::exists('ingredients', 'id')->where('company_id', $companyId)],
            'ingredients.*.quantity' => ['required', 'numeric', 'min:0.001'],
        ]);
    }

    private function present(Recipe $recipe): array
    {
        return [
            'id' => $recipe->id,
            'kind' => $recipe->kind,
            'is_general' => $recipe->is_general,
            'product' => [
                'id' => $recipe->product->id,
                'name' => $recipe->product->name,
                'sale_price' => $recipe->product->sale_price,
                'category' => $recipe->product->category?->name,
            ],
            'ingredients' => $recipe->recipeIngredients->map(fn ($ri) => [
                'id' => $ri->id,
                'ingredient_id' => $ri->ingredient_id,
                'name' => $ri->ingredient->name,
                'unit' => $ri->ingredient->unit,
                'quantity' => $ri->quantity,
                'cost' => $ri->ingredient->cost,
                'line_cost' => round((float) $ri->quantity * (float) $ri->ingredient->cost, 2),
            ]),
            'cost_total' => $recipe->costTotal(),
            'margin' => $recipe->margin(),
            'food_cost_percent' => $recipe->foodCostPercent(),
        ];
    }
}

<?php

namespace App\Services;

use App\Events\SaleCreated;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Support\Broadcaster;
use Illuminate\Support\Facades\DB;

class SaleService
{
    public function __construct(private VoucherService $vouchers)
    {
    }

    public function create(array $data, int $userId): Sale
    {
        return DB::transaction(function () use ($data, $userId) {
            $settings = app('currentCompany');
            // El precio de venta del producto ya incluye el IGV (es el precio final que paga
            // el cliente), asi que el subtotal/IGV se extraen de ese monto en vez de sumarse
            // encima de el.
            $grossTotal = 0;
            $items = [];

            foreach ($data['items'] as $line) {
                $product = Product::lockForUpdate()->findOrFail($line['product_id']);
                $quantity = (float) $line['quantity'];

                if (!$product->active) {
                    abort(422, "\"{$product->name}\" no esta disponible.");
                }
                // Los platos de la Carta no llevan stock/almacen (se preparan al momento),
                // asi que solo se valida y descuenta stock para articulos y productos de Market.
                if (!$product->isDish() && $product->stock < $quantity) {
                    abort(422, "Stock insuficiente para {$product->name}");
                }

                $lineTotal = round($quantity * (float) $product->sale_price, 2);
                $grossTotal += $lineTotal;
                $items[] = compact('product', 'quantity', 'lineTotal');
            }

            $discountPercent = min(100, max(0, round((float) ($data['discount_percent'] ?? 0), 2)));
            $discountAmount = round($grossTotal * $discountPercent / 100, 2);
            $netGross = round($grossTotal - $discountAmount, 2);

            $igvPercent = (float) $settings->igv_percent;
            $subtotal = round($netGross / (1 + $igvPercent / 100), 2);
            $igv = round($netGross - $subtotal, 2);
            $tip = round((float) ($data['tip'] ?? 0), 2);
            $total = round($netGross + $tip, 2);
            $cashRegister = CashRegister::where('status', 'open')->where('user_id', $userId)->latest()->first();
            if (!$cashRegister) {
                abort(422, 'Debe abrir caja diaria antes de registrar una venta.');
            }

            $sale = Sale::create([
                'voucher_number' => $this->vouchers->next(),
                'cash_register_id' => $cashRegister->id,
                'user_id' => $userId,
                'customer_name' => $data['customer_name'] ?? 'Cliente General',
                'table_name' => $data['table_name'] ?? null,
                'subtotal' => $subtotal,
                'discount_percent' => $discountPercent,
                'discount_amount' => $discountAmount,
                'igv' => $igv,
                'tip' => $tip,
                'total' => $total,
                'payment_method' => $data['payment_method'],
                'mixed_payments' => $data['mixed_payments'] ?? null,
            ]);

            foreach ($items as $line) {
                $product = $line['product'];
                $sale->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $line['quantity'],
                    'unit_price' => $product->sale_price,
                    'unit_cost' => $product->cost,
                    'total' => $line['lineTotal'],
                ]);
                if (!$product->isDish()) {
                    $product->decrement('stock', $line['quantity']);
                    StockMovement::create([
                        'product_id' => $product->id,
                        'from_warehouse_id' => $product->warehouse_id,
                        'user_id' => $userId,
                        'type' => 'sale',
                        'quantity' => $line['quantity'],
                        'note' => "Venta {$sale->voucher_number}",
                    ]);
                }

                // Si el plato tiene una receta, se descuenta el stock de sus insumos
                // (el plato en si nunca lleva stock propio).
                $recipe = $product->isDish() ? $product->recipe()->with('recipeIngredients.ingredient')->first() : null;
                if ($recipe) {
                    foreach ($recipe->recipeIngredients as $recipeIngredient) {
                        $consumed = round((float) $recipeIngredient->quantity * $line['quantity'], 3);
                        $ingredient = $recipeIngredient->ingredient;
                        $ingredient->decrement('stock', $consumed);
                        StockMovement::create([
                            'ingredient_id' => $ingredient->id,
                            'user_id' => $userId,
                            'type' => 'sale',
                            'quantity' => $consumed,
                            'note' => "Venta {$sale->voucher_number} ({$product->name})",
                        ]);
                    }
                }
            }

            // Si la orden ya recibio cobros anticipados, ese dinero ya se registro como su
            // propio CashMovement al momento de cobrarse; aqui solo se registra el saldo
            // realmente cobrado ahora, para no duplicarlo en el balance de caja.
            $alreadyCollected = round((float) ($data['already_collected'] ?? 0), 2);
            $collectNow = max(0, round($total - $alreadyCollected, 2));
            if ($cashRegister && $collectNow > 0) {
                CashMovement::create([
                    'cash_register_id' => $cashRegister->id,
                    'user_id' => $userId,
                    'source_type' => Sale::class,
                    'source_id' => $sale->id,
                    'type' => 'sale',
                    'category' => 'Venta',
                    'description' => "Venta {$sale->voucher_number}",
                    'amount' => $collectNow,
                    'payment_method' => $data['payment_method'],
                ]);
            }

            $sale->load('items', 'cashier');
            Broadcaster::send(fn () => broadcast(new SaleCreated($sale))->toOthers());

            return $sale;
        });
    }
}





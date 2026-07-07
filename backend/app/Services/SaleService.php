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

                if (!$product->active || $product->stock < $quantity) {
                    abort(422, "Stock insuficiente para {$product->name}");
                }

                $lineTotal = round($quantity * (float) $product->sale_price, 2);
                $grossTotal += $lineTotal;
                $items[] = compact('product', 'quantity', 'lineTotal');
            }

            $igvPercent = (float) $settings->igv_percent;
            $subtotal = round($grossTotal / (1 + $igvPercent / 100), 2);
            $igv = round($grossTotal - $subtotal, 2);
            $tip = round((float) ($data['tip'] ?? 0), 2);
            $total = round($grossTotal + $tip, 2);
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

            if ($cashRegister) {
                CashMovement::create([
                    'cash_register_id' => $cashRegister->id,
                    'user_id' => $userId,
                    'source_type' => Sale::class,
                    'source_id' => $sale->id,
                    'type' => 'sale',
                    'category' => 'Venta',
                    'description' => "Venta {$sale->voucher_number}",
                    'amount' => $total,
                    'payment_method' => $data['payment_method'],
                ]);
            }

            $sale->load('items', 'cashier');
            Broadcaster::send(fn () => broadcast(new SaleCreated($sale))->toOthers());

            return $sale;
        });
    }
}





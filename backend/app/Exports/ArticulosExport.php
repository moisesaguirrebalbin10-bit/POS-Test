<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ArticulosExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(private Collection $articulos)
    {
    }

    public function collection(): Collection
    {
        return $this->articulos;
    }

    public function headings(): array
    {
        return ['Articulo', 'SKU', 'Categoria', 'Stock', 'Stock Minimo', 'Precio', 'Estado'];
    }

    public function map($product): array
    {
        return [
            $product->name,
            $product->sku,
            $product->category?->name ?? '-',
            (float) $product->stock,
            (float) $product->min_stock,
            (float) $product->sale_price,
            $product->active ? 'Activo' : 'Inactivo',
        ];
    }
}

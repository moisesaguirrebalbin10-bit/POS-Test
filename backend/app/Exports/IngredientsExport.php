<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class IngredientsExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(private Collection $ingredients)
    {
    }

    public function collection(): Collection
    {
        return $this->ingredients;
    }

    public function headings(): array
    {
        return ['Insumo', 'SKU', 'Categoria', 'Unidad', 'Stock', 'Stock Minimo', 'Costo', 'Estado'];
    }

    public function map($ingredient): array
    {
        return [
            $ingredient->name,
            $ingredient->sku,
            $ingredient->category?->name ?? '-',
            $ingredient->unit,
            (float) $ingredient->stock,
            (float) $ingredient->min_stock,
            (float) $ingredient->cost,
            $ingredient->active ? 'Activo' : 'Inactivo',
        ];
    }
}

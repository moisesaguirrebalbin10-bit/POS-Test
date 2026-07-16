<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ProductsTemplateExport implements FromArray, WithHeadings, ShouldAutoSize
{
    public function array(): array
    {
        return [];
    }

    public function headings(): array
    {
        return ['Nombre del plato', 'Categoria', 'Area de Preparacion (cocina/bar)', 'Precio de Venta (S/)', 'Costo (S/)', 'Visible (Si/No)'];
    }
}

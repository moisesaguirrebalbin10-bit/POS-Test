<?php

namespace App\Imports;

use App\Models\Category;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;

/**
 * Solo parsea y normaliza el Excel de la carta subida: no persiste nada.
 * La confirmacion/persistencia ocurre en ProductController::importConfirm,
 * a partir de las filas que el usuario ya reviso/corrigio en el frontend.
 */
class ProductsImport implements ToCollection
{
    /** @var array Filas ya parseadas y normalizadas, llenadas por collection(). */
    public array $parsedRows = [];

    public function collection(Collection $rows): void
    {
        $categories = Category::pluck('id', 'name')
            ->mapWithKeys(fn ($id, $name) => [mb_strtolower(trim((string) $name)) => $id]);

        $this->parsedRows = $rows->slice(1)->values()
            ->map(fn ($row, $index) => $this->parseRow($row, $index, $categories))
            ->filter(fn ($row) => $row['name'] !== '' || $row['category_name'] !== '')
            ->values()
            ->all();
    }

    private function parseRow($row, int $index, Collection $categories): array
    {
        $name = trim((string) ($row[0] ?? ''));
        $categoryName = trim((string) ($row[1] ?? ''));
        $areaRaw = mb_strtolower(trim((string) ($row[2] ?? '')));
        $salePriceRaw = $row[3] ?? null;
        $costRaw = $row[4] ?? null;
        $visibleRaw = mb_strtolower(trim((string) ($row[5] ?? '')));

        $errors = [];
        if ($name === '') {
            $errors[] = 'El nombre es obligatorio.';
        }
        if ($categoryName === '') {
            $errors[] = 'La categoria es obligatoria.';
        }

        $salePrice = is_numeric($salePriceRaw) ? (float) $salePriceRaw : null;
        if ($salePrice === null || $salePrice < 0) {
            $errors[] = 'El precio de venta debe ser un numero valido.';
        }

        $cost = is_numeric($costRaw) ? (float) $costRaw : null;
        if ($cost === null || $cost < 0) {
            $errors[] = 'El costo debe ser un numero valido.';
        }

        return [
            'row' => $index + 2,
            'name' => $name,
            'category_name' => $categoryName,
            'category_id' => $categoryName !== '' ? ($categories[mb_strtolower($categoryName)] ?? null) : null,
            'area_preparacion' => in_array($areaRaw, ['cocina', 'bar'], true) ? $areaRaw : 'cocina',
            'sale_price' => $salePrice,
            'cost' => $cost,
            'active' => !in_array($visibleRaw, ['no', 'n', '0', 'false'], true),
            'errors' => $errors,
        ];
    }
}

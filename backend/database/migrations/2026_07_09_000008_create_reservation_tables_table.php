<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservation_tables', function (Blueprint $table) {
            $table->foreignId('reservation_id')->constrained('restaurant_table_reservations')->cascadeOnDelete();
            $table->foreignId('restaurant_table_id')->constrained('restaurant_tables')->cascadeOnDelete();
            $table->primary(['reservation_id', 'restaurant_table_id']);
        });

        // Traslada la mesa unica que ya tenia cada reserva a la nueva tabla pivote
        // antes de borrar la columna, para no perder datos existentes.
        DB::table('restaurant_table_reservations')
            ->whereNotNull('restaurant_table_id')
            ->select('id', 'restaurant_table_id')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                $pivotRows = $rows->map(fn ($row) => [
                    'reservation_id' => $row->id,
                    'restaurant_table_id' => $row->restaurant_table_id,
                ])->all();
                if ($pivotRows) {
                    DB::table('reservation_tables')->insert($pivotRows);
                }
            });

        Schema::table('restaurant_table_reservations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('restaurant_table_id');
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_table_reservations', function (Blueprint $table) {
            $table->foreignId('restaurant_table_id')->nullable()->after('id')->constrained('restaurant_tables')->nullOnDelete();
        });

        DB::table('reservation_tables')->orderBy('reservation_id')->chunk(200, function ($rows) {
            foreach ($rows as $row) {
                DB::table('restaurant_table_reservations')
                    ->where('id', $row->reservation_id)
                    ->update(['restaurant_table_id' => $row->restaurant_table_id]);
            }
        });

        Schema::dropIfExists('reservation_tables');
    }
};

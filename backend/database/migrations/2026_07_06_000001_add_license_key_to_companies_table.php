<?php

use App\Models\Company;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('license_key')->nullable()->unique()->after('slug');
        });

        foreach (DB::table('companies')->whereNull('license_key')->pluck('id') as $id) {
            DB::table('companies')->where('id', $id)->update(['license_key' => Company::generateLicenseKey()]);
        }
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('license_key');
        });
    }
};

<?php

use App\Models\PlatformPermission;
use App\Models\PlatformRole;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $permission = PlatformPermission::updateOrCreate(
            ['key' => 'security.manage'],
            ['module' => 'Seguridad', 'label' => 'Ver y desbloquear direcciones IP bloqueadas']
        );

        $superAdmin = PlatformRole::where('name', 'Super Admin')->first();
        $superAdmin?->permissions()->syncWithoutDetaching([$permission->id]);
    }

    public function down(): void
    {
        $permission = PlatformPermission::where('key', 'security.manage')->first();
        if ($permission) {
            $permission->roles()->detach();
            $permission->delete();
        }
    }
};

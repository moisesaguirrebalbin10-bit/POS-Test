<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlockedIp;
use App\Services\PlatformActivityLogger;
use Illuminate\Http\Request;

class BlockedIpController extends Controller
{
    public function index()
    {
        return BlockedIp::latest('blocked_at')->paginate(20);
    }

    public function destroy(Request $request, BlockedIp $blockedIp)
    {
        $ip = $blockedIp->ip;
        $blockedIp->delete();

        PlatformActivityLogger::log($request->user(), 'security', 'unblock', "Desbloqueo la IP {$ip}.");

        return response()->noContent();
    }
}

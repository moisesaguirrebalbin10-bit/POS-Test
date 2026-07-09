<?php

namespace App\Http\Controllers\Api;

use App\Events\ReservationChanged;
use App\Http\Controllers\Controller;
use App\Models\RestaurantTableReservation;
use App\Services\ActivityLogger;
use App\Support\Broadcaster;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        $statuses = $request->status ? explode(',', $request->status) : null;

        return RestaurantTableReservation::with(['tables:id,name,zone,capacity', 'creator:id,name'])
            ->when($request->from, fn ($q, $v) => $q->whereDate('reserved_at', '>=', $v))
            ->when($request->to, fn ($q, $v) => $q->whereDate('reserved_at', '<=', $v))
            ->when(!$request->from && !$request->to && !$request->date, fn ($q) => $q->whereDate('reserved_at', '>=', now()->toDateString()))
            ->when($request->date, fn ($q, $v) => $q->whereDate('reserved_at', $v))
            ->when($statuses, fn ($q, $v) => $q->whereIn('status', $v))
            ->when($request->restaurant_table_id, fn ($q, $v) => $q->whereHas('tables', fn ($t) => $t->where('restaurant_tables.id', $v)))
            ->orderBy('reserved_at')
            ->paginate($request->integer('per_page') ?: 30);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'restaurant_table_ids' => ['nullable', 'array'],
            'restaurant_table_ids.*' => [Rule::exists('restaurant_tables', 'id')->where('company_id', app('currentCompanyId'))],
            'customer_name' => ['required', 'string', 'max:150'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'customer_dni' => ['nullable', 'string', 'max:20'],
            'party_size' => ['required', 'integer', 'min:1', 'max:99'],
            'reserved_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $tableIds = $data['restaurant_table_ids'] ?? [];
        unset($data['restaurant_table_ids']);

        // El input puede venir con offset explicito (ej. "Z" desde el navegador); lo convertimos
        // a la zona horaria de la app ANTES de guardar, para que las cifras que terminan en la
        // columna naive (sin tz) representen el mismo instante real, no las cifras UTC crudas.
        $data['reserved_at'] = \Illuminate\Support\Carbon::parse($data['reserved_at'])->setTimezone(config('app.timezone'));

        $reservation = RestaurantTableReservation::create([
            ...$data,
            'status' => 'pending',
            'created_by' => $request->user()->id,
        ]);
        $reservation->tables()->sync($tableIds);

        ActivityLogger::log($request->user(), 'reservations', 'create', "Registro una reserva para \"{$reservation->customer_name}\" ({$reservation->party_size} personas).");
        Broadcaster::send(fn () => broadcast(new ReservationChanged($reservation))->toOthers());

        return response()->json($reservation->load('tables:id,name,zone,capacity'), 201);
    }

    public function updateStatus(Request $request, RestaurantTableReservation $reservation)
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,seated,completed,cancelled,no_show'],
        ]);

        $reservation->update($data);
        ActivityLogger::log($request->user(), 'reservations', 'update-status', "Cambio la reserva de \"{$reservation->customer_name}\" a \"{$data['status']}\".");
        Broadcaster::send(fn () => broadcast(new ReservationChanged($reservation))->toOthers());

        return $reservation->fresh()->load('tables:id,name,zone,capacity');
    }

    public function destroy(Request $request, RestaurantTableReservation $reservation)
    {
        abort_if(in_array($reservation->status, ['seated', 'completed']), 422, 'No se puede eliminar una reserva ya atendida.');

        $customerName = $reservation->customer_name;
        $reservation->load('tables:id');
        $reservation->delete();
        ActivityLogger::log($request->user(), 'reservations', 'delete', "Elimino la reserva de \"{$customerName}\".");
        Broadcaster::send(fn () => broadcast(new ReservationChanged($reservation))->toOthers());

        return response()->noContent();
    }

    public function upcomingCount(Request $request)
    {
        $minutes = $request->integer('minutes') ?: 60;

        $count = RestaurantTableReservation::where('status', 'pending')
            ->whereBetween('reserved_at', [now(), now()->addMinutes($minutes)])
            ->count();

        return ['count' => $count, 'minutes_window' => $minutes];
    }
}

<?php

namespace App\Support;

use Throwable;

class Broadcaster
{
    /**
     * Ejecuta un broadcast() sin dejar que una falla del servidor de WebSockets
     * (p.ej. Reverb caido) tumbe la peticion HTTP que lo origino. La excepcion de
     * Pusher/Reverb se lanza recien en el destructor de PendingBroadcast, asi que
     * el broadcast debe invocarse como sentencia suelta dentro de este try/catch
     * (nunca retornado) para que la destruccion ocurra todavia protegida.
     */
    public static function send(\Closure $broadcast): void
    {
        try {
            $broadcast();
        } catch (Throwable $e) {
            report($e);
        }
    }
}

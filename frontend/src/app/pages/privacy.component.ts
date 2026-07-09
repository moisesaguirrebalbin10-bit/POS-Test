import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
  <div class="legal-page">
    <header class="legal-nav">
      <a class="legal-logo" routerLink="/"><img src="/assets/brand/optiuso-logo.png" alt="OptiUso"></a>
      <a class="legal-back" routerLink="/"><mat-icon>arrow_back</mat-icon>Volver al inicio</a>
    </header>

    <main class="legal-card">
      <span class="legal-eyebrow">Legal</span>
      <h1>Política de Privacidad</h1>
      <p class="legal-updated">Última actualización: 9 de julio de 2026</p>

      <p>
        En OptiUso valoramos la privacidad de nuestros usuarios y de las empresas que confían en nuestra
        plataforma. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos los
        datos personales, en cumplimiento de la Ley N.° 29733, Ley de Protección de Datos Personales, su
        Reglamento aprobado por Decreto Supremo N.° 003-2013-JUS, y demás normativa peruana aplicable en materia
        de protección de datos.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        OptiUso es responsable del tratamiento de los datos personales que usted y su empresa nos proporcionan
        al registrarse y usar la plataforma. Para cualquier consulta relacionada con el tratamiento de sus datos
        personales, puede contactarnos a través de los canales de soporte disponibles dentro del sistema.
      </p>

      <h2>2. Datos personales que recopilamos</h2>
      <p>Recopilamos los siguientes tipos de datos, según el uso que usted haga de la plataforma:</p>
      <ul>
        <li><b>Datos de registro:</b> nombre, correo electrónico, teléfono, nombre y datos de la empresa (RUC, razón social, dirección).</li>
        <li><b>Datos de uso:</b> registros de acceso, acciones realizadas dentro del sistema, dirección IP y tipo de dispositivo, con fines de seguridad y auditoría.</li>
        <li><b>Datos de facturación:</b> información necesaria para procesar el pago de la suscripción contratada.</li>
        <li><b>Datos operativos del negocio:</b> productos, ventas, movimientos de caja, inventario, reservas y demás información que usted registra para operar su negocio.</li>
      </ul>

      <h2>3. Finalidad del tratamiento</h2>
      <p>Utilizamos sus datos personales para:</p>
      <ul>
        <li>Crear y administrar su cuenta y la de su empresa dentro de la plataforma.</li>
        <li>Brindar, mantener y mejorar las funcionalidades del servicio.</li>
        <li>Procesar pagos y gestionar la facturación de su suscripción.</li>
        <li>Enviar comunicaciones operativas (avisos de servicio, cambios en los Términos, soporte técnico).</li>
        <li>Prevenir fraude y proteger la seguridad de la plataforma y de nuestros usuarios.</li>
        <li>Cumplir obligaciones legales y tributarias aplicables en el Perú.</li>
      </ul>

      <h2>4. Base legal y consentimiento</h2>
      <p>
        El tratamiento de sus datos se sustenta en la ejecución del contrato de prestación de servicios aceptado
        mediante nuestros Términos de Servicio, en el cumplimiento de obligaciones legales, y, cuando corresponda,
        en su consentimiento expreso, el cual puede ser retirado en cualquier momento sin que ello afecte la
        licitud del tratamiento previo a su revocación.
      </p>

      <h2>5. Datos de clientes finales registrados por el negocio</h2>
      <p>
        Si usted registra en OptiUso datos personales de sus propios clientes o comensales (por ejemplo, al
        generar un comprobante de venta o una reserva), su empresa actúa como titular del banco de datos y
        responsable del tratamiento de dicha información frente a la ley peruana. OptiUso interviene únicamente
        como encargado del tratamiento, procesando esos datos solo para prestarle el servicio contratado y
        conforme a sus instrucciones, sin utilizarlos para fines propios ni cederlos a terceros no autorizados.
      </p>

      <h2>6. Plazo de conservación</h2>
      <p>
        Conservamos sus datos personales mientras su cuenta permanezca activa y durante el plazo adicional
        necesario para cumplir obligaciones legales, tributarias o contables, o para resolver eventuales
        controversias. Una vez vencidos dichos plazos, los datos son eliminados o anonimizados de forma segura.
      </p>

      <h2>7. Sus derechos (Derechos ARCO)</h2>
      <p>
        Conforme a la Ley N.° 29733, usted tiene derecho a Acceder, Rectificar, Cancelar y Oponerse (derechos
        ARCO) al tratamiento de sus datos personales, así como a revocar su consentimiento en cualquier momento.
        Puede ejercer estos derechos escribiéndonos a través de los canales de soporte de la plataforma,
        indicando su solicitud de forma clara. Responderemos dentro de los plazos establecidos por la normativa
        vigente. Si considera que sus derechos no han sido atendidos adecuadamente, puede presentar su reclamo
        ante la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos
        Humanos.
      </p>

      <h2>8. Encargados de tratamiento y transferencias</h2>
      <p>
        Podemos apoyarnos en proveedores de infraestructura tecnológica (por ejemplo, hospedaje en la nube y
        pasarelas de pago) para operar la plataforma, quienes tratan los datos únicamente siguiendo nuestras
        instrucciones y bajo obligaciones de confidencialidad. No vendemos ni comercializamos datos personales
        de nuestros usuarios a terceros.
      </p>

      <h2>9. Medidas de seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger los datos personales bajo nuestro
        tratamiento, incluyendo control de acceso por roles, cifrado de contraseñas, aislamiento de datos entre
        empresas registradas (multi-tenant) y registros de auditoría de las acciones realizadas en el sistema.
        Ninguna plataforma es 100% invulnerable, por lo que le recomendamos mantener sus credenciales de acceso
        en reserva y notificarnos ante cualquier uso indebido de su cuenta.
      </p>

      <h2>10. Uso de cookies</h2>
      <p>
        Utilizamos cookies y tecnologías similares estrictamente necesarias para el funcionamiento de la sesión
        y la plataforma (por ejemplo, mantener su sesión iniciada y recordar sus preferencias de tema visual).
        No utilizamos cookies de publicidad de terceros.
      </p>

      <h2>11. Menores de edad</h2>
      <p>
        OptiUso está dirigido a personas naturales mayores de edad que actúan en representación de un negocio o
        empresa. No recopilamos intencionalmente datos personales de menores de edad.
      </p>

      <h2>12. Cambios a esta política</h2>
      <p>
        Podemos actualizar esta Política de Privacidad periódicamente para reflejar cambios operativos, legales
        o tecnológicos. Los cambios sustanciales serán comunicados a través de la plataforma o por correo
        electrónico, indicando la fecha de la última actualización en la parte superior de este documento.
      </p>

      <h2>13. Contacto</h2>
      <p>
        Para consultas sobre el tratamiento de sus datos personales o para ejercer sus derechos ARCO, puede
        escribirnos a través de los canales de soporte disponibles dentro de la plataforma.
      </p>

      <p class="legal-crosslink">Consulta también nuestros <a routerLink="/terms">Términos de Servicio</a>.</p>
    </main>

    <footer class="legal-footer">
      <p>&copy; 2026 OptiUso. Todos los derechos reservados.</p>
    </footer>
  </div>`,
  styles: [`
    .legal-page { min-height: 100vh; display: flex; flex-direction: column; background: #f4f6f7; }
    .legal-nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; background: #fff; border-bottom: 1px solid #e5e9ea; }
    .legal-logo img { height: 38px; width: auto; display: block; }
    .legal-back { display: inline-flex; align-items: center; gap: 6px; color: #475569; text-decoration: none; font-size: 13px; font-weight: 700; }
    .legal-back:hover { color: #0f766e; }
    .legal-back mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .legal-card {
      flex: 1; width: min(760px, 92vw); margin: 40px auto; background: #fff; border-radius: 16px;
      box-shadow: 0 12px 40px rgba(15,23,25,.06); padding: 44px 48px 56px;
    }
    @media (max-width: 640px) { .legal-card { padding: 32px 22px 40px; } }

    .legal-eyebrow { display: inline-block; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #0f766e; background: #e6f4f2; padding: 4px 10px; border-radius: 999px; margin-bottom: 14px; }
    .legal-card h1 { font-size: 28px; margin: 0 0 6px; color: #0f1e1c; }
    .legal-updated { color: #64748b; font-size: 13px; margin: 0 0 28px; }
    .legal-card h2 { font-size: 17px; color: #0f1e1c; margin: 30px 0 10px; }
    .legal-card p { color: #334155; line-height: 1.7; font-size: 14.5px; margin: 0 0 14px; }
    .legal-card ul { color: #334155; line-height: 1.7; font-size: 14.5px; margin: 0 0 14px; padding-left: 22px; }
    .legal-card li { margin-bottom: 6px; }
    .legal-card b { color: #0f1e1c; }
    .legal-card a { color: #0f766e; font-weight: 700; text-decoration: none; }
    .legal-card a:hover { text-decoration: underline; }
    .legal-crosslink { margin-top: 26px; padding-top: 20px; border-top: 1px solid #e5e9ea; font-size: 13.5px; }

    .legal-footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }
  `]
})
export class PrivacyComponent {}

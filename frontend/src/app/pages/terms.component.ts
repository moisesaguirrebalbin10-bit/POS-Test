import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-terms',
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
      <h1>Términos de Servicio</h1>
      <p class="legal-updated">Última actualización: 9 de julio de 2026</p>

      <p>
        Estos Términos de Servicio ("Términos") regulan el acceso y uso de OptiUso, una plataforma de software
        como servicio (SaaS) de punto de venta multi-empresa para restaurantes y negocios de retail, operada
        desde la República del Perú. Al crear una cuenta, activar una licencia o utilizar OptiUso de cualquier
        forma, usted ("el Cliente") acepta estos Términos en su totalidad. Si actúa en representación de una
        empresa, declara contar con las facultades suficientes para vincularla a este acuerdo.
      </p>

      <h2>1. Descripción del servicio</h2>
      <p>
        OptiUso ofrece un sistema de punto de venta, control de caja, inventario, reservas y reportes, disponible
        en modalidad web y como aplicativo de escritorio. Cada empresa que se registra ("Cuenta" o "Tenant")
        opera de forma aislada: sus usuarios, productos, ventas, caja e inventario son independientes de los de
        cualquier otra empresa registrada en la plataforma.
      </p>

      <h2>2. Registro de cuenta</h2>
      <p>
        Para usar OptiUso debe registrar una cuenta proporcionando información veraz, completa y actualizada
        sobre usted y su negocio. Usted es responsable de mantener la confidencialidad de sus credenciales de
        acceso y de toda actividad que ocurra bajo su cuenta. Debe notificarnos de inmediato ante cualquier uso
        no autorizado de su cuenta.
      </p>

      <h2>3. Planes, suscripción y facturación</h2>
      <p>
        OptiUso se ofrece bajo distintos planes de suscripción, cuyas características, límites y precios se
        detallan al momento de la contratación. Los precios se expresan en Soles (S/) e incluyen el Impuesto
        General a las Ventas (IGV) vigente, salvo que se indique lo contrario. La suscripción se renueva de
        forma automática según el periodo contratado, salvo cancelación previa por parte del Cliente. Nos
        reservamos el derecho de modificar los precios de los planes, notificando dichos cambios con
        anticipación razonable; las modificaciones no aplican de forma retroactiva a periodos ya pagados.
      </p>

      <h2>4. Uso aceptable</h2>
      <p>El Cliente se compromete a no utilizar OptiUso para:</p>
      <ul>
        <li>Actividades ilícitas o que infrinjan la normativa peruana aplicable, incluyendo la tributaria y de protección al consumidor.</li>
        <li>Intentar vulnerar, realizar ingeniería inversa o comprometer la seguridad de la plataforma.</li>
        <li>Revender, sublicenciar o poner a disposición de terceros el acceso al sistema sin autorización expresa de OptiUso.</li>
        <li>Cargar contenido que infrinja derechos de terceros o que sea difamatorio, fraudulento o malicioso.</li>
      </ul>

      <h2>5. Datos del Cliente y de sus consumidores finales</h2>
      <p>
        El Cliente conserva la titularidad de los datos que ingresa al sistema (productos, ventas, información
        de sus propios clientes, empleados, etc.). Respecto de los datos personales de terceros (por ejemplo,
        clientes o comensales del Cliente) que este registre en la plataforma, el Cliente actúa como
        <b>titular/responsable del tratamiento</b> conforme a la Ley N.° 29733, Ley de Protección de Datos
        Personales, y OptiUso actúa únicamente como <b>encargado del tratamiento</b>, procesando dicha
        información solo para prestar el servicio contratado y siguiendo las instrucciones del Cliente.
      </p>

      <h2>6. Propiedad intelectual</h2>
      <p>
        El software, la marca OptiUso, su diseño, código fuente y demás elementos de la plataforma son de
        titularidad exclusiva de OptiUso o sus licenciantes, y se encuentran protegidos por la legislación
        peruana e internacional sobre derechos de autor y propiedad industrial. Estos Términos no transfieren
        al Cliente ningún derecho de propiedad intelectual sobre la plataforma, únicamente una licencia limitada,
        no exclusiva e intransferible de uso mientras la suscripción se encuentre vigente.
      </p>

      <h2>7. Disponibilidad del servicio</h2>
      <p>
        Procuramos mantener OptiUso disponible de forma continua, pero no garantizamos un servicio libre de
        interrupciones, errores o mantenimientos programados. Cuando sea posible, notificaremos con anticipación
        las ventanas de mantenimiento que puedan afectar la disponibilidad del sistema.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        En la medida máxima permitida por la ley peruana, OptiUso no será responsable por daños indirectos,
        lucro cesante o pérdida de datos derivados del uso o la imposibilidad de uso de la plataforma. El
        Cliente es responsable de mantener respaldos adicionales de su información crítica y de la exactitud de
        los datos que registra en el sistema, incluyendo aquellos con fines tributarios.
      </p>

      <h2>9. Suspensión y terminación</h2>
      <p>
        Podemos suspender o cancelar el acceso a la cuenta ante incumplimientos graves de estos Términos, falta
        de pago o uso indebido de la plataforma, previa notificación cuando las circunstancias lo permitan. El
        Cliente puede cancelar su suscripción en cualquier momento desde el módulo de Empresa o contactando a
        soporte; la cancelación no genera devolución de periodos ya facturados, salvo disposición legal en
        contrario.
      </p>

      <h2>10. Modificaciones a los términos</h2>
      <p>
        Podemos actualizar estos Términos periódicamente. Los cambios sustanciales serán comunicados a través de
        la plataforma o por correo electrónico. El uso continuado de OptiUso después de la entrada en vigencia de
        los cambios constituye la aceptación de los nuevos Términos.
      </p>

      <h2>11. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por las leyes de la República del Perú. Cualquier controversia derivada de su
        interpretación o ejecución se someterá a los jueces y tribunales del distrito judicial de Lima, Perú,
        con renuncia expresa a cualquier otro fuero que pudiera corresponder.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Para consultas sobre estos Términos puede escribirnos a través de los canales de soporte disponibles
        dentro de la plataforma.
      </p>

      <p class="legal-crosslink">Consulta también nuestra <a routerLink="/privacy">Política de Privacidad</a>.</p>
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
export class TermsComponent {}

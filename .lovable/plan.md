# Activar el envío de correos (notify.asocialcafe.com)

Los correos no llegan porque el dominio de envío aún no está verificado. No hay nada que corregir en la aplicación: las plantillas, el dominio remitente y los envíos automáticos (resumen de reserva y confirmación de pago) ya están implementados y quedan activos en cuanto el DNS verifique.

## Lo que tienes que hacer tú (en tu proveedor DNS)

Agrega estos tres registros en el DNS de `asocialcafe.com`:

| Tipo | Host | Valor |
|---|---|---|
| TXT | `_lovable-email.asocialcafe.com` | `lovable_email_verify=1f2797031579f698f23b73292bcef4c209804145aa3fb17b58061a56e7535846` |
| NS | `notify.asocialcafe.com` | `ns3.lovable.cloud` |
| NS | `notify.asocialcafe.com` | `ns4.lovable.cloud` |

Notas:
- Los dos registros NS van juntos en el mismo host `notify`.
- No agregues MX, SPF ni DKIM manualmente: Lovable los administra dentro del subdominio delegado.
- La propagación suele tardar minutos, pero puede llegar hasta 72 horas.
- Puedes seguir el estado y forzar la revisión en Cloud → Emails.

## Lo que haré cuando avises que los registros están puestos

1. Verificar el estado del dominio y confirmar que quedó activo.
2. Revisar el registro de envíos para confirmar que los correos salen (y detectar rechazos, rebotes o supresiones si los hubiera).
3. Hacer una prueba real: crear una reserva de prueba y validar un pago, para comprobar que llegan el correo de resumen (reserva por confirmar + medios de pago + aviso de comprobante por WhatsApp) y el de confirmación.
4. Ajustar contenido o formato de esas plantillas si algo no se ve bien.

## Si tu proveedor no permite registros NS

Dos alternativas: transferir el dominio a Lovable (Workspace settings → Workspace domains), o mover el DNS a un proveedor que sí soporte NS (por ejemplo el plan gratuito de Cloudflare) manteniendo tu registrador actual.

# asocial · café omakase — sistema de reservas

Aplicación full-stack para operar una experiencia de café con cupos limitados: sesiones, disponibilidad, reservas, clientes, pagos y asistencia. Panel administrativo + experiencia pública de reserva, con base de datos real (Lovable Cloud), autenticación y datos demo listos para probar.

## Identidad visual

- Paleta: Lino `#F3EEE4` (fondo), Nogal `#554034` (bordes/texto secundario), Arcilla `#8A5E4B` (atención, pagos pendientes), Musgo `#83846F` (disponibilidad, confirmado), Carbón `#232222` (texto, sidebar, botones).
- Tipografía Instrument Sans (Regular / Medium / Semibold). Sin Black ni ExtraBold, sin títulos gigantes.
- Espacio negativo generoso, esquinas suaves, bordes finos, sombras casi imperceptibles, animaciones solo fade/hover 150–250 ms.
- Microcopy calmado: "2 lugares disponibles", "Reservar", "Tu lugar está reservado", "Pago por confirmar". Sin urgencia, contadores, escasez falsa ni badges rojos.

## Base de datos

Tablas: `sessions`, `seat_blocks`, `customers`, `reservations`, `payments`, `waitlist`, `settings`, `user_roles`, `audit_logs`.

- Estados: sesión (draft/published/full/closed/cancelled), reserva (pending/confirmed/attended/no_show/cancelled), pago (pending/partial/paid/refunded/complimentary), método de pago (yape/plin/bank_transfer/card/payment_link/cash/complimentary/other).
- La disponibilidad **no se almacena**: se deriva de `capacidad_maxima − reservas válidas − bloqueos` mediante una vista/función en base de datos.
- Roles en tabla aparte (`user_roles` con enum admin/operator) y función `has_role` de seguridad definida.
- RLS: administración solo para usuarios autenticados; lectura pública únicamente de sesiones publicadas con columnas seguras; creación pública de reservas y lista de espera vía funciones de servidor validadas.
- Código de reserva `ASO-YYMMDD-XXX` único, generado en el servidor.
- Seed en la migración: 3 sesiones (hoy 6pm 5/6, hoy 8pm 5/5, vie 7 ago 7pm 3/6), clientes Ana Pérez, Lucía Ramos, Diego Ruiz, Marco Ríos, con reservas y pagos coherentes.

## Reglas de negocio

- Toda reserva valida disponibilidad en el servidor de forma atómica; nunca puede exceder los lugares libres.
- Sesión llena → se muestra "Completa" y se bloquea la reserva pública, ofreciendo lista de espera.
- Mover reserva: libera lugares en la sesión origen, valida y ocupa en la destino, en una sola operación.
- Cancelar reserva: motivo obligatorio, libera lugares automáticamente.
- Registrar pago: al alcanzar el total, `payment_status = paid`. Pago y estado de reserva son independientes.
- Check-in / no-show: actualizan estado y guardan `checked_in_at` / `checked_in_by`.
- Auditoría de cambios de pago, cancelaciones, cambios de sesión y de capacidad.

## Pantallas administrativas (protegidas)

Sidebar Carbón con logotipo en Lino; en móvil se convierte en drawer.

1. **Dashboard** — 4 KPI (sesiones hoy, ocupación, cobrado hoy con monto por confirmar, clientes con recurrentes), próximas sesiones con barra sutil de ocupación, y pagos por confirmar con acción "Registrar pago".
2. **Calendario** — vista mensual con puntos por sesión (`7 pm · 3/6`) y lista de próximas sesiones; color según disponibilidad.
3. **Sesiones** — listado, crear/editar sesión con todos los campos, bloqueo de lugares con motivo, y modo check-in para la sesión del día.
4. **Reservas** — tabla con filtros (fecha, sesión, estado, pago, canal) y buscador; crear reserva manual (sesión, cliente existente o nuevo, personas, estados, método de pago, notas); acciones mover, cancelar, registrar pago, check-in, no-show.
5. **Clientes** — listado, perfil con datos de contacto, métricas (primera/última visita, reservas, asistencias, cancelaciones, no-shows, gasto acumulado), etiqueta automática primera visita / recurrente / frecuente, e historial tipo timeline.
6. **Pagos** — registro de pagos con método, fecha, referencia y notas.
7. **Reportes** — rango de fechas y métricas: revenue, reservas, personas, ocupación, ticket promedio, no-show rate, cancellation rate, clientes nuevos y recurrentes.
8. **Configuración** — negocio, logo, dirección, moneda, timezone, capacidad y precio por defecto, métodos de pago, política de cancelación y texto de confirmación.

## Experiencia pública

Ruta `/reservar` (y home que conduce a ella), mobile-first, header Carbón con "asocial · café omakase" y la frase de bienvenida.

- Paso 1 "Elige cuándo venir" — cards de sesión con fecha, hora y lugares; las llenas muestran "Completa" y ofrecen lista de espera.
- Paso 2 "Cuéntanos quién viene" — personas, nombre, WhatsApp, email, y opcionales alergias/restricciones/comentarios.
- Paso 3 "Revisa tu reserva" — resumen y "Confirmar reserva".
- Confirmación — "Tu lugar está reservado", código, fecha, hora, personas, "Pago por confirmar" y aviso de contacto por WhatsApp.

## Componentes reutilizables

SessionCard, StatusPill, MetricCard, ReservationTable, CustomerCard, PaymentStatus, BookingStepper, AvailabilityBadge, ConfirmDialog, EmptyState, SearchInput, FilterBar.

## Notas técnicas

- Lovable Cloud (Postgres + Auth + RLS) como backend; login email/contraseña para el panel, ruta pública sin sesión.
- Lecturas y escrituras sensibles a través de funciones de servidor tipadas; lectura pública de sesiones con política acotada.
- Estructura preparada para añadir después WhatsApp y pasarela de pagos: los pagos ya modelan referencia de transacción y método `payment_link`, y el flujo reserva → pago → confirmación queda separado en capas.
- Entrega por fases: esquema y datos demo → panel (dashboard, sesiones, reservas, clientes, pagos) → experiencia pública → reportes y configuración → repaso responsive y de detalle visual.

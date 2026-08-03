# Asocial Café

Quiero que construyas una aplicación web full-stack llamada asocial · café omakase para gestionar las reservas de una experiencia privada de café.

No quiero un mockup estático. Quiero una aplicación funcional, navegable, responsive y preparada para conectarse a una base de datos real.

1. Objetivo del producto

Construir un sistema de gestión de reservas para asocial café omakase, una experiencia de café con cupos limitados.

La plataforma debe permitir gestionar de punta a punta:

Sesiones → disponibilidad → reservas → clientes → pagos → asistencia

Debe existir:

Panel administrativo

Experiencia pública de reservas para clientes

La aplicación debe ser mobile-first en la parte pública y desktop-first, pero responsive, en la parte administrativa.



2. Tecnología

Usa:

React

TypeScript

Tailwind CSS

Supabase como backend

Supabase Database

Supabase Auth

Supabase Row Level Security

Componentes reutilizables

Arquitectura preparada para posteriormente integrar WhatsApp y una pasarela de pagos

No construyas solamente datos hardcodeados.

Crea el esquema de Supabase necesario.

Incluye seed/demo data para poder probar la aplicación inmediatamente.



3. Identidad de marca

La aplicación NO debe parecer un SaaS genérico.

Debe trasladar al entorno digital la identidad de asocial.

La personalidad de marca es:

contemplativa

artesanal

sensorial

cercana

intencional

El producto debe sentirse:

tranquilo

cálido

minimalista

refinado

simple

humano

Evitar una estética tecnológica, fintech o corporate SaaS.



4. Concepto de marca

La idea de asocial es:

“Una experiencia de café donde el silencio también forma parte del ritual.”

Otros conceptos que representan la marca:

“menos ruido, más café.”

El café y la experiencia deben ser protagonistas.

La interfaz debe acompañar, no competir.



5. Tono de comunicación

La interfaz debe hablar desde:

calma

curiosidad

honestidad

sencillez

conocimiento

Nunca desde:

urgencia

exageración

pretensión

complejidad

exceso

No utilizar lenguaje típico de ecommerce agresivo.

NO escribir:

“¡ÚLTIMOS 2 CUPOS!”

Usar:

“2 lugares disponibles”

NO escribir:

“¡COMPRA AHORA!”

Usar:

“Reservar”

NO escribir:

“Transacción exitosa”

Usar:

“Tu lugar está reservado”

NO escribir:

“ERROR DE PAGO”

Usar:

“Pago por confirmar”

El microcopy debe sentirse humano, calmado y sencillo.



6. Sistema visual

Usar esta paleta oficial.

Lino

#F3EEE4

Uso:

fondo principal

superficies claras

background de la experiencia pública

Nogal

#554034

Uso:

detalles

bordes

texto secundario

elementos cálidos

Arcilla

#8A5E4B

Uso:

información que requiere atención

pagos pendientes

pequeños acentos

Musgo

#83846F

Uso:

disponibilidad

estados positivos

progreso

reservas confirmadas

Carbón

#232222

Uso:

texto principal

navegación

botones principales

sidebar

No introducir colores saturados ajenos a esta paleta.

Evitar especialmente:

azul SaaS

morado tecnológico

verde neón

rojo brillante



7. Tipografía

Utilizar:

Instrument Sans

Pesos:

Regular:

cuerpo

descripciones

información secundaria

Medium:

títulos

subtítulos

encabezados

Semibold:

datos importantes

cifras

énfasis puntual

NO utilizar:

Black

ExtraBold

No construir títulos enormes tipo landing page de startup.

La identidad debe sentirse ligera y pausada.



8. Principios UX/UI

Seguir estos principios:

El café primero

La interfaz acompaña la experiencia.

Diseñar para detenerse

Usar bastante espacio negativo.

No saturar pantallas.

Función antes que adorno

Cada elemento debe tener una función.

Calidez en los detalles

Usar:

esquinas suaves

bordes finos

sombras muy discretas

espaciado generoso

Todo pertenece al mismo lenguaje

El panel administrativo y la web pública deben sentirse parte de la misma marca.



9. Evitar dark patterns

No utilizar:

countdown timers

falsa escasez

“X personas están viendo esta sesión”

popups agresivos

badges rojos innecesarios

animaciones intermitentes

Mostrar disponibilidad de forma factual:

“4 lugares”

“2 lugares”

“Completa”



10. Navegación administrativa

Crear sidebar con:

Dashboard

Calendario

Sesiones

Reservas

Clientes

Pagos

Reportes

Configuración

Sidebar:

background Carbón #232222

Logotipo de asocial en Lino.

El menú debe ser extremadamente limpio.



11. Dashboard

Crear un dashboard que permita entender en segundos qué está pasando.

Mostrar arriba cuatro KPI cards:

Sesiones hoy

Ejemplo:
2

Ocupación

91%

10 de 11 lugares

Cobrado hoy

S/ 820

S/ 90 por confirmar

Clientes

8

3 recurrentes

Debajo crear:

Próximas sesiones

Cada fila:

Fecha

Hora

Reservados / capacidad

Barra sutil de ocupación

Disponibilidad

Ejemplo:

Hoy · 6:00 pm

5 de 6 lugares

[barra]

1 lugar



Mostrar también:

Pagos por confirmar

Cliente

Sesión

Cantidad de personas

Monto

Acción rápida:

“Registrar pago”



12. Sesiones

Crear módulo de sesiones.

Una sesión representa un omakase específico.

Campos:

id

fecha

hora_inicio

hora_fin

capacidad_maxima

precio_por_persona

ubicacion

estado

notas_internas

descripcion_publica

created_at

updated_at

Estados:

draft

published

full

closed

cancelled



13. Crear sesión

Formulario:

Fecha

Hora de inicio

Hora final

Capacidad máxima

Precio por persona

Ubicación

Estado

Descripción pública

Notas internas

Botón:

“Guardar sesión”



14. Disponibilidad

Calcular automáticamente:

Disponibilidad = capacidad máxima - lugares reservados - lugares bloqueados

Nunca permitir que una reserva supere la disponibilidad.

Si una sesión llega a capacidad máxima:

estado visual:

“Completa”

y no permitir nuevas reservas públicas.



15. Bloqueo de lugares

Permitir al administrador bloquear lugares.

Ejemplo:

2 lugares

Motivo:

invitado

influencer

equipo

prensa

cortesía

otro

Registrar:

session_id

quantity

reason

notes

created_at



16. Calendario

Crear:

vista mensual

opcionalmente vista semanal

lista de próximas sesiones

Cada día puede mostrar:

7 pm · 3/6

5 pm · 6/6

Utilizar estados visuales discretos.

Musgo:
disponibilidad

Arcilla:
pocos lugares

Carbón:
sesión completa



17. Reservas

Crear una tabla/listado de reservas.

Columnas:

Cliente

Sesión

Número de personas

Monto

Pago

Estado

Origen

Acciones

Permitir filtros:

fecha

sesión

estado

estado de pago

canal

Buscador por:

nombre

email

teléfono

código de reserva



18. Modelo de reserva

Crear tabla:

reservations

Campos:

id

booking_code

session_id

customer_id

guest_count

subtotal

discount

total

reservation_status

payment_status

source

notes

cancelled_at

cancellation_reason

created_at

updated_at



19. Estados de reserva

reservation_status:

pending

confirmed

attended

no_show

cancelled



20. Estado de pago

payment_status:

pending

partial

paid

refunded

complimentary

El estado del pago debe ser independiente del estado de la reserva.



21. Reserva manual

Desde administración debe existir:

“Crear reserva”

Permitir:

Seleccionar sesión

Buscar cliente existente

o crear cliente nuevo

Número de personas

Estado de reserva

Estado de pago

Método de pago

Notas

Validar disponibilidad automáticamente.



22. Cambiar reserva de sesión

Crear acción:

“Mover reserva”

Debe abrir modal o drawer.

Mostrar sesiones futuras con disponibilidad.

Cuando se confirme:

liberar lugares en sesión anterior

validar nueva disponibilidad

ocupar nuevos lugares

actualizar reserva

Debe realizarse de forma segura para evitar inconsistencias.



23. Cancelar reserva

Acción:

“Cancelar reserva”

Solicitar motivo:

solicitado por cliente

cambio de fecha

problema de pago

cancelado por asocial

otro

Al cancelar:

liberar automáticamente los lugares.



24. Pagos

Crear tabla:

payments

Campos:

id

reservation_id

amount

payment_method

status

transaction_reference

paid_at

notes

created_at

Métodos:

yape

plin

bank_transfer

card

payment_link

cash

complimentary

other



25. Registrar pago

Desde una reserva permitir:

“Registrar pago”

Solicitar:

Monto

Método

Fecha

Número de operación

Notas

Al completar el monto total:

payment_status = paid



26. Arquitectura futura de pagos

No integrar todavía obligatoriamente un gateway real.

Pero diseñar la arquitectura para poder incorporar posteriormente:

cliente reserva

↓

link de pago

↓

pasarela

↓

webhook

↓

payment = paid

↓

reservation = confirmed

↓

confirmación WhatsApp/email



27. Check-in

En la sesión del día crear modo operacional.

Mostrar:

Nombre

Personas

Pago

Estado

Botón grande:

“Check-in”

Al hacer check-in:

reservation_status = attended

Guardar:

checked_in_at

checked_in_by



28. No-show

Permitir marcar:

“No asistió”

reservation_status = no_show



29. Clientes

Crear tabla:

customers

Campos:

id

first_name

last_name

email

phone

instagram

birthday

acquisition_source

notes

created_at

updated_at



30. Perfil de cliente

Mostrar:

Nombre

WhatsApp

Email

Instagram

Primera visita

Última visita

Reservas

Asistencias

Cancelaciones

No-shows

Gasto acumulado



31. Historial del cliente

Mostrar timeline/lista:

02 ago

2 personas

asistió

S/180



12 jul

2 personas

asistió

S/180

etc.



32. Identificación de recurrentes

Calcular automáticamente:

Primera visita

Recurrente

Frecuente

A futuro debe permitir segmentación CRM.



33. Experiencia pública de reserva

Crear una página pública independiente.

Ruta sugerida:

/reservar

Debe ser mobile-first.

No debe parecer un checkout tradicional.

Debe sentirse como la entrada digital a la experiencia asocial.



34. Header público

Mostrar el logo de:

asocial
café omakase

Sobre fondo Carbón.

Debajo:

“Una experiencia guiada para descubrir el café con calma.”

Mantener mucho espacio visual.



35. Paso 1 — elegir sesión

Título:

“Elige cuándo venir”

Texto:

“Mostramos solo los momentos que aún tienen lugar.”

Mostrar cards:

Vie 7 ago

7:00 pm

3 lugares



Sáb 8 ago

5:00 pm

4 lugares



Sáb 8 ago

7:00 pm

2 lugares



Para una sesión llena:

“Completa”

deshabilitar selección.



36. Paso 2 — asistentes

Título:

“Cuéntanos quién viene”

Mostrar resumen de sesión.

Solicitar:

Número de personas

Nombre completo

WhatsApp

Email

También permitir opcionalmente:

Alergias

Restricciones alimentarias

Comentarios



37. Paso 3 — resumen

Título:

“Revisa tu reserva”

Mostrar:

Fecha

Hora

Número de personas

Precio por persona

Total

Botón:

“Confirmar reserva”



38. Confirmación

Mostrar:

“Tu lugar está reservado”

Código:

ASO-260807-018

Fecha

Hora

Personas

Estado de pago:

“Pago por confirmar”

Texto:

“Te enviaremos por WhatsApp la información necesaria para completar tu reserva.”



39. Código de reserva

Generar códigos con formato similar:

ASO-YYMMDD-XXX

Ejemplo:

ASO-260807-018

Debe ser único.



40. Lista de espera

Si una sesión está completa:

Mostrar:

“Esta sesión está completa.”

CTA secundario:

“Unirme a la lista de espera”

Solicitar:

Nombre

WhatsApp

Email

Cantidad de lugares

Crear tabla:

waitlist



41. Reportes

Crear pantalla básica de reportes.

Filtros:

Fecha inicio

Fecha fin

Mostrar:

Revenue

Reservas

Personas

Ocupación

Ticket promedio

No-show rate

Cancellation rate

Clientes nuevos

Clientes recurrentes



42. Configuración

Crear configuración para:

Nombre de negocio

Logo

Dirección

Moneda

Timezone

Capacidad predeterminada

Precio predeterminado

Métodos de pago disponibles

Política de cancelación

Texto de confirmación



43. Seguridad

Implementar Supabase Auth.

MVP:

login por email/password.

Roles:

admin

operator

Implementar Row Level Security.

Las rutas administrativas deben requerir autenticación.

La página pública de reservas no requiere login.



44. Auditoría

Crear estructura básica para registrar acciones administrativas importantes:

audit_logs

user_id

action

entity_type

entity_id

old_values

new_values

created_at

Registrar especialmente:

cambio de pago

cancelación

cambio de sesión

cambio de capacidad



45. Responsive

La experiencia pública debe diseñarse primero para iPhone/mobile.

El administrador debe funcionar correctamente en:

desktop

tablet

mobile

En mobile el sidebar puede convertirse en bottom navigation o drawer.



46. Componentes visuales

Crear componentes reutilizables:

SessionCard

StatusPill

MetricCard

ReservationTable

CustomerCard

PaymentStatus

BookingStepper

AvailabilityBadge

ConfirmDialog

EmptyState

SearchInput

FilterBar



47. Estados visuales

Available:
Musgo

Low availability:
Arcilla

Pending:
Arcilla

Confirmed:
Musgo

Paid:
Musgo

Full:
Carbón

Cancelled:
Nogal con opacidad reducida

Evitar rojo salvo errores realmente críticos.



48. Animaciones

Animaciones mínimas.

Usar solamente:

fade

transiciones de 150-250 ms

hover suave

No usar:

bounces

gradientes animados

confetti

animaciones llamativas



49. Seed data

Crear datos demo realistas.

Sesiones:

Hoy 6:00 pm

Capacidad 6

5 reservados



Hoy 8:00 pm

Capacidad 5

5 reservados



Vie 7 ago 7:00 pm

Capacidad 6

3 reservados

Clientes:

Ana Pérez

Lucía Ramos

Diego Ruiz

Marco Ríos

Crear reservas y pagos demo para que el dashboard se vea funcional.



50. Principio técnico importante

No almacenar “vacantes disponibles” como un número editable si puede calcularse.

La disponibilidad debe derivarse de:

capacidad

menos reservas válidas

menos bloqueos

para evitar inconsistencias.



51. Métricas

Calcular:

occupancy_rate

revenue

average_ticket

revenue_per_guest

no_show_rate

cancellation_rate

repeat_customer_rate



52. MVP

Priorizar primero:

P0

autenticación

dashboard

sesiones

disponibilidad

calendario

reservas

reservas manuales

clientes

pagos manuales

cancelaciones

mover reserva

check-in

no-show

experiencia pública

reportes básicos

No desarrollar todavía sistemas complejos de loyalty, membresías o marketing automation.



53. Arquitectura futura

Diseñar de forma que posteriormente podamos agregar:

WhatsApp

email automation

payment gateway

gift cards

membresías

loyalty

referidos

eventos privados

suscripciones

POS

multi-local

CRM

Customer Lifetime Value



54. Criterio de éxito

La aplicación debe permitir operar asocial durante una semana completa sin usar Excel, Google Sheets o una herramienta paralela para controlar:

sesiones

vacantes

reservas

clientes

pagos

asistencia



55. Importante

Antes de terminar:

Construye el esquema Supabase.

Crea todas las tablas y relaciones.

Implementa autenticación.

Implementa las reglas principales de disponibilidad.

Crea seed data.

Haz todas las pantallas navegables.

Implementa las acciones principales.

No dejes botones importantes sin funcionalidad.

Revisa responsive mobile.

Revisa consistencia con el sistema visual de asocial.

Prioriza primero que el producto sea operativamente funcional y simple.

Después mejora los detalles visuales.

El resultado debe sentirse como:

hospitality + ritual + café + software silencioso

y NO como:

dashboard SaaS + fintech + ecommerce tradicional.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://asocial-omakase.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e5b826e2-4803-480a-87db-479bb8a3566f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

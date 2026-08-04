# Plan: Arreglar apertura del botón de WhatsApp

## Objetivo
Que el botón "WhatsApp" en la lista de reservas abra el chat del cliente sin ser bloqueado por el navegador (`api.whatsapp.com is blocked` / `ERR_BLOCKED_BY_RESPONSE`).

## Situación actual
- El botón genera una URL `https://wa.me/<telefono>?text=<mensaje>`.
- Está renderizado como `<a href="..." target="_blank" rel="noopener noreferrer">`.
- En el preview (y posiblemente en producción) el clic llega a `api.whatsapp.com`, que devuelve `ERR_BLOCKED_BY_RESPONSE`. Esto suele pasar cuando el destino es redirigido dentro de un iframe o cuando la apertura de ventana no usa la API correcta del navegador.

## Pasos

1. **Revisar el generador de URL y el renderizado del botón**
   - Leer `src/lib/whatsapp.ts` y `src/routes/_authenticated/reservas.index.tsx`.
   - Confirmar si se usa `wa.me` o `api.whatsapp.com` y cómo se abre el enlace.

2. **Cambiar la apertura a `window.open` con parámetros de seguridad**
   - En lugar de dejar que el navegador maneje `<a target="_blank">`, usar un manejador de clic que llame `window.open(waLink, "_blank", "noopener,noreferrer")`.
   - Esto evita que el destino herede el contexto del iframe/preview y reduce bloqueos por COOP/COEP.

3. **Soportar fallback si el navegador bloquea el popup**
   - Si `window.open` devuelve `null` o es bloqueado, mostrar una alerta/toast con el enlace copiable y un botón "Copiar enlace".
   - Opcional: mostrar el enlace completo en un tooltip secundario.

4. **Normalizar el número de teléfono para `wa.me`**
   - Asegurar que el número tenga código de país (E.164) y solo dígitos; si falta el `+`, agregar `51` por defecto solo cuando el usuario no haya seleccionado otro país.
   - Esto ya está parcialmente en `PhoneInput`, pero conviene validar en el helper.

5. **Verificar en el preview y en el dominio publicado**
   - Probar el clic en la lista de reservas.
   - Confirmar que `api.whatsapp.com` ya no se bloquea.
   - Si persiste, evaluar usar `https://web.whatsapp.com/send?phone=` para desktop o `https://wa.me/` para móvil según el user-agent.

## Cambios esperados
- `src/lib/whatsapp.ts`: agregar helper `openWhatsApp` con manejo de fallback.
- `src/routes/_authenticated/reservas.index.tsx`: usar el helper en el botón WhatsApp en lugar de `<a>` directo.
- Posible ajuste de normalización de número de teléfono.

## No incluido
- No se integra API de WhatsApp Business ni servidor de mensajería.
- No se almacena historial de mensajes enviados.

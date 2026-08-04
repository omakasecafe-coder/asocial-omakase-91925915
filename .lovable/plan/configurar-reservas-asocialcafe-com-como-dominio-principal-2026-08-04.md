# Configurar reservas.asocialcafe.com como dominio principal

## Objetivo
Conectar el subdominio `reservas.asocialcafe.com` al proyecto de Lovable para que sea la URL principal de la app de reservas.

## Requisitos confirmados
- El dominio `asocialcafe.com` está registrado en Spaceship y ya tiene configuración previa en Lovable (email en `notify.asocialcafe.com`).
- El proyecto ya está publicado en `https://asocial-omakase.lovable.app` con visibilidad pública.
- Se quiere que `reservas.asocialcafe.com` sea el **dominio principal** de la app.

## Pasos a ejecutar

1. **Abrir configuración de dominios**
   - Ir a **Project Settings → Project → Domains** (o desde el diálogo de Publish → Add custom domain).

2. **Conectar el subdominio**
   - Hacer clic en **Connect Domain**.
   - Ingresar `reservas.asocialcafe.com` (con el subdominio completo).

3. **Configurar registros DNS en Spaceship**
   - Añadir un registro **A** para `reservas` apuntando a `185.158.133.1`.
   - Añadir el registro **TXT** que Lovable solicite para verificación (generalmente `_lovable` o similar con el valor de verificación).
   - No borrar los registros de `notify.asocialcafe.com` que ya funcionan para email.

4. **Verificar y marcar como primario**
   - Esperar la propagación DNS (puede tomar hasta 72 horas, aunque usualmente es minutos).
   - Una vez verificado, Lovable lo marcará como **Ready**.
   - Establecer `reservas.asocialcafe.com` como **Primary domain** para que sea la URL canónica.

5. **Validar la publicación**
   - Confirmar que `https://reservas.asocialcafe.com` responde correctamente.
   - Verificar que las rutas internas (por ejemplo `/reservar`, `/auth`) funcionan con el nuevo dominio.

## Notas técnicas
- No es necesario modificar código del frontend para que el dominio funcione; TanStack Start y el hosting de Lovable manejan los dominios automáticamente.
- Si el subdominio `reservas` ya tiene otros registros DNS (CNAME, A, etc.), deben eliminarse o actualizarse para evitar conflictos con los registros de Lovable.
- La activación de SSL se gestiona automáticamente una vez verificado el dominio.

## Resultado esperado
- La app será accesible desde `https://reservas.asocialcafe.com`.
- `https://asocial-omakase.lovable.app` seguirá funcionando y redirigirá al dominio primario si se configura así.

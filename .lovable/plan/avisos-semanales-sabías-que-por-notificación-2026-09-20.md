# Avisos semanales «¿Sabías que…?» por notificación

## Qué existe de verdad (verificado)

- **Tabla `push_subscriptions`**: existe, 3 filas, la última de abril de 2026. Con permisos por usuario (cada quien ve/crea/borra las suyas). Servible tal cual.
- **Tabla `notifications`**: 61 filas, todas de un solo tipo (recordatorios de rutina antiguos). Ninguna pantalla de la app la lee hoy.
- **`get-vapid-key`**: existe y funciona. Las claves VAPID (pública y privada) están guardadas y disponibles.
- **`send-test-push`, `routine-reminders`, `moderate-post`, `translate`**: aparecen listadas en la configuración pero **ya no existen en el proyecto**. Son restos.
- **Tarea automática horaria `routine-reminders-hourly`**: activa, llamando cada hora a una función que ya no existe. Es decir, 24 llamadas fallidas al día. Confirmado que nada la usa.
- **`public/push-sw.js`**: existe y ya gestiona recibir el aviso y abrir la url al tocarlo. Reutilizable casi sin cambios.
- **Permiso de notificaciones**: confirmado, **la app no lo pide en ningún sitio**. No hay código de suscripción en el frontend.
- **Aviso de instalación** (`InstallPrompt`): ya detecta iPhone, navegador dentro de otra app, y si la app ya está en la pantalla de inicio. Reutilizable.
- **Eventos**: ya existe el registro de eventos con consentimiento; `scan_success` se registra en la pantalla de resultado. Buen punto de anclaje para contar escaneos.

## Lo que propongo construir

### 1. Tarjeta de permiso (tras el 2º escaneo con éxito)
Contador local de escaneos con éxito. Al llegar a 2, en la pantalla de resultado aparece una tarjeta suave con el texto pedido y los botones «Sí, avísame» / «Ahora no». «Ahora no» silencia 30 días. Solo «Sí» lanza el diálogo del navegador, y si lo acepta se guarda la suscripción. Nunca al abrir la app.

### 2. iPhone
Con lo que ya hay: si es iOS **y** la app no está en la pantalla de inicio, no se muestra la tarjeta; en su lugar sigue apareciendo el aviso de instalación actual. Una vez instalada y abierta desde el icono, la tarjeta sí aparece. Además se comprueba que el navegador soporte avisos.

### 3. Lista de consejos y envío semanal
Tabla nueva `push_tips` (título, texto, url de destino, activo sí/no, idioma). Tú me pasas los textos y los cargo. Tabla nueva `push_sends` para saber qué consejo recibió cada usuario y cuándo: garantiza **máximo 1 por semana** y rotación sin repetir hasta agotar la lista (cuando se agota, vuelve a empezar). Envío los **martes a las 19:00 hora de Madrid** mediante una tarea semanal única. Al tocar, abre la url del consejo; por defecto `/scan`.

### 4. Interruptor en el perfil
«Consejos semanales (notificaciones)» dentro del perfil. Al desactivar, se borra la suscripción de verdad (en el navegador y en la base de datos), así que deja de recibir. Al activar, pide permiso y vuelve a suscribir.

### 5. Anónimos: mi recomendación es **no**
Técnicamente es posible (guardando la suscripción sin usuario), pero: no podrías desactivarlo desde ningún sitio con garantías, la suscripción se pierde al borrar datos del navegador, y complica el control de «una por semana». Además encaja mejor con tu objetivo: quien no tiene cuenta, primero la crea. Lo dejaría solo para usuarios con cuenta.

### 6. Limpieza (confirmado que nada depende de ello)
- Eliminar la tarea horaria `routine-reminders-hourly` (llama a algo inexistente).
- Quitar de la configuración las cuatro entradas de funciones que ya no existen.
- Las 61 filas antiguas de `notifications`: propongo **dejarlas**; nada las lee y borrarlas no aporta. Dime si prefieres vaciarlas.

### 7. Eventos
Se registran los seis que pides: tarjeta mostrada, aceptada, rechazada, permiso denegado, aviso enviado y aviso tocado.

## Detalles técnicos

Archivos nuevos: `src/components/push/PushOptInCard.tsx`, `src/lib/push.ts` (suscribir/desuscribir, conversión de clave VAPID, detección de soporte), función `send-weekly-tips` (envío con web-push y claves VAPID existentes, limpieza de suscripciones caducadas 404/410).

Archivos tocados: `src/pages/ResultPage.tsx` (solo montar la tarjeta y contar el escaneo con éxito; sin tocar scoring ni lógica de producto), `src/pages/ProfilePage.tsx` (el interruptor), `public/push-sw.js` (evento de «tocado» y url por defecto `/scan`), `supabase/config.toml` (limpieza + nueva función).

Base de datos (migración mínima): crear `push_tips` y `push_sends` con sus permisos y políticas propias; añadir a `push_subscriptions` una marca de activa/desactivada y la zona horaria si hace falta. No se toca ninguna política existente.

## Riesgos

- **iPhone**: solo funciona instalada en la pantalla de inicio y con iOS 16.4 o superior. Alcance real limitado al principio.
- **Las 3 suscripciones de abril** casi con seguridad están caducadas; el primer envío las limpiará. Se empieza prácticamente de cero.
- **Entrega no garantizada**: el usuario puede tener el permiso bloqueado a nivel de sistema; se registra como denegado y no se insiste.
- **El service worker solo está activo en la web publicada**, no en la vista previa: las pruebas reales hay que hacerlas en maseya.es.
- **Fatiga**: un aviso semanal es prudente; si la gente los ignora, conviene bajar la frecuencia antes que subirla.

## Complejidad honesta

Media. Lo más laborioso es el envío y la limpieza de suscripciones caducadas; el resto es trabajo de pantalla acotado. Estimo hacerlo en 2–3 tandas: (1) limpieza + base de datos + suscripción y tarjeta, (2) envío semanal con tus textos, (3) interruptor del perfil y comprobación real en maseya.es.

Necesito de ti: la lista de consejos (título, texto, destino) para cargarla.

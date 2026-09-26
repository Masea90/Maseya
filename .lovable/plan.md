# Seguridad: catálogo, Mira, enriquecimiento y fotos

## Qué he comprobado (sin cambiar nada)
- **Problema 4:** nada lista `product-images`. El único `.list()` del proyecto es sobre `avatars` (foto de perfil). Las fotos de producto solo se suben desde `extract-ingredients` y se guardan como URL firmada (10 años) en `maseya_products.image_url`. Esas URLs siguen funcionando con el bucket público. Se puede seguir.
- **Problema 1:** `extract-ingredients` acepta la clave pública (`isPublishableToken`), limita con un Map en memoria por `x-forwarded-for`, y escribe en `maseya_products` con service role en tres sitios (contribución de foto, update de nutrientes, upsert de nutrientes).
- **Problema 2:** `mira-analyze` solo valida si el token parece JWT con `sub`; la cuota de 30 va dentro de `if (subject)` y el subject puede salir del `sessionId` del body.
- **Problema 3:** `enrich-products` modo un-producto escribe con service role sin comprobar `verified`.

## Consecuencia importante (decídela tú)
Como no puedo tocar `src/`, los usuarios **sin cuenta** dejarán de poder: usar el flujo de foto (recibirán error) y pedir el análisis de Mira (el botón fallará y verán solo el resumen básico local). La app no se rompe, pero esas dos funciones pasan a ser solo para usuarios con cuenta. Si quieres, en otra tanda ajusto los textos del frontend para invitar a registrarse.

## Qué voy a tocar
1. **`supabase/functions/extract-ingredients/index.ts`**
   - Quitar `isPublishableToken`, el Map `anonRequests` y el uso de `x-forwarded-for`.
   - Exigir `getClaims` con `sub`; si no, 401.
   - Límite por usuario en base de datos (nueva tabla, ver abajo); si se supera, 429.
   - Las tres escrituras en `maseya_products`: antes de escribir, leer la fila; si existe con `verified = true`, no tocarla; si existe con `submitted_by` de otro usuario, no tocarla; al crear/modificar, forzar `verified = false` y `submitted_by = usuario`.
2. **`supabase/functions/mira-analyze/index.ts`**
   - Validar siempre el token con `getClaims`; sin `sub`, 401.
   - Cuota de 30/día siempre, con subject `u:<id del usuario>`; se ignora `sessionId` para la cuota (se sigue usando solo para analítica, como hoy).
3. **`supabase/functions/enrich-products/index.ts`** (solo modo un-producto)
   - Si la fila existe con `verified = true`, no se escribe. Las filas nuevas o actualizadas quedan con `verified = false`. El modo masivo de admin no cambia.
4. **Migración mínima**
   - Tabla `extract_quota` (usuario, día, contador), RLS activada sin políticas, acceso solo `service_role` (igual que `mira_quota`).
   - Bucket `product-images` a `public = true` y eliminar la política "Public read product-images". Nada más en storage.

## No toco
RLS de tablas, funciones admin_*, lectura pública de `maseya_products`, inserciones anónimas en feedback/app_events/ingredient_candidates, send-weekly-tips, send-welcome-email, auth-email-hook, chat, import-off-products, nada de `src/`, dependencias.

## Detalle técnico
- Regla de escritura (mismo criterio que la política de la tabla): permitido si no existe fila, o si existe con `verified = false` y (`submitted_by` nulo o igual al usuario). Filas de OFF importadas sin `submitted_by` y no verificadas seguirán pudiéndose completar; dímelo si prefieres bloquearlas también.
- Límite propuesto para `extract-ingredients`: 20 extracciones por usuario y día (ajustable).
- Tras los cambios: redesplegar las tres funciones y probar con llamadas reales: sin token → 401, clave pública → 401, fila verificada → intacta.

# Seguridad: catálogo, Mira, enriquecimiento y fotos (corregido)

Dos problemas separados:
- **Gasto de IA:** se controla con un límite de uso real en base de datos (por usuario o por IP). Nadie necesita cuenta.
- **Integridad del catálogo:** se controla con quién puede escribir qué. Nadie necesita cuenta para escanear.

## Quién puede hacer qué

| | Analizar foto / Mira | Crear producto nuevo | Rellenar campos vacíos | Sobrescribir campos con contenido |
|---|---|---|---|---|
| Sin cuenta (clave pública) | Sí, límite por IP | Sí | No | No |
| Con cuenta | Sí, límite por usuario | Sí | Sí | No |
| Admin | Sí | Sí | Sí | Sí (como hoy) |

- "Campos vacíos" = `ingredients_text`, `product_name`, `brand`, `nutriments`, `image_url` nulos o vacíos. `product_name = 'Producto sin nombre'` cuenta como vacío (es el valor de relleno que ya usa la app).
- Un anónimo nunca modifica una fila existente, ni un campo. Si el producto ya existe, el análisis se devuelve igual a la pantalla (el usuario ve su resultado), pero no se guarda nada.
- Al crear una fila: `verified = false`, `submitted_by` = usuario si hay sesión, nulo si es anónimo.
- Los usuarios sin cuenta no ven ningún error nuevo: si el guardado se omite, la función responde como hoy con `saved: false` (la insignia ya muestra "Guardado solo en tu dispositivo").

## Cambios

1. **`extract-ingredients`**
   - Token: se acepta la clave pública válida o un JWT de usuario verificado con `getClaims`. Cualquier otra cosa → 401.
   - Se eliminan el Map en memoria y el uso de `x-forwarded-for` como identificador.
   - Límite diario en base de datos: por usuario si hay sesión, por IP si es anónimo. Superado → 429 (la pantalla ya lo trata como fallo de lectura, sin romperse).
   - Las tres escrituras en `maseya_products` pasan por una única regla común (tabla de arriba).
2. **`mira-analyze`**
   - Mismo control de token: clave pública válida o JWT verificado; si no, 401. Se cierra el hueco de "Bearer xxx".
   - Cuota de 30/día siempre: `u:<id>` con sesión, `ip:<hash>` sin sesión. `sessionId` deja de usarse para la cuota (sigue solo para analítica).
3. **`enrich-products`**, solo modo un-producto: la misma regla. El modo masivo sigue siendo solo admin y sin cambios.
4. **Base de datos (migración mínima)**
   - Tabla `usage_quota` (función, sujeto, día, contador), RLS activada sin políticas, solo `service_role`. Se reutiliza el patrón de `mira_quota`; Mira sigue en `mira_quota`.
5. **Fotos (aprobado):** bucket `product-images` a público y eliminar la política "Public read product-images". Nada lista ese bucket; las fotos se sirven por su URL guardada.

## No toco
RLS de tablas, funciones admin_*, lectura pública de `maseya_products`, inserciones anónimas en feedback/app_events/ingredient_candidates, send-weekly-tips, send-welcome-email, auth-email-hook, chat, import-off-products, nada de `src/`, dependencias.

## Detalle técnico
- **IP real:** se usa `cf-connecting-ip` (la pone el proxy de la plataforma y sobrescribe la del cliente); si faltara, la última entrada de `x-forwarded-for` (la añade la plataforma, no el cliente). Se guarda como hash SHA-256 con sal, nunca la IP en claro.
- **Límites propuestos:** extract-ingredients 20/día por usuario y 10/día por IP; Mira 30/día en ambos casos. Riesgo: varias personas tras la misma IP (wifi pública, red móvil) comparten cupo anónimo; por eso el cupo por IP no es muy bajo. Ajustables.
- **Admin:** `has_role(uid, 'admin')` con service role, igual que ya hace `enrich-products`.
- **Contador atómico:** incremento con `upsert` + lectura en una sola función SQL `SECURITY DEFINER` solo ejecutable por `service_role`, para que dos peticiones simultáneas no se salten el límite.
- **Verificación tras implementar:** sin token → 401; "Bearer xxx" → 401; clave pública sobre producto existente → nada escrito; usuario con cuenta sobre producto con ingredientes → ingredientes intactos, solo se rellenan vacíos; superar el cupo → 429; foto existente sigue abriendo por su URL; listado del bucket → vacío/denegado.

# Tarjeta «¿Es natural?» y referencia del veredicto

Dos ficheros. Nada más.

## 1. `src/lib/scoring.ts` — solo la función `naturalness()`

Cambia el cálculo del porcentaje y del nivel. No se toca nada más del fichero.

**Porcentaje ponderado por posición.** Cada ingrediente pesa según su puesto en la lista: el 1.º pesa 1, el 2.º 1/2, el 3.º 1/3, y así sucesivamente. El porcentaje es el peso de los ingredientes «limpios» (en verde) dividido entre el peso total.
- Por qué este reparto: los primeros puestos son los que más cantidad llevan. Con un reparto lineal (17, 16, 15…), el champú Elvive seguiría cerca del 78 %. Con este, dos ingredientes malos en 1.º y 2.º puesto lo bajan aproximadamente al 55 %.
- Como hoy, los ingredientes en ámbar (precaución) no cuentan como limpios.

**Tope por gravedad.** Si hay al menos un ingrediente en rojo, el nivel nunca es «Natural». Como máximo es «Semi-natural». El porcentaje se muestra tal cual sale del cálculo ponderado.

**Umbrales de nivel:** se mantienen los actuales (más de 80 = Natural, de 50 a 80 = Semi-natural, menos de 50 = Sintético).

**Datos insuficientes:** no cambia. Ese aviso lo decide hoy la ficha (si hay o no datos de ingredientes), no esta función, y se queda igual.

**Verificación antes de entregar:**
- Champú Elvive Color Vive Violeta: deja de mostrar 88 % · Natural.
- Coca-Cola 5449000000996: se recalcula y se informa la cifra real. Si E150d y E338 salen en ámbar y no en rojo, el tope de gravedad no aplica: lo diré y no lo ajustaré sin confirmación.
- Controles sin cambios: nota general, nota personal y etiqueta de nota de ambos productos.

## 2. `src/pages/ResultPage.tsx` — solo la palabra del veredicto

- Se añaden dos entradas al objeto COPY en los tres idiomas:
  - Español: «Para ti» / «General»
  - Inglés: «For you» / «Overall»
  - Francés: «Pour toi» / «Général»
- Si la personalización está activa, la palabra se muestra con la referencia «Para ti: Malo».
- Si el círculo «Para ti» sale bloqueado o pendiente, se muestra «General: Bueno», que es la nota que ya se usa en ese caso.
- No cambia el color, la palabra (sigue saliendo de `scoreLabel`) ni el cálculo.

## Fuera de alcance

El resto de `scoring.ts`, el escáner, las alternativas, la caché de Mira, las funciones de servidor, los permisos, las dependencias, el onboarding y el perfil. Sin publicar.

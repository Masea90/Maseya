UPDATE public.feedback SET resolved = true, resolved_at = now(),
  resolution_notes = COALESCE(resolution_notes,'') || ' [auto] Voto positivo sin comentario — no requiere acción.'
WHERE id IN (
  '5bdfd8d3-de43-4841-8bbf-f3bc032d4a52',
  '4f495aad-973b-491c-b1f2-a986180077b7',
  '3436eeb1-7a64-48c0-bf96-03a39da2a387',
  'f4d87e39-685b-4929-800e-5589a600e154'
);

UPDATE public.feedback SET resolved = true, resolved_at = now(),
  resolution_notes = COALESCE(resolution_notes,'') || ' [auto] Ashwagandha (infusión suplemento) ahora entra en rama non-scorable via isSupplement; Mira oculta para no-scorables.'
WHERE id = '129c8d8f-8f89-4991-b472-7d060caa33a6';

UPDATE public.feedback SET resolved = true, resolved_at = now(),
  resolution_notes = COALESCE(resolution_notes,'') || ' [auto] Aceite de coco: data-confidence cap limita a 60/100 cuando faltan nutriments completos.'
WHERE id = 'f37eece8-87c6-4ef3-aa8a-5e0092363521';
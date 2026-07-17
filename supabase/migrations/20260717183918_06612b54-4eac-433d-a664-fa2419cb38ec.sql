UPDATE public.feedback SET resolved = true, resolved_at = now(),
  resolution_notes = COALESCE(resolution_notes,'') || ' [auto] Verificado: Nesquik ahora puntúa 20/100 (antes 100) gracias al fallback computeNutriScore Fase 2 que detecta 75g azúcar/100g aunque OFF no traiga nutriscore_grade.'
WHERE id = '32cfc294-7943-4f72-9b68-ba2b3dafc04d';

UPDATE public.feedback SET resolved = true, resolved_at = now(),
  resolution_notes = COALESCE(resolution_notes,'') || ' [auto] FARMER chocolate no está en OFF; data-confidence cap ahora limita a 60/100 y el fallback computeNutriScore penaliza el azúcar si la foto de tabla nutricional se completa.'
WHERE id = 'a04ada26-9c5c-451c-810d-c2ba89181fd1';

UPDATE public.feedback SET resolved = true, resolved_at = now(),
  resolution_notes = COALESCE(resolution_notes,'') || ' [auto] Prompt de mira-analyze tiene guard explícito: "NEVER write bracketed placeholders like [nombre de usuario]". Si reaparece, escalar como bug de modelo.'
WHERE id = '99be0a90-e63e-4eda-a3bf-64df44ae3285';

UPDATE public.feedback SET resolved = true, resolved_at = now(),
  resolution_notes = COALESCE(resolution_notes,'') || ' [auto] Thumbs-down sin comentario ni contexto adicional — no accionable.'
WHERE id = '8d4be4e5-54bf-49e4-9c0b-2e3ee0fd6ac5';
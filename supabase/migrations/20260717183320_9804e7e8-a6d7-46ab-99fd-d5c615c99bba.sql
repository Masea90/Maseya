UPDATE public.feedback SET resolved = true, resolved_at = now(),
  resolution_notes = COALESCE(resolution_notes, '') || ' [auto] Fixed: supplements ahora entran en rama non-scorable (isSupplement detecta en:dietary-supplements/vitamin y keywords ashwagandha/forte); MiraAnalysis oculto para no-scorables.'
WHERE id IN ('42096ee7-48e0-4d94-97e4-233053cdd024','ad4c7e18-24cc-47a7-8d82-042ec8516b8c','6d57b892-eb10-457e-99cd-0cd2718ca99a');

UPDATE public.feedback SET resolved = true, resolved_at = now(),
  resolution_notes = COALESCE(resolution_notes, '') || ' [auto] Fixed: data-confidence cap limita alimentos sin nutriscore/nutriments a 60/100 (verificado coconut oil 100→60, panela sin nutri capado).'
WHERE id IN ('e48beba2-1455-4efc-bad6-7ef37c33ef93','59b8e95d-8a32-4c5d-b3ae-5248d7568c6d','fe481ff2-a893-44d3-8efa-87a1942c92c1','817dc11a-2b8e-4573-b826-5f58f79da6c3');
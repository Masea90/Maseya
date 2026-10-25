create policy "own scans update" on public.scan_history
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
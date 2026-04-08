-- Allow upsert on push_subscriptions (needs UPDATE for onConflict)
CREATE POLICY "Users can update their own push subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
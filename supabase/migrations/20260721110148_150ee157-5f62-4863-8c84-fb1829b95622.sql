CREATE POLICY "avatars_public_read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');
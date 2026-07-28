
REVOKE ALL ON FUNCTION public.analytics_ingest_recording_chunk(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_ingest_recording_chunk(jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.analytics_list_recordings(text, timestamptz, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_list_recordings(text, timestamptz, int) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.analytics_get_recording(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_get_recording(uuid) TO authenticated, service_role;

-- Public RPC: n8n + React can update guard heartbeat without service role in expressions
CREATE OR REPLACE FUNCTION public.touch_n8n_heartbeat(p_source text DEFAULT 'webhook')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_row n8n_heartbeat%ROWTYPE;
BEGIN
  INSERT INTO n8n_heartbeat (id, last_ping_at, source, status, instance_url, updated_at)
  VALUES (
    'render_lifetime_guard',
    now(),
    COALESCE(NULLIF(trim(p_source), ''), 'webhook'),
    'alive',
    'https://lifesolvenow.onrender.com',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    last_ping_at = EXCLUDED.last_ping_at,
    source = EXCLUDED.source,
    status = EXCLUDED.status,
    instance_url = EXCLUDED.instance_url,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO result_row;

  RETURN to_jsonb(result_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_n8n_heartbeat(text) TO anon, authenticated, service_role;

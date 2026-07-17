
INSERT INTO public.platform_settings (key, value, description) VALUES
('ads', '{"enabled": false, "top": {"enabled": false, "code": ""}, "feed": {"enabled": false, "code": "", "every": 6}, "profile": {"enabled": false, "code": ""}, "mobile_sticky": {"enabled": false, "code": ""}}'::jsonb, 'Códigos de anúncios (AdSense, etc.)'),
('legal', '{"cookies_version": "1", "terms_version": "2026-07", "privacy_version": "2026-07", "contact_email": "contato@forlink.app", "controller_name": "ForLink"}'::jsonb, 'Textos e versões legais (LGPD)')
ON CONFLICT (key) DO NOTHING;

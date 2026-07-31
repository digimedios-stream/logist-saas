-- Migration: Crear buckets de almacenamiento y configurar RLS para fotos

-- 1. Crear buckets si no existen
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('novedades-fotos', 'novedades-fotos', true),
    ('tickets-combustible', 'tickets-combustible', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Asegurar políticas de acceso público
DROP POLICY IF EXISTS "Public Access Novedades" ON storage.objects;
CREATE POLICY "Public Access Novedades" ON storage.objects
    FOR SELECT USING (bucket_id IN ('novedades-fotos', 'tickets-combustible'));

-- 3. Permitir subidas (insertar objetos) a los buckets
DROP POLICY IF EXISTS "Upload Access Novedades" ON storage.objects;
CREATE POLICY "Upload Access Novedades" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('novedades-fotos', 'tickets-combustible'));

-- Migration: Crear tablas para Trazabilidad y Geolocalización

-- 1. Crear tabla viajes
CREATE TABLE public.viajes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    chofer_id UUID NOT NULL REFERENCES public.choferes(id) ON DELETE RESTRICT,
    vehiculo_id UUID REFERENCES public.vehiculos(id) ON DELETE SET NULL,
    cliente TEXT,
    origen TEXT,
    destino TEXT,
    estado TEXT DEFAULT 'en_ruta' CHECK (estado IN ('en_ruta', 'atrasado', 'en_riesgo', 'paralizado', 'finalizado')),
    fecha_inicio TIMESTAMPTZ DEFAULT now(),
    fecha_fin TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Crear tabla ubicaciones_viaje para el historial GPS
CREATE TABLE public.ubicaciones_viaje (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viaje_id UUID NOT NULL REFERENCES public.viajes(id) ON DELETE CASCADE,
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    velocidad DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    precision_gps DOUBLE PRECISION,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.viajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ubicaciones_viaje ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para viajes
-- (a) Los usuarios pueden ver los viajes de su empresa
CREATE POLICY "Ver viajes de mi empresa" ON public.viajes
    FOR SELECT USING (empresa_id = get_user_empresa_id());

-- (b) Los administradores pueden insertar/actualizar viajes de su empresa
CREATE POLICY "Modificar viajes de mi empresa" ON public.viajes
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- 5. Políticas para ubicaciones_viaje
-- (a) Ver ubicaciones de viajes de la misma empresa
CREATE POLICY "Ver ubicaciones de mi empresa" ON public.ubicaciones_viaje
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.viajes v 
            WHERE v.id = ubicaciones_viaje.viaje_id 
            AND v.empresa_id = get_user_empresa_id()
        )
    );

-- (b) Insertar ubicaciones (el chofer puede insertar)
CREATE POLICY "Insertar ubicaciones" ON public.ubicaciones_viaje
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.viajes v 
            WHERE v.id = viaje_id 
            AND v.empresa_id = get_user_empresa_id()
        )
    );

-- 6. Activar Supabase Realtime para la tabla ubicaciones_viaje y viajes
ALTER PUBLICATION supabase_realtime ADD TABLE public.viajes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ubicaciones_viaje;

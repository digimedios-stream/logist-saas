-- ====================================================================
-- MIGRACIÓN: MÓDULO ERP INTEGRAL (VENTAS, COMPRAS, INVENTARIO, TESORERÍA)
-- Fecha: 2026-09-11
-- ====================================================================

-- 1. TABLA: erp_proveedores (Directorio de compras y servicios)
CREATE TABLE IF NOT EXISTS public.erp_proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    razon_social TEXT NOT NULL,
    cuit TEXT,
    condicion_iva TEXT DEFAULT 'responsable_inscripto'
        CHECK (condicion_iva IN ('responsable_inscripto', 'monotributista', 'exento', 'consumidor_final')),
    rubro TEXT DEFAULT 'repuestos'
        CHECK (rubro IN ('repuestos', 'combustible', 'taller_mecanico', 'neumaticos', 'seguros', 'insumos_courier', 'servicios_portuarios', 'otros')),
    email TEXT,
    telefono TEXT,
    direccion TEXT,
    dias_credito INTEGER DEFAULT 30,
    saldo_cuenta_corriente NUMERIC(14,2) DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: erp_compras (Órdenes de compra y facturas de proveedores / AP)
CREATE TABLE IF NOT EXISTS public.erp_compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    proveedor_id UUID REFERENCES public.erp_proveedores(id) ON DELETE SET NULL,
    tipo_comprobante TEXT NOT NULL DEFAULT 'factura_a'
        CHECK (tipo_comprobante IN ('factura_a', 'factura_b', 'factura_c', 'orden_compra', 'remito', 'ticket_combustible', 'otro')),
    numero_comprobante TEXT NOT NULL,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    concepto TEXT NOT NULL,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    iva NUMERIC(14,2) NOT NULL DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    saldo_pendiente NUMERIC(14,2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'pagado_parcial', 'pagado', 'anulado')),
    centro_costo_tipo TEXT DEFAULT 'vehiculo'
        CHECK (centro_costo_tipo IN ('vehiculo', 'linea', 'deposito', 'general')),
    vehiculo_id UUID REFERENCES public.vehiculos(id) ON DELETE SET NULL,
    adjunto_url TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: erp_facturas (Facturación comercial y fiscal de ventas / AR)
CREATE TABLE IF NOT EXISTS public.erp_facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    presupuesto_id UUID REFERENCES public.presupuestos(id) ON DELETE SET NULL,
    tipo_comprobante TEXT NOT NULL DEFAULT 'factura_a'
        CHECK (tipo_comprobante IN ('factura_a', 'factura_b', 'factura_c', 'nota_credito_a', 'nota_credito_b', 'nota_debito', 'recibo_x')),
    punto_venta TEXT NOT NULL DEFAULT '0001',
    numero TEXT NOT NULL,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
    condicion_venta TEXT DEFAULT 'cuenta_corriente'
        CHECK (condicion_venta IN ('contado', 'cuenta_corriente', 'transferencia', 'cheque')),
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    iva NUMERIC(14,2) NOT NULL DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    saldo_pendiente NUMERIC(14,2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'emitida'
        CHECK (estado IN ('borrador', 'emitida', 'cobrada_parcial', 'cobrada', 'anulada')),
    origen_tipo TEXT DEFAULT 'manual'
        CHECK (origen_tipo IN ('presupuesto', 'viaje', 'comex_ot', 'courier_guia', 'manual')),
    origen_id UUID,
    cae TEXT,
    vencimiento_cae DATE,
    pdf_url TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: erp_factura_items (Líneas de detalle de factura)
CREATE TABLE IF NOT EXISTS public.erp_factura_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES public.erp_facturas(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
    unidad_medida TEXT DEFAULT 'unidades',
    precio_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
    alicuota_iva NUMERIC(5,2) DEFAULT 21.00,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: erp_inventario_items (Catálogo de repuestos, lubricantes e insumos)
CREATE TABLE IF NOT EXISTS public.erp_inventario_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo_sku TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT NOT NULL DEFAULT 'repuestos'
        CHECK (categoria IN ('neumaticos', 'filtros', 'aceites_lubricantes', 'frenos', 'baterias', 'suspension', 'insumos_courier', 'otros')),
    unidad_medida TEXT DEFAULT 'unidades'
        CHECK (unidad_medida IN ('unidades', 'litros', 'juegos', 'kilos', 'metros')),
    stock_actual NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 2,
    costo_unitario_promedio NUMERIC(14,2) NOT NULL DEFAULT 0,
    ubicacion_deposito TEXT DEFAULT 'Estantería Principal',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: erp_inventario_movimientos (Kardex inmutable de entradas y salidas)
CREATE TABLE IF NOT EXISTS public.erp_inventario_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.erp_inventario_items(id) ON DELETE CASCADE,
    tipo_movimiento TEXT NOT NULL
        CHECK (tipo_movimiento IN ('entrada_compra', 'salida_mantenimiento', 'salida_consumo', 'ajuste_inventario_positivo', 'ajuste_inventario_negativo')),
    cantidad NUMERIC(12,2) NOT NULL,
    costo_unitario NUMERIC(14,2) DEFAULT 0,
    mantenimiento_id UUID REFERENCES public.mantenimientos(id) ON DELETE SET NULL,
    vehiculo_id UUID REFERENCES public.vehiculos(id) ON DELETE SET NULL,
    compra_id UUID REFERENCES public.erp_compras(id) ON DELETE SET NULL,
    motivo TEXT,
    usuario_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: erp_cajas_cuentas (Cajas chicas y cuentas bancarias)
CREATE TABLE IF NOT EXISTS public.erp_cajas_cuentas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'cuenta_bancaria'
        CHECK (tipo IN ('cuenta_bancaria', 'caja_chica_efectivo', 'billetera_digital')),
    moneda TEXT NOT NULL DEFAULT 'ARS'
        CHECK (moneda IN ('ARS', 'USD')),
    cbu_alias TEXT,
    banco TEXT,
    nro_cuenta TEXT,
    saldo_actual NUMERIC(16,2) NOT NULL DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA: erp_caja_movimientos (Libro diario transaccional / Cashflow)
CREATE TABLE IF NOT EXISTS public.erp_caja_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cuenta_id UUID NOT NULL REFERENCES public.erp_cajas_cuentas(id) ON DELETE RESTRICT,
    tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'transferencia')),
    monto NUMERIC(16,2) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    concepto TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'otros'
        CHECK (categoria IN (
            'cobranza_cliente', 
            'pago_proveedor', 
            'pago_sueldos_choferes', 
            'combustible', 
            'mantenimiento_taller', 
            'peajes_viaticos', 
            'impuestos_tasas', 
            'servicios_generales', 
            'transferencia_interna', 
            'otros'
        )),
    referencia_tipo TEXT
        CHECK (referencia_tipo IN ('factura_venta', 'factura_compra', 'liquidacion_chofer', 'combustible_carga', 'mantenimiento_orden', 'otro')),
    referencia_id UUID,
    cuenta_destino_id UUID REFERENCES public.erp_cajas_cuentas(id) ON DELETE SET NULL,
    comprobante_url TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- RLS (ROW LEVEL SECURITY)
-- ====================================================================
ALTER TABLE public.erp_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_factura_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_inventario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_cajas_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_caja_movimientos ENABLE ROW LEVEL SECURITY;

-- Helper policies
DROP POLICY IF EXISTS p_erp_proveedores_empresa ON public.erp_proveedores;
CREATE POLICY p_erp_proveedores_empresa ON public.erp_proveedores FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_erp_compras_empresa ON public.erp_compras;
CREATE POLICY p_erp_compras_empresa ON public.erp_compras FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_erp_facturas_empresa ON public.erp_facturas;
CREATE POLICY p_erp_facturas_empresa ON public.erp_facturas FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_erp_factura_items_empresa ON public.erp_factura_items;
CREATE POLICY p_erp_factura_items_empresa ON public.erp_factura_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.erp_facturas f 
        WHERE f.id = erp_factura_items.factura_id 
        AND (
            f.empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
            OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
            OR auth.role() = 'service_role'
        )
    )
);

DROP POLICY IF EXISTS p_erp_inventario_items_empresa ON public.erp_inventario_items;
CREATE POLICY p_erp_inventario_items_empresa ON public.erp_inventario_items FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_erp_inventario_movimientos_empresa ON public.erp_inventario_movimientos;
CREATE POLICY p_erp_inventario_movimientos_empresa ON public.erp_inventario_movimientos FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_erp_cajas_cuentas_empresa ON public.erp_cajas_cuentas;
CREATE POLICY p_erp_cajas_cuentas_empresa ON public.erp_cajas_cuentas FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS p_erp_caja_movimientos_empresa ON public.erp_caja_movimientos;
CREATE POLICY p_erp_caja_movimientos_empresa ON public.erp_caja_movimientos FOR ALL USING (
    empresa_id = ((auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid)
    OR (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR auth.role() = 'service_role'
);

-- ====================================================================
-- PUBLICACIÓN EN REALTIME
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_facturas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_compras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_inventario_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_cajas_cuentas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_caja_movimientos;

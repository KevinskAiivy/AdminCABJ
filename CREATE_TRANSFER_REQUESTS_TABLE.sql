-- ============================================
-- Tabla: transfer_requests
-- Descripción: Almacena las solicitudes de transferencia de socios entre consulados
-- ============================================

CREATE TABLE IF NOT EXISTS transfer_requests (
    id TEXT PRIMARY KEY,
    socio_id TEXT NOT NULL,
    socio_name TEXT NOT NULL,
    from_consulado_id TEXT NOT NULL,
    from_consulado_name TEXT NOT NULL,
    to_consulado_id TEXT NOT NULL,
    to_consulado_name TEXT NOT NULL,
    comments TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    request_date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_transfer_requests_socio_id ON transfer_requests(socio_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_from_consulado ON transfer_requests(from_consulado_name);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_to_consulado ON transfer_requests(to_consulado_name);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_request_date ON transfer_requests(request_date);

-- Comentarios en las columnas
COMMENT ON TABLE transfer_requests IS 'Solicitudes de transferencia de socios entre consulados';
COMMENT ON COLUMN transfer_requests.id IS 'Identificador único del transfer request (UUID)';
COMMENT ON COLUMN transfer_requests.socio_id IS 'ID del socio a transferir';
COMMENT ON COLUMN transfer_requests.socio_name IS 'Nombre completo del socio (first_name + last_name)';
COMMENT ON COLUMN transfer_requests.from_consulado_id IS 'ID del consulado de origen';
COMMENT ON COLUMN transfer_requests.from_consulado_name IS 'Nombre del consulado de origen';
COMMENT ON COLUMN transfer_requests.to_consulado_id IS 'ID del consulado de destino';
COMMENT ON COLUMN transfer_requests.to_consulado_name IS 'Nombre del consulado de destino';
COMMENT ON COLUMN transfer_requests.comments IS 'Comentarios opcionales sobre la transferencia';
COMMENT ON COLUMN transfer_requests.status IS 'Estado de la solicitud: PENDING, APPROVED, REJECTED, CANCELLED';
COMMENT ON COLUMN transfer_requests.request_date IS 'Fecha de la solicitud (ISO 8601)';
COMMENT ON COLUMN transfer_requests.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN transfer_requests.updated_at IS 'Fecha de última actualización del registro';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_transfer_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transfer_requests_updated_at
    BEFORE UPDATE ON transfer_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_transfer_requests_updated_at();

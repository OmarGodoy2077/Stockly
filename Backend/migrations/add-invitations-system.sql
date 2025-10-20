-- =====================================================
-- MIGRATION: Add Invitation System for Company Onboarding
-- Fecha: 2025-10-20
-- Descripción: Agrega soporte para invitaciones con códigos únicos
--              Permite que usuarios se unan a empresas existentes o creen una nueva
--              Vigencia de 24 horas para códigos de invitación
-- =====================================================

-- IMPORTANTE: Este script modifica la BD. Ver notas al final para cambios.

-- =====================================================
-- 1. CREAR TABLA INVITATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(12) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON invitations(created_by);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_is_active ON invitations(is_active);
-- Composite index for efficient queries on active non-expired invitations
CREATE INDEX IF NOT EXISTS idx_invitations_active_not_expired ON invitations(is_active, expires_at);

-- =====================================================
-- 3. CREAR FUNCIÓN PARA GENERAR CÓDIGO ÚNICO
-- =====================================================

CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS VARCHAR(12) AS $$
DECLARE
    new_code VARCHAR(12);
    exists_count INT;
BEGIN
    LOOP
        -- Generar código de 8 caracteres (letras mayúsculas y números)
        new_code := UPPER(
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1) ||
            SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CEIL(RANDOM() * 36)::INT, 1)
        );
        
        -- Verificar que el código sea único (using table alias to avoid ambiguity)
        SELECT COUNT(*) INTO exists_count FROM invitations i WHERE i.code = new_code;
        EXIT WHEN exists_count = 0;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREAR TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invitations_updated_at
BEFORE UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION update_invitations_updated_at();

-- =====================================================
-- 5. CREAR FUNCIÓN PARA VALIDAR INVITACIÓN
-- =====================================================

CREATE OR REPLACE FUNCTION validate_invitation(p_code VARCHAR)
RETURNS TABLE(
    invitation_id UUID,
    company_id UUID,
    company_name VARCHAR,
    role VARCHAR,
    is_valid BOOLEAN,
    error_message VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.company_id,
        c.name,
        i.role,
        CASE 
            WHEN i.id IS NULL THEN FALSE
            WHEN i.expires_at < NOW() THEN FALSE
            WHEN i.is_active = FALSE THEN FALSE
            ELSE TRUE
        END as is_valid,
        CASE 
            WHEN i.id IS NULL THEN 'Invitation code not found'::VARCHAR
            WHEN i.expires_at < NOW() THEN 'Invitation code has expired'::VARCHAR
            WHEN i.is_active = FALSE THEN 'Invitation code has been deactivated'::VARCHAR
            ELSE NULL::VARCHAR
        END as error_message
    FROM invitations i
    LEFT JOIN companies c ON i.company_id = c.id
    WHERE i.code = p_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CREAR FUNCIÓN PARA LIMPIAR INVITACIONES EXPIRADAS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS TABLE(cleaned_count INT) AS $$
DECLARE
    count INT;
BEGIN
    UPDATE invitations 
    SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;
    GET DIAGNOSTICS count = ROW_COUNT;
    RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. ACTUALIZAR TABLA user_company PARA MEJOR TRACKING
-- =====================================================

-- Agregar columna para rastrear si el usuario fue invitado
ALTER TABLE user_company 
ADD COLUMN IF NOT EXISTS invitation_code_used VARCHAR(12) REFERENCES invitations(code) ON DELETE SET NULL;

-- Agregar índice
CREATE INDEX IF NOT EXISTS idx_user_company_invitation_code ON user_company(invitation_code_used);

-- =====================================================
-- 8. ROW LEVEL SECURITY PARA INVITATIONS
-- =====================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Solo owners/admins de la empresa pueden ver las invitaciones
CREATE POLICY "Company owners can view invitations" ON invitations
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM user_company 
            WHERE company_id = invitations.company_id 
            AND role IN ('owner', 'admin')
        )
    );

-- Solo owners pueden crear invitaciones
CREATE POLICY "Only owners can create invitations" ON invitations
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM user_company 
            WHERE company_id = invitations.company_id 
            AND role = 'owner'
        )
    );

-- Solo owners pueden actualizar invitaciones
CREATE POLICY "Only owners can update invitations" ON invitations
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM user_company 
            WHERE company_id = invitations.company_id 
            AND role = 'owner'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM user_company 
            WHERE company_id = invitations.company_id 
            AND role = 'owner'
        )
    );

-- =====================================================
-- NOTAS DE CAMBIOS
-- =====================================================

/*
CAMBIOS REALIZADOS:
1. Se agregó tabla 'invitations' para gestionar códigos de invitación
2. Se agregó columna 'invitation_code_used' a 'user_company' para rastrear qué invitación usó el usuario
3. Se creó función 'generate_invitation_code()' para generar códigos únicos automáticamente
4. Se creó función 'validate_invitation()' para validar códigos
5. Se creó función 'cleanup_expired_invitations()' para limpiar códigos expirados
6. Se agregó Row Level Security para invitations
7. Vigencia de códigos: 24 horas (configurable en expires_at)

FLUJO DEL NUEVO SISTEMA:
1. Usuario se registra solo con datos personales
2. Elige si: (a) Crear nueva empresa o (b) Unirse a empresa existente con código
3. Si elige (a): se crea empresa y se asigna como owner
4. Si elige (b): se valida código de invitación y se asigna al rol especificado
5. Owner puede generar códigos con vigencia de 24 horas para invitar a nuevos usuarios

COMPATIBILIDAD:
- No rompe datos existentes
- Columna 'invitation_code_used' es nullable (compatible con usuarios existentes)
- Códigos antiguos se marcan como inactivos automáticamente después de 24 horas
*/

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Invitation system migration completed successfully!';
    RAISE NOTICE 'New table: invitations';
    RAISE NOTICE 'New functions: generate_invitation_code(), validate_invitation(), cleanup_expired_invitations()';
    RAISE NOTICE 'Invitation codes expire after 24 hours';
END $$;

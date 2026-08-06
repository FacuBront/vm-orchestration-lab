-- -----------------------------------------------------------------------------
-- Esquema de la base de datos del pipeline de gestión de vulnerabilidades.
--
-- Dos tablas:
--   scan_history      -> una fila por cada ejecución completa del workflow
--                        (metadatos: cuándo, contra qué objetivo, cuántos
--                        hallazgos produjo). Es la tabla que permite, a
--                        futuro, comparar el estado de riesgo entre
--                        ejecuciones consecutivas.
--   vulnerability_scans -> una fila por cada hallazgo individual, con FK
--                        hacia scan_history. Es la tabla que el nodo
--                        generador de informes recorre al 100% (sin
--                        truncar), y sobre la que corre la consulta de
--                        validación cruzada de la Fase 5.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS scan_history (
    id              SERIAL PRIMARY KEY,
    scan_uuid       VARCHAR(64) NOT NULL UNIQUE,   -- id de tarea/escaneo (ej. taskId de GVM o UUID propio)
    target_range    VARCHAR(64) NOT NULL,          -- ej. "172.28.0.0/24"
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ,
    host_count      INTEGER,
    finding_count   INTEGER,
    status          VARCHAR(20) NOT NULL DEFAULT 'running'  -- running | completed | failed
);

CREATE TABLE IF NOT EXISTS vulnerability_scans (
    id              SERIAL PRIMARY KEY,
    scan_id         INTEGER NOT NULL REFERENCES scan_history(id) ON DELETE CASCADE,
    host_ip         VARCHAR(45) NOT NULL,          -- 45 = largo máximo de una dirección IPv6
    hostname        VARCHAR(255),
    port            INTEGER,
    protocol        VARCHAR(10),
    service_name    VARCHAR(100),
    service_version VARCHAR(255),
    cve_id          VARCHAR(32),                   -- ej. "CVE-2024-12345"
    severity_score  NUMERIC(4,1),                  -- CVSS: 0.0 a 10.0
    severity_label  VARCHAR(20),                   -- Crítica | Alta | Media | Baja | Ninguna
    description     TEXT,
    solution        TEXT,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices sobre los campos que más se van a consultar: filtrado por scan,
-- por host y por severidad (para armar el resumen ejecutivo del informe).
CREATE INDEX IF NOT EXISTS idx_vuln_scan_id   ON vulnerability_scans (scan_id);
CREATE INDEX IF NOT EXISTS idx_vuln_host_ip   ON vulnerability_scans (host_ip);
CREATE INDEX IF NOT EXISTS idx_vuln_severity  ON vulnerability_scans (severity_label);
CREATE INDEX IF NOT EXISTS idx_scan_started   ON scan_history (started_at);

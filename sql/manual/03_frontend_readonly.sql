-- -----------------------------------------------------------------------------
-- OPCIONAL. Rol de solo lectura para el frontend MVP.
--
-- No está en sql/init/ a propósito: esos scripts corren una sola vez, al crear
-- el volumen de datos, y este rol se agrega sobre una base que ya existe. Se
-- corre A MANO, una vez, con el superusuario (valores de tu .env):
--
--   docker exec -i lab_postgres psql -U postgres -d vm_orchestration \
--     -v ro_password='una_clave_para_el_frontend' < sql/manual/03_frontend_readonly.sql
--
-- Después, en .env:
--   DATABASE_URL=postgresql://frontend_ro:una_clave_para_el_frontend@postgres:5432/vm_orchestration
-- y recreá el contenedor del frontend (up -d frontend).
--
-- Sin este rol, el frontend usa POSTGRES_APP_USER, que igual solo hace SELECT
-- (y abre cada sesión con default_transaction_read_only=on).
-- -----------------------------------------------------------------------------

\set ON_ERROR_STOP on

CREATE ROLE frontend_ro WITH LOGIN PASSWORD :'ro_password';

GRANT CONNECT ON DATABASE vm_orchestration TO frontend_ro;
GRANT USAGE ON SCHEMA public TO frontend_ro;

-- Solo SELECT, y solo sobre las dos tablas del pipeline. Sin INSERT, UPDATE,
-- DELETE ni acceso a secuencias.
GRANT SELECT ON scan_history, vulnerability_scans TO frontend_ro;

ALTER ROLE frontend_ro SET default_transaction_read_only = on;

#!/bin/bash
# -----------------------------------------------------------------------------
# Crea un usuario de base de datos separado del superusuario, con permisos
# restringidos a lo estrictamente necesario para el workflow de n8n:
# SELECT, INSERT y UPDATE. Sin DELETE, DROP ni ALTER: si algo en el
# workflow falla o se ejecuta mal, no puede borrar ni destruir el esquema.
#
# Este es exactamente el tipo de buena práctica que el dictamen de
# auditoría reconoció como acierto en la tesis anterior (ver 3.4,
# "Lo que está bien documentado") — la mantenemos desde el diseño inicial
# en vez de agregarla después.
#
# Se ejecuta automáticamente la primera vez que se crea el volumen de
# datos de Postgres (los scripts en /docker-entrypoint-initdb.d/ corren
# una sola vez, en orden alfabético — por eso el prefijo "02_").
# -----------------------------------------------------------------------------
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_SUPERUSER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER ${POSTGRES_APP_USER} WITH PASSWORD '${POSTGRES_APP_PASSWORD}';

    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_APP_USER};
    GRANT USAGE ON SCHEMA public TO ${POSTGRES_APP_USER};

    -- Permisos sobre las tablas que ya existen (creadas por 01_schema.sql,
    -- que corre antes por orden alfabético).
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO ${POSTGRES_APP_USER};
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${POSTGRES_APP_USER};

    -- Permisos por defecto para tablas que se creen en el futuro (por si
    -- se agregan más adelante, p. ej. una tabla de auditoría de ejecuciones).
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE ON TABLES TO ${POSTGRES_APP_USER};
EOSQL

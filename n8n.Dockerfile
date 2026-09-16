# -----------------------------------------------------------------------------
# Imagen de n8n con Nmap embebido — v2
#
# POR QUÉ ESTE ARCHIVO CAMBIÓ DE ENFOQUE (documentar en la tesis, cap. Desarrollo):
# El intento original extendía n8nio/n8n:latest. Al inspeccionar la imagen
# (docker run --entrypoint sh ... cat /etc/os-release) se confirmó que es una
# "Docker Hardened Image" basada en Alpine 3.24 que elimina intencionalmente
# el gestor de paquetes (no existe apk, apt, ni ningún otro) como medida de
# endurecimiento de seguridad: reduce la superficie de ataque al impedir que
# el contenedor instale software en runtime.
#
# Esto es una buena práctica de seguridad en general, pero es incompatible
# con nuestro caso de uso: necesitamos Nmap dentro del mismo contenedor que
# ejecuta el nodo "Execute Command" de n8n.
#
# Solución adoptada: partir de node:20-alpine (imagen Alpine estándar, con
# gestor de paquetes normal) e instalar n8n mediante npm, que es el método
# de autohospedaje ("self-hosted via npm") documentado oficialmente por n8n
# como alternativa a su imagen Docker. Esto nos da control total del sistema
# operativo del contenedor.
# -----------------------------------------------------------------------------

FROM node:20-alpine

# Paquetes del sistema:
# - nmap: el escáner de descubrimiento, motivo original de este archivo.
# - nmap-scripts: en Alpine, el motor de scripting NSE (nse_main.lua y
#   los scripts .nse) viene en un paquete SEPARADO de "nmap". Sin él,
#   Nmap falla al arrancar con "could not locate nse_main.lua" incluso
#   para un escaneo simple, porque inicializa el motor de scripts
#   siempre, se usen scripts explícitos o no.
# - tzdata: para que GENERIC_TIMEZONE/TZ funcionen correctamente en n8n.
# - python3, py3-pip: a diferencia de la v1 de este archivo, ahora
#   quedan en la imagen final (no son solo build-deps) porque el ciclo
#   GMP/GVM necesita ejecutar "gvm-cli" (de gvm-tools, un paquete
#   de Python) en runtime desde el nodo "Execute Command", igual que ya
#   se hace con Nmap.
# - make, g++, libffi-dev, openssl-dev: build-deps. Necesarios solo por
#   si pip tiene que compilar alguna dependencia nativa de gvm-tools
#   (cryptography/lxml) en vez de bajar un wheel prearmado para esta
#   plataforma; se desinstalan en la misma capa igual que antes.
RUN apk add --no-cache nmap nmap-scripts tzdata python3 py3-pip && \
    apk add --no-cache --virtual .build-deps make g++ libffi-dev openssl-dev && \
    npm install -g n8n && \
    pip install --no-cache-dir --break-system-packages gvm-tools && \
    apk del .build-deps && \
    npm cache clean --force

# n8n espera encontrar su carpeta de datos en $HOME/.n8n. Creamos un usuario
# sin privilegios (buena práctica: nunca correr n8n como root) y le damos
# dueño de esa carpeta.
RUN addgroup -S n8n && adduser -S n8n -G n8n && \
    mkdir -p /home/n8n/.n8n && \
    chown -R n8n:n8n /home/n8n

USER n8n
ENV HOME=/home/n8n
WORKDIR /home/n8n

EXPOSE 5678

CMD ["n8n"]

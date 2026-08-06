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
# - nmap: el escáner de descubrimiento, motivo de todo este archivo.
# - nmap-scripts: en Alpine, el motor de scripting NSE (nse_main.lua y
#   los scripts .nse) viene en un paquete SEPARADO de "nmap". Sin él,
#   Nmap falla al arrancar con "could not locate nse_main.lua" incluso
#   para un escaneo simple, porque inicializa el motor de scripts
#   siempre, se usen scripts explícitos o no.
# - tzdata: para que GENERIC_TIMEZONE/TZ funcionen correctamente en n8n.
# - python3, make, g++: dependencias de compilación que necesitan algunos
#   módulos nativos de Node que n8n usa internamente (p. ej. sqlite3).
#   Se instalan y desinstalan en la misma capa para no dejarlas en la
#   imagen final (más liviano, relevante con 4GB de RAM).
RUN apk add --no-cache nmap nmap-scripts tzdata && \
    apk add --no-cache --virtual .build-deps python3 make g++ && \
    npm install -g n8n && \
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

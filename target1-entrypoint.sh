#!/bin/bash
# -----------------------------------------------------------------------------
# Arranca los tres servicios del contenedor objetivo y mantiene el proceso
# principal en primer plano (requisito de Docker: si el proceso PID 1
# termina, el contenedor se apaga). No existe systemd dentro del
# contenedor, así que cada demonio se levanta a mano.
# -----------------------------------------------------------------------------
set -e

echo "[entrypoint] Iniciando sshd (puerto 22)..."
/usr/sbin/sshd

echo "[entrypoint] Iniciando vsftpd (puerto 21)..."
/usr/sbin/vsftpd /etc/vsftpd.conf &

echo "[entrypoint] Iniciando apache2 (puerto 80)..."
service apache2 start

echo "[entrypoint] Los tres servicios están arriba. Manteniendo el contenedor activo."
tail -f /var/log/apache2/access.log /var/log/apache2/error.log

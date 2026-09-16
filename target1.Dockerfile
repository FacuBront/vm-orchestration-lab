# -----------------------------------------------------------------------------
# Contenedor objetivo con vulnerabilidades reales y conocidas, construido
# desde cero.
#
# POR QUÉ EXISTE ESTE ARCHIVO (documentar en la tesis, cap. Desarrollo):
# El plan original era usar una imagen comunitaria de Metasploitable2
# (citizenstig/metasploitable2). Al intentar descargarla, Docker Hub
# respondió "repository does not exist" — la imagen fue retirada. Una
# búsqueda posterior (docker search metasploitable) solo encontró
# repositorios personales sin mantenimiento verificable (0 a 4 estrellas,
# mantenedores anónimos), inadecuados para citar en un trabajo académico
# por falta de procedencia trazable y por el riesgo de que desaparezcan
# de nuevo sin aviso.
#
# En su lugar, se construye un contenedor propio a partir de una versión
# de Ubuntu ya fuera de soporte estándar, instalando los servicios de red
# tal como los distribuía esa versión en su momento. Al ser paquetes de
# una distribución EOL, sus versiones son intrínsecamente antiguas y
# corresponden a CVEs reales, documentados y verificables contra el NVD
# — exactamente lo que un escáner de vulnerabilidades como GVM (o Nmap
# con scripts NSE) debe poder detectar.
#
# NOTA TÉCNICA #2 (documentar en la tesis): el primer intento usó Ubuntu
# 16.04 "Xenial" y falló con 404 incluso apuntando a old-releases.ubuntu.com.
# Se pivoteó a Ubuntu 18.04 "Bionic" asumiendo que necesitaría el mismo
# redireccionamiento a old-releases -pero antes de repetir el mismo error
# a ciegas, se verificó con un contenedor descartable
# (docker run --rm ubuntu:18.04 sh -c "apt-get update") si esa suposición
# era correcta. No lo era: Bionic, gracias al soporte extendido (ESM),
# TODAVÍA está en los mirrors primarios (archive.ubuntu.com y
# security.ubuntu.com) sin ningún cambio. La redirección a old-releases
# era innecesaria y, de hecho, la causa del segundo fallo. Se elimina por
# completo el paso de "sed" para esta versión.
#
# Ventaja metodológica adicional: al controlar exactamente qué versión de
# cada servicio se instaló, se puede contrastar los hallazgos reportados
# por el escáner contra la lista de vulnerabilidades deliberadamente
# instaladas — la validación cruzada de falsos positivos y negativos que
# desarrolla el capítulo de Discusión.
# -----------------------------------------------------------------------------

FROM ubuntu:18.04

# Ubuntu 18.04 llegó a su fin de soporte estándar en abril de 2023, pero
# sigue disponible en los mirrors primarios normales gracias al soporte
# extendido (ESM) de Canonical — verificado empíricamente antes de
# escribir esta línea (ver NOTA TÉCNICA #2 más arriba). No hace falta
# ningún cambio de mirror.

# Los tres servicios objetivo: SSH, FTP y un servidor web. Las versiones
# que instala apt son las que Ubuntu 18.04 distribuía originalmente
# (no las últimas disponibles), así que ya vienen "desactualizadas por
# definición" respecto del día de hoy. Confirmado en el primer escaneo
# real: OpenSSH 7.6p1 y Apache 2.4.29, ambos con CVEs documentados.
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        openssh-server \
        vsftpd \
        apache2 \
    && rm -rf /var/lib/apt/lists/*

# openssh-server necesita sus claves de host generadas antes de poder
# arrancar. En una instalación normal esto lo hace un hook post-install
# del paquete .deb disparado por systemd, que no existe dentro de un
# contenedor — por eso se genera a mano acá.
RUN mkdir -p /var/run/sshd && ssh-keygen -A

# vsftpd espera este directorio para su "secure_chroot_dir" (aislamiento
# de usuarios anónimos/no autenticados). Sin él, vsftpd igual arranca y
# responde, pero reporta un estado "broken" visible en el escaneo de
# Nmap (se detectó exactamente este problema en la primera prueba real).
RUN mkdir -p /var/run/vsftpd/empty

COPY target1-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Puertos que este contenedor expone dentro de la red del laboratorio
# (documentación, no abre nada por sí solo — eso lo controla el
# docker-compose.yml).
EXPOSE 21 22 80

ENTRYPOINT ["/entrypoint.sh"]

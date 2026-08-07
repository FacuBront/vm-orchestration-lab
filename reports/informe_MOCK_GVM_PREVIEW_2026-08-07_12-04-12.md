# [PREVIEW - DATOS SIMULADOS, NO REALES] Informe de Escaneo de Red

> ⚠️ Este informe se generó con datos de GVM SIMULADOS (ver gvm-integration/README.md).
> No representa un escaneo real. Sirve para validar que el pipeline completo
> (parseo -> agrupación por severidad -> informe) funciona antes de tener GVM instalado.

**ID de escaneo:** MOCK-PREVIEW-828eb688-9e5e-49fc-b789-47947209860e
**Rango/objetivo:** 172.28.0.20
**Inicio:** 2026-08-07T15:01:26.675Z
**Fin:** 2026-08-07T15:01:26.677Z
**Hosts analizados:** 1
**Hallazgos totales:** 3 de 3 recuperados (correspondencia 1:1 verificada)

## Inventario de hosts

| Host (IP) | Hostname | Puertos detectados | Cant. hallazgos |
|---|---|---|---|
| 172.28.0.20 | target1 | 80, 22, 21 | 3 |


## Detalle de hallazgos

### Alta (1)

- **172.28.0.20:80/tcp** — http (Apache httpd 2.4.29 ((Ubuntu)))
  - CVE: CVE-2019-0211
  - Descripción: A local privilege escalation flaw exists in Apache HTTP Server 2.4.17 through 2.4.38 due to unsafe handling of the scoreboard by child processes.
  - Solución recomendada: Actualizar a Apache HTTP Server 2.4.39 o superior.

### Media (1)

- **172.28.0.20:22/tcp** — ssh (OpenSSH 7.6p1 Ubuntu 4ubuntu0.7)
  - CVE: CVE-2018-15473
  - Descripción: OpenSSH through 7.7 is prone to a user enumeration vulnerability due to not delaying bailout for an invalid authenticating user until after the packet containing the request has been fully parsed.
  - Solución recomendada: Actualizar a OpenSSH 7.8 o superior.

### Ninguna (1)

- **172.28.0.20:21/tcp** — ftp (vsftpd 3.0.3)
  - Descripción: Se detectó un servicio FTP (vsftpd 3.0.3). No se identificó una vulnerabilidad crítica conocida para esta versión específica.
  - Solución recomendada: Verificar la configuración de acceso anónimo y mantener el servicio actualizado.


## Recomendaciones generales

- Correlacionar estos hallazgos con una base de datos de CVE (GVM/Greenbone) antes de tomar acciones de remediación.
- Mantener actualizado el software de cada servicio detectado a su versión estable más reciente.
- Restringir el acceso de red a los puertos detectados únicamente a los hosts que efectivamente lo necesiten.
- Repetir este escaneo de forma periódica para detectar desviaciones respecto de esta línea base.

---
*Informe generado automáticamente. PREVIEW con datos simulados, scan_id = MOCK-PREVIEW-828eb688-9e5e-49fc-b789-47947209860e.*

# Rendimiento y seguridad en produccion

## Indices de base de datos

Ejecuta este script despues de crear la base o cuando lo subas al VPS:

```bash
psql -h localhost -U indesa_user -d indesa -f database/performance-indexes.sql
```

Estos indices ayudan a que PostgreSQL no tenga que leer tablas completas en busquedas de catalogo, reservas, inventario, usuarios y reportes.

## Cache de consultas

El frontend mantiene datos consultados por 60 segundos y evita repetir solicitudes iguales que ocurren al mismo tiempo. El backend tambien marca el catalogo publico con cache corto:

- `Cache-Control: public, max-age=30, stale-while-revalidate=120` para catalogo publico.
- `Cache-Control: no-store` para administracion, login, reservas y datos sensibles.

## Pruebas de carga

Para probar varias solicitudes concurrentes:

```bash
BASE_URL=http://localhost:4000 REQUESTS=300 CONCURRENCY=30 pnpm load:test
```

En el VPS cambia `BASE_URL` por tu dominio o por `http://localhost:4000` si lo ejecutas dentro del servidor.

## Ocultar version del servidor

La aplicacion Express ya desactiva `X-Powered-By`. Si el navegador muestra `Ubuntu` o version de Nginx, eso viene del proxy del servidor. En Nginx agrega:

```nginx
server_tokens off;
proxy_hide_header X-Powered-By;
```

Si necesitas ocultar por completo el encabezado `Server`, instala el modulo `headers-more` y agrega:

```nginx
more_clear_headers Server;
```

Despues reinicia Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

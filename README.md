# Facturación Prolog - Grupo 8

Sistema didáctico de facturación para SC-250. Incluye catálogo, clientes, creación/emisión de facturas, inventario, descuentos, IVA, historial y reportes.

## Ejecutar

Requiere Node.js 22.5 o superior (usa `node:sqlite`, sin dependencias externas).

```bash
npm start
```

Abra `http://localhost:3000`. En el primer arranque se crea `data/facturacion.db` y se cargan datos de demostración.

```bash
npm test
```

## Arquitectura

```text
web (HTML, CSS, JS) -> API Node.js -> SQLite
                              |
                         reglas/reglas.pl
```

`reglas/reglas.pl` contiene el motor declarativo solicitado, con kits recursivos y el predicado `evaluar_factura/6`. La API usa un adaptador JavaScript equivalente mientras se instala SWI-Prolog en Windows; no se debe afirmar que la API ejecuta Prolog hasta instalarlo e integrar el proceso.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/productos` | Catálogo y stock |
| POST / PUT | `/api/productos` y `/api/productos/:codigo` | Crear o editar productos |
| GET | `/api/clientes` | Clientes |
| POST | `/api/clientes` | Crear cliente |
| GET | `/api/facturas?estado=&cliente=` | Historial |
| GET | `/api/facturas/:id` | Detalle |
| POST | `/api/facturas` | Crear borrador con líneas |
| POST | `/api/facturas/:id/emitir` | Validar, calcular y emitir/rechazar |
| GET | `/api/reportes` | Ventas, IVA y productos vendidos |

## Reglas implementadas

- IVA: general 13 %, medicamento 2 %, canasta 1 % y exento 0 %.
- Kits recursivos: precio de componentes menos 5 % e IVA general.
- Descuento por volumen: 5 % desde 10 unidades; 10 % desde 50.
- Descuento por nivel: oro 10 %, plata 5 %, regular 0 %, después del descuento por volumen.
- Cliente exonerado: IVA 0.
- Redondeo por línea al colón.
- Validaciones: líneas, cantidad, stock y crédito.

## Equipo y pendientes de entrega

Completen los nombres del grupo, creen los Issues e incluyan una colección Postman y las capturas en este README. No suban `.env` ni bases de datos a Git.

## Verificación

Ejecute `npm test`: hay 15 casos de reglas (IVA, descuentos, crédito, cantidades, stock y redondeo). La colección Postman contiene 12 peticiones y 27 verificaciones. Antes de entregar, ejecútenla completa desde Postman y guarden una captura del resultado.

## Evidencia pendiente del equipo

- Agregar los nombres y roles de los integrantes.
- Crear Issues con las historias de usuario y criterios de aceptación.
- Hacer ramas y Pull Requests reales, revisados por otra persona.
- Añadir capturas de la interfaz funcionando y el diagrama de arquitectura.
- Crear el Release o etiqueta `v1.0` al finalizar.

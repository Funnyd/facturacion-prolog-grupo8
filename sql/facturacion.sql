-- Esquema SQLite para desarrollo. En PostgreSQL cambie INTEGER PRIMARY KEY por SERIAL/IDENTITY.
CREATE TABLE IF NOT EXISTS productos (
  codigo TEXT PRIMARY KEY, nombre TEXT NOT NULL, categoria TEXT NOT NULL,
  precio INTEGER NOT NULL CHECK(precio > 0), stock INTEGER NOT NULL CHECK(stock >= 0), es_kit INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kit_componentes (
  kit_codigo TEXT NOT NULL REFERENCES productos(codigo), componente_codigo TEXT NOT NULL REFERENCES productos(codigo),
  cantidad INTEGER NOT NULL CHECK(cantidad > 0), PRIMARY KEY(kit_codigo, componente_codigo)
);
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, tipo TEXT NOT NULL CHECK(tipo IN ('contribuyente','consumidor_final','exonerado')),
  nivel TEXT NOT NULL CHECK(nivel IN ('oro','plata','regular'))
);
CREATE TABLE IF NOT EXISTS facturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT, consecutivo INTEGER UNIQUE, cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  forma_pago TEXT NOT NULL CHECK(forma_pago IN ('contado','credito')), estado TEXT NOT NULL DEFAULT 'borrador',
  subtotal INTEGER, iva INTEGER, total INTEGER, errores TEXT, creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS lineas_factura (
  id INTEGER PRIMARY KEY AUTOINCREMENT, factura_id INTEGER NOT NULL REFERENCES facturas(id), producto_codigo TEXT NOT NULL REFERENCES productos(codigo),
  cantidad INTEGER NOT NULL, precio_unitario INTEGER, descuento_volumen REAL, descuento_cliente REAL, base INTEGER, iva INTEGER
);

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
mkdirSync(dataDir, { recursive: true });
export const db = new DatabaseSync(join(dataDir, 'facturacion.db'));
db.exec('PRAGMA foreign_keys = ON');
db.exec(readFileSync(join(root, 'sql', 'facturacion.sql'), 'utf8'));

if (db.prepare('SELECT COUNT(*) AS n FROM productos').get().n === 0) {
  const productos = [
    ['p1', 'arroz_1kg', 'canasta', 1200, 200, 0], ['p2', 'laptop', 'general', 450000, 15, 0],
    ['p3', 'paracetamol', 'medicamento', 1500, 500, 0], ['p4', 'mouse', 'general', 8500, 80, 0],
    ['p5', 'hora_soporte', 'general', 25000, 9999, 0], ['p6', 'libro_texto', 'exento', 12000, 30, 0],
    ['p7', 'teclado', 'general', 18000, 40, 0], ['k1', 'kit_oficina', 'general', 452675, 10, 1], ['k2', 'kit_oficina_con_soporte', 'general', 453791, 10, 1]
  ];
  const p = db.prepare('INSERT INTO productos VALUES (?, ?, ?, ?, ?, ?)');
  for (const item of productos) p.run(...item);
  for (const c of [['k1', 'p2', 1], ['k1', 'p4', 1], ['k1', 'p7', 1], ['k2', 'k1', 1], ['k2', 'p5', 1]]) db.prepare('INSERT INTO kit_componentes VALUES (?, ?, ?)').run(...c);
  const cliente = db.prepare('INSERT INTO clientes (nombre,tipo,nivel) VALUES (?, ?, ?)');
  [['tienda_sol', 'contribuyente', 'oro'], ['juan_perez', 'consumidor_final', 'regular'], ['fundacion_esperanza', 'exonerado', 'plata'], ['comercial_luna', 'contribuyente', 'regular']].forEach(x => cliente.run(...x));
  const factura = db.prepare('INSERT INTO facturas (id,cliente_id,forma_pago) VALUES (?,?,?)');
  [[1,1,'contado'],[2,2,'contado'],[3,3,'contado'],[4,4,'credito'],[5,2,'contado'],[6,1,'credito']].forEach(x => factura.run(...x));
  const linea = db.prepare('INSERT INTO lineas_factura (factura_id,producto_codigo,cantidad) VALUES (?,?,?)');
  [[1,'p2',2],[1,'p4',12],[1,'p5',3],[2,'p1',10],[2,'p3',2],[2,'p6',1],[3,'p2',1],[3,'p7',10],[4,'p4',5],[5,'p2',20],[6,'k2',1]].forEach(x => linea.run(...x));
}

export const all = (sql, ...params) => db.prepare(sql).all(...params);
export const one = (sql, ...params) => db.prepare(sql).get(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);

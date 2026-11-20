import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, all, one, run } from './db.js';
import { calcularLinea, validarFactura } from './rules.js';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
const body = req => new Promise((resolve, reject) => { let raw = ''; req.on('data', c => raw += c); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('JSON inválido')); } }); });
const producto = codigo => one('SELECT * FROM productos WHERE codigo = ?', codigo);
function precioEfectivo(codigo, visitados = new Set()) {
  if (visitados.has(codigo)) throw new Error('Un kit no puede contenerse a sí mismo.');
  const p = producto(codigo); if (!p) throw new Error(`Producto no encontrado: ${codigo}.`);
  if (!p.es_kit) return p.precio;
  visitados.add(codigo);
  const suma = all('SELECT componente_codigo,cantidad FROM kit_componentes WHERE kit_codigo=?', codigo).reduce((total, c) => total + precioEfectivo(c.componente_codigo, new Set(visitados)) * c.cantidad, 0);
  return suma * 0.95;
}

function detalleFactura(id) {
  const factura = one(`SELECT f.*, c.nombre cliente_nombre, c.tipo cliente_tipo, c.nivel cliente_nivel FROM facturas f JOIN clientes c ON c.id=f.cliente_id WHERE f.id=?`, id);
  if (!factura) return null;
  factura.errores = factura.errores ? JSON.parse(factura.errores) : [];
  factura.lineas = all(`SELECT l.*, p.nombre producto_nombre FROM lineas_factura l JOIN productos p ON p.codigo=l.producto_codigo WHERE factura_id=?`, id);
  return factura;
}

function emitir(id) {
  const factura = detalleFactura(id);
  if (!factura) return { status: 404, data: { error: 'Factura no encontrada.' } };
  if (factura.estado !== 'borrador') return { status: 409, data: { error: 'La factura ya fue procesada.' } };
  const productos = new Map(factura.lineas.map(l => { const p=producto(l.producto_codigo); return [l.producto_codigo, {...p, precio: precioEfectivo(l.producto_codigo)}]; }));
  const errores = validarFactura({ tipo: factura.cliente_tipo, nivel: factura.cliente_nivel }, factura.forma_pago, factura.lineas, productos);
  db.exec('BEGIN IMMEDIATE');
  try {
    if (errores.length) {
      run(`UPDATE facturas SET estado='rechazada', errores=? WHERE id=?`, JSON.stringify(errores), id);
    } else {
      let subtotal = 0, iva = 0;
      for (const linea of factura.lineas) {
        const p = productos.get(linea.producto_codigo); const calc = calcularLinea(p, linea.cantidad, { tipo: factura.cliente_tipo, nivel: factura.cliente_nivel });
        subtotal += calc.base; iva += calc.iva;
        run('UPDATE lineas_factura SET precio_unitario=?,descuento_volumen=?,descuento_cliente=?,base=?,iva=? WHERE id=?', calc.precio_unitario, calc.descuento_volumen, calc.descuento_cliente, calc.base, calc.iva, linea.id);
        run('UPDATE productos SET stock=stock-? WHERE codigo=?', linea.cantidad, p.codigo);
      }
      const consecutivo = one("SELECT COALESCE(MAX(consecutivo), 0) + 1 AS n FROM facturas WHERE estado='emitida'").n;
      run("UPDATE facturas SET estado='emitida', consecutivo=?, subtotal=?, iva=?, total=?, errores='[]' WHERE id=?", consecutivo, subtotal, iva, subtotal + iva, id);
    }
    db.exec('COMMIT'); return { status: 200, data: detalleFactura(id) };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

async function api(req, res, url) {
  const path = url.pathname, method = req.method;
  if (method === 'GET' && path === '/api/productos') return json(res, 200, all('SELECT * FROM productos ORDER BY codigo'));
  if (method === 'POST' && path === '/api/productos') { const b=await body(req); if (!b.codigo || !b.nombre || !['general','medicamento','canasta','exento'].includes(b.categoria) || !Number.isInteger(b.precio) || b.precio<=0 || !Number.isInteger(b.stock) || b.stock<0) return json(res,400,{error:'Producto inválido: revise código, categoría, precio y stock.'}); try { run('INSERT INTO productos (codigo,nombre,categoria,precio,stock,es_kit) VALUES (?,?,?,?,?,0)',b.codigo,b.nombre,b.categoria,b.precio,b.stock); return json(res,201,producto(b.codigo)); } catch { return json(res,409,{error:'Ya existe un producto con ese código.'}); } }
  if (method === 'PUT' && /^\/api\/productos\/[^/]+$/.test(path)) { const codigo=decodeURIComponent(path.split('/')[3]); const b=await body(req); if (!producto(codigo)) return json(res,404,{error:'Producto no encontrado.'}); if (!b.nombre || !['general','medicamento','canasta','exento'].includes(b.categoria) || !Number.isInteger(b.precio) || b.precio<=0 || !Number.isInteger(b.stock) || b.stock<0) return json(res,400,{error:'Producto inválido.'}); run('UPDATE productos SET nombre=?,categoria=?,precio=?,stock=? WHERE codigo=?',b.nombre,b.categoria,b.precio,b.stock,codigo); return json(res,200,producto(codigo)); }
  if (method === 'GET' && path === '/api/clientes') return json(res, 200, all('SELECT * FROM clientes ORDER BY nombre'));
  if (method === 'POST' && path === '/api/clientes') { const b = await body(req); if (!b.nombre || !['contribuyente','consumidor_final','exonerado'].includes(b.tipo) || !['oro','plata','regular'].includes(b.nivel)) return json(res,400,{error:'Cliente inválido.'}); const r=run('INSERT INTO clientes (nombre,tipo,nivel) VALUES (?,?,?)',b.nombre,b.tipo,b.nivel); return json(res,201,one('SELECT * FROM clientes WHERE id=?',r.lastInsertRowid)); }
  if (method === 'POST' && path === '/api/facturas') { const b = await body(req); if (!Number.isInteger(b.cliente_id) || !['contado','credito'].includes(b.forma_pago) || !Array.isArray(b.lineas)) return json(res,400,{error:'Datos de factura inválidos.'}); if (!one('SELECT 1 FROM clientes WHERE id=?',b.cliente_id)) return json(res,404,{error:'Cliente no encontrado.'}); for (const l of b.lineas) { if (!l || typeof l.producto_codigo !== 'string' || !Number.isInteger(l.cantidad) || l.cantidad <= 0) return json(res,400,{error:'Cada línea requiere un producto y una cantidad entera positiva.'}); if (!producto(l.producto_codigo)) return json(res,404,{error:`Producto no encontrado: ${l.producto_codigo}.`}); } const r=run('INSERT INTO facturas (cliente_id,forma_pago) VALUES (?,?)',b.cliente_id,b.forma_pago); for(const l of b.lineas) run('INSERT INTO lineas_factura (factura_id,producto_codigo,cantidad) VALUES (?,?,?)',r.lastInsertRowid,l.producto_codigo,l.cantidad); return json(res,201,detalleFactura(r.lastInsertRowid)); }
  if (method === 'POST' && /^\/api\/facturas\/\d+\/emitir$/.test(path)) { const out=emitir(Number(path.split('/')[3])); return json(res,out.status,out.data); }
  if (method === 'GET' && /^\/api\/facturas\/\d+$/.test(path)) { const f=detalleFactura(Number(path.split('/')[3])); return f ? json(res,200,f) : json(res,404,{error:'Factura no encontrada.'}); }
  if (method === 'GET' && path === '/api/facturas') { let sql=`SELECT f.id,f.consecutivo,f.forma_pago,f.estado,f.subtotal,f.iva,f.total,f.creada_en,c.nombre cliente_nombre FROM facturas f JOIN clientes c ON c.id=f.cliente_id WHERE 1=1`, p=[]; if(url.searchParams.has('estado')){sql+=' AND f.estado=?';p.push(url.searchParams.get('estado'));} if(url.searchParams.has('cliente')){sql+=' AND f.cliente_id=?';p.push(url.searchParams.get('cliente'));} return json(res,200,all(sql+' ORDER BY f.id DESC',...p)); }
  if (method === 'GET' && path === '/api/reportes') { const resumen=one("SELECT COALESCE(SUM(total),0) ventas,COALESCE(SUM(iva),0) iva FROM facturas WHERE estado='emitida'"); const productos=all("SELECT p.codigo,p.nombre,COALESCE(SUM(CASE WHEN f.estado='emitida' THEN l.cantidad ELSE 0 END),0) unidades FROM productos p LEFT JOIN lineas_factura l ON l.producto_codigo=p.codigo LEFT JOIN facturas f ON f.id=l.factura_id GROUP BY p.codigo ORDER BY unidades DESC, p.nombre"); return json(res,200,{...resumen, productos, mas_vendido:productos[0]}); }
  return json(res,404,{error:'Ruta no encontrada.'});
}

createServer(async (req,res) => { const url=new URL(req.url,'http://localhost'); try { if(url.pathname.startsWith('/api/')) return await api(req,res,url); const file=url.pathname==='/'?'index.html':url.pathname.slice(1); const allowed=['.html','.css','.js']; if(!allowed.includes(extname(file))) return json(res,404,{error:'Archivo no encontrado.'}); const data=await readFile(join(root,'web',file)); res.writeHead(200,{'Content-Type':extname(file)==='.css'?'text/css':extname(file)==='.js'?'text/javascript':'text/html'}); res.end(data); } catch(e) { json(res,500,{error:e.message}); } }).listen(process.env.PORT || 3000,()=>console.log('Facturación disponible en http://localhost:3000'));

import test from 'node:test'; import assert from 'node:assert/strict'; import { calcularLinea, validarFactura } from '../api/rules.js';
const p={codigo:'X',nombre:'Producto',categoria:'general',precio:1000,stock:15};
test('aplica volumen antes de nivel oro',()=>{const r=calcularLinea(p,12,{tipo:'contribuyente',nivel:'oro'});assert.equal(r.base,10260);assert.equal(r.iva,1334)});
test('cliente exonerado no paga IVA',()=>assert.equal(calcularLinea(p,1,{tipo:'exonerado',nivel:'plata'}).iva,0));
test('rechaza crédito de cliente regular',()=>assert.match(validarFactura({tipo:'consumidor_final',nivel:'regular'},'credito',[{producto_codigo:'X',cantidad:1}],new Map([['X',p]]))[0],/Crédito/));
test('detecta falta de stock',()=>assert.match(validarFactura({tipo:'contribuyente',nivel:'oro'},'contado',[{producto_codigo:'X',cantidad:20}],new Map([['X',p]]))[0],/Stock insuficiente/));

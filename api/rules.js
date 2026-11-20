const ivaPorCategoria = { general: 0.13, medicamento: 0.02, canasta: 0.01, exento: 0 };
const descuentoNivel = { oro: 0.10, plata: 0.05, regular: 0 };

export function calcularLinea(producto, cantidad, cliente) {
  const descuento_volumen = cantidad >= 50 ? 0.10 : cantidad >= 10 ? 0.05 : 0;
  const descuento_cliente = descuentoNivel[cliente.nivel] ?? 0;
  const base = Math.round(producto.precio * cantidad * (1 - descuento_volumen) * (1 - descuento_cliente));
  const iva = cliente.tipo === 'exonerado' ? 0 : Math.round(base * (ivaPorCategoria[producto.categoria] ?? 0));
  return { precio_unitario: producto.precio, descuento_volumen, descuento_cliente, base, iva };
}

export function validarFactura(cliente, formaPago, lineas, productos) {
  const errores = [];
  if (!lineas.length) errores.push('La factura debe incluir al menos una línea.');
  if (formaPago === 'credito' && !(cliente.tipo === 'contribuyente' && ['oro', 'plata'].includes(cliente.nivel))) errores.push('Crédito no permitido para este cliente.');
  for (const linea of lineas) {
    const producto = productos.get(linea.producto_codigo);
    if (!Number.isInteger(linea.cantidad) || linea.cantidad <= 0) errores.push(`La cantidad de ${linea.producto_codigo} debe ser un entero mayor que cero.`);
    else if (!producto) errores.push(`El producto ${linea.producto_codigo} no existe.`);
    else if (linea.cantidad > producto.stock) errores.push(`Stock insuficiente para ${producto.nombre}: disponible ${producto.stock}.`);
  }
  return errores;
}

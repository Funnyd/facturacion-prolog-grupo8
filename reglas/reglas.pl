:- use_module(library(lists)).
:- consult(facturacion_datos).

iva_categoria(general, 0.13). iva_categoria(medicamento, 0.02).
iva_categoria(canasta, 0.01). iva_categoria(exento, 0.0).
descuento_volumen(Cantidad, 0.10) :- Cantidad >= 50, !.
descuento_volumen(Cantidad, 0.05) :- Cantidad >= 10, !.
descuento_volumen(_, 0.0).
descuento_cliente(oro, 0.10). descuento_cliente(plata, 0.05). descuento_cliente(regular, 0.0).
credito_permitido(contribuyente, oro). credito_permitido(contribuyente, plata).

% Kits recursivos: suma los componentes y descuenta 5 %.
precio_item(Codigo, Precio) :- producto(Codigo, _, _, Precio, _), !.
precio_item(Codigo, Precio) :- kit(Codigo, Componentes), maplist(precio_item, Componentes, Precios), sum_list(Precios, Suma), Precio is Suma * 0.95.
categoria_item(Codigo, Categoria) :- producto(Codigo, _, Categoria, _, _), !.
categoria_item(Codigo, general) :- kit(Codigo, _).

total_linea(Tipo, Nivel, Codigo, Cantidad, Base, Iva) :-
  precio_item(Codigo, Precio), categoria_item(Codigo, Categoria),
  descuento_volumen(Cantidad, DV), descuento_cliente(Nivel, DC),
  Base is round(Precio * Cantidad * (1 - DV) * (1 - DC)),
  (Tipo = exonerado -> Iva = 0 ; iva_categoria(Categoria, Tarifa), Iva is round(Base * Tarifa)).

error_factura(Factura, 'La factura debe incluir al menos una linea.') :- \+ linea(Factura, _, _).
error_factura(Factura, 'Credito no permitido para este cliente.') :-
  factura(Factura, Cliente, credito), cliente(Cliente, _, Tipo, Nivel), \+ credito_permitido(Tipo, Nivel).
error_factura(Factura, Error) :- linea(Factura, Codigo, Cantidad), Cantidad =< 0, format(string(Error), 'La cantidad de ~w debe ser mayor que cero.', [Codigo]).
error_factura(Factura, Error) :- linea(Factura, Codigo, Cantidad), producto(Codigo, Nombre, _, _, Stock), Cantidad > Stock, format(string(Error), 'Stock insuficiente para ~w: disponible ~w.', [Nombre, Stock]).

linea_factura(Factura, Codigo, Cantidad, Base, Iva) :- factura(Factura, Cliente, _), cliente(Cliente, _, Tipo, Nivel), linea(Factura, Codigo, Cantidad), total_linea(Tipo, Nivel, Codigo, Cantidad, Base, Iva).
evaluar_factura(Factura, Estado, Subtotal, Iva, Total, Errores) :-
  findall(Error, error_factura(Factura, Error), Errores), (Errores = [] -> Estado = emitida ; Estado = rechazada),
  findall(Base, linea_factura(Factura, _, _, Base, _), Bases), sum_list(Bases, Subtotal), findall(Impuesto, linea_factura(Factura, _, _, _, Impuesto), Impuestos), sum_list(Impuestos, Iva), Total is Subtotal + Iva.

% Consulta de control: ?- evaluar_factura(2,E,S,I,T,Errores).

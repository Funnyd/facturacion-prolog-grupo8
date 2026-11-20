:- use_module(library(lists)).
:- consult(facturacion_datos).

iva(general, 0.13). iva(medicamento, 0.02). iva(canasta, 0.01). iva(exento, 0.0).
descuento_volumen(C, 0.10) :- C >= 50, !.
descuento_volumen(C, 0.05) :- C >= 10, !.
descuento_volumen(_, 0.0).
descuento_cliente(oro, 0.10). descuento_cliente(plata, 0.05). descuento_cliente(regular, 0.0).
credito_permitido(contribuyente, oro). credito_permitido(contribuyente, plata).

% Los hechos producto/5, kit/2 y cliente/4 los entrega la capa de datos.
precio_producto(Codigo, Precio) :- producto(Codigo, _, _, Precio, _).
precio_producto(Codigo, Precio) :- kit(Codigo, Componentes), maplist(precio_componente, Componentes, Precios), sum_list(Precios, Suma), Precio is round(Suma * 0.95).
precio_componente(Codigo-Cantidad, Precio) :- precio_producto(Codigo, Unitario), Precio is Unitario * Cantidad.

linea_total(Tipo, Nivel, Categoria, Precio, Cantidad, Base, Iva) :-
  descuento_volumen(Cantidad, DV), descuento_cliente(Nivel, DC),
  Base is round(Precio * Cantidad * (1 - DV) * (1 - DC)),
  (Tipo = exonerado -> Iva = 0 ; iva(Categoria, Tarifa), Iva is round(Base * Tarifa)).

error_credito(credito, Tipo, Nivel, 'Crédito no permitido para este cliente') :- \+ credito_permitido(Tipo, Nivel).

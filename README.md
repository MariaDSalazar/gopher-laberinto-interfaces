# Gopher Laberinto

Juego de laberinto para introducir las interfaces en Go (semana 11 de POO). El gopher recorre el laberinto y recoge
las fichas de código que cumplen el contrato del nivel; las trampas cuestan una vida y muestran el error real de Go.
Cuatro bugs lo persiguen (Nil, Panic, Typo y Loop); al cumplir el contrato se asustan y se abre la salida.

## Niveles

Hilo: la caja de una tienda en línea que cobra con varios medios de pago (`MedioPago`).

| Nivel | Lo que se practica | Fichas |
|---|---|---|
| 1 · El contrato | Qué es una interfaz: lista de métodos sin código; mayúsculas, nombre y receptor | 2 correctas, 3 trampas |
| 2 · La firma exacta | Mismos tipos de parámetros y de resultado; el nombre del parámetro no cuenta | 2 / 3 |
| 3 · Sin `implements` | Implementación implícita; una interfaz no se crea con llaves; cumplir a medias no sirve | 3 / 3 |
| 4 · Muchas formas | Polimorfismo: slice de `MedioPago` y función que recibe la interfaz | 3 / 3 |
| 5 · ¿Valor o puntero? | Receptor puntero: lo cumple `*Billetera`, no `Billetera`; puntero a interfaz | 3 / 3 |
| 6 · Interfaces que Go ya trae | `fmt.Stringer` y `error` | 2 / 3 |

Cada ficha se compiló y ejecutó con Go 1.27 al construir: las correctas compilan e imprimen lo del programa del
nivel; las trampas no compilan (se muestra el mensaje real) o imprimen otra cosa (se muestra la salida real).

Al terminar aparece un informe por tema (trampas esquivadas en el primer recorrido de cada nivel) y un certificado
con el nombre del jugador. Solo se pide nombre y apellido; el progreso se guarda en el propio dispositivo.

Todo el contenido va cifrado y en cadena: cada nivel se abre con la llave que deja el anterior terminado.

## Controles

Flechas o W A S D; en el celular, deslizar el dedo sobre el laberinto. P o Esc pausan.

## Jugar

Se juega en https://mariadsalazar.github.io/gopher-laberinto-interfaces/.

## Ejecutar en local

Es un sitio estático. Desde la carpeta del repositorio:

```
python -m http.server 8000
```

y abrir `http://localhost:8000`.

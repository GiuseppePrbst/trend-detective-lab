# Presenter Mode — guía de uso

*Declaración de SI: redactado con una herramienta de SI (Claude); pendiente de revisión del equipo.*

La presentación al jurado se hace **dentro de la aplicación real**: ocho escenas (*cues*) preparadas que mueven el globo, las capas, los paneles, la película y el Research Lab. Todas las cifras se leen de los resultados publicados.

## Abrir

- En vivo: `https://giuseppeprbst.github.io/trend-detective-lab/?present=1`
- En un cue concreto (para revisar): `…/?present=1&cue=comparison` — ids: `problem`, `solution`, `film`, `comparison`, `antofagasta`, `evidence`, `disagreement`, `closing`.
- Sin `present=1` la aplicación es exactamente la de siempre.

Recomendado: Chrome o Edge actuales, ventana a 1920×1080 (probado también a 1366×768 y 1280×720), compartir **esa ventana** en la videollamada, pantalla completa con **F**. Abrir la página un par de minutos antes: el globo y el mapa base quedan en caché.

## Empezar

Aparece un recuadro con tres botones:

- **Start presentation** — modo *Live*: el reloj empieza ahora y la cámara va al cue 01.
- **Rehearsal** — igual, y las notas (**N**) muestran una tabla con el tiempo real de cada cue frente al previsto.
- **Preview cues (no clock)** — recorrer o saltar escenas sin reloj.

## Controles

| Tecla | Acción |
| --- | --- |
| **→** o **PageDown** | Siguiente (en el cue 05, la primera pulsación cambia de 1980–2025 a 2003–2025) |
| **←** o **PageUp** | Anterior |
| **Home** / **End** | Primer / último cue |
| **Espacio** | Pausar o reanudar el reloj (la escena no cambia) |
| **N** | Notas del orador: texto exacto con las cifras de los archivos, pantalla, acción, contingencia, advertencias científicas |
| **B** | Respaldo: muestra la captura validada del cue en lugar de la vista en vivo (otra vez **B** para volver) |
| **F** | Pantalla completa |
| **Esc** | Detiene la película o el vuelo donde esté. Con todo quieto, **Esc dos veces seguidas** sale del modo presentador |

Las teclas no actúan mientras se escribe en un campo. La barra inferior izquierda (sobre el pie de página) repite los controles con botones y muestra: punto verde = cue listo (ámbar = preparándose), número de cue, tiempo total · tiempo del cue / previsto · tiempo restante hasta 4:35. Avisos: "*N s behind*" con 10 s de retraso, "*4:35 reached*", y en rojo los 30 s finales antes de 5:00. Nada se detiene ni avanza solo. **▾** minimiza la barra.

## Qué hace cada cue

1. Tierra completa, paneles plegados, tarjeta de identidad.
2. Vuelo a Chile; capa regional de temperatura (16 regiones) con su leyenda.
3. La intro de 30 s (la misma película, dibujada en vivo, **sin música**: se narra encima). Termina en Antofagasta, interactiva.
4. Encuadre Antofagasta – Los Lagos; tarjeta con las dos tendencias y la **diferencia directa preinscrita** (IC 95 %, p).
5. Antofagasta con relieve, celdas MERRA-2 en **escala fija**, panel Compare; segunda → a 2003–2025.
6. El **Research Lab real** aparece sobre el globo (precargado durante el cue 05) en la sección de costa e interior.
7. El Lab se desplaza a la sección de Magallanes.
8. Se cierra el Lab; vuelta a la Tierra con la tarjeta final.

El Lab se muestra en un marco sobre el globo: el globo no se desmonta y no hay recarga al volver.

## Si algo falla

- **El globo no carga o la GPU falla**: aparece la captura validada del cue con un aviso; las notas y el reloj siguen, y se avanza igual.
- **Cualquier cue se ve mal**: **B** muestra su captura (tomadas de la aplicación real por la prueba 21 del smoke).
- **Sin conexión o el navegador no responde**: abrir `…/presenter/` — página estática con las nueve capturas, flechas y un reloj.
- **El Lab no encuentra la sección**: aparece un aviso; **B** muestra su captura.

## Salir

Botón **Exit**, o **Esc Esc** con todo quieto. La dirección vuelve a la aplicación normal (se conservan los demás parámetros).

## Ensayar

1. Abrir `?present=1`, pulsar **Rehearsal**, **N** para ver las notas.
2. Leer cada cue en voz alta y pasar con →. La tabla de las notas muestra el tiempo real por cue y la desviación.
3. **↺** (en la barra) reinicia el cue actual; **Home** vuelve al principio.

Pruebas automáticas: `npm test` (guion, navegación, reloj, cifras contra los JSON) y `npm run smoke` (prueba 21: recorrido completo con el teclado real; `PSIZE=1920x1080 ONLY=21 npm run smoke` regenera las capturas de respaldo en `out/smoke/presenter/`).

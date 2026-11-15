# Guion de la presentación al jurado — Presenter Mode

*Declaración de SI: redactado con una herramienta de SI (Claude); pendiente de revisión del equipo.*

Abrir `https://giuseppeprbst.github.io/trend-detective-lab/?present=1`. Duración prevista **4:35**; límite **5:00**. El reloj empieza al pulsar *Start presentation* y nunca avanza solo: cada cue se pasa con **→**.

Las cifras entre corchetes son las que el modo presentador lee de los archivos publicados (`web/public/data/t2m.json`, `territory.json`) y escribe en las notas (tecla **N**); los valores de abajo son los del 15-nov-2026. Si los archivos cambian, las notas cambian solas: leer las notas, no este documento.

| Cue | Tiempo | Pantalla | Acción al pulsar → | Resultado esperado | Si falla |
| --- | --- | --- | --- | --- | --- |
| 01 El problema | 0:00–0:30 | Tierra completa, paneles plegados, banderines | La cámara va a la Tierra | Planeta navegable y tarjeta de identidad | **B** muestra la captura validada |
| 02 Nuestra solución | 0:30–0:55 | Chile completo, capa regional de temperatura (16 regiones) | Vuelo a Chile (~7 s) | Regiones coloreadas, leyenda, banderines | Seguir hablando: la capa aparece en 1–2 s |
| 03 Intro cinematográfica | 0:55–1:25 | La película de 30 s, en vivo y sin música | `stage.play()` | Termina en Antofagasta, interactivo | → la corta donde esté y pasa al cue 04 |
| 04 Comparación regional | 1:25–2:08 | Antofagasta y Los Lagos en un encuadre; tarjeta abajo | Vuelo norte–sur (~4 s) | Dos tendencias y la diferencia directa con IC y p | La tarjeta no depende del globo |
| 05 Hallazgo de Antofagasta | 2:08–2:55 | Relieve, celdas MERRA-2, panel Compare, escala fija | Vuelo a Antofagasta; **segunda →** cambia a 2003–2025 | Costa ≈ 0, interior se calienta; luego ambas | La tabla Compare muestra las tres ventanas |
| 06 Evidencia y método | 2:55–3:35 | Research Lab real, sección costa/interior | El Lab (precargado) aparece sobre el globo | Figuras con intervalos y el método | **B**: captura de la sección |
| 07 Desacuerdo entre fuentes | 3:35–4:06 | Research Lab, sección Magallanes | Desplazamiento dentro del Lab | IMERG, ERA5 y estación con intervalos | **B**: captura |
| 08 Cierre | 4:06–4:35 | Tierra completa con la tarjeta final | Se cierra el Lab; vuelo a la Tierra (~7 s) | Marca, lema, enlace y repositorio | La tarjeta no depende del globo |

## Texto exacto

**01 — El problema (30 s)**
¿Qué ocurre cuando un promedio climático nos cuenta una historia incompleta? Una región puede estar cambiando, pero eso no significa que toda su geografía evolucione de la misma forma. La costa, las montañas y el interior pueden presentar tendencias diferentes. Desde ProGarLabs quisimos investigar esas diferencias utilizando datos de NASA.

**02 — Nuestra solución (25 s)**
Desarrollamos Trend Detective Lab, una plataforma abierta que permite explorar tendencias ambientales de las 16 regiones de Chile. Integramos temperatura, precipitación, humedad del suelo y otros resultados de productos NASA. La plataforma combina cartografía interactiva, análisis estadístico y evidencia científica reproducible.
*Ciencia: la capa regional son promedios de celdas nativas; el relieve 3D existe solo para Antofagasta y Los Lagos.*

**03 — Introducción cinematográfica (30 s)**
Comenzamos observando la Tierra desde el espacio. Nos acercamos a Chile y descendemos hasta Antofagasta. Sobre el territorio aparecen las observaciones climáticas de NASA y una serie que muestra su evolución durante décadas. Lo que descubrimos es que una misma región puede contener historias climáticas diferentes. Ahora podemos investigarlas directamente.

**04 — Comparación regional (43 s)**
Primero comparamos dos regiones de Chile. Entre 1980 y 2025, MERRA-2 estima un calentamiento de aproximadamente [0,23] grados por década en Antofagasta y [0,05] en Los Lagos. La diferencia entre ambas tendencias es cercana a [0,18] grados por década y resulta estadísticamente significativa. Esta fue nuestra pregunta principal, definida antes de analizar los datos.
*Ciencia: comparación preinscrita; se prueba la serie diferencia (IC 95 % +0,05 a +0,31; p = 0,0064), no se comparan dos p separados.*

**05 — El hallazgo de Antofagasta (47 s)**
Pero el promedio regional ocultaba algo importante. Al analizar las celdas de Antofagasta, encontramos que la costa y el interior no mostraban la misma tendencia histórica. En el período completo, la costa tiene una pendiente cercana a cero ([0,03]), mientras el interior muestra un calentamiento mayor ([0,27]). **[→]** Sin embargo, al cambiar a 2003–2025, ambas zonas se calientan ([0,43] y [0,52]) y la diferencia entre sus tendencias deja de ser significativa. Por eso importa tanto el período que elegimos.
*Ciencia: exploratorio. No atribuir causa al océano ni al relieve. Que la diferencia no sea significativa no prueba que no exista. Las celdas usan la escala fija para que un cambio de color sea un cambio de valor.*

**06 — Evidencia y método (40 s)**
Los resultados se calculan con un pipeline reproducible en Python. Utilizamos promedios espaciales, series temporales, análisis de tendencias e intervalos de confianza. También comprobamos nuestros métodos con simulaciones y contrastamos resultados con otras fuentes. La aplicación distingue entre resultados significativos, resultados no concluyentes y posibles explicaciones que todavía no están demostradas.

**07 — Desacuerdo entre fuentes (31 s)**
Otro ejemplo es Magallanes. IMERG muestra una disminución significativa de precipitación, pero las comprobaciones con ERA5 y la estación de Punta Arenas no confirman de manera equivalente esa conclusión. En lugar de ocultar el desacuerdo, lo mostramos. Una tendencia significativa en un producto no necesariamente está confirmada por otras fuentes.
*Ciencia: distintos productos y coberturas (región completa, cinco puntos de ERA5, una estación). No declarar validado.*

**08 — Cierre (29 s)**
Trend Detective Lab une ciencia reproducible, diseño y exploración geográfica para hacer más comprensibles los datos ambientales. Está disponible en la web y cada investigación permite revisar sus resultados, fuentes y limitaciones. Porque entender el cambio ambiental no consiste solamente en encontrar una tendencia. Consiste en saber qué podemos concluir de ella y qué preguntas todavía debemos investigar. Muchas gracias.

## Tiempos medidos de la máquina (no de la voz)

Ensayo automático completo (`npm run smoke`, prueba 21; Chrome 157, GTX 1650 SUPER), tiempo desde → hasta que el cue queda listo: 01 ≈ 2,4 s · 02 ≈ 7,2 s · 03 0,4 s (la película dura 30,1 s) · 04 ≈ 4,3 s · 05a ≈ 4,2 s · 05b ≈ 2,6 s · 06 ≈ 0,8 s · 07 ≈ 0,8 s · 08 ≈ 7,2 s. Los vuelos ocurren mientras se habla: ningún cue espera a la máquina más de lo que dura su primera frase. **La duración de la narración no se midió**: hay que ensayarla en voz alta con el modo *Rehearsal*, que registra el tiempo real de cada cue.

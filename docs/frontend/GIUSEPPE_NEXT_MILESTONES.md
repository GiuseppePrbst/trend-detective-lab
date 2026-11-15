# Climate Intelligence Chile — traspaso a Giuseppe y próximos hitos

Fecha: 15 de noviembre de 2026. Responsable de implementación: Giuseppe Proboste (`GiuseppePrbst`).
Dirección visual y aceptación: Fabiana García. Preparado con asistencia de OpenAI Codex, a solicitud de Fabiana.

Este documento entrega las instrucciones para continuar los hitos 3–7 del frontend inmersivo y su integración.
El PR que lo incorpora es documental: no publica el código local de los hitos 1–2 ni modifica ciencia, datos,
dependencias o workflows. Leer primero el estado de las bases y completar la reconciliación G0.

## 1. Estado verificado y punto de partida

Base remota inspeccionada: [`f38d07c544fb076803a488930fa90f465cfe2b07`](https://github.com/GiuseppePrbst/trend-detective-lab/commit/f38d07c544fb076803a488930fa90f465cfe2b07),
después de los PR [#6: SST](https://github.com/GiuseppePrbst/trend-detective-lab/pull/6) y
[#7: terreno 3D](https://github.com/GiuseppePrbst/trend-detective-lab/pull/7).

| Área | Existe en `main` inspeccionado | Existe solo en el prototipo local de Fabiana | Trabajo pendiente |
| --- | --- | --- | --- |
| Aplicación | React/TypeScript/Vite, laboratorio, mapas 2D, series y comparaciones | Entrada inmersiva y acceso al laboratorio mediante `?view=lab` | Reconciliar entradas y migrar módulos sin perder funciones |
| Geografía 3D | Terrenos regionales Three.js, assets QGIS y vistas reproducibles | Globo global Cesium, foco Chile/regiones, picking y fallback | Integrar el globo y conservar el terreno como vista especializada |
| Estado y servicios | Carga de JSON y tipos del pipeline | Zustand, TanStack Query, Zod, adaptadores JSON/DEMO y provider | Integración con el `main` vigente y ampliaciones versionadas |
| Ciencia | MERRA-2, IMERG, laboratorio GLDAS, ventanas, tendencias territoriales y SST MUR | Adaptación inicial de catálogo/series principales al puerto modular | Migrar el resto de productos manteniendo métodos y cobertura |
| Interfaz | Laboratorio tradicional y sección de terreno bajo demanda | Viewport completo, controles geográficos y modo inmersivo básico | H3: módulos flotantes completos; H4: capas/tiempo; H5: análisis |
| Transporte | Exports estáticos de `web/public/` | Contrato propuesto, sin backend HTTP | H6: adaptador HTTP y servicios reales acordados |
| Calidad | Tests Python, build y validaciones de terreno/SST | Pruebas de contratos, estado, escena y WebGL | Revalidar la base integrada; H7: QA y demo completa |

**No confundir los dos motores:** `web/src/terrain3d.tsx` presenta terrenos regionales, no un globo global.
La decisión de Three.js documentada para la entrega actual sigue siendo válida para ese alcance.
La experiencia inmersiva aprobada utiliza Cesium para la Tierra global. Conservar el trabajo de Three.js/QGIS;
no sustituirlo ni retirarlo como efecto colateral de integrar el globo. Cualquier cambio del motor global
respecto del plan Cesium necesita una decisión explícita con Fabiana y criterios equivalentes demostrados.

Los hitos locales 1–2 parten de `5c03ec0`, anterior a esos dos PR. Sus referencias de trabajo son
`feat/immersive-foundation` y `feat/immersive-globe`, pero **no están publicadas en GitHub en esta revisión**.
Los nombres de archivos de esa base que aparecen abajo son puntos de integración previstos, no enlaces a
código ya disponible en `main`. No asumir que `git checkout` de esas ramas funcionará en otro equipo.

La validación local comunicada fue de 81 pruebas unitarias/de integración y 11 casos E2E sobre WebGL por software.
No es una certificación del `main` actual ni de la futura base integrada; volver a ejecutar las comprobaciones
cuando se entregue el código. Las capturas locales tampoco forman parte de este PR documental.

Referencias ya versionadas que deben conservarse:

- [Contrato pipeline → web](../data-contract.md).
- [Arquitectura del terreno 3D](../gis/GIS_3D_ARCHITECTURE.md), [validación 3D](../gis/THREE_D_VALIDATION.md)
  y [mediciones existentes](../gis/PERFORMANCE_BENCHMARKS.md).
- [Fuentes de terreno](../gis/TERRAIN_SOURCES.md), [licencias](../gis/DATA_LICENSES.md)
  y [diseño cartográfico](../gis/CARTOGRAPHIC_DESIGN.md).
- [Validación SST](../validation/SST_VALIDATION.md), [inventario multivariable](../multivariable/DATASET_INVENTORY.md)
  y [variables futuras](../research/NEW_VARIABLES_ROADMAP.md).

## 2. G0 — reconciliación obligatoria antes del Hito 3

Objetivo: disponer de una base compartida verificable sobre el `main` vigente, sin regresar a una versión
anterior de la ciencia ni dar por publicados cambios que solo existen localmente.

- [ ] Confirmar el HEAD actual de `main` y leer `AGENTS.md`, si se incorpora al repositorio.
- [ ] Coordinar con Fabiana la entrega/publicación del código local de H1–H2 en un PR separado autorizado.
  Si no se dispone de ese código, acordar explícitamente una reconstrucción de la base; esta guía no lo entrega.
- [ ] Crear una rama de integración desde `main`. Portar selectivamente los módulos inmersivos y resolver los
  conflictos de `main.tsx`, estilos, `App.tsx`, manifiestos y workflows; evitar copiar el árbol antiguo completo.
- [ ] Preservar `sst.json`, `pipeline/sst_mur.py`, `pipeline/scene3d.py`, `web/public/scene3d/`,
  `terrain3d.tsx`, los tests y los nuevos resultados/documentos de los PR #6 y #7.
- [ ] Mantener la entrada `?embed=3d` y sus parámetros `scene`, `period`, `cam`, `exag`, `tex`, etc.
  Los scripts de exportación dependen de esas URLs. No interceptarlas con la nueva ruta inmersiva.
- [ ] Distinguir el ID regional `los-lagos` del identificador de escena `los_lagos` mediante un mapper explícito.
- [ ] Conservar el laboratorio completo como ruta alternativa y su acceso de regreso al globo. El fallback de
  WebGL debe permitir consultar evidencia, incluido el terreno 2D disponible.
- [ ] Verificar Cesium/Workers/Assets/Widgets/ThirdParty y rutas relativas en un montaje de subcarpeta.
- [ ] Unificar Node con los requisitos de las dependencias portadas. El prototipo usó Cesium 1.147 y Node 24;
  el `main` inspeccionado usa Node 20 en CI. Actualizar CI/Pages si se adopta esa versión de Cesium.
- [ ] Ejecutar los tests científicos actuales y las comprobaciones frontend efectivamente disponibles;
  registrar comandos, resultados, capturas y limitaciones. No borrar tests para resolver incompatibilidades.

Salida de G0: PR de integración revisable, versiones y fuentes inventariadas, rutas antiguas operativas,
un solo globo persistente y selección territorial compartida. Solicitar revisión antes de dar G0 por cerrado.

## 3. Contrato visual obligatorio

Referencia de experiencia: [Climate TRACE](https://climatetrace.org/air-pollution/map).
Usar sus patrones de exploración espacial como referencia; no copiar marca, assets, HTML ni CSS.
Las medidas y colores siguientes son la especificación original aprobada para este proyecto.

### Viewport y pantallas

- Tierra y espacio ocupan **100 % del viewport**, de borde a borde y detrás de toda la interfaz.
- `EarthScene`/`GlobeCanvas`: contenedor fijo, `inset:0`, ancho completo y altura `100dvh`, con fallback `100vh`.
- `OverlayRoot`: misma superficie, `pointer-events:none`. Solo sus controles recuperan `pointer-events:auto`.
- Abrir/cerrar paneles nunca cambia las dimensiones del canvas ni crea otro `Cesium.Viewer`.
- Explorar, Tendencias, Comparar y Metodología son modos de módulos sobre la escena persistente. Cambiar
  de modo no desmonta el planeta ni modifica silenciosamente los filtros.
- La cabecera flota con identidad, navegación, foco Chile y modo inmersivo. Evitar menús de utilería.
- Izquierda: territorio, variable, capas, opacidad, leyendas y acordeones.
- Derecha: indicadores, series, tendencias, comparaciones, incertidumbre y fuentes.
- Abajo: dock temporal flotante, nunca footer convencional ni fila que reduzca el mapa.

El terreno Three.js puede abrirse bajo demanda como vista especializada, conservando sus datos y controles.
Evaluar el coste de dos contextos WebGL y destruir el contexto secundario al cerrarlo. No duplicar la Tierra
ni mantener un segundo renderer activo sin necesidad; no destruir Cesium para abrir un módulo.

### Estados y responsive

- Paneles: `closed | minimized | expanded`, con cierre visible, `aria-expanded`, relación con su trigger y foco lógico.
- Timeline: `paused | playing | scrubbing | unavailable`. La intención de fecha no equivale a un frame visible.
- Transporte, cobertura y origen son estados independientes; ver la sección de contratos.
- Modo inmersivo: guardar/restaurar paneles y dock. Preservar selección, fecha y cámara; Escape sale y devuelve foco.
- Mantener visibles en todo modo: origen DEMO cuando corresponda, atribuciones, advertencias críticas y salida.
- Escritorio: paneles laterales flotantes. Tablet: priorizar un módulo expandido. Móvil: un drawer/bottom sheet
  principal abierto, superficie compacta y aproximadamente la mitad de la escena libre de controles.
- Probar 1440×900, 1280×720, 768×1024 y 390×844; añadir landscape, DPR alto y dispositivos táctiles.
- La altura dinámica, safe areas y teclado móvil no deben ocultar controles ni bloquear el giro/zoom en áreas libres.

### Sistema visual y movimiento

| Token | Valor aprobado |
| --- | --- |
| Fondo / superficie | `#060D1A` / `#101A2C` |
| Borde / texto / texto secundario | `#34465C` / `#EFF6FF` / `#A8BDD0` |
| Acento / advertencia | `#4CD9E6` / `#F59E0B` |
| Tipografía | Inter si está disponible, con fallback `system-ui`; cuerpo legible, unidades explícitas |
| Superficies | Transparencia moderada, borde discreto, blur contenido; contraste verificable |
| Hover / abrir panel / cerrar panel | 140 / 220 / 190 ms |
| Cambio de modo / vuelo a Chile | 170 / 2400 ms |
| Movimiento reducido | Duraciones cero; sin autoplay; navegación manual operativa |

Centralizar tokens; animar `transform`/opacidad de módulos, no dimensiones del canvas. Los vuelos deben poder
interrumpirse. Evitar partículas decorativas que sugieran viento o transporte cuando no existe un campo vectorial.

Cartografía: magnitudes con escala secuencial; anomalías con escala divergente centrada en cero. El rango proviene
del producto y del período, no de un número de ejemplo. Representar significancia mediante patrón/contorno/etiqueta
independiente del color de magnitud. NoData es neutro y explícito; nunca cero. La selección territorial usa otro estilo.

## 4. Arquitectura y organización de referencia

Mantener **Frontend First + API Contract First**. Los componentes consumen dominio/consultas, nunca credenciales,
URLs NASA, JSON crudo o estadísticas recalculadas. El backend puede cambiar de transporte sin reconstruir la UI.

```text
web/src/
  app/                       # composición, providers, modos y rutas compatibles
  contracts/
    schemas/                 # Zod + tipos inferidos
    mappers/                 # compatibilidad con exports publicados
  domain/                    # tipos y semántica del producto
  services/
    ClimateDataService.ts    # puerto común
    queries.ts               # claves, validación, cancelación
    adapters/{mock,static-json,http}/
  state/                     # intención UI y recibos de respuestas, no datasets
  features/
    globe/ geography/        # Viewer, cámara, límites, picking
    navigation/ panels/ filters/
    layers/ timeline/
    insights/ comparisons/ methodology/
  ui/                        # controles, tokens, superficies y accesibilidad
```

Las carpetas nuevas se incorporan al integrar la base; no requieren mover todos los módulos existentes a la vez.
Reutilizar `charts.tsx`, `format.ts`, `lab.tsx`, `discovery.tsx` y `terrain3d.tsx` mediante adaptadores/presentadores.
No perder la distinción confirmatorio/exploratorio ni las advertencias al extraer componentes.

Separación de responsabilidades:

- Zustand: selección, modo, paneles, intención temporal, cámara declarativa y tokens de solicitud.
- TanStack Query: resultados del servidor, caché por fuente/versión/selección, cancelación y reintentos controlados.
- Cesium: renderer persistente y recursos geoespaciales, actualizados incrementalmente mediante adaptadores.
- React: interfaces accesibles y presentación. No almacenar el Viewer ni grandes series en Zustand.
- Pipeline/backend: extracción, QA, agregación, armonización, inferencia y resultados científicos versionados.

## 5. Contratos mínimos y reglas de integración

### Puerto preparado en H1, a portar en G0

| Operación | Entrada | Salida |
| --- | --- | --- |
| `getCatalog` | opciones con `signal` | Variables, regiones, fuentes, períodos, método y versiones |
| `getInvestigation` | `regionId`, `variableId`, `windowId`, opciones | Serie y tendencia publicadas o motivo de ausencia |
| `getLayerCatalog` | opciones | Descriptores declarativos de capas |
| `getAvailability` | `layerId`, `regionId`, opciones | Timestamps realmente disponibles y cobertura |
| `getFrame` | `layerId`, `regionId`, `date`, opciones | Recurso de esa fecha exacta o motivo de ausencia |

Adaptadores `StaticJsonClimateService`, `MockClimateService` y futuro `HttpClimateService` implementan la misma
interfaz. Cada configuración tiene ID estable propio. Todos aceptan `AbortSignal` y validan respuestas.
No importar Cesium en esos contratos ni construir URLs de proveedor desde componentes.

Endpoints HTTP propuestos, aún por acordar/implementar: `GET /api/v1/catalog`, `/investigations`, `/layers`,
`/availability` y `/frames`. Comparaciones/correlaciones requieren extensión explícita de schemas y OpenAPI;
no están implementadas en el puerto inicial.

### Metadatos, capas y frames

Envoltorio común: `schemaVersion`, `datasetVersion`, `origin: real | synthetic`; donde corresponda,
`processingVersion`, query normalizada y procedencia completa. Una versión de datos no sustituye la de procesamiento.

Un descriptor de capa debe incluir:

```text
layerId, variableId, displayName, sourceId, dataOrigin,
mode: none | imagery | raster | vector | point,
units, period{start,end}, step, spatialResolution, temporalResolution, crs,
legend{kind,unit,domain,colors,center,label}, nodata{value,color,label},
attribution, license, minZoom, maxZoom, opacity,
availability: available | unavailable, reason, layerUrl
```

`layerUrl` puede ser null. Una capa sin recursos reales debe decir `unavailable` y explicar el motivo; no dibujar
un raster vacío o inventado. Validar opacidad 0–1, zoom ordenado, unidades coherentes y dominio de leyenda válido.
El recurso inicial de un frame puede ser puntos inline o URL con formato explícito. Acordar por separado las
opciones WMTS/XYZ, matrices, CRS, NoData, calendario, licencias y límites; mencionar un formato no significa soportarlo.

Disponibilidad: query exacta, período real y timestamps ordenados, únicos y dentro de cobertura. Frame: query,
`frameDate`, unidad, origen/versión y recurso; `frameDate` debe coincidir con la fecha solicitada. Confirmar el
frame visible solo tras validar la respuesta vigente. Rechazar consultas, versiones u orígenes incompatibles.

Claves de caché: servicio, versión, selección; para frames, origen y fecha exacta. Incluir transformación,
ventana, método y par de variables/regiones cuando se incorporen esos parámetros. Cancelar consultas obsoletas;
además usar generación/identidad de solicitudes para impedir que una respuesta tardía cambie la escena vigente.

### Tiempo y ciencia: tres conceptos separados

1. **Horizonte solicitado:** 2005–2025 para la experiencia de exploración.
2. **Frame efectivo/cobertura:** solo lo que el proveedor declara y devuelve para una fecha.
3. **Período estadístico:** ventana de los resultados calculados por pipeline/backend, siempre visible.

El catálogo principal inspeccionado publica `t2m` 1980–2025 e IMERG 1998–2024. `windows.json` tiene claves
`full/normal/common` para temperatura y `full/common` para precipitación. El puerto inicial local admite solo
`windowId=full`: ampliar y validar ese contrato antes de ofrecer otras ventanas. No asumir que todos los
productos cubren 2025 ni recalcular tendencias en el navegador al mover un slider.

Los mapas de `cells_t2m.json`, `cells_soilm_root.json` y los temas de terreno son resultados agregados por
período, no frames mensuales. `height.bin`, relieve y CONAF tampoco son observaciones climáticas mensuales.
Los datos GLDAS del laboratorio tienen sus unidades y cobertura propias; humedad de raíz en mm no equivale
a humedad volumétrica o atmosférica. `t2m` es temperatura del aire, no LST. SST MUR costera es otra variable,
otro soporte espacial y una investigación exploratoria; no convertirla en capa nacional sin datos para ello.

### Tendencias, comparaciones y correlaciones

Conservar valores, arrays, faltantes, IC, método, pendiente/unidad, N, N efectivo, p, p ajustado, alfa,
familia de pruebas, condición exploratoria/prerregistrada, advertencias, fechas y procedencia. No convertir
un p ausente en cero. No deducir una diferencia entre regiones porque una tiene p significativo y otra no.
La diferencia debe venir de la prueba del contraste. Conservar orientación y signo del par consultado.

Para correlaciones, acordar: variables y región, ventana común, transformación (`raw`/anomalías/detrended/lag),
método Pearson/Spearman, pares coincidentes, N efectivo si existe, IC y p ajustado/contexto de inferencia.
No mezclar calendarios, resoluciones, climatologías o productos sin declarar el procedimiento. No afirmar causalidad.

Todo resultado debe enlazar fuentes/producto/versión, DOI/cita cuando exista, resolución, QA, licencia y método.
La licencia del software no sustituye la del dataset. Información ausente queda como pendiente explícito.

### Estados, errores y DEMO

| Dimensión | Estados |
| --- | --- |
| Solicitud | `idle`, `loading`, `success`, `error` |
| Cobertura | `unknown`, `available`, `unavailable` |
| Origen | `real`, `synthetic` |

HTTP propuesto: ausencia válida → 200 con `status=unavailable` y motivo; selección no soportada → 400;
payload upstream inválido → 502; servicio caído → 503. Cancelar no debe mostrarse como error de la fuente.
No cambiar a mocks al fallar un servicio real. Si se autoriza fallback a export real local, indicar fuente,
versión, antigüedad y cambio de transporte; nunca hacerlo indistinguible de la respuesta actual.

Mocks deterministas, sin `Math.random` en resultados científicos, seleccionados explícitamente. Mostrar
**DEMO — datos simulados** de forma persistente desde el catálogo, incluso durante loading, error,
reproducción y modo inmersivo. El aviso no depende de que haya un frame visible.

## 6. Plan incremental por hitos

Orden recomendado: **G0 → H3 → H4 → H5 → H6 → H7**.
El contrato HTTP y la preparación de datos pueden avanzar en paralelo desde G0; H6 sustituye el transporte
cuando el contrato es compatible. No bloquear H3/H4 por una API aún no disponible: usar fixtures declarados.

### Hito 3 — módulos flotantes, filtros y navegación

1. **Objetivo.** Transformar los controles mínimos en una interfaz modular y accesible sin modificar el viewport.
2. **Funcionalidades.** Cabecera con Explorar/Tendencias/Comparar/Metodología; panel de filtros izquierdo y de
   análisis derecho; estados cerrado/minimizado/expandido; selectores geográfico y de variable; acordeones,
   leyendas, origen y estado de disponibilidad. Restaurar contexto al cambiar modo y al salir de inmersión.
3. **Componentes/archivos previstos.** `features/navigation/FloatingTopbar.tsx`, `ModeNavigation.tsx`,
   `features/panels/{FloatingPanel,FilterPanel,AnalysisPanel,MobileSheet}.tsx`,
   `features/filters/{RegionPicker,VariablePicker,LayerPicker}.tsx`, `ui/{Accordion,OriginBadge}.tsx`;
   ampliar el store existente en lugar de crear selecciones locales divergentes.
4. **Skills.** UX Director, UI Reference Auditor, Cartography Art Director y Motion Interaction.
5. **Dependencias.** G0 cerrado; catálogo validado; geometría/selección compartida. H3 puede mostrar análisis
   existente adaptado o ausencia explícita, pero no inventar KPI/gráficas para completar un layout.
6. **Aceptación.**
   - [ ] Abrir/cerrar cualquier módulo conserva identidad y bounding box del canvas, cámara y selección.
   - [ ] Todos los controles visibles producen un efecto real o declaran por qué están deshabilitados.
   - [ ] En móvil solo un sheet principal expandido; no hay botones ocultos fuera del viewport.
   - [ ] Teclado, Escape, foco restaurado, nombres accesibles y origen/atribuciones persistentes.
7. **Pruebas.** Estado y restauración; integración catálogo→filtro→store; 30 alternancias sin nuevo Viewer;
   E2E en los cuatro formatos, foco, hit testing en áreas libres y movimiento reducido.
8. **Riesgos.** Overlays transparentes que capturan puntero, z-index, popovers fuera de pantalla, pérdida de
   contexto y estilos globales del laboratorio. Mantener fallback legible cuando catálogo/API falle.
9. **Entregable/PR.** `feat/immersive-panels`; PR H3 con componentes, pruebas y capturas. Excluir la integración
   HTTP, cambios de métodos científicos y controles temporales que aún no funcionan.

### Hito 4 — capas climáticas y dock temporal

1. **Objetivo.** Conectar selección de capa/fecha con recursos reales disponibles o DEMO inequívoco.
2. **Funcionalidades.** Dock 2005–2025 compacto/expandido, slider, año/mes, reproducción/pausa, selección de
   timestamps, toggles, opacidad y orden; adaptador de recursos hacia Cesium y leyenda sincronizada.
   No interpolar ni fabricar frames entre fechas. Pausar al cambiar selección, fuente o ventana.
3. **Componentes/archivos previstos.** `features/timeline/{TimeDock,TimeSlider,PlaybackControls}.tsx`,
   `features/layers/{LayerManager,FrameRenderer,ScientificLegend}.ts(x)` y hooks de disponibilidad/frame.
   Un único controlador de reproducción con cleanup; estado compartido y requests con generación.
4. **Skills.** Globe Engineer, Cartography Art Director, Motion Interaction y NASA Data Engineer.
5. **Dependencias.** H3; contrato de capas/disponibilidad/frame; al menos un recurso renderizable verificable.
   Si no hay raster real, usar el fixture DEMO explícito y mantener capas reales pendientes con motivo.
6. **Aceptación.**
   - [ ] Activar/desactivar/opacidad actualizan recursos sin recrear el Viewer.
   - [ ] Fecha solicitada y frame efectivo son identificables; una respuesta vieja no aparece bajo fecha nueva.
   - [ ] Playback recorre solo timestamps disponibles y espera recursos pendientes; pausa/cancelación funcionan.
   - [ ] NoData conserva transparencia/semántica y la leyenda corresponde a unidad, rango y período del recurso.
   - [ ] Fechas sin cobertura quedan indicadas/deshabilitadas; sin autoplay con movimiento reducido.
7. **Pruebas.** Orden/duplicados/cobertura, recursos ausentes, rangos de opacidad; respuestas fuera de orden,
   cancelación y cambio de origen; temporizadores limpiados; E2E fecha→frame→leyenda y reproducción reducida.
8. **Riesgos.** Dibujar temas agregados como animación mensual, escalas cambiantes engañosas, saturación de red/GPU,
   CORS/CRS/TileMatrixSet y recursos sin licencia. Validar capabilities antes de habilitar un proveedor.
9. **Entregable/PR.** `feat/climate-layers-timeline`; PR H4 con renderer, dock, fixtures y matriz de disponibilidad.
   No incorporar resultados estadísticos recalculados por el frontend ni nuevos productos sin QA.

### Hito 5 — evidencia científica, tendencias y comparaciones

1. **Objetivo.** Presentar los resultados existentes y sus límites dentro de módulos inmersivos coherentes.
2. **Funcionalidades.** Series con faltantes y contexto, tendencia/IC, p ajustado, N/método/período, comparación
   entre regiones y variables, correlaciones con transformación explícita, fuentes y Metodología.
   Reutilizar los casos territoriales, SST y la vista Three.js bajo demanda; conservar marcas exploratorias.
3. **Componentes/archivos previstos.** `features/insights/{TrendSummary,TimeSeriesChart,UncertaintyNote}.tsx`,
   `features/comparisons/{RegionComparison,CorrelationChart,ComparisonRequirements}.tsx`,
   `features/methodology/{SourceDetails,MethodologyPanel}.tsx`; mappers de `windows`, `multivar`, `territory`,
   `sst` y `scene3d`. Mantener Observable Plot inicialmente; otra librería requiere una necesidad demostrada.
4. **Skills.** Trend Scientist, NASA Data Engineer, UX Director y Cartography Art Director.
5. **Dependencias.** H3, selección temporal/capas de H4, contratos ampliados de análisis. Si no hay una ventana
   calculada compatible, mostrar la ventana publicada o explicar la ausencia; no recortar solo la etiqueta.
6. **Aceptación.**
   - [ ] Toda cifra coincide con su export/proveedor y muestra unidad, período, método y fuente.
   - [ ] Faltantes interrumpen la serie; cero no sustituye ausencia ni p-valor faltante.
   - [ ] Comparaciones mantienen signo/orientación, familia de pruebas e incertidumbre del contraste directo.
   - [ ] Correlaciones muestran método, transformación y pares; sin relaciones causales inferidas.
   - [ ] SST, terrenos, ventanas y resultados incorporados en main no desaparecen durante la migración.
7. **Pruebas.** Fixtures de todos los productos migrados y equivalencia de cifras/arrays; signo de pares,
   ventanas incompatibles, N insuficiente, null y ajustes múltiples; integración selección→evidencia→fuente;
   E2E de tendencias/comparación/metodología y acceso al laboratorio/URLs de terreno existentes.
8. **Riesgos.** Confundir t2m/LST/SST o unidades de humedad, exponer como confirmatorios hallazgos exploratorios,
   mapas con resolución aparente falsa y dos renderers activos innecesariamente. Documentar exageración vertical.
9. **Entregable/PR.** `feat/scientific-insights`; PR H5 con componentes, mappers, contratos ampliados y evidencia
   de equivalencia. Cambios de métodos o nuevos cálculos van en PR científico separado y reproducible.

### Hito 6 — HTTP y servicios reales preparados para NASA

1. **Objetivo.** Sustituir mocks/exports por servicios versionados sin reconstruir los componentes visuales.
2. **Funcionalidades.** `HttpClimateService`, configuración por entorno, validación Zod en frontera, errores,
   cancelación, políticas de caché/versión y disponibilidad real; integración incremental por capacidad.
   Publicar OpenAPI, ejemplos verificables y documentación de transporte/operación.
3. **Componentes/archivos previstos.** `services/adapters/http/HttpClimateService.ts`, `services/config.ts`,
   schemas/mappers ampliados, `docs/api/openapi.json`, guía de integración y ejemplos de resultados disponibles,
   ausentes, errores y DEMO. No duplicar el store ni poner fetch NASA dentro de `EarthScene`.
4. **Skills.** NASA Data Engineer, Globe Engineer, Trend Scientist y Hackathon Delivery.
5. **Dependencias.** Puerto/semántica acordados desde G0 y ampliaciones H4/H5; backend con CORS, versionado,
   cobertura, QA y formatos compatibles. Su diseño puede avanzar en paralelo; activar solo capacidades probadas.
6. **Aceptación.**
   - [ ] Misma batería de contrato para mock, JSON y HTTP; sustituir el adaptador no cambia componentes.
   - [ ] Error de API conserva el globo y permite reintentar; sin fallback sintético silencioso.
   - [ ] Respuestas no conformes o de otra consulta/versión/origen se rechazan antes de renderizar.
   - [ ] Credenciales Earthdata y descarga/procesamiento NASA quedan en backend, fuera de `VITE_*` y del bundle.
   - [ ] Contrato y ejemplos coinciden; disponibilidad muestra límites reales, no expectativas del catálogo.
7. **Pruebas.** Contratos de proveedor/consumidor, drift OpenAPI, errores 400/502/503 y payload inválido,
   abort/races, caché entre versiones, fallback autorizado, CORS y smoke contra entorno de integración.
   No usar la API NASA en los unit tests ni depender de su disponibilidad para CI.
8. **Riesgos.** Límites de descarga/servicio, URLs de tiles expiradas, métodos no comparables, licencias y coste.
   Fijar política de refresh/expiración y contrato de bytes/CRS/NoData antes de conectar recursos.
9. **Entregable/PR.** `feat/http-climate-integration`; PR H6 con adaptador, contrato y configuración documentada,
   sin secretos. Separar PR backend/procesamiento cuando corresponda y enlazar su versión compatible.

### Hito 7 — QA, optimización y demostración

1. **Objetivo.** Una demo repetible, accesible y trazable en el equipo/condiciones de presentación.
2. **Funcionalidades.** Auditoría de los cinco circuitos completos; carga diferida, presupuestos medidos de
   memoria/bytes/tiles, cleanup, accesibilidad, fallback sin red y guion verificable de 90 segundos.
3. **Componentes/archivos previstos.** E2E/fixtures y smoke de subcarpeta; scripts de verificación de assets;
   informe QA, capturas, mediciones y guía de arranque/demo. Reutilizar los documentos de presentación actuales
   y actualizar métricas con equipo, navegador, DPR, conectividad y metodología de medición.
4. **Skills.** Hackathon Delivery, Motion Interaction, UI Reference Auditor y el especialista del circuito probado.
5. **Dependencias.** H3–H6 o un alcance DEMO explícitamente aceptado, con datos/contratos congelados para ensayo.
6. **Aceptación.**
   - [ ] Pasan región→capa, fecha→frame/serie, A/B→comparación, tendencia→incertidumbre y dato→fuente.
   - [ ] Sin regresiones científicas, filtros divergentes, errores de consola ni recursos 404 en subcarpeta.
   - [ ] Modo inmersivo, teclado, touch, reduced motion y ausencia/pérdida de WebGL tienen salidas operativas.
   - [ ] Se verifican las cuatro resoluciones, landscape, proyector y un teléfono físico cuando esté disponible.
   - [ ] Demo offline identifica claramente export real cacheado o DEMO; no promete datos en vivo.
   - [ ] Tiempos/FPS/memoria se miden en equipo objetivo; se declaran los casos no medidos.
7. **Pruebas.** Suite frontend/científica, contratos y E2E de producción; 30 cambios de panel/capa/fecha,
   detección de contextos/listeners/timers acumulados, WebGL perdido, red lenta/caída, origen cambiante,
   navegación de terreno y ensayo del guion con una segunda persona.
8. **Riesgos.** El Cesium local produjo un chunk aproximado de 4,26 MB (1,14 MB gzip), medido en una base
   anterior; no compararlo directamente con el terreno Three.js especializado ni usarlo como SLA.
   Reperfilar después de integrar main. No prometer FPS derivados de SwiftShader o de una captura estática.
9. **Entregable/PR.** `test/immersive-release-readiness`; PR H7 con optimizaciones justificadas, evidencia QA,
   límites conocidos, README/guion actualizados y alcance real de la demo. Sin despliegue o merge automático.

## 7. Skills y referencias de trabajo

Las ocho skills originales se consultaron localmente durante la planificación. No forman parte del `main`
inspeccionado ni se publican mediante este PR. Sus responsabilidades se sintetizan aquí para que el encargo
no dependa de plugins ni rutas locales de otro equipo. Si se comparten después, leer sus `SKILL.md` y referencias.
La especificación inmersiva aprobada prevalece sobre propuestas antiguas de mapa reducido a 45vh o a una tarjeta.

| Skill | Aplicación |
| --- | --- |
| `climate-ux-director` | Jerarquía, pantallas, divulgación progresiva y módulos reutilizables |
| `climate-globe-engineer` | Viewer persistente, cámara, picking, capas, recursos y recuperación |
| `climate-nasa-data-engineer` | Productos, QA, unidades, cobertura y frontera backend/frontend |
| `climate-trend-scientist` | Métodos, contraste directo, ajustes múltiples, incertidumbre y límites |
| `climate-hackathon-delivery` | Circuitos completos, calidad, demo y métricas verificadas |
| `climate-ui-reference-auditor` | Auditoría de referencia y criterios visuales sin copiar autoría |
| `climate-cartography-art-director` | Escalas, NoData, resolución, selección y significancia separadas |
| `climate-motion-interaction` | Estados, interrupción, sincronización, responsive y movimiento reducido |

## 8. Responsabilidades backend y prioridades de datos

Para Giuseppe, separar entregables científicos de los de interfaz aunque desarrolle ambos:

- Inventariar los productos/versiones ya publicados y conservar sus pruebas, unidades, QA y condición exploratoria.
- Obtener/procesar datos, máscaras, agregaciones, tiles y valores desde backend/pipeline; publicar trazabilidad.
- Añadir LST/MODIS, NDVI u otras variables solo con accesibilidad, licencia, QA y cobertura verificadas. No son
  prerrequisito artificial para mostrar correctamente las variables ya disponibles.
- Publicar ventanas comparables, pruebas de contraste, correlaciones e incertidumbre calculadas fuera del cliente.
- Alinear soporte espacial y temporal; el terreno de 2 km no aumenta la resolución de celdas MERRA-2 o GLDAS.
- Mantener caché y credenciales en su ámbito correcto; documentar límites y observabilidad de servicios.

## 9. Git, revisiones y definición de terminado

Una rama por hito; derivarla de una base integrada acordada. Evitar acumular H3–H7 en un PR único.
Conservar el trabajo local de otras personas y no hacer force-push sobre ramas compartidas.
Si un hito depende de otro todavía no integrado, declarar la dependencia y revisar el diff propio antes de publicar.

Por cada implementación: delimitar alcance, desarrollar, ejecutar comprobaciones, presentar diff/capturas y
riesgos a Fabiana, y respetar la aprobación explícita solicitada antes de commit/push/PR de implementación.
Este PR documental está autorizado por la solicitud de traspaso; no supone aprobación de métodos nuevos,
de un cambio de motor ni de merges automáticos. No solicitar revisión a una persona antes de preparar un resultado
concreto y comprobable. No confundir aprobación del plan con implementación ya terminada.

Plantilla mínima del futuro PR de hito:

```text
Problema y comportamiento resultante:
Alcance y dependencia/base:
Qué componentes/contratos cambian:
Datos/fuentes y condición real o DEMO:
Pruebas ejecutadas y resultados:
Capturas y mediciones, con sus condiciones:
Limitaciones, riesgos y pasos pendientes:
Revisión solicitada a Fabiana; sin merge automático.
```

Comprobaciones a usar **una vez incorporada la infraestructura**, desde las carpetas correspondientes:

```sh
# Raíz: ciencia y contratos publicados
uv sync --locked
uv run pytest -q

# web/: tras G0, cuando existan estos scripts
npm ci
npm test
npm run contracts:check
npm run build
npm run test:e2e
```

En el `main` inspeccionado aún no existen `npm test`, `contracts:check` ni E2E frontend. Incorporarlos en G0;
no presentar esos comandos como checks remotos ya aprobados. Preservar las comprobaciones Python actuales.

Un hito termina cuando su flujo funciona con datos declarados o ausencia justificada, sus criterios están
demostrados, el globo permanece operativo y las limitaciones son visibles. Una captura bonita o un botón
habilitado sin efecto no constituye una funcionalidad terminada.

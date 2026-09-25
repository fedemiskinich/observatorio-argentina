# Registro de fuentes argentinas

Este registro controla qué datos pueden incorporarse al Observatorio Argentina.
Una fuente no se considera habilitada hasta comprobar formato, licencia,
estabilidad y alcance.

| Dominio | Fuente | Cobertura | Integración | Estado inicial |
| --- | --- | --- | --- | --- |
| Cartografía | Instituto Geográfico Nacional (IGN), Capas SIG y Geoportal | Nacional | Argenmap TMS y WFS GeoJSON | Adaptador base implementado |
| Catálogo público | Datos Argentina | Nacional | API CKAN y recursos descargables | Priorizada |
| Vuelos | OpenSky y adsb.lol | Global, con cobertura variable en Argentina | Adaptador existente | Operativa |
| Embarcaciones | AISStream | Hidrovía, Río de la Plata y costa atlántica | WebSocket AIS con recorte regional | Operativa opcional |
| Satélites | CelesTrak | Global | Adaptador existente | Operativa |
| Incendios | NASA FIRMS | Argentina, últimas 24 h | VIIRS NRT con recorte territorial y caché | Operativa opcional |
| Sismos | USGS | Global | Adaptador existente | Operativa |
| Transporte CABA | API Transporte de Buenos Aires | CABA y AMBA según feed | GTFS/API, sujeto a disponibilidad | En evaluación |
| Cámaras | Catálogo público argentino revisado | Variable | Archivo local con admisión documentada | Preparada, sin fuente aprobada |

## Requisitos de admisión

Cada adaptador debe publicar junto al dato:

- organismo o proveedor;
- fecha y hora de observación;
- fecha y hora de recepción;
- frecuencia de actualización esperada;
- estado del feed: operativo, degradado, demorado o sin datos;
- naturaleza: observado, estimado, reconstruido o simulado;
- licencia, términos o fundamento de reutilización;
- limitaciones territoriales y técnicas conocidas.

## Restricciones

- No incorporar cámaras privadas ni eludir autenticación.
- No realizar reconocimiento facial ni búsqueda de personas.
- No representar como tiempo real un feed histórico, demorado o simulado.
- No usar esta plataforma para navegación, emergencias u operaciones críticas.
- No publicar detalles técnicos que incrementen innecesariamente el riesgo sobre
  instalaciones sensibles.

## Adaptador IGN implementado

El módulo `src/sources/ignWfs.js` admite inicialmente aeropuertos, puertos y
localidades. Rechaza nombres de capa arbitrarios, limita cada respuesta a 1.000
objetos y, cuando recibe una extensión, exige que permanezca dentro del área
operativa argentina. El mapa base `Argenmap Oscuro` está disponible desde el
selector de mapas y conserva la atribución institucional.

Desde la versión 0.5, al activar una capa IGN el visor calcula la intersección
entre la vista actual y el territorio argentino y envía esa extensión al WFS.
Si la vista no permite determinar una región válida, utiliza la consulta
nacional limitada como recuperación segura. Al desactivar, mover la vista y
volver a activar una capa, se solicita la nueva zona en lugar de reutilizar
objetos de la región anterior.

Desde la versión 0.6, las capas visibles de aeropuertos, puertos y localidades
se actualizan automáticamente 700 ms después de que la cámara termina de
moverse. El retardo agrupa movimientos consecutivos y evita lanzar consultas
WFS durante el desplazamiento; si la extensión no cambió, se conserva la
colección ya cargada.

Desde la versión 0.7, el proxy de incendios consulta NASA FIRMS sólo para el
rectángulo operativo de Argentina (`-74,-56,-52,-21`) en lugar de descargar el
feed mundial. Combina VIIRS NOAA-20, NOAA-21 y Suomi-NPP, conserva únicamente
las detecciones de las últimas 24 horas y mantiene una caché de 30 minutos. La
capa requiere una clave gratuita `FIRMS_MAP_KEY` y comunica su ausencia como
fuente no disponible, sin simular datos.

Desde la versión 0.8, la suscripción AIS deja de solicitar el flujo mundial y
se limita a tres zonas argentinas: Hidrovía Paraná–Paraguay, Río de la Plata y
costa atlántica hasta Tierra del Fuego. La capa conserva posiciones durante 30
minutos y requiere `AISSTREAM_API_KEY`. Su cobertura es variable: depende de
receptores terrestres y satelitales de terceros, por lo que la ausencia de una
embarcación no demuestra que el área esté libre de tráfico.

Desde la versión 0.9, la adaptación desactiva de forma predeterminada los
catálogos extranjeros de cámaras heredados del proyecto original y utiliza
`config/cctv_sources.argentina.json`. El catálogo comienza vacío: las APIs
oficiales de transporte verificadas publican datos de movilidad, pero no un
inventario reutilizable con coordenadas y URLs de imágenes o streams. Las
reglas de incorporación están documentadas en `config/CCTV-ARGENTINA.md`.

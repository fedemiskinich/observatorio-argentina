# Catálogo de cámaras públicas argentinas

`cctv_sources.argentina.json` es el catálogo activo de la adaptación argentina.
Incluye cámaras que el organismo responsable publica expresamente para acceso
público. Los reproductores web usan `feedType: "embed"` y `embedUrl`; no se
extraen tokens, playlists temporales ni endpoints internos del proveedor.

El catálogo también admite webcams públicas institucionales con
`sourceKind: "argentina-public-webcam"`. Se identifican como no gubernamentales
en `credit` para que no se confundan con cámaras oficiales.

## Fuentes incluidas

- Municipalidad de Las Heras: cinco reproductores municipales individuales.
- SISE Argentina: transmisión pública del Puente General Belgrano.
- Municipalidad de Corrientes + SISE: monitor compartido de Ciudad Segura. La
  municipalidad declara 30 cámaras, pero el catálogo registra una sola entrada
  porque la publicación ofrece una señal común y no 30 streams individuales.
- Buenos Aires Panorama y UADE: webcams públicas de CABA, marcadas como fuentes
  públicas no gubernamentales.

No agregar cámaras privadas, credenciales, URLs obtenidas eludiendo controles,
videovigilancia de seguridad ni endpoints deducidos por ingeniería inversa.

## Requisitos de admisión

Cada cámara debe contar con:

- organismo público responsable;
- página oficial del catálogo o API;
- licencia o condiciones de reutilización;
- coordenadas publicadas por el organismo;
- URL pública de imagen o stream;
- fecha de verificación;
- finalidad declarada, por ejemplo tránsito, clima o estado vial.

## Formato mínimo

```json
[
  {
    "id": "organismo-identificador",
    "name": "Nombre público",
    "city": "Ciudad",
    "cityId": "ciudad",
    "provider": "Organismo responsable",
    "lat": -27.47,
    "lon": -58.83,
    "feedType": "image",
    "url": "https://organismo.example/camara.jpg",
    "snapshotUrl": "https://organismo.example/camara.jpg",
    "sourceKind": "argentina-public-official",
    "license": "Condiciones oficiales verificadas"
  }
]
```

Para un reproductor público embebible se usa `feedType: "embed"` y una URL
HTTPS oficial o enlazada por el organismo en `embedUrl`. En ese modo no se
configuran `url` ni `snapshotUrl`.

Las señales `embed` se muestran en el reproductor web flotante. No se proyectan
como textura sobre el plano 3D porque los reproductores de terceros (por
ejemplo YouTube) no exponen sus píxeles al canvas WebGL. `sourceUrl` permite
abrir la publicación oficial cuando el emisor está fuera de línea o rechaza la
reproducción embebida.

El bloque anterior es únicamente un esquema ilustrativo: el dominio
`organismo.example` no es una fuente real y no debe copiarse al catálogo.

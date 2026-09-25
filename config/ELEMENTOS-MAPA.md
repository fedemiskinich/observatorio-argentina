# Elementos personalizados del mapa

1. Active la capa **Elementos personalizados** en `DATA LAYERS > Infrastructure`.
2. Pulse **+ ELEMENTO**.
3. Cree un registro manualmente o importe un archivo GeoJSON.
4. Use **EXPORTAR** para generar una copia de seguridad transferible.

Los registros se conservan en el almacenamiento local del navegador utilizado para ejecutar Observatorio Argentina. No se envían a servicios externos.

## GeoJSON admitido

- Raíz `FeatureCollection`.
- Geometrías `Point` únicamente.
- Coordenadas en orden GeoJSON: `[longitud, latitud]`.
- Categorías: `building`, `camera`, `hospital`, `police`, `government`, `infrastructure`, `shelter`, `other`.
- Las propiedades `sourceUrl` y `mediaUrl` admiten solamente direcciones HTTP o HTTPS.

Puede comenzar importando `map_elements.example.geojson` y luego editar o eliminar sus elementos desde la aplicación.

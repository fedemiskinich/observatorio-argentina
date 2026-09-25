# Observatorio Argentina

Adaptación local de **God's Eye View** para exploración OSINT/GEOINT de fuentes
públicas relacionadas con Argentina.

## Alcance inicial

- Infraestructura crítica: centros de datos, represas y cables submarinos.
- Movilidad: vuelos civiles y militares observables, embarcaciones y satélites.
- Fuentes públicas: cámaras incorporadas únicamente cuando exista una API o
  publicación oficial con condiciones de reutilización verificables.
- Ambiente: incendios activos NASA FIRMS recortados a Argentina (últimas 24 h) y sismos de USGS.
- Embarcaciones: AISStream limitado a Hidrovía, Río de la Plata y costa atlántica, con cobertura variable.
- Cámaras: catálogo argentino controlado, inicialmente vacío hasta aprobar endpoints públicos oficiales.

## Criterios de integridad

Cada nueva capa argentina debe documentar:

1. organismo o proveedor responsable;
2. URL y condiciones de uso;
3. frecuencia de actualización;
4. cobertura y limitaciones conocidas;
5. naturaleza del dato: observado, estimado, reconstruido o simulado.

La plataforma no debe incorporar búsqueda de personas, reconocimiento facial,
seguimiento individual ni fuentes obtenidas mediante acceso no autorizado.

## Ejecución local en Windows

Requiere Node.js 24.14 o superior dentro de la rama 24.x, o Node.js 26.x.

```powershell
npm ci
npm run doctor
npm run dev
```

Abrir `http://localhost:4173`. Las claves son opcionales para el primer inicio.

## Explorador terrestre 3D

El botón `3D WALK` de la barra superior coloca la cámara sobre el punto ubicado
en el centro de la pantalla. Controles disponibles:

- `W`, `A`, `S`, `D`: desplazamiento.
- Flechas: giro y elevación de la mirada.
- `Shift`: movimiento rápido.
- `R` y `F`: subir o bajar dentro del margen de exploración.
- `Esc` o `VISTA AÉREA`: salir conservando la ubicación actual.

El recorrido utiliza el terreno o la superficie 3D disponible y no requiere una
API de panoramas fotográficos.

## Gestión local de claves

Ejecutar `CONFIGURAR-CLAVES-WINDOWS.cmd` para crear o actualizar `.env` mediante
un menú. Los valores se solicitan ocultos, no se imprimen en pantalla y el
script intenta restringir el archivo al usuario actual de Windows. Después de
cualquier cambio debe reiniciarse `INICIAR-WINDOWS.cmd`.

`.env` contiene secretos en texto plano porque Node.js necesita leerlos al
iniciar. Está excluido de Git y de los paquetes ZIP; no debe compartirse.

## Procedencia

Basado en `bilawalsidhu/gods-eye-view`, distribuido bajo licencia MIT. Se
conservan `LICENSE`, atribuciones y documentación de procedencia. Los conjuntos
de datos mantienen sus respectivas licencias y condiciones de uso.

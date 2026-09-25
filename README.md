<div align="center">

# 🇦🇷 Observatorio Argentina

### Plataforma abierta de conciencia situacional, OSINT y análisis geoespacial

**Integrar señales. Visualizar el territorio. Comprender el contexto.**

</div>

---

## ¿Qué es Observatorio Argentina?

**Observatorio Argentina** es un proyecto abierto de investigación y desarrollo orientado a integrar, visualizar y contextualizar información geoespacial proveniente de fuentes públicas y abiertas sobre una misma interfaz territorial.

El objetivo no es acumular puntos sobre un mapa, sino facilitar la construcción de **conciencia situacional** mediante la combinación de capas, eventos y fuentes con procedencia documentada.

El proyecto parte del código abierto de [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view), de Bilawal Sidhu, distribuido bajo licencia MIT, y desarrolla sobre esa base una adaptación orientada a Argentina, con nuevas capas, criterios de integridad, herramientas y flujos de investigación.

## Capacidades actuales

- Visualización geoespacial 2D/3D y navegación territorial.
- Capas de infraestructura y elementos relevantes.
- Vuelos, embarcaciones, satélites, sismos y otras señales públicas según disponibilidad de las fuentes.
- Información ambiental, incluyendo incendios activos y eventos georreferenciados.
- Integración controlada de cámaras públicas cuando su publicación y reutilización sean verificables.
- Incorporación manual de edificios, cámaras, organismos, infraestructura crítica, refugios y otros elementos mediante catálogos locales/GeoJSON.
- Arquitectura extensible para nuevas fuentes y capas.
- Capacidades experimentales de análisis asistido por IA.

> La presencia de una capa en la plataforma no implica cobertura total, disponibilidad permanente ni carácter oficial. Cada fuente conserva sus propias condiciones, limitaciones y frecuencia de actualización.

## Principios del proyecto

Observatorio Argentina trabaja exclusivamente con fuentes públicas o incorporadas legítimamente por el operador. El proyecto no está diseñado para reconocimiento facial, búsqueda de personas, seguimiento individual ni acceso no autorizado a sistemas o datos.

Toda nueva capa argentina debería documentar, como mínimo, su organismo/proveedor, procedencia, condiciones de uso, frecuencia de actualización, cobertura, limitaciones y naturaleza del dato (observado, estimado, reconstruido o simulado).

## Inicio rápido

Requiere **Node.js 24.14.x o 26.x**.

```bash
git clone https://github.com/fedemiskinich/observatorio-argentina.git
cd observatorio-argentina
npm ci
npm run doctor
npm run dev
```

Luego abrir `http://localhost:4173`.

Las claves de proveedores son opcionales para el primer inicio. Cuando se utilicen, deben almacenarse únicamente en `.env` u otros mecanismos locales ignorados por Git. Nunca publiques credenciales reales.

En Windows también se incluyen utilidades de inicio y configuración local. Ver [`ARGENTINA.md`](ARGENTINA.md).

## Fuentes, datos y atribuciones

El **código fuente propio y las modificaciones** se distribuyen bajo licencia MIT, preservando la licencia y el copyright del proyecto original donde corresponde.

Los datasets, modelos 3D, imágenes y servicios externos **no quedan automáticamente relicenciados bajo MIT**. Cada recurso conserva sus términos originales. Consultá:

- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
- [`DATA_SOURCES.md`](DATA_SOURCES.md)
- [`public/models/README.md`](public/models/README.md)

Algunos datasets incluidos tienen restricciones **NonCommercial**. Si se pretende realizar una distribución o uso comercial, deben revisarse o retirarse esos recursos según sus respectivas licencias.

## Seguridad y privacidad

Antes de reportar una vulnerabilidad o desplegar la plataforma fuera de localhost, consultá [`SECURITY.md`](SECURITY.md). El servidor local puede actuar como intermediario de claves de proveedores y no debe exponerse públicamente sin controles adicionales.

## Colaborar

El proyecto está abierto a aportes de desarrolladores, investigadores y profesionales de OSINT, GEOINT, GIS, ciberseguridad, inteligencia artificial, datos abiertos y disciplinas relacionadas.

Las contribuciones pueden incluir nuevas fuentes públicas, conectores, capas geográficas, mejoras de visualización, documentación, investigación aplicada y correcciones. Ver [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Estado

**MVP / proyecto experimental en desarrollo.** Los resultados deben interpretarse considerando la procedencia y limitaciones de cada fuente. Observatorio Argentina no sustituye fuentes oficiales ni constituye por sí mismo información de inteligencia validada.

## Licencia

MIT para el código cubierto por el repositorio, con conservación de los avisos de copyright aplicables. Los componentes y datos de terceros mantienen sus licencias originales. Ver [`LICENSE`](LICENSE) y [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

---

<div align="center">

**Observatorio Argentina**  
*Open Situational Awareness · OSINT · GEOINT · Argentina*

</div>

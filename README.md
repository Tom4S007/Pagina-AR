# Aves UAO — guía interactiva del campus

Prototipo web responsivo derivado de la *Guía ilustrada de las aves del campus de la Universidad Autónoma de Occidente* (primera edición, 2023). Incluye explorador de especies, búsqueda, filtro por familia, favoritos locales, fichas, atribución de recursos de la guía y un módulo de cámara demostrativo preparado para conectar 8th Wall.

## Ejecutar

Requiere JDK 21 o compatible con `jdk.httpserver`.

```bash
mkdir -p backend-java/build
javac --add-modules jdk.httpserver -d backend-java/build $(find backend-java/src/main/java -name '*.java')
PORT=3000 java --add-modules jdk.httpserver -cp backend-java/build edu.uao.aves.Main
```

Luego abre `http://localhost:3000`. El servidor de Java entrega los archivos estáticos y `GET /api/v1/health`; no usa dependencias de terceros ni abre una conexión a base de datos. `GET /api/v1/species` devuelve HTTP 501 de forma intencional hasta que se defina e implemente la fuente de datos. El puerto por defecto puede sobrescribirse con `PORT`.

## Estructura

| Ruta | Responsabilidad |
| --- | --- |
| `index.html` | Página semántica, navegación y diálogos accesibles. |
| `styles/main.css` | Sistema editorial, responsive, focos y preferencia de movimiento reducido. |
| `scripts/app.js` | Carga del catálogo, búsqueda, filtros, fichas, favoritos locales y navegación. |
| `scripts/ar.js` | Vista demostrativa de cámara y punto de extensión para el SDK/escena XR8. |
| `data/species.json` | Muestra local de 29 registros normalizados a partir de contenido legible del PDF. |
| `assets/` | Marca y fotografías seleccionadas de la guía adjunta; créditos visibles en el sitio. |
| `backend-java/` | Servidor Java y contrato provisional `SpeciesRepository`; sin persistencia. |
| `manus-routes.json` | Declaración de la ruta principal servida por la vista previa. |
| `plan.md` / `TODO.md` | Dirección visual/técnica y criterios de resultados pendientes. |
| `docs/paleta-identidad.md` | Manual cromático UAO 2026, tema Adobe Color elegido y pautas de aplicación en la interfaz. |

## Estado del contenido

La presentación de la guía declara 84 especies, 30 familias y 77 géneros encontrados durante monitoreos. Este prototipo **no contiene las 84 fichas**: el archivo local muestra 29 entradas extraídas de las partes legibles del PDF. Las fichas marcadas “Inventario · ampliar” tienen descripción, ilustración o enlaces todavía pendientes. El archivo fuente también presenta discrepancias taxonómicas en algunas entradas; el sitio conserva una nota editorial y no las oculta ni afirma validación científica independiente. Antes de publicar como catálogo oficial, revisar nomenclatura, cantidad final de especies, descripciones, derechos y créditos de cada activo con la UAO.

## Base de datos y API Java — no conectadas

No se eligió motor, esquema, autenticación ni ubicación de datos porque aún no están disponibles. El prototipo consulta `/data/species.json` como fuente de demostración. Los favoritos sólo se guardan en `localStorage` del navegador. Los comentarios `TODO: DATABASE/API` señalan los puntos a completar: seleccionar motor; configurar secreto/URL fuera del cliente; definir migraciones, identificadores y DTOs validados; implementar `SpeciesRepository`; construir búsqueda y filtros paginados; revisar autorización, CORS, errores y despliegue; migrar favoritos a una cuenta/sesión si se requiere sincronización. No colocar credenciales en HTML ni JavaScript.

El backend está escrito con `com.sun.net.httpserver.HttpServer` para esta fase ligera; no es Spring Boot ni realiza operaciones CRUD. Si el contrato futuro exige Spring Boot, sustituir el servidor de desarrollo por controladores y configuración en el servidor Java, preservando la interfaz de `SpeciesRepository` sólo después de aprobar el modelo de dominio.

## 8th Wall — preparado, no activo

`/#realidad-aumentada` abre una previsualización 2D de cámara con superposición de una ilustración. La cámara se solicita sólo después de pulsar el botón, el video no se transmite ni se almacena y sus pistas se detienen al cerrar el diálogo. La demostración no detecta planos ni ancla objetos 3D y no debe describirse como AR real.

Para activar una experiencia real: registrar/configurar el proyecto 8th Wall de la institución; decidir tracking y escena; aprobar derechos y activos 3D; cargar el SDK oficial y arrancar la escena desde el bloque `TODO: 8TH WALL` de `scripts/ar.js` / `scripts/app.js`; gestionar claves y dominios en la configuración del despliegue; probar cámara, permisos, dispositivos compatibles y caída al modo guía. No se incluyó una clave ni se simula que exista un proyecto XR.

## Multimedia y fuentes

Las grabaciones de cantos no se proporcionaron como archivos; por eso el control de canto se muestra inhabilitado y se indica esa ausencia. Los enlaces de Wiki Aves se habilitan sólo cuando el ID aparece en la guía; no se descargaron audios o fotos externos. Las fotos de la galería general no se asignan automáticamente a una ficha si el PDF no contiene un epígrafe que verifique esa relación. Se citan los créditos impresos: Juan Manuel Quintero, Natalia Lenis Sánchez y Diana Carolina Campo Daza. Verificar licencia/autorización de republicación antes de un despliegue público.

# Plan — Aves UAO

## Alcance y enfoque técnico
Crear una guía web adaptable basada en la publicación UAO 2023: portada editorial, explorador de especies, búsqueda global, filtro por familia, fichas, galería disponible, enlaces a WikiAves, cantos sólo si hay recursos y entrada a realidad aumentada. La introducción de la guía informa 84 especies, 30 familias y 77 géneros; este prototipo deja claro que el catálogo inicial de 29 entradas (24 descripciones transcritas y 5 entradas de inventario) no es una transcripción total validada.

- **Frontend:** HTML semántico, CSS responsive y JavaScript modular sin framework; catálogo JSON local, interacciones accesibles, favoritos en `localStorage` y sin persistencia remota.
- **Backend:** servidor de archivos y estado escrito en Java 21 con `HttpServer`; contrato `SpeciesRepository` describe la futura interfaz de dominio. No se conecta a base de datos; `/api/v1/species` devuelve 501 pendiente por diseño. Contraseñas/DSN no existen en esta fase.
- **8th Wall:** entrada AR y módulo aislado de carga de SDK/escena. La interfaz ofrece una previsualización de cámara 2D explícitamente no espacial; no hay clave ni escena XR institucional y no se afirma que exista una sesión XR real.
- **Datos:** nombres y textos proceden del PDF adjunto donde son legibles; discrepancias taxonómicas conocidas se conservan como notas editoriales. Las fotografías reutilizadas provienen del material entregado, se muestran con crédito general cuando la fuente no relaciona la imagen con una ficha y requieren permiso confirmado antes de publicar. Audio no proporcionado.
- **Servidor:** Java `HttpServer` en puerto 3000, incluye `GET /api/v1/health`; no habilitar base de datos gestionada.

## Estructura
- `index.html`: estructura de página y puntos de montaje.
- `styles/main.css`: sistema visual responsive, estados de foco y movimiento reducido.
- `scripts/app.js`: navegación, búsqueda, filtros, render de tarjetas/fichas y favoritos locales.
- `scripts/ar.js`: vista 2D de cámara no espacial, gestión de cámara y punto de extensión XR8.
- `data/species.json`: catálogo de muestra desacoplado de la UI y reemplazable por API.
- `assets/`: marca, fotografías/ilustraciones derivadas del PDF y galería.
- `backend-java/`: servidor estático Java y contrato comentado para repositorio futuro.
- `manus-routes.json`: manifiesto de rutas.
- `README.md` y `TODO.md`: arquitectura, ejecución y pendientes.

## Diseño
- **Movimiento:** editorial contemporáneo de historia natural, como un cuaderno de campo convertido en atlas digital.
- **Principios:** rigor y atribución; naturaleza sin exceso ornamental; escaneo rápido; controles calmados y accesibles.
- **Color:** aplicar la identidad UAO definida en su Manual de Identidad de julio de 2026: rojo `#FF051E` y crema `#FBF5EC` como dominantes; vino `#8A1428`, granate `#AC0B32`, coral `#FF836C` y blanco como subordinados; preservar la proporción guía 60/35/5. Como acento botánico, tomar tonos discretos del tema prehecho “This Green” de Adobe Color (`#00261C`, `#044D29`, `#168039`, `#45BF55`, `#97ED8A`) y el verde menta UAO `#00C6A1` con su claro `#E0EEE6`; no desplazar el rojo/crema institucional ni exceder el uso visual de acentos. Ver `docs/paleta-identidad.md`.
- **Composición:** cabecera compacta, portada fotográfica asimétrica, banda de indicadores y explorador con filtros laterales en escritorio / apilados en móvil; bloques editoriales con aire, no una retícula genérica centralizada.
- **Motivos:** anillos de observación, etiquetas taxonómicas y líneas de cuaderno.
- **Interacción:** filtros inmediatos, estados vacíos, favoritos locales rotulados, controles por teclado; la cámara es opcional y no bloquea la guía.
- **Movimiento:** transiciones discretas de 180–260 ms, sin parallax obligatorio; respetar `prefers-reduced-motion`.
- **Tipografía:** Fraunces para títulos y DM Sans para interfaz/cuerpo, con fallbacks del sistema.
- **Esencia:** un atlas para que la comunidad UAO reconozca y valore la avifauna del campus. Personalidad: curiosa, cuidadosa, cercana.
- **Voz:** precisa y cálida; «El campus también se escucha.» y «Busca una forma, una familia o un nombre.»
- **Marca:** wordmark «aves UAO» y símbolo ala/anillo de observación; UAO rojo `#FF051E` como color institucional de firma y verdes de Adobe sólo como contrapunto de biodiversidad.

## Restricciones materiales y siguientes dependencias
La guía PDF adjunta está disponible. No hay acceso a base de datos, esquema, credenciales ni proyecto de 8th Wall, ni archivos de cantos confirmados. Se dejaron comentarios `TODO: DATABASE/API` y `TODO: 8TH WALL` en código con las uniones futuras. Revisar la nomenclatura contradictoria del PDF, completar las 84 fichas, confirmar autorización de las imágenes, determinar motor/esquema, implementar los endpoints Java de lectura/escritura y configurar la escena XR8 antes de afirmar cobertura total o AR real.

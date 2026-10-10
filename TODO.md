# Seguimiento del proyecto Aves UAO

## Prototipo incluido en esta entrega

- [x] **Guía y catálogo:** presentar la experiencia editorial del campus y las cifras que declara la publicación UAO 2023 (84 especies, 30 familias y 77 géneros), dejando claro que el catálogo de demostración sólo contiene 29 entradas: 24 descripciones transcritas y 5 registros de inventario por ampliar; atribuir la publicación.
- [x] **Búsqueda y navegación del catálogo:** buscar por nombre común, científico, inglés, familia, orden y rasgos/descripción disponibles; filtrar por familia; ordenar por selección editorial, nombre o familia; mostrar resultados vacíos y un botón para restablecer; indicar conteos sin presentar la muestra como cobertura completa.
- [x] **Fichas:** abrir/cerrar fichas accesibles con los nombres y metadatos que consten en la fuente, descripción y rasgos disponibles, imagen/crédito cuando estén verificados, nota editorial, enlace Wiki Aves si el material da un identificador y aviso explícito cuando no exista audio de canto.
- [x] **Identidad cromática UAO + Adobe Color:** usar el rojo `#FF051E` y crema `#FBF5EC` del Manual de Identidad UAO 2026 como base, reservar los tonos verdes a acentos discretos según la guía 60/35/5, complementar con el tema prehecho «This Green» de Adobe Color (`#00261C`, `#044D29`, `#168039`, `#45BF55`, `#97ED8A`) y documentar la fuente y aplicación en `docs/paleta-identidad.md`.
- [x] **Medios e identificación:** reutilizar fotos suministradas por el usuario con atribución de la guía, mostrar la galería como galería general cuando la fuente no relaciona una foto con una especie, evitar imágenes de relleno como evidencia de identificación y conservar por separado los espacios visuales aún por digitalizar.
- [x] **Favoritos:** permitir agregar/quitar y filtrar favoritos guardados sólo en el navegador; no insinuar que se sincronizan con una cuenta o servidor.
- [x] **Realidad aumentada, en modo preparación:** presentar una demostración opcional de cámara 2D que solicita permiso sólo después de una acción explícita, no afirma detectar superficies ni colocar objetos 3D, no almacena/transmite video y detiene las pistas al cerrar; comentar el punto de integración real de 8th Wall sin inventar claves.
- [x] **Java/API:** servir la web mediante Java y exponer `GET /api/v1/health`; dejar `GET /api/v1/species` como pendiente explícito, con `HTTP 501` y comentarios para futura implementación cuando se decida la base de datos.
- [x] **Base de datos:** no crear conexión, credenciales, motor ni esquema ficticios; señalar en los puntos de carga local, favoritos, endpoint y repositorio Java qué partes deben migrarse cuando el usuario facilite acceso/modelo.
- [x] **Responsive y accesibilidad:** adaptar navegación, fichas y controles a escritorio y móvil; cerrar la ficha con Escape, limpiar su hash y restaurar foco; mantener los avisos/estados accesibles y respetar movimiento reducido.
- [x] **Documentación y ruta:** documentar carpetas, ejecución Java, límites del catálogo, estado de base de datos/8th Wall, audio y derechos de medios; mantener un plan del sistema/diseño y el manifiesto `manus-routes.json`.

## Pendientes posteriores, fuera del alcance disponible

- [ ] Conectar una base de datos real cuando se comparta el acceso y se decida el motor: definir esquema/migraciones/DTOs, búsqueda y paginación, persistencia autorizada de favoritos, gestión de errores y seguridad; reemplazar entonces el `HTTP 501` de demostración.
- [ ] Activar 8th Wall real cuando exista proyecto/credencial autorizada, SDK oficial, escena XR8 y decisión de despliegue; probar permisos y dispositivos compatibles sin fingir que la demo actual es espacial.
- [ ] Completar y cotejar las fichas restantes frente al inventario y las cifras de 84 especies; revisar la discrepancia de orden anotada en fichas Trochilidae con una persona experta de la UAO.
- [ ] Confirmar autorización institucional para reproducir fotografías y créditos, y suministrar audio autorizado antes de habilitar controles de canto.

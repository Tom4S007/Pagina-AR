# Paleta de identidad — Aves UAO

## Referencia institucional

La sección oficial de **Imagen corporativa** de la Universidad Autónoma de Occidente enlaza su Manual de Identidad. El manual vigente consultado está fechado en julio de 2026. Su paleta principal fija el rojo UAO `#FF051E` (RGB 255, 5, 30) y el crema `#FBF5EC` (RGB 251, 245, 236) como colores dominantes, e indica que el rojo principal debe estar presente. Para la composición orienta una proporción aproximada de **60% dominantes, 35% subordinados y 5% acentos**.[1] [2]

La misma guía especifica, entre otros subordinados, el vino `#8A1428`, el granate `#AC0B32`, el coral `#FF836C` y el blanco `#FFFFFF`. Su paleta general de acentos incluye verde menta `#00C6A1` y verde muy claro `#E0EEE6`. La web institucional actual también usa rojo en el encabezado y tonos cálidos claros, en línea con esta lectura.[1] [3]

## Paleta verde de Adobe Color

En la página pública **Adobe Color · Explore**, bajo la búsqueda “forest green”, seleccioné el tema preexistente **“This Green”**, identificado en el resultado como tema `10309756`. Sus cinco muestras son `#00261C`, `#044D29`, `#168039`, `#45BF55` y `#97ED8A`.[4] Esta paleta funciona como complemento botánico para la guía; no sustituye la identidad institucional ni implica que sus colores sean oficiales de la UAO.

## Aplicación en el sistema

El papel crema y los tonos blancos/cálidos forman la superficie; el rojo UAO da identidad a la marca y a las acciones clave; los vinos sostienen bloques oscuros y texto de alto contraste. Los verdes Adobe se reservan para detalles de exploración —anillos, indicadores de campo, etiquetas y pequeños acentos— y el menta UAO para fondos suaves. Se evita teñir grandes bloques con verde y se mantiene la relación visual 60/35/5 como criterio, no como cálculo píxel a píxel. No se usa `#42AD28` de la paleta complementaria especial: el manual la reserva a Vinculación y HEP LATAM.

En CSS, los tokens de `:root` de `styles/main.css` registran las muestras principales. Los colores pueden reutilizarse sin editar cada componente y deben contrastarse contra fondo crema/blanco antes de usarse en texto pequeño.

## Referencias

[1]: https://www.uao.edu.co/imagen-corporativa/ "Imagen corporativa — Universidad Autónoma de Occidente"
[2]: https://www.uao.edu.co/wp-content/uploads/2026/08/manual-identidad-2026.pdf "Manual de Identidad UAO, julio de 2026"
[3]: https://www.uao.edu.co/logo/ "Logo e identidad institucional UAO"
[4]: https://color.adobe.com/explore?q=forest%20green "Adobe Color Explore — búsqueda forest green y tema This Green"

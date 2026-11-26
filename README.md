<div align="center">
  <img src="./public/brand/tigrito-avatar.webp" alt="Tigrito KitLab" width="96" height="96" />
  <h1>Tigrito KitLab</h1>
  <p><strong>Catálogo deportivo serverless, rápido y editable sin base de datos.</strong></p>
  <p>
    <img alt="Vue 3.5" src="https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js&logoColor=white" />
    <img alt="Vite 8" src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" />
    <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white" />
    <img alt="Supabase Storage" src="https://img.shields.io/badge/Supabase-Storage-3ecf8e?logo=supabase&logoColor=white" />
  </p>
</div>

Tigrito KitLab es una tienda-catálogo de camisetas y ropa deportiva construida con **Vue 3 (Composition API)**, **Vite** y **Tailwind CSS v4**. Todo el contenido —productos, imágenes y configuración— vive en un bucket público de **Supabase Storage**, por lo que no hay servidor propio, base de datos ni proceso de build por cada cambio de catálogo.

> [!NOTE]
> El catálogo se reconstruye en memoria a partir de los nombres de archivo de `catalog/` y de los JSON de `config/`. Agregar o editar un producto no requiere volver a desplegar la aplicación.

## Contenido

- [Características](#características)
- [Stack](#stack)
- [Inicio rápido](#inicio-rápido)
- [Configuración de Supabase](#configuración-de-supabase)
- [Variables de entorno](#variables-de-entorno)
- [Configuración JSON](#configuración-json)
- [Catálogo y taxonomía de archivos](#catálogo-y-taxonomía-de-archivos)
- [Filtros, orden y paginación](#filtros-orden-y-paginación)
- [Panel de administración](#panel-de-administración)
- [Arquitectura](#arquitectura)
- [Diseño y temas](#diseño-y-temas)
- [Rendimiento](#rendimiento)
- [Scripts](#scripts)
- [Pruebas](#pruebas)
- [Últimas actualizaciones](#últimas-actualizaciones)
- [Despliegue](#despliegue)
- [Documentación](#documentación)

## Características

- **Catálogo dinámico** desde Supabase Storage: lista de archivos WebP, parseo del nombre y URLs públicas.
- **Filtros en memoria** por categoría, equipo, prenda, retro y búsqueda por equipo/temporada.
- **Orden comercial** con modos `Recomendados`, `Más recientes` y `Menor precio`.
- **Jerarquía recomendada**: temporada reciente → equipos prioritarios → prendas → variantes.
- **Precios declarativos** por prenda, con `overrides` por equipo/archivo y precios tachados cuando hay descuento.
- **Pedidos por WhatsApp** con mensaje prearmado desde la tarjeta o el detalle del kit.
- **Panel de administración** con Supabase Auth para subir, editar, mover y eliminar imágenes, y editar los JSON de configuración.
- **Optimización en el navegador**: las imágenes se redimensionan y convierten a WebP antes de subirlas.
- **Dos temas semánticos** (`paper-light` y `slate-dark`) con tokens CSS compartidos.
- **Modo offline de desarrollo**: si Supabase no está configurado, la app usa un catálogo y configuraciones de ejemplo.
- **Iconos tree-shaken** mediante un registro central; nunca se importa el paquete completo de Lucide.

## Stack

| Capa | Tecnología |
| --- | --- |
| UI | Vue 3.5 con `<script setup>` y Composition API |
| Build | Vite 8 |
| Estilos | Tailwind CSS 4 + tokens CSS semánticos |
| Datos y activos | Supabase Storage (bucket público) + REST |
| Autenticación admin | Supabase Auth (email/contraseña) |
| Iconos | `@lucide/vue` con registro central |
| Tipografía | Inter y Plus Jakarta Sans (Google Fonts) |
| Pruebas | `node:test` + `node:assert/strict` |

## Inicio rápido

Requisitos: **Node.js `^20.19.0` o `>=22.12.0`** (requisito de Vite 8) y npm.

```bash
npm install
cp .env.example .env
# Completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

La aplicación queda disponible en la URL que imprime Vite (por defecto `http://localhost:5173`).

```bash
npm run build    # build de producción en dist/
npm run preview  # sirve el build localmente
npm test         # suite completa con node:test
```

Sin variables de Supabase, la app arranca igualmente con datos de demostración. El panel de administración sí necesita Supabase Auth y Storage configurados.

## Configuración de Supabase

1. Crea un proyecto en Supabase.
2. Crea un bucket **público** llamado `tigrito-assets` (o define otro nombre en `VITE_SUPABASE_BUCKET`).
3. Dentro del bucket, usa esta estructura:

```text
tigrito-assets/
├── catalog/
│   ├── CLUB_BARCELONA-SC_2026_LOCAL_CAMISETA.webp
│   ├── SEL_ECUADOR_2026_LOCAL_CONJUNTO.webp
│   └── ...
└── config/
    ├── store.json
    ├── notifications.json
    └── top-picks.json
```

4. Permite **lectura pública** sobre `catalog/` y `config/`.
5. Permite **escritura autenticada** sobre `catalog/` y `config/` para el usuario administrador.
6. Crea el usuario de administración desde **Authentication → Users** en Supabase.

> [!IMPORTANT]
> El panel de administración usa la sesión de Supabase Auth. No guardes contraseñas ni claves de servicio en el repositorio. La app solo necesita la URL del proyecto y la **anon key** pública.

La app accede al panel desde el hash `/#admin` o desde el enlace **Acceso al taller** del pie de página.

## Variables de entorno

Copia `.env.example` a `.env` y completa:

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Sí para datos reales | URL del proyecto, por ejemplo `https://xxxx.supabase.co`. |
| `VITE_SUPABASE_ANON_KEY` | Sí para datos reales | Anon key pública del proyecto. |
| `VITE_SUPABASE_BUCKET` | No | Nombre del bucket. Por defecto: `tigrito-assets`. |

El archivo `.env` está ignorado por Git; `.env.example` sí se versiona.

## Configuración JSON

Los tres archivos viven en `config/` dentro del bucket. El panel de administración los valida y los guarda sin necesidad de desplegar.

### `store.json`

Controla marca, precios, contacto, textos y contenido informativo.

```json
{
  "brandName": "Tigrito Kits",
  "tagline": "Catálogo de ropa deportiva de alta calidad",
  "whatsappNumber": "593963919421",
  "whatsappGreeting": "Hola Tigrito Kits, quiero información sobre un kit.",
  "currency": "USD",
  "basePrice": 25,
  "prices": {
    "CAMISETA": 25,
    "CONJUNTO": 40,
    "BUZO": 35,
    "IMPERMEABLE": 30,
    "PANTALONETA": 20,
    "JOGGER": 25
  },
  "priorityTeams": ["Barcelona SC", "Ecuador", "Real Madrid"],
  "overrides": [
    {
      "team": "Ecuador",
      "garment": "CAMISETA",
      "price": 20
    }
  ],
  "deliveryCity": "Milagro",
  "paymentMethods": ["Transferencia bancaria", "Efectivo contra entrega"],
  "reservationPolicy": "Los pedidos se reservan por 24 horas.",
  "localDeliveryPolicy": "Entregas coordinadas por WhatsApp en Milagro.",
  "ui": {
    "searchPlaceholder": "Busca por equipo o temporada",
    "emptyState": "No encontramos prendas con esos filtros."
  },
  "infoSections": [
    {
      "icon": "Truck",
      "title": "Entregas",
      "body": "Presenciales o envíos, coordinados por WhatsApp."
    }
  ]
}
```

| Campo | Uso |
| --- | --- |
| `brandName`, `tagline` | Identidad mostrada en encabezado y portada. |
| `whatsappNumber`, `whatsappGreeting` | Número y mensaje inicial para pedidos. |
| `currency` | Moneda usada por `Intl.NumberFormat`. |
| `prices` | Precio por código de prenda (`CAMISETA`, `BUZO`, etc.). Es la fuente principal del precio actual. |
| `basePrice` / `defaultPrice` | Respaldo cuando la prenda no tiene precio propio. |
| `priorityTeams` | Lista opcional de equipos prioritarios para el orden `Recomendados`. La comparación ignora mayúsculas. |
| `overrides` | Ajustes de precio opcionales. Pueden coincidir por `filename`, `team` y/o `garment`; gana la coincidencia más específica y, en empate, la última entrada. |
| `deliveryCity` | Ciudad de entrega local. |
| `paymentMethods`, `reservationPolicy`, `localDeliveryPolicy` | Contenido del modal de información. |
| `infoSections` | Secciones libres de respaldo (`icon`, `title`, `body`). |
| `ui.searchPlaceholder`, `ui.emptyState` | Textos de búsqueda y estado vacío. |

> [!TIP]
> Los nombres de icono deben existir en `src/config/icons.registry.js`. El editor JSON del panel muestra un selector de iconos disponibles y copia el nombre exacto al portapapeles.

### `notifications.json`

Anuncios que aparecen en el modal de novedades.

```json
{
  "updatedAt": "2026-11-13",
  "notifications": [
    {
      "id": "lluvias-impermeables-2026",
      "active": true,
      "icon": "Sparkles",
      "title": "Impermeables para la temporada de lluvias",
      "message": "Llegaron impermeables de clubes y selecciones.",
      "date": "2026-11-13"
    }
  ]
}
```

| Campo | Uso |
| --- | --- |
| `updatedAt` | Fecha de actualización del archivo. |
| `notifications[].id` | Identificador estable. |
| `notifications[].active` | Si es `false`, el anuncio no se muestra. |
| `notifications[].icon` | Nombre registrado en el registro de iconos. |
| `notifications[].title`, `message` | Contenido visible. |
| `notifications[].date` | Fecha ISO mostrada en la tarjeta. |

### `top-picks.json`

Selección curada de la portada.

```json
{
  "teams": ["Barcelona SC", "Ecuador", "Real Madrid"],
  "specificFiles": [
    "CLUB_BARCELONA-SC_2026_LOCAL_CAMISETA.webp",
    "SEL_ECUADOR_2026_LOCAL_CONJUNTO.webp"
  ]
}
```

Los `specificFiles` se resuelven primero y conservan el orden del archivo; después se agregan los equipos de `teams` sin duplicar kits.

## Catálogo y taxonomía de archivos

Cada imagen de `catalog/` debe cumplir el contrato de cinco segmentos:

```text
[CATEGORY]_[TEAM]_[SEASON]_[VARIANT]_[GARMENT].webp
```

| Segmento | Valores |
| --- | --- |
| `CATEGORY` | `CLUB`, `SEL` o `MARCA`. |
| `TEAM` | Equipo en mayúsculas, palabras unidas con guiones (`BARCELONA-SC`, `REAL-MADRID`, `ESPANA`). |
| `SEASON` | Año de cuatro dígitos (`2026`, `1998`) o `RETRO`. |
| `VARIANT` | `LOCAL`, `VISITA`, `TERCERA`, `100-ANOS-1`, `ED-LIMITADA`, etc. |
| `GARMENT` | `CAMISETA`, `CONJUNTO`, `BUZO`, `IMPERMEABLE`, `PANTALONETA`, `JOGGER`, `POLO`, etc. |

Reglas:

- Solo ASCII en mayúsculas; sin acentos ni `Ñ` (se normalizan a `N`).
- Los segmentos se separan con `_` y las palabras del equipo con `-`.
- Extensión obligatoria `.webp`.
- El parser deriva `team`, `season`, `variant`, `garment`, `category` e `isRetro`; las temporadas `RETRO` o anteriores a 2019 se consideran retro.

Ejemplo válido:

```text
CLUB_BARCELONA-SC_2026_LOCAL_CAMISETA.webp
```

## Filtros, orden y paginación

El catálogo se filtra y ordena en memoria; solo se renderizan **12 kits por lote** para reducir egress y trabajo del navegador.

Filtros disponibles:

- **Categoría**: todos, clubes, selecciones o marcas.
- **Equipo**: extraído dinámicamente del catálogo cargado.
- **Prenda**: extraída dinámicamente del catálogo (sin listas hardcodeadas).
- **Solo Retro**: activa `isRetro`.
- **Búsqueda**: por equipo o temporada.

Modos de orden:

| Modo | Criterio |
| --- | --- |
| `recommended` (por defecto) | Temporada descendente → `priorityTeams` → jerarquía de prendas → jerarquía de variantes. |
| `newest` | Temporada descendente → equipo alfabético → prendas → variantes. |
| `price-asc` | Precio actual ascendente (con `prices` y `overrides`) → temporada descendente. |

Jerarquía de prendas: `CAMISETA > CONJUNTO > BUZO > IMPERMEABLE > PANTALONETA > JOGGER`; el resto va después en orden alfabético.

Jerarquía de variantes: `LOCAL > VISITANTE > ALTERNA > EXCLUSIVA`; `VISITA` se trata como `VISITANTE`. El resto va después en orden alfabético.

Las temporadas numéricas se ordenan de más reciente a más antigua; las etiquetas no numéricas como `RETRO` van al final.

## Panel de administración

Abre `/#admin`. El acceso requiere un usuario de Supabase Auth.

**Configuración**

- Editor de `store.json`, `notifications.json` y `top-picks.json`.
- Validación de JSON antes de enviarlo.
- Vista previa del contenido, conteo de caracteres y guardado directo en Storage.
- Barra de iconos disponibles con copia del nombre exacto al portapapeles.

**Catálogo**

- Subida de imágenes con optimización local: lado máximo de **1400 px**, WebP con calidad **0.82**.
- Constructor de nombre con vista previa de los cinco segmentos y advertencia de sobrescritura.
- Combobox táctil para equipo, variante y prenda; las sugerencias salen del catálogo y de `store.json`.
- Edición de metadatos con movimiento del objeto en Storage.
- Reemplazo opcional de la imagen durante la edición.
- Eliminación de imágenes del catálogo.

Los cambios en el panel refrescan el catálogo y la configuración sin recargar la página.

## Arquitectura

La UI nunca llama a `fetch` ni al SDK de Supabase directamente. Todo el acceso a datos pasa por adaptadores y composables.

```text
App.vue / componentes
        │
        ▼
useCatalog.js · useAdminAuth.js
        │
        ▼
src/core/adapters/
├── catalogAdapter.js          # fachada pública de lectura
├── supabaseStorageAdapter.js  # listado/parseo de catálogo y configs
└── adminStorageAdapter.js     # Auth + escritura en Storage
        │
        ▼
Supabase Storage
```

Flujo de lectura:

1. `fetchCatalog()` lista `catalog/`, filtra `.webp` y parsea cada nombre.
2. `fetchConfig('store.json' | 'notifications.json' | 'top-picks.json')` descarga la configuración con cache-busting.
3. `useCatalog` mantiene el catálogo en memoria, aplica filtros declarativos, ordena y pagina.
4. Los componentes reciben datos y opciones ya resueltos.

Estructura del proyecto:

```text
.
├── docs/specs/                 # Especificaciones del desarrollo
├── public/brand/               # Avatar y activos de marca
├── src/
│   ├── assets/
│   │   ├── json/               # Ejemplos locales de configuración (ignorados por Git)
│   │   └── styles/             # Tailwind + temas semánticos
│   ├── components/
│   │   ├── admin/              # Login, panel, uploader y editor JSON
│   │   ├── BaseCombobox.vue    # Combobox táctil reutilizable
│   │   ├── FilterBar.vue       # Filtros, orden y contador
│   │   └── ...
│   ├── composables/            # useCatalog, useAdminAuth, useTheme
│   ├── config/
│   │   ├── filters.config.js   # Reglas declarativas de filtros y orden
│   │   └── icons.registry.js   # Registro tree-shaken de iconos
│   ├── core/
│   │   ├── adapters/           # Límites de datos
│   │   ├── domain/             # Lógica pura, p. ej. catalogSorter
│   │   ├── mocks/              # Catálogo/config de respaldo offline
│   │   ├── filterEngine.js     # Evaluador puro de filtros
│   │   ├── formatters.js       # Precios, textos, WhatsApp, fechas
│   │   └── ...
│   ├── App.vue
│   └── main.js
└── tests/                      # Suites de node:test
```

Decisiones clave:

- **Open/Closed para filtros**: nuevas reglas `select`, `toggle` o `search` se agregan en `filters.config.js`; el motor no cambia.
- **Orden puro y testeable**: `src/core/domain/catalogSorter.js` no depende de Vue ni del DOM.
- **Configuración como datos**: precios, equipos prioritarios, textos y contenido informativo salen de `store.json`.
- **Iconos centralizados**: `resolveIcon()` evita importar todo Lucide y permite nombres dinámicos desde JSON.

## Diseño y temas

- Estética editorial/táctil con superficies suaves, bordes sutiles y acento cálido.
- Tokens semánticos en `src/assets/styles/themes.css`: `--bg-base`, `--bg-surface`, `--bg-glass`, `--border-subtle`, `--accent-primary`, `--text-main`, `--text-muted`, etc.
- Temas `paper-light` y `slate-dark`, persistidos en `localStorage` y aplicados con `data-theme`.
- Tipografía: **Plus Jakarta Sans** para títulos y **Inter** para texto.
- Componentes accesibles: estados `aria-pressed`/`aria-expanded`, foco visible, etiquetas `sr-only` y objetivos táctiles cómodos.
- Grillas responsivas y truncado seguro para evitar desbordes en móvil.

## Rendimiento

- Filtrado y orden en memoria; sin peticiones por cada cambio de filtro.
- Render por lotes de **12** kits y `loading="lazy"` en imágenes.
- Iconos importados de forma nombrada y resueltos desde un registro central.
- El panel de administración y el SDK de Supabase se cargan en un chunk aparte.
- Las configuraciones se piden con `cache: 'no-store'` y parámetro de tiempo para evitar datos viejos.
- Las imágenes nuevas se optimizan en el cliente antes de subirse.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con HMR. |
| `npm run build` | Build de producción en `dist/`. |
| `npm run preview` | Sirve el build de producción localmente. |
| `npm test` | Ejecuta todas las suites con `node --test`. |

## Pruebas

La suite usa `node:test` y no necesita navegador ni DOM real. Cubre, entre otras áreas:

- Parseo de nombres, formateo de equipos y detección de retro.
- Motor de filtros declarativo y estado por defecto.
- Orden recomendado, `newest` y `price-asc`, incluyendo `priorityTeams`, jerarquías y precios.
- Opciones dinámicas de equipo, variante y prenda.
- Precios por prenda, overrides y descuentos.
- Adaptadores de Storage, autenticación y edición/movimiento de archivos.
- Optimización de imágenes, utilidades JSON y registro de iconos.
- Composición del catálogo, filtros, paginación y top picks.

```bash
npm test
```

## Últimas actualizaciones

- **Orden inteligente y filtro de prendas (spec 12):** orden comercial por temporada, `priorityTeams`, prendas y variantes; selector `Recomendados / Más recientes / Menor precio`; filtro dinámico de prendas.
- **Admin dinámico (spec 11):** combobox táctil reutilizable para equipo, variante y prenda; opciones derivadas del catálogo y de `store.json`; selector de iconos con copia al portapapeles.
- **Edición de catálogo (spec 10):** edición de metadatos, movimiento de objetos en Storage y reemplazo opcional de imagen.
- **Precios y marcas (spec 09):** precios por prenda, overrides por equipo/archivo y categoría `MARCA`.

Estado actual: **KitLab 1.1** en la interfaz, paquete privado `0.0.0`.

## Despliegue

El build genera archivos estáticos en `dist/`, aptos para Vercel, Netlify, Cloudflare Pages o cualquier hosting estático.

1. Configura `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y, si aplica, `VITE_SUPABASE_BUCKET` en el hosting.
2. Ejecuta `npm run build`.
3. Publica `dist/`.

No hay rutas del servidor ni fallback SPA especial: el panel se abre con el hash `/#admin`.

## Documentación

- `AGENTS.md`: reglas de arquitectura, estándares y flujo de trabajo.
- `docs/specs/`: especificaciones funcionales y criterios de aceptación, en orden de implementación.
- `src/config/filters.config.js`: definición declarativa de filtros y modos de orden.
- `src/config/icons.registry.js`: iconos disponibles para la UI y los JSON.

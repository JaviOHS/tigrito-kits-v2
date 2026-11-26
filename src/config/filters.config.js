export const SORT_OPTIONS = Object.freeze([
  { value: 'recommended', label: 'Recomendados' },
  { value: 'newest', label: 'Más recientes' },
  { value: 'price-asc', label: 'Menor precio' },
])

/**
 * Declarative filter rules. The UI renders controls from these definitions and
 * the pure filter engine evaluates them; no filter logic belongs in components.
 */
export const FILTER_CONFIG = Object.freeze([
  {
    key: 'category',
    type: 'select',
    label: 'Categoría',
    field: 'category',
    defaultValue: 'ALL',
    allValue: 'ALL',
    allLabel: 'Todos',
    options: Object.freeze([
      { value: 'ALL', label: 'Todos' },
      { value: 'CLUB', label: 'Clubes' },
      { value: 'SEL', label: 'Selecciones' },
      { value: 'MARCA', label: 'Marcas' },
    ]),
  },
  {
    key: 'retroOnly',
    type: 'toggle',
    label: 'Solo Retro',
    field: 'isRetro',
    defaultValue: false,
    activeValue: true,
    activeLabel: 'Retro',
  },
  {
    key: 'team',
    type: 'select',
    label: 'Equipo',
    field: 'team',
    defaultValue: 'ALL',
    allValue: 'ALL',
    allLabel: 'Todos los equipos',
    optionsSource: 'teams',
  },
  {
    key: 'garment',
    type: 'select',
    label: 'Prenda',
    field: 'garment',
    defaultValue: 'ALL',
    allValue: 'ALL',
    allLabel: 'Todas las prendas',
    optionsSource: 'garments',
  },
  {
    key: 'search',
    type: 'search',
    label: 'Buscar',
    fields: ['team', 'season'],
    defaultValue: '',
    placeholder: 'Busca por equipo o temporada',
  },
  {
    // Sorting is part of the filter state (so "Limpiar filtros" resets it), but
    // the filter engine ignores this rule because it has no field/evaluator.
    key: 'sort',
    type: 'sort',
    label: 'Ordenar',
    defaultValue: 'recommended',
    options: SORT_OPTIONS,
  },
])

export const DEFAULT_FILTER_STATE = Object.freeze(
  Object.fromEntries(
    FILTER_CONFIG.map(({ key, defaultValue }) => [key, defaultValue]),
  ),
)

export const CATEGORY_FILTER = FILTER_CONFIG.find(({ key }) => key === 'category')

export const RETRO_FILTER = FILTER_CONFIG.find(({ key }) => key === 'retroOnly')

export const TEAM_FILTER = FILTER_CONFIG.find(({ key }) => key === 'team')

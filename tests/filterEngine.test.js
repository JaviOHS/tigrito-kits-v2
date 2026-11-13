import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_FILTER_STATE,
  FILTER_CONFIG,
} from '../src/config/filters.config.js'
import { applyCatalogFilters } from '../src/core/filterEngine.js'
import { FALLBACK_CATALOG } from '../src/core/mocks/fallbackData.js'

function apply(overrides) {
  return applyCatalogFilters(
    FALLBACK_CATALOG,
    { ...DEFAULT_FILTER_STATE, ...overrides },
    FILTER_CONFIG,
  )
}

test('defines the requested declarative category and team rules', () => {
  const category = FILTER_CONFIG.find((rule) => rule.key === 'category')
  const team = FILTER_CONFIG.find((rule) => rule.key === 'team')
  const retro = FILTER_CONFIG.find((rule) => rule.key === 'retroOnly')
  const search = FILTER_CONFIG.find((rule) => rule.key === 'search')

  assert.deepEqual(
    category.options.map((option) => option.value),
    ['ALL', 'CLUB', 'SEL'],
  )
  assert.equal(category.type, 'select')
  assert.equal(team.optionsSource, 'teams')
  assert.equal(team.allValue, 'ALL')
  assert.equal(retro.type, 'toggle')
  assert.equal(retro.field, 'isRetro')
  assert.deepEqual(search.fields, ['team', 'season'])
  assert.deepEqual(DEFAULT_FILTER_STATE, {
    category: 'ALL',
    retroOnly: false,
    team: 'ALL',
    search: '',
  })
})

test('returns every item with default filters', () => {
  const result = applyCatalogFilters(
    FALLBACK_CATALOG,
    DEFAULT_FILTER_STATE,
    FILTER_CONFIG,
  )

  assert.equal(result.length, FALLBACK_CATALOG.length)
})

test('filters by category pills', () => {
  const clubs = apply({ category: 'CLUB' })
  const selections = apply({ category: 'SEL' })

  assert.ok(clubs.length > 0)
  assert.ok(clubs.every((kit) => kit.category === 'CLUB'))
  assert.ok(selections.length > 0)
  assert.ok(selections.every((kit) => kit.category === 'SEL'))
})

test('filters retro items through the boolean toggle', () => {
  const retro = apply({ retroOnly: true })
  const current = apply({ retroOnly: false })

  assert.ok(retro.length > 0)
  assert.ok(retro.every((kit) => kit.isRetro === true))
  assert.equal(current.length, FALLBACK_CATALOG.length)
})

test('filters by a dynamically extracted team', () => {
  const result = apply({ team: 'Argentina' })

  assert.ok(result.length > 0)
  assert.ok(result.every((kit) => kit.team === 'Argentina'))
})

test('search matches team or season only', () => {
  const teamMatches = apply({ search: 'barcelona' })
  const seasonMatches = apply({ search: '2014' })

  assert.ok(teamMatches.length >= 2)
  assert.ok(teamMatches.every((kit) => kit.team.toLowerCase().includes('barcelona')))
  assert.ok(seasonMatches.length > 0)
  assert.ok(seasonMatches.every((kit) => kit.season.includes('2014')))
})

test('combines active rules with AND semantics', () => {
  const result = apply({
    category: 'SEL',
    retroOnly: true,
    team: 'Argentina',
    search: '2014',
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].filename, 'SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp')
})

test('supports new declarative select rules without engine changes', () => {
  const garmentRules = [
    {
      key: 'garment',
      type: 'select',
      field: 'garment',
      defaultValue: 'ALL',
      allValue: 'ALL',
    },
  ]

  const result = applyCatalogFilters(
    FALLBACK_CATALOG,
    { garment: 'BUZO' },
    garmentRules,
  )

  assert.ok(result.length > 0)
  assert.ok(result.every((kit) => kit.garment === 'BUZO'))
})

test('accepts config keyed by filter id and handles bad input', () => {
  const configByKey = {
    category: {
      type: 'select',
      field: 'category',
      allValue: 'ALL',
    },
  }

  const result = applyCatalogFilters(
    FALLBACK_CATALOG,
    { category: 'SEL' },
    configByKey,
  )

  assert.ok(result.every((kit) => kit.category === 'SEL'))
  assert.deepEqual(applyCatalogFilters(null, {}, FILTER_CONFIG), [])
  assert.deepEqual(applyCatalogFilters(FALLBACK_CATALOG, {}, []), FALLBACK_CATALOG)
})

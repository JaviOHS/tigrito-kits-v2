import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildGarmentOptions,
  buildTeamOptions,
  buildVariantOptions,
} from '../src/core/adminOptions.js'

const KITS = [
  { team: 'Barcelona SC', variant: 'LOCAL', garment: 'CAMISETA' },
  { team: 'Barcelona SC', variant: 'VISITA', garment: 'BUZO' },
  { team: 'Ecuador', variant: 'LOCAL', garment: 'CAMISETA' },
]

test('builds team options from unique live catalog teams', () => {
  assert.deepEqual(buildTeamOptions(KITS), ['Barcelona SC', 'Ecuador'])
  assert.deepEqual(buildTeamOptions([]), [])
  assert.deepEqual(buildTeamOptions(null), [])
})

test('builds variant options from the live catalog with display labels', () => {
  assert.deepEqual(buildVariantOptions(KITS), [
    { value: 'LOCAL', label: 'Local' },
    { value: 'VISITA', label: 'Visita' },
  ])
  assert.deepEqual(buildVariantOptions([]), [])
})

test('builds garment options from store prices plus catalog garments', () => {
  const options = buildGarmentOptions(
    {
      prices: {
        CAMISETA: 25,
        SUDADERA: 35,
        ' buzo ': 30,
      },
    },
    KITS,
  )

  assert.deepEqual(
    options.map((option) => option.value),
    ['BUZO', 'CAMISETA', 'SUDADERA'],
  )
  assert.deepEqual(options[0], { value: 'BUZO', label: 'Buzo' })
  assert.deepEqual(options[2], { value: 'SUDADERA', label: 'Sudadera' })
})

test('ignores invalid price tables and still uses catalog garments', () => {
  assert.deepEqual(buildGarmentOptions({ prices: ['CAMISETA'] }, KITS), [
    { value: 'BUZO', label: 'Buzo' },
    { value: 'CAMISETA', label: 'Camiseta' },
  ])
  assert.deepEqual(buildGarmentOptions(null, null), [])
})

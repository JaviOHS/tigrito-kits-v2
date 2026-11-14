import test from 'node:test'
import assert from 'node:assert/strict'

import {
  GARMENT_OPTIONS,
  buildCatalogFilename,
  validateCatalogFilename,
} from '../src/core/filenameBuilder.js'

test('builds uppercase ASCII filenames from accented Spanish input', () => {
  assert.equal(
    buildCatalogFilename({
      category: 'sel',
      team: 'España',
      season: '2026',
      variant: 'Local',
      garment: 'Camiseta',
    }),
    'SEL_ESPANA_2026_LOCAL_CAMISETA.webp',
  )

  assert.equal(
    buildCatalogFilename({
      category: 'club',
      team: 'Barcelona SC',
      season: '2026',
      variant: '100 Años 1',
      garment: 'Camiseta',
    }),
    'CLUB_BARCELONA-SC_2026_100-ANOS-1_CAMISETA.webp',
  )
})

test('builds and validates MARCA category filenames with JOGGER', () => {
  assert.ok(GARMENT_OPTIONS.includes('JOGGER'))

  assert.equal(
    buildCatalogFilename({
      category: 'MARCA',
      team: 'Nike',
      season: '2026',
      variant: 'Negro',
      garment: 'Jogger',
    }),
    'MARCA_NIKE_2026_NEGRO_JOGGER.webp',
  )
  assert.equal(
    validateCatalogFilename('MARCA_NIKE_2026_NEGRO_IMPERMEABLE.webp'),
    true,
  )
})

test('normalizes accents, Ñ, punctuation, and repeated separators', () => {
  assert.equal(
    buildCatalogFilename({
      category: 'CLUB',
      team: 'Atlético de Madrid',
      season: '2026',
      variant: 'Edición Limitada',
      garment: 'Buzo',
    }),
    'CLUB_ATLETICO-DE-MADRID_2026_EDICION-LIMITADA_BUZO.webp',
  )

  assert.equal(
    buildCatalogFilename({
      category: 'SEL',
      team: "O'Higgins",
      season: '1998',
      variant: 'Local',
      garment: 'Polo',
    }),
    'SEL_OHIGGINS_1998_LOCAL_POLO.webp',
  )

  assert.equal(
    buildCatalogFilename({
      category: 'CLUB',
      team: '1. FC Köln',
      season: '2026',
      variant: '  Tercera  ',
      garment: 'Pantaloneta',
    }),
    'CLUB_1-FC-KOLN_2026_TERCERA_PANTALONETA.webp',
  )

  assert.equal(
    buildCatalogFilename({
      category: 'CLUB',
      team: 'Barcelona @ SC!',
      season: '2026',
      variant: 'Local',
      garment: 'Camiseta',
    }),
    'CLUB_BARCELONA-SC_2026_LOCAL_CAMISETA.webp',
  )
})

test('converts Ñ and non-decomposing Latin letters to ASCII', () => {
  assert.equal(
    buildCatalogFilename({
      category: 'SEL',
      team: 'Ñandú',
      season: 'RETRO',
      variant: 'Local',
      garment: 'Camiseta',
    }),
    'SEL_NANDU_RETRO_LOCAL_CAMISETA.webp',
  )

  assert.equal(
    buildCatalogFilename({
      category: 'CLUB',
      team: 'SønderjyskE',
      season: '2026',
      variant: 'Local',
      garment: 'Camiseta',
    }),
    'CLUB_SONDERJYSKE_2026_LOCAL_CAMISETA.webp',
  )
})

test('returns an empty string for missing or invalid taxonomy input', () => {
  assert.equal(buildCatalogFilename(), '')
  assert.equal(buildCatalogFilename(null), '')
  assert.equal(
    buildCatalogFilename({
      category: 'LIGA',
      team: 'Barcelona SC',
      season: '2026',
      variant: 'Local',
      garment: 'Camiseta',
    }),
    '',
  )
  assert.equal(
    buildCatalogFilename({
      category: 'CLUB',
      team: 'Barcelona SC',
      season: '26',
      variant: 'Local',
      garment: 'Camiseta',
    }),
    '',
  )
  assert.equal(
    buildCatalogFilename({
      category: 'CLUB',
      team: '!!!',
      season: '2026',
      variant: 'Local',
      garment: 'Camiseta',
    }),
    '',
  )
})

test('validates strict uppercase 5-segment WebP filenames', () => {
  assert.equal(
    validateCatalogFilename('SEL_ESPANA_2026_LOCAL_CAMISETA.webp'),
    true,
  )
  assert.equal(
    validateCatalogFilename('CLUB_BARCELONA-SC_2026_100-ANOS-1_CAMISETA.webp'),
    true,
  )
  assert.equal(
    validateCatalogFilename('CLUB_REAL-MADRID_RETRO_LOCAL_POLO.webp'),
    true,
  )
  assert.equal(
    validateCatalogFilename('SEL_ESPANA_1998_LOCAL_CAMISETA.webp'),
    true,
  )
})

test('rejects lowercase, malformed, path, and non-WebP filenames', () => {
  const invalid = [
    null,
    '',
    'sel_espana_2026_local_camiseta.webp',
    'SEL_ESPANA_2026_LOCAL_CAMISETA.WEBP',
    'SEL_ESPANA_2026_LOCAL_CAMISETA.png',
    'SEL_ESPANA_2026_LOCAL.webp',
    'SEL_ESPANA_2026_LOCAL_CAMISETA_EXTRA.webp',
    'SEL_ESPANA_26_LOCAL_CAMISETA.webp',
    'LIGA_ESPANA_2026_LOCAL_CAMISETA.webp',
    'SEL_ESPANA_2026_LOCAL__CAMISETA.webp',
    'SEL_ESPANA_2026_LOCAL--CAMISETA_B.webp',
    'catalog/SEL_ESPANA_2026_LOCAL_CAMISETA.webp',
    ' SEL_ESPANA_2026_LOCAL_CAMISETA.webp',
    'SEL_ESPANA_2026_LOCAL_CAMISETA.webp ',
  ]

  for (const filename of invalid) {
    assert.equal(
      validateCatalogFilename(filename),
      false,
      `Expected "${filename}" to be invalid.`,
    )
  }
})

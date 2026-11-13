import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildKitOrderMessage,
  buildWhatsAppUrl,
  formatFileSize,
  formatGarment,
  formatKitPrice,
  formatNotificationDate,
  formatPrice,
  formatVariant,
  resolveKitPrice,
} from '../src/core/formatters.js'

test('formats catalog variants and garments for display', () => {
  assert.equal(formatVariant('LOCAL'), 'Local')
  assert.equal(formatVariant('100-ANOS-1'), '100 años')
  assert.equal(formatVariant('ED-LIMITADA'), 'Edición limitada')
  assert.equal(formatVariant('TERCERA'), 'Tercera')
  assert.equal(formatVariant(undefined), '')

  assert.equal(formatGarment('CAMISETA'), 'Camiseta')
  assert.equal(formatGarment('IMPERMEABLE'), 'Impermeable')
  assert.equal(formatGarment('PANTALONETA'), 'Pantaloneta')
})

test('formats store prices with the configured currency', () => {
  assert.equal(formatPrice(35, 'USD'), '$35')
  assert.equal(formatPrice('35', 'USD'), '$35')
  assert.equal(formatPrice(35.5, 'USD'), '$35,50')
  assert.equal(formatPrice(0, 'USD'), '$0')
  assert.equal(formatPrice(null, 'USD'), '')
  assert.equal(formatPrice('', 'USD'), '')
  assert.equal(formatPrice('not-a-number', 'USD'), '')
})

test('resolves prices per garment with base price fallback', () => {
  const store = {
    basePrice: 25,
    prices: { CAMISETA: 25, IMPERMEABLE: 30 },
    currency: 'USD',
  }

  assert.equal(resolveKitPrice({ garment: 'CAMISETA' }, store), 25)
  assert.equal(resolveKitPrice({ garment: 'IMPERMEABLE' }, store), 30)
  assert.equal(resolveKitPrice({ garment: 'BUZO' }, store), 25)
  assert.equal(resolveKitPrice({ garment: 'IMPERMEABLE' }, {}), null)
  assert.equal(
    resolveKitPrice({ garment: 'CAMISETA' }, { defaultPrice: 20 }),
    20,
  )

  assert.equal(formatKitPrice({ garment: 'CAMISETA' }, store), '$25')
  assert.equal(formatKitPrice({ garment: 'IMPERMEABLE' }, store), '$30')
  assert.equal(formatKitPrice({ garment: 'BUZO' }, store), '$25')
})

test('builds encoded WhatsApp URLs and rejects missing numbers', () => {
  assert.equal(
    buildWhatsAppUrl('+593 99 999 9999', 'Hola mundo & kit'),
    'https://wa.me/593999999999?text=Hola%20mundo%20%26%20kit',
  )
  assert.equal(
    buildWhatsAppUrl('593999999999'),
    'https://wa.me/593999999999',
  )
  assert.equal(buildWhatsAppUrl('', 'Hola'), '')
  assert.equal(buildWhatsAppUrl(null, 'Hola'), '')
})

test('builds one consistent WhatsApp order message for cards and modals', () => {
  const kit = {
    team: 'Barcelona SC',
    season: '2025',
    variant: '100-ANOS-1',
    garment: 'CAMISETA',
  }
  const store = {
    whatsappGreeting: 'Hola Tigrito KitLab',
    basePrice: 35,
    currency: 'USD',
  }

  assert.equal(
    buildKitOrderMessage(kit, store),
    'Hola Tigrito KitLab\n\nQuiero pedir: Barcelona SC, temporada 2025, 100 años, Camiseta.\n\nPrecio: $35.',
  )
  assert.equal(
    buildKitOrderMessage(
      { ...kit, garment: 'IMPERMEABLE' },
      { ...store, prices: { IMPERMEABLE: 30 } },
    ),
    'Hola Tigrito KitLab\n\nQuiero pedir: Barcelona SC, temporada 2025, 100 años, Impermeable.\n\nPrecio: $30.',
  )
  assert.equal(
    buildKitOrderMessage(kit, {}),
    'Quiero pedir: Barcelona SC, temporada 2025, 100 años, Camiseta.',
  )
  assert.equal(buildKitOrderMessage(null, store), '')
})

test('formats byte counts for the admin image preview', () => {
  assert.equal(formatFileSize(0), '0 B')
  assert.equal(formatFileSize(512), '512 B')
  assert.equal(formatFileSize(1023), '1023 B')
  assert.equal(formatFileSize(1024), '1 KB')
  assert.equal(formatFileSize(1200), '1,2 KB')
  assert.equal(formatFileSize(1536), '1,5 KB')
  assert.equal(formatFileSize(10240), '10 KB')
  assert.equal(formatFileSize(1048576), '1 MB')
  assert.equal(formatFileSize(310632), '303 KB')
  assert.equal(formatFileSize(4666071), '4,4 MB')
  assert.equal(formatFileSize(-1), '')
  assert.equal(formatFileSize('not-a-number'), '')
  assert.equal(formatFileSize(Number.POSITIVE_INFINITY), '')
})

test('formats notification calendar dates without timezone drift', () => {
  assert.equal(formatNotificationDate('2026-11-01'), '1 nov 2026')
  assert.equal(formatNotificationDate('2026-10-15'), '15 oct 2026')
  assert.equal(formatNotificationDate(''), '')
  assert.equal(formatNotificationDate(null), '')
  assert.equal(formatNotificationDate('not-a-date'), '')
})

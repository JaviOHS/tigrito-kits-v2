import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildKitOrderMessage,
  buildWhatsAppUrl,
  formatGarment,
  formatNotificationDate,
  formatPrice,
  formatVariant,
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
    buildKitOrderMessage(kit, {}),
    'Quiero pedir: Barcelona SC, temporada 2025, 100 años, Camiseta.',
  )
  assert.equal(buildKitOrderMessage(null, store), '')
})

test('formats notification calendar dates without timezone drift', () => {
  assert.equal(formatNotificationDate('2026-11-01'), '1 nov 2026')
  assert.equal(formatNotificationDate('2026-10-15'), '15 oct 2026')
  assert.equal(formatNotificationDate(''), '')
  assert.equal(formatNotificationDate(null), '')
  assert.equal(formatNotificationDate('not-a-date'), '')
})

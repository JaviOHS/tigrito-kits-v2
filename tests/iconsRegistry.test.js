import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AVAILABLE_ICON_NAMES,
  DEFAULT_ICON_NAME,
  ICON_REGISTRY,
  resolveIcon,
} from '../src/config/icons.registry.js'

test('exposes every registered icon name for the admin picker', () => {
  assert.ok(Object.isFrozen(AVAILABLE_ICON_NAMES))
  assert.deepEqual(
    [...AVAILABLE_ICON_NAMES],
    Object.keys(ICON_REGISTRY).sort((a, b) => a.localeCompare(b)),
  )
  assert.ok(AVAILABLE_ICON_NAMES.includes(DEFAULT_ICON_NAME))
  assert.ok(AVAILABLE_ICON_NAMES.includes('Pencil'))
})

test('falls back to the default icon for unknown names', () => {
  assert.equal(resolveIcon('NotRegistered'), ICON_REGISTRY[DEFAULT_ICON_NAME])
})

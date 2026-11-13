import test from 'node:test'
import assert from 'node:assert/strict'

import {
  describeJsonError,
  formatJsonConfig,
  inspectJsonConfig,
} from '../src/core/jsonConfig.js'

test('inspects valid JSON without throwing', () => {
  assert.deepEqual(inspectJsonConfig('{"brandName":"Tigrito"}'), {
    valid: true,
    data: { brandName: 'Tigrito' },
    error: null,
  })
  assert.deepEqual(inspectJsonConfig('null'), {
    valid: true,
    data: null,
    error: null,
  })
  assert.deepEqual(inspectJsonConfig('[1,2,3]'), {
    valid: true,
    data: [1, 2, 3],
    error: null,
  })
})

test('rejects empty, non-string, and malformed input', () => {
  assert.equal(inspectJsonConfig('').valid, false)
  assert.equal(inspectJsonConfig('   ').error, 'El archivo está vacío.')
  assert.equal(inspectJsonConfig(null).error, 'El contenido debe ser texto.')
  assert.equal(inspectJsonConfig(42).error, 'El contenido debe ser texto.')

  const malformed = inspectJsonConfig('{"a":1,')
  assert.equal(malformed.valid, false)
  assert.equal(malformed.data, null)
  assert.equal(typeof malformed.error, 'string')
  assert.ok(malformed.error.length > 0)
})

test('adds a 1-based line and column when only a position is reported', () => {
  const source = '{"a":1,\n}'
  const message =
    'Unexpected token } in JSON at position 8'

  assert.equal(
    describeJsonError(new SyntaxError(message), source),
    `${message} (línea 2, columna 1)`,
  )
})

test('does not duplicate line and column information', () => {
  const message =
    'Unexpected token } in JSON at position 8 (line 2 column 1)'

  assert.equal(
    describeJsonError(new SyntaxError(message), '{"a":1,\n}'),
    message,
  )
  assert.equal(
    describeJsonError(new SyntaxError('Unexpected token'), '{'),
    'Unexpected token',
  )
  assert.equal(describeJsonError('fallo', ''), 'fallo')
})

test('formats valid JSON with two-space indentation', () => {
  assert.deepEqual(formatJsonConfig('{"a":1,"b":[2,3]}'), {
    valid: true,
    data: { a: 1, b: [2, 3] },
    error: null,
    text: '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}',
  })
})

test('returns the parse error when formatting invalid JSON', () => {
  const result = formatJsonConfig('{"a":1,')

  assert.equal(result.valid, false)
  assert.equal(result.data, null)
  assert.equal(typeof result.error, 'string')
  assert.equal(result.text, undefined)
})

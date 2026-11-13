function errorMessage(error) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'JSON inválido.'
}

/**
 * Add a 1-based line/column when the engine only reports a character
 * position. V8 and SpiderMonkey already include line/column in most errors.
 */
export function describeJsonError(error, source = '') {
  const message = errorMessage(error).trim() || 'JSON inválido.'

  if (typeof source !== 'string' || !source) return message
  if (/line\s+\d+/i.test(message)) return message

  const positionMatch = message.match(/position\s+(\d+)/i)
  if (!positionMatch) return message

  const position = Math.min(
    Math.max(Number(positionMatch[1]), 0),
    source.length,
  )
  const before = source.slice(0, position)
  const line = before.split('\n').length
  const lastBreak = before.lastIndexOf('\n')
  const column = position - lastBreak

  return `${message} (línea ${line}, columna ${column})`
}

/**
 * Inspect a raw config string without throwing. The admin editor uses this on
 * every keystroke, so it must stay synchronous and side-effect free.
 */
export function inspectJsonConfig(source) {
  if (typeof source !== 'string') {
    return {
      valid: false,
      data: null,
      error: 'El contenido debe ser texto.',
    }
  }

  if (!source.trim()) {
    return { valid: false, data: null, error: 'El archivo está vacío.' }
  }

  try {
    return { valid: true, data: JSON.parse(source), error: null }
  } catch (error) {
    return {
      valid: false,
      data: null,
      error: describeJsonError(error, source),
    }
  }
}

/**
 * Format valid JSON with two-space indentation. Invalid input returns the
 * same inspection result so callers can surface the parse error.
 */
export function formatJsonConfig(source) {
  const result = inspectJsonConfig(source)
  if (!result.valid) return result

  return {
    ...result,
    text: JSON.stringify(result.data, null, 2),
  }
}

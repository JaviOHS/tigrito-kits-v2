import test from 'node:test'
import assert from 'node:assert/strict'

import { createImageOptimizer } from '../src/core/imageOptimizer.js'

function createHarness({ source, resultBlob, encode } = {}) {
  const calls = {
    draws: [],
    sourceClosed: false,
    loadCalls: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    quality: null,
    contextType: null,
    encodedCanvas: null,
    file: null,
  }

  const blob = resultBlob ?? new Blob(['optimized'], { type: 'image/webp' })
  const imageSource = source ?? {
    width: 2800,
    height: 1400,
    close() {
      calls.sourceClosed = true
    },
  }

  const context = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    drawImage(...args) {
      calls.draws.push(args)
    },
  }

  const canvas = {
    width: 0,
    height: 0,
    getContext(type) {
      calls.contextType = type
      return context
    },
  }

  const optimize = createImageOptimizer({
    loadImage: async (file) => {
      calls.loadCalls += 1
      calls.file = file
      return imageSource
    },
    createCanvas: (width, height) => {
      calls.canvasWidth = width
      calls.canvasHeight = height
      canvas.width = width
      canvas.height = height
      return canvas
    },
    encodeCanvas: async (targetCanvas, quality) => {
      calls.encodedCanvas = targetCanvas
      calls.quality = quality

      return encode ? encode(targetCanvas, quality) : blob
    },
  })

  return { optimize, calls, context, canvas, blob, source: imageSource }
}

test('scales landscape images to 1400px and reports compression sizes', async () => {
  const harness = createHarness()
  const file = { size: 5000 }

  const result = await harness.optimize(file)

  assert.equal(result.blob, harness.blob)
  assert.equal(result.width, 1400)
  assert.equal(result.height, 700)
  assert.equal(result.originalSize, 5000)
  assert.equal(result.optimizedSize, harness.blob.size)
  assert.equal(harness.calls.file, file)
  assert.equal(harness.calls.canvasWidth, 1400)
  assert.equal(harness.calls.canvasHeight, 700)
  assert.equal(harness.calls.quality, 0.82)
  assert.equal(harness.calls.contextType, '2d')
  assert.equal(harness.context.imageSmoothingEnabled, true)
  assert.equal(harness.context.imageSmoothingQuality, 'high')
  assert.equal(harness.calls.draws.length, 1)
  assert.equal(harness.calls.draws[0][0], harness.source)
  assert.deepEqual(harness.calls.draws[0].slice(1), [0, 0, 1400, 700])
  assert.equal(harness.calls.sourceClosed, true)
})

test('does not upscale images smaller than the dimension limit', async () => {
  const harness = createHarness({
    source: { width: 800, height: 600, close() {} },
  })

  const result = await harness.optimize({ size: 1200 })

  assert.equal(result.width, 800)
  assert.equal(result.height, 600)
  assert.equal(harness.calls.canvasWidth, 800)
  assert.equal(harness.calls.canvasHeight, 600)
})

test('scales portrait images proportionally', async () => {
  const harness = createHarness({
    source: { width: 1000, height: 3000, close() {} },
  })

  const result = await harness.optimize({ size: 9000 })

  assert.equal(result.width, 467)
  assert.equal(result.height, 1400)
})

test('prefers natural image dimensions when available', async () => {
  const harness = createHarness({
    source: {
      naturalWidth: 2800,
      naturalHeight: 1400,
      width: 100,
      height: 100,
      close() {},
    },
  })

  const result = await harness.optimize({ size: 4000 })

  assert.equal(result.width, 1400)
  assert.equal(result.height, 700)
})

test('validates options before loading the image', async () => {
  const harness = createHarness()

  await assert.rejects(
    () => harness.optimize({ size: 100 }, { maxDimension: 0 }),
    /maxDimension/,
  )
  await assert.rejects(
    () => harness.optimize({ size: 100 }, { quality: 1.1 }),
    /quality/,
  )

  assert.equal(harness.calls.loadCalls, 0)
})

test('rejects missing and empty files before loading', async () => {
  const harness = createHarness()

  await assert.rejects(() => harness.optimize(null), /File or Blob/)
  await assert.rejects(() => harness.optimize({ size: 0 }), /empty/)

  assert.equal(harness.calls.loadCalls, 0)
})

test('closes the source when encoding fails', async () => {
  const harness = createHarness({
    encode: async () => {
      throw new Error('encode failed')
    },
  })

  await assert.rejects(() => harness.optimize({ size: 100 }), /encode failed/)
  assert.equal(harness.calls.sourceClosed, true)
})

test('rejects non-WebP encoder output', async () => {
  const harness = createHarness({
    resultBlob: new Blob(['png'], { type: 'image/png' }),
  })

  await assert.rejects(
    () => harness.optimize({ size: 100 }),
    /WebP encoding is not supported/,
  )
  assert.equal(harness.calls.sourceClosed, true)
})

test('closes the source when image dimensions are invalid', async () => {
  let closed = false
  const harness = createHarness({
    source: {
      width: 0,
      height: 100,
      close() {
        closed = true
      },
    },
  })

  await assert.rejects(
    () => harness.optimize({ size: 100 }),
    /invalid dimensions/,
  )
  assert.equal(closed, true)
})

test('rejects a canvas without a 2D context', async () => {
  let closed = false
  const optimize = createImageOptimizer({
    loadImage: async () => ({
      width: 100,
      height: 100,
      close() {
        closed = true
      },
    }),
    createCanvas: () => ({ getContext: () => null }),
    encodeCanvas: async () => new Blob(['webp'], { type: 'image/webp' }),
  })

  await assert.rejects(
    () => optimize({ size: 100 }),
    /2D canvas context/,
  )
  assert.equal(closed, true)
})

test('requires callable browser primitives', () => {
  assert.throws(
    () => createImageOptimizer({ loadImage: null }),
    /dependencies must be functions/,
  )
})

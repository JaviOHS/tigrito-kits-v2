const DEFAULT_MAX_DIMENSION = 1400
const DEFAULT_QUALITY = 0.82

function normalizeOptions(options = {}) {
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
  } = options ?? {}

  const limit = Number(maxDimension)
  const webpQuality = Number(quality)

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new TypeError('maxDimension must be a positive number.')
  }

  if (!Number.isFinite(webpQuality) || webpQuality < 0 || webpQuality > 1) {
    throw new TypeError('quality must be a number between 0 and 1.')
  }

  return {
    maxDimension: Math.max(1, Math.floor(limit)),
    quality: webpQuality,
  }
}

function calculateTargetDimensions(width, height, maxDimension) {
  const sourceWidth = Number(width)
  const sourceHeight = Number(height)

  if (
    !Number.isFinite(sourceWidth) ||
    sourceWidth <= 0 ||
    !Number.isFinite(sourceHeight) ||
    sourceHeight <= 0
  ) {
    throw new Error('The selected image has invalid dimensions.')
  }

  const largestSide = Math.max(sourceWidth, sourceHeight)

  if (largestSide <= maxDimension) {
    return {
      width: Math.max(1, Math.round(sourceWidth)),
      height: Math.max(1, Math.round(sourceHeight)),
    }
  }

  const ratio = maxDimension / largestSide

  return {
    width: Math.max(1, Math.round(sourceWidth * ratio)),
    height: Math.max(1, Math.round(sourceHeight * ratio)),
  }
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    if (
      typeof Image !== 'function' ||
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      reject(new Error('Image decoding is not available in this environment.'))
      return
    }

    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.decoding = 'async'
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('The selected image could not be decoded.'))
    }
    image.src = objectUrl
  })
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Some browsers expose createImageBitmap but cannot decode every format.
      // Fall back to the <img> decoder before surfacing an error.
    }
  }

  return loadImageElement(file)
}

function createCanvasElement(width, height) {
  if (
    typeof OffscreenCanvas === 'function' &&
    typeof OffscreenCanvas.prototype?.convertToBlob === 'function'
  ) {
    return new OffscreenCanvas(width, height)
  }

  if (
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function'
  ) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  throw new Error('Canvas rendering is not available in this environment.')
}

function encodeCanvasToWebp(canvas, quality) {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: 'image/webp', quality })
  }

  if (typeof canvas.toBlob === 'function') {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('The image could not be encoded as WebP.'))
          }
        },
        'image/webp',
        quality,
      )
    })
  }

  return Promise.reject(
    new Error('Canvas encoding is not available in this environment.'),
  )
}

/**
 * Build an optimizer with injectable browser primitives so the scaling and
 * encoding contract can be tested without a DOM. The default export uses the
 * real createImageBitmap/Image and canvas WebP APIs.
 */
export function createImageOptimizer({
  loadImage = loadImageSource,
  createCanvas = createCanvasElement,
  encodeCanvas = encodeCanvasToWebp,
} = {}) {
  if (
    typeof loadImage !== 'function' ||
    typeof createCanvas !== 'function' ||
    typeof encodeCanvas !== 'function'
  ) {
    throw new TypeError('Image optimizer dependencies must be functions.')
  }

  return async function optimizeImageToWebp(file, options = {}) {
    if (
      !file ||
      typeof file.size !== 'number' ||
      !Number.isFinite(file.size) ||
      file.size < 0
    ) {
      throw new TypeError('A File or Blob is required.')
    }

    if (file.size === 0) {
      throw new Error('The selected image is empty.')
    }

    const settings = normalizeOptions(options)
    const source = await loadImage(file)

    try {
      const sourceWidth = source?.naturalWidth || source?.width
      const sourceHeight = source?.naturalHeight || source?.height
      const target = calculateTargetDimensions(
        sourceWidth,
        sourceHeight,
        settings.maxDimension,
      )

      const canvas = createCanvas(target.width, target.height)
      const context = canvas?.getContext?.('2d')

      if (!context) {
        throw new Error('Unable to create a 2D canvas context.')
      }

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(source, 0, 0, target.width, target.height)

      const blob = await encodeCanvas(canvas, settings.quality)

      if (!blob || blob.type !== 'image/webp' || blob.size <= 0) {
        throw new Error('WebP encoding is not supported in this browser.')
      }

      return {
        blob,
        width: target.width,
        height: target.height,
        originalSize: file.size,
        optimizedSize: blob.size,
      }
    } finally {
      if (typeof source?.close === 'function') {
        try {
          source.close()
        } catch {
          // Releasing an already-closed bitmap must not hide the real result.
        }
      }
    }
  }
}

export const optimizeImageToWebp = createImageOptimizer()

export default optimizeImageToWebp

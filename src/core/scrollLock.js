let lockCount = 0
let originalOverflow = ''
let originalPaddingRight = ''

function hasDocument() {
  return typeof document !== 'undefined' && Boolean(document.body)
}

/**
 * Prevent background scrolling while one or more modals are open. The lock is
 * reference-counted so overlapping dialogs cannot restore the page too early.
 */
export function lockBodyScroll() {
  if (!hasDocument()) return

  if (lockCount === 0) {
    const { body } = document
    originalOverflow = body.style.overflow
    originalPaddingRight = body.style.paddingRight

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'

    if (scrollbarWidth > 0) {
      const currentPadding =
        Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }
  }

  lockCount += 1
}

export function unlockBodyScroll() {
  if (!hasDocument() || lockCount === 0) return

  lockCount -= 1
  if (lockCount > 0) return

  document.body.style.overflow = originalOverflow
  document.body.style.paddingRight = originalPaddingRight

  originalOverflow = ''
  originalPaddingRight = ''
}

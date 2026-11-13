<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

import { resolveIcon } from '../config/icons.registry.js'
import { lockBodyScroll, unlockBodyScroll } from '../core/scrollLock.js'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['md', 'lg', 'xl'].includes(value),
  },
})

const emit = defineEmits(['close'])

const SIZE_CLASSES = Object.freeze({
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
})

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const CloseIcon = resolveIcon('X')
const panel = ref(null)
const titleId = useId()
const subtitleId = useId()

let previouslyFocused = null
let isActive = false

function requestClose() {
  emit('close')
}

function getFocusableElements() {
  const root = panel.value
  if (!root) return []

  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (element) =>
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.hasAttribute('hidden') &&
      (element.offsetWidth > 0 ||
        element.offsetHeight > 0 ||
        element.getClientRects().length > 0),
  )
}

function handleKeydown(event) {
  if (!props.open || event.defaultPrevented) return

  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
    return
  }

  if (event.key !== 'Tab') return

  const focusable = getFocusableElements()
  if (!focusable.length) {
    event.preventDefault()
    panel.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  const focusIsInside = panel.value?.contains(active)

  if (event.shiftKey) {
    if (!focusIsInside || active === first || active === panel.value) {
      event.preventDefault()
      last.focus()
    }
    return
  }

  if (!focusIsInside || active === last) {
    event.preventDefault()
    first.focus()
  }
}

function activate() {
  if (isActive) return
  isActive = true

  previouslyFocused =
    typeof document !== 'undefined' ? document.activeElement : null

  lockBodyScroll()
  document.addEventListener('keydown', handleKeydown)

  nextTick(() => panel.value?.focus())
}

function deactivate() {
  if (!isActive) return
  isActive = false

  document.removeEventListener('keydown', handleKeydown)
  unlockBodyScroll()

  const target = previouslyFocused
  previouslyFocused = null

  nextTick(() => {
    if (target && target.isConnected) target.focus()
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) activate()
    else deactivate()
  },
  { immediate: true },
)

onBeforeUnmount(deactivate)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      >
        <div
          class="absolute inset-0 bg-scrim backdrop-blur-sm"
          aria-hidden="true"
          @click="requestClose"
        />

        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="subtitle ? subtitleId : undefined"
          tabindex="-1"
          class="modal-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-subtle bg-surface text-main shadow-lifted outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
          :class="SIZE_CLASSES[size] ?? SIZE_CLASSES.md"
        >
          <header
            class="flex items-start gap-3 border-b border-subtle bg-surface px-4 py-3.5 sm:px-6 sm:py-4"
          >
            <div class="min-w-0 flex-1">
              <h2
                :id="titleId"
                class="truncate font-display text-xl font-semibold tracking-tight text-main sm:text-2xl"
              >
                {{ title }}
              </h2>
              <p
                v-if="subtitle"
                :id="subtitleId"
                class="mt-0.5 truncate text-xs text-muted sm:text-sm"
              >
                {{ subtitle }}
              </p>
            </div>

            <button
              type="button"
              class="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-subtle bg-base text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-10"
              aria-label="Cerrar"
              @click="requestClose"
            >
              <component :is="CloseIcon" :size="18" aria-hidden="true" />
            </button>
          </header>

          <div
            class="modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <slot />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--border-subtle) transparent;
}

.modal-scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.modal-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.modal-scroll::-webkit-scrollbar-thumb {
  background-color: var(--border-subtle);
  border: 3px solid var(--bg-surface);
  border-radius: 9999px;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: translateY(14px);
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-panel,
  .modal-leave-active .modal-panel {
    transition: none;
  }
}
</style>

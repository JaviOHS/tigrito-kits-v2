<script setup>
import { onBeforeUnmount, watch } from 'vue'

import { resolveIcon } from '../../config/icons.registry.js'

const AUTO_DISMISS_MS = 5000

const props = defineProps({
  type: {
    type: String,
    default: 'error',
    validator: (value) => ['success', 'error'].includes(value),
  },
  message: {
    type: String,
    default: '',
  },
  autoDismiss: {
    type: Number,
    default: AUTO_DISMISS_MS,
  },
})

const emit = defineEmits(['dismiss'])

const CheckIcon = resolveIcon('CheckCircle')
const AlertIcon = resolveIcon('AlertCircle')
const CloseIcon = resolveIcon('X')

let dismissTimer = null

function clearDismissTimer() {
  if (dismissTimer === null) return
  clearTimeout(dismissTimer)
  dismissTimer = null
}

function scheduleDismiss() {
  clearDismissTimer()

  if (props.type !== 'success' || !props.message || props.autoDismiss <= 0) {
    return
  }

  dismissTimer = setTimeout(() => {
    dismissTimer = null
    emit('dismiss')
  }, props.autoDismiss)
}

watch(
  () => [props.type, props.message, props.autoDismiss],
  scheduleDismiss,
  { immediate: true },
)

onBeforeUnmount(clearDismissTimer)
</script>

<template>
  <div
    class="flex min-w-0 items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-5"
    :class="
      type === 'success'
        ? 'border-success bg-success-soft text-success'
        : 'border-danger bg-danger-soft text-danger'
    "
    :role="type === 'error' ? 'alert' : 'status'"
  >
    <component
      :is="type === 'success' ? CheckIcon : AlertIcon"
      :size="16"
      class="mt-0.5 shrink-0"
      aria-hidden="true"
    />
    <p class="min-w-0 flex-1 break-words break-all">{{ message }}</p>
    <button
      type="button"
      class="-my-1 -mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label="Descartar mensaje"
      @click="emit('dismiss')"
    >
      <component :is="CloseIcon" :size="14" aria-hidden="true" />
    </button>
  </div>
</template>

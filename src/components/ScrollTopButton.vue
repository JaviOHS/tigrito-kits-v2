<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { resolveIcon } from '../config/icons.registry.js'

const SCROLL_THRESHOLD = 400

const isVisible = ref(false)
const ArrowUpIcon = resolveIcon('ArrowUp')

function updateVisibility() {
  isVisible.value = window.scrollY > SCROLL_THRESHOLD
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', updateVisibility, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateVisibility)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-2 opacity-0"
  >
    <button
      v-if="isVisible"
      type="button"
      aria-label="Volver arriba"
      title="Volver arriba"
      class="fixed bottom-6 right-6 z-40 grid size-11 place-items-center rounded-full bg-accent-dark text-surface shadow-lifted transition-colors hover:bg-accent hover:text-accent-contrast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
      @click="scrollToTop"
    >
      <component :is="ArrowUpIcon" :size="20" aria-hidden="true" />
    </button>
  </Transition>
</template>

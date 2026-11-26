<script setup>
import { onBeforeUpdate, ref } from 'vue'

import KitBoxCard from './KitBoxCard.vue'

defineProps({
  kits: {
    type: Array,
    default: () => [],
  },
  store: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['select'])

const gridRef = ref(null)
const previousRects = new Map()

function gridElement() {
  const grid = gridRef.value
  return grid?.$el ?? grid
}

// Capture every card's position before Vue patches the grid. Leaving cards are
// taken out of flow, so without this they would all stack on the first cell.
onBeforeUpdate(() => {
  const grid = gridElement()
  if (!grid?.querySelectorAll) return

  const gridRect = grid.getBoundingClientRect()
  previousRects.clear()

  grid.querySelectorAll('[data-kit-id]').forEach((card) => {
    const rect = card.getBoundingClientRect()
    previousRects.set(card.dataset.kitId, {
      top: rect.top - gridRect.top,
      left: rect.left - gridRect.left,
      width: rect.width,
      height: rect.height,
    })
  })
})

function pinLeavingCard(el) {
  const rect = previousRects.get(el.dataset.kitId)
  if (!rect) return

  Object.assign(el.style, {
    position: 'absolute',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    pointerEvents: 'none',
  })
}

function resetLeavingCard(el) {
  for (const property of [
    'position',
    'top',
    'left',
    'width',
    'height',
    'margin',
    'pointer-events',
  ]) {
    el.style.removeProperty(property)
  }
}
</script>

<template>
  <TransitionGroup
    ref="gridRef"
    name="kit-grid"
    tag="div"
    class="kit-grid relative grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
    @before-leave="pinLeavingCard"
    @after-leave="resetLeavingCard"
    @leave-cancelled="resetLeavingCard"
  >
    <KitBoxCard
      v-for="kit in kits"
      :key="kit.id"
      :data-kit-id="kit.id"
      :kit="kit"
      :store="store"
      @select="emit('select', $event)"
    />
  </TransitionGroup>
</template>

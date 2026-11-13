<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { resolveIcon } from '../config/icons.registry.js'
import {
  buildKitOrderMessage,
  buildWhatsAppUrl,
  formatGarment,
  formatKitPrice,
  formatVariant,
} from '../core/formatters.js'
import ModalShell from './ModalShell.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  kit: {
    type: Object,
    default: null,
  },
  kits: {
    type: Array,
    default: () => [],
  },
  store: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['close', 'navigate'])

const imageFailed = ref(false)
const isZoomed = ref(false)

const ShirtIcon = resolveIcon('Shirt')
const ZoomIcon = computed(() =>
  resolveIcon(isZoomed.value ? 'ZoomOut' : 'ZoomIn'),
)
const ArrowLeftIcon = resolveIcon('ArrowLeft')
const ArrowRightIcon = resolveIcon('ArrowRight')
const WhatsAppIcon = resolveIcon('MessageCircle')

const title = computed(() =>
  props.kit
    ? [props.kit.team, props.kit.season].filter(Boolean).join(' · ')
    : '',
)
const variantLabel = computed(() => formatVariant(props.kit?.variant))
const garmentLabel = computed(() => formatGarment(props.kit?.garment))
const subtitle = computed(() =>
  props.kit
    ? [props.kit.categoryLabel, variantLabel.value, garmentLabel.value]
        .filter(Boolean)
        .join(' · ')
    : '',
)
const priceLabel = computed(() => formatKitPrice(props.kit, props.store))
const imageAlt = computed(() =>
  props.kit
    ? `${props.kit.team}, ${props.kit.season}, ${variantLabel.value}, ${garmentLabel.value}`
    : '',
)

const metadata = computed(() => {
  if (!props.kit) return []

  return [
    { label: 'Categoría', value: props.kit.categoryLabel },
    { label: 'Temporada', value: props.kit.season },
    { label: 'Variante', value: variantLabel.value },
    { label: 'Prenda', value: garmentLabel.value },
  ].filter((item) => item.value)
})

const currentIndex = computed(() =>
  props.kits.findIndex((kit) => kit.id === props.kit?.id),
)
const hasNavigation = computed(() => props.kits.length > 1)
const positionLabel = computed(() =>
  currentIndex.value >= 0
    ? `${currentIndex.value + 1} / ${props.kits.length}`
    : '',
)
const zoomLabel = computed(() =>
  isZoomed.value ? 'Reducir imagen' : 'Ampliar imagen',
)

const orderMessage = computed(() =>
  buildKitOrderMessage(props.kit, props.store),
)
const whatsappUrl = computed(() =>
  buildWhatsAppUrl(props.store?.whatsappNumber, orderMessage.value),
)

function toggleZoom() {
  isZoomed.value = !isZoomed.value
}

function navigate(direction) {
  if (!hasNavigation.value) return
  emit('navigate', direction)
}

function handleKeydown(event) {
  if (!props.open || event.defaultPrevented) return
  if (event.altKey || event.ctrlKey || event.metaKey) return

  const target = event.target
  const tagName = target?.tagName
  if (
    target?.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  ) {
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    navigate(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    navigate(1)
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      document.addEventListener('keydown', handleKeydown)
    } else {
      document.removeEventListener('keydown', handleKeydown)
      imageFailed.value = false
      isZoomed.value = false
    }
  },
  { immediate: true },
)

watch(
  () => props.kit?.id,
  () => {
    imageFailed.value = false
    isZoomed.value = false
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <ModalShell
    :open="open"
    :title="title"
    :subtitle="subtitle"
    size="xl"
    @close="emit('close')"
  >
    <div v-if="kit" class="grid lg:grid-cols-[1.05fr_0.95fr]">
      <div class="border-b border-subtle lg:border-b-0 lg:border-r">
        <div
          class="kit-stage h-[clamp(16rem,42dvh,30rem)] overflow-hidden lg:h-full lg:min-h-[28rem]"
        >
          <button
            v-if="kit.imageUrl && !imageFailed"
            type="button"
            class="group relative flex size-full items-center justify-center p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent motion-reduce:transition-none sm:p-6"
            :class="isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'"
            :aria-label="zoomLabel"
            :aria-pressed="isZoomed"
            @click="toggleZoom"
          >
            <img
              :src="kit.imageUrl"
              :alt="imageAlt"
              decoding="async"
              class="max-h-full max-w-full object-contain transition-transform duration-300 ease-out motion-reduce:transition-none"
              :class="isZoomed ? 'scale-[1.65]' : ''"
              @error="imageFailed = true"
            />

            <span
              class="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-subtle bg-glass px-2.5 py-1 text-[0.7rem] font-semibold text-main backdrop-blur-sm"
            >
              <component :is="ZoomIcon" :size="13" aria-hidden="true" />
              {{ zoomLabel }}
            </span>
          </button>

          <div
            v-else
            class="grid size-full place-items-center text-subtle"
            aria-hidden="true"
          >
            <component :is="ShirtIcon" :size="56" :stroke-width="1.4" />
          </div>
        </div>

        <div
          class="flex items-center justify-between gap-2 border-t border-subtle bg-surface px-3 py-2"
        >
          <button
            type="button"
            class="inline-flex size-9 items-center justify-center rounded-full border border-subtle bg-base text-main transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!hasNavigation"
            aria-label="Ver kit anterior"
            @click="navigate(-1)"
          >
            <component :is="ArrowLeftIcon" :size="16" aria-hidden="true" />
          </button>

          <p class="text-xs font-medium tabular-nums text-muted">
            {{ positionLabel }}
          </p>

          <button
            type="button"
            class="inline-flex size-9 items-center justify-center rounded-full border border-subtle bg-base text-main transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!hasNavigation"
            aria-label="Ver kit siguiente"
            @click="navigate(1)"
          >
            <component :is="ArrowRightIcon" :size="16" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-5 p-4 sm:p-6">
        <div class="flex flex-wrap items-center gap-2">
          <span
            v-if="kit.categoryLabel"
            class="rounded-full border border-subtle bg-base px-2.5 py-1 text-[0.7rem] font-semibold text-main"
          >
            {{ kit.categoryLabel }}
          </span>
          <span
            v-if="kit.isRetro"
            class="rounded-full border border-accent bg-accent px-2.5 py-1 text-[0.7rem] font-semibold text-accent-contrast"
          >
            Retro
          </span>
        </div>

        <div>
          <h3
            class="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted"
          >
            Detalles del kit
          </h3>
          <dl class="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-3">
            <div v-for="item in metadata" :key="item.label">
              <dt class="text-xs text-muted">{{ item.label }}</dt>
              <dd class="mt-0.5 text-sm font-medium text-main">
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </div>

        <div
          class="mt-auto rounded-2xl border border-subtle bg-base p-4 sm:p-5"
        >
          <p
            v-if="priceLabel"
            class="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted"
          >
            Precio
          </p>
          <p
            v-if="priceLabel"
            class="mt-0.5 font-display text-2xl font-semibold tabular-nums text-main"
          >
            {{ priceLabel }}
          </p>

          <a
            v-if="whatsappUrl"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`Pedir ${kit.team} por WhatsApp`"
            class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast shadow-soft transition-colors hover:bg-accent-dark hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <component :is="WhatsAppIcon" :size="17" aria-hidden="true" />
            Pedir por WhatsApp
          </a>

          <p class="mt-2.5 text-center text-[0.7rem] leading-4 text-muted">
            Coordina pago y entrega directamente por WhatsApp.
          </p>
        </div>

        <p
          v-if="hasNavigation"
          class="text-center text-[0.7rem] leading-4 text-muted"
        >
          Usa las flechas ← → para moverte entre kits.
        </p>

        <p class="sr-only" aria-live="polite">
          {{ title }}{{ positionLabel ? `, ${positionLabel}` : '' }}
        </p>
      </div>
    </div>
  </ModalShell>
</template>

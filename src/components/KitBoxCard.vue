<script setup>
import { computed, ref } from 'vue'

import { resolveIcon } from '../config/icons.registry.js'
import {
  buildKitOrderMessage,
  buildWhatsAppUrl,
  formatGarment,
  formatPrice,
  formatVariant,
} from '../core/formatters.js'

const props = defineProps({
  kit: {
    type: Object,
    required: true,
  },
  store: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['select'])

const imageFailed = ref(false)
const ShirtIcon = resolveIcon('Shirt')

const variantLabel = computed(() => formatVariant(props.kit?.variant))
const garmentLabel = computed(() => formatGarment(props.kit?.garment))
const showGarmentBadge = computed(
  () => Boolean(props.kit?.garment) && props.kit.garment !== 'CAMISETA',
)
const priceLabel = computed(() =>
  formatPrice(props.store?.basePrice, props.store?.currency),
)
const seasonBadgeClass = computed(() =>
  props.kit?.isRetro
    ? 'border-accent bg-accent text-accent-contrast'
    : 'border-subtle bg-glass text-main backdrop-blur-sm',
)

const detailLabel = computed(() =>
  [
    'Ver detalles de',
    props.kit?.team,
    props.kit?.season,
    variantLabel.value,
  ]
    .filter(Boolean)
    .join(' '),
)

const orderMessage = computed(() =>
  buildKitOrderMessage(props.kit, props.store),
)
const whatsappUrl = computed(() =>
  buildWhatsAppUrl(props.store?.whatsappNumber, orderMessage.value),
)

function handleCardClick(event) {
  const target = event.target
  if (typeof target?.closest === 'function' && target.closest('a, button')) {
    return
  }

  emit('select', props.kit)
}
</script>

<template>
  <article
    class="flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-subtle bg-surface transition-colors hover:border-accent/50"
    @click="handleCardClick"
  >
    <div class="kit-stage relative aspect-[4/5] overflow-hidden">
      <img
        v-if="kit.imageUrl && !imageFailed"
        :src="kit.imageUrl"
        :alt="`${kit.team}, ${kit.season}, ${variantLabel}, ${garmentLabel}`"
        loading="lazy"
        decoding="async"
        class="size-full object-contain p-3"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="absolute inset-0 grid place-items-center text-subtle"
        aria-hidden="true"
      >
        <component :is="ShirtIcon" :size="40" :stroke-width="1.5" />
      </div>

      <div
        class="absolute inset-x-0 top-0 flex items-start justify-between gap-1.5 p-2 sm:p-2.5"
      >
        <span
          class="rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold leading-4"
          :class="seasonBadgeClass"
        >
          {{ kit.season }}
        </span>
        <span
          v-if="showGarmentBadge"
          class="rounded-full border border-subtle bg-glass px-2 py-0.5 text-[0.65rem] font-medium leading-4 text-main backdrop-blur-sm"
        >
          {{ garmentLabel }}
        </span>
      </div>

      <button
        type="button"
        class="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        :aria-label="detailLabel"
        aria-haspopup="dialog"
        @click="emit('select', kit)"
      ></button>
    </div>

    <div
      class="flex flex-1 flex-col border-t border-dashed border-subtle px-2.5 pb-2.5 pt-2 sm:px-3.5 sm:pb-3.5 sm:pt-3"
    >
      <h3
        class="line-clamp-2 font-display text-[0.95rem] font-semibold leading-tight text-main sm:text-lg"
      >
        {{ kit.team }}
      </h3>
      <p class="mt-0.5 truncate text-[0.7rem] text-muted sm:text-xs">
        {{ variantLabel }}
      </p>

      <div class="mt-auto flex items-end justify-between gap-1.5 pt-2.5">
        <p
          v-if="priceLabel"
          class="font-display text-[1rem] font-semibold tabular-nums text-main sm:text-lg"
        >
          {{ priceLabel }}
        </p>

        <a
          v-if="whatsappUrl"
          :href="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`Pedir ${kit.team} ${kit.season} por WhatsApp`"
          class="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-accent-dark px-2.5 text-xs font-semibold text-surface transition-colors hover:bg-accent hover:text-accent-contrast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <component
            :is="resolveIcon('MessageCircle')"
            :size="13"
            aria-hidden="true"
          />
          Pedir
        </a>
      </div>
    </div>
  </article>
</template>

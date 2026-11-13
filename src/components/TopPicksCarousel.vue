<script setup>
import { ref } from 'vue'

import { resolveIcon } from '../config/icons.registry.js'
import {
  buildKitOrderMessage,
  buildWhatsAppUrl,
  formatVariant,
} from '../core/formatters.js'

const props = defineProps({
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

const stripRef = ref(null)
const WhatsAppIcon = resolveIcon('MessageCircle')
const ChevronLeftIcon = resolveIcon('ChevronLeft')
const ChevronRightIcon = resolveIcon('ChevronRight')

const SCROLL_STEP = 320

function scrollCarousel(direction) {
  stripRef.value?.scrollBy({
    left: direction * SCROLL_STEP,
    behavior: 'smooth',
  })
}

function orderUrl(kit) {
  return buildWhatsAppUrl(
    props.store?.whatsappNumber,
    buildKitOrderMessage(kit, props.store),
  )
}
</script>

<template>
  <section
    v-if="kits.length"
    aria-labelledby="top-picks-title"
    class="space-y-3.5"
  >
    <div class="flex items-end justify-between gap-4">
      <div>
        <h2
          id="top-picks-title"
          class="font-display text-2xl font-semibold tracking-tight text-main sm:text-3xl"
        >
          Destacados
        </h2>
        <p class="mt-1 text-sm text-muted">Las camisetas que más nos piden.</p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <p class="hidden text-xs text-muted sm:block">Desliza para explorar</p>
        <button
          type="button"
          class="inline-flex size-8 items-center justify-center rounded-full border border-subtle bg-surface text-main shadow-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-9"
          aria-label="Ver destacados anteriores"
          @click="scrollCarousel(-1)"
        >
          <component :is="ChevronLeftIcon" :size="17" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex size-8 items-center justify-center rounded-full border border-subtle bg-surface text-main shadow-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-9"
          aria-label="Ver más destacados"
          @click="scrollCarousel(1)"
        >
          <component :is="ChevronRightIcon" :size="17" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      ref="stripRef"
      class="strip -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0"
    >
      <article
        v-for="kit in kits"
        :key="kit.id"
        class="relative w-[210px] min-w-[210px] shrink-0 snap-start overflow-hidden rounded-xl border border-accent/40 bg-surface shadow-soft transition-colors hover:border-accent/70 sm:w-[245px] sm:min-w-[245px]"
      >
        <span
          class="absolute left-2 top-2 z-20 rounded-full bg-accent px-2 py-0.5 text-[0.6rem] font-bold tracking-[0.16em] text-accent-contrast"
        >
          TOP
        </span>

        <button
          type="button"
          class="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          :aria-label="`Ver detalles de ${kit.team} ${kit.season}`"
          aria-haspopup="dialog"
          @click="emit('select', kit)"
        ></button>

        <div class="kit-stage aspect-[4/5] overflow-hidden p-2">
          <img
            v-if="kit.imageUrl"
            :src="kit.imageUrl"
            :alt="`${kit.team}, ${kit.season}`"
            loading="lazy"
            decoding="async"
            class="size-full object-contain"
          />
        </div>

        <div class="border-t border-dashed border-subtle px-2.5 py-2">
          <p class="truncate font-display text-sm font-semibold text-main">
            {{ kit.team }}
          </p>
          <p class="mt-0.5 truncate text-[0.7rem] text-muted">
            {{ formatVariant(kit.variant) }}, {{ kit.season }}
          </p>

          <div v-if="orderUrl(kit)" class="mt-2 flex justify-end">
            <a
              :href="orderUrl(kit)"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`Pedir ${kit.team} ${kit.season} por WhatsApp`"
              class="relative z-20 inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-accent-dark px-2.5 text-xs font-semibold text-surface transition-colors hover:bg-accent hover:text-accent-contrast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <component :is="WhatsAppIcon" :size="13" aria-hidden="true" />
              Pedir
            </a>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.strip {
  scrollbar-width: thin;
  scrollbar-color: var(--accent-primary) transparent;
}

.strip::-webkit-scrollbar {
  height: 6px;
}

.strip::-webkit-scrollbar-track {
  background: transparent;
}

.strip::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background-color: color-mix(
    in srgb,
    var(--accent-primary) 55%,
    transparent
  );
}

.strip::-webkit-scrollbar-thumb:hover {
  background-color: var(--accent-primary);
}
</style>

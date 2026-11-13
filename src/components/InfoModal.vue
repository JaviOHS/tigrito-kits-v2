<script setup>
import { computed } from 'vue'

import { resolveIcon } from '../config/icons.registry.js'
import {
  buildWhatsAppUrl,
  formatGarment,
  formatPrice,
} from '../core/formatters.js'
import ModalShell from './ModalShell.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  store: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['close'])

const InfoIcon = resolveIcon('Info')
const MapPinIcon = resolveIcon('MapPin')
const WhatsAppIcon = resolveIcon('MessageCircle')

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined && item !== '')
      .map((item) => String(item))
  }

  if (typeof value === 'string' && value.trim()) return [value.trim()]

  return []
}

const storeData = computed(() => props.store ?? {})
const priceItems = computed(() => {
  const store = storeData.value
  const prices = store.prices

  if (prices && typeof prices === 'object' && !Array.isArray(prices)) {
    const entries = Object.entries(prices)
      .map(([garment, value]) => ({
        id: garment,
        label: formatGarment(garment),
        value: formatPrice(value, store.currency),
      }))
      .filter((item) => item.value)

    if (entries.length) return entries
  }

  const basePrice = formatPrice(
    store.basePrice ?? store.defaultPrice,
    store.currency,
  )

  return basePrice
    ? [{ id: 'base', label: 'Precio base', value: basePrice }]
    : []
})
const deliveryCity = computed(() => storeData.value.deliveryCity ?? '')
const whatsappUrl = computed(() =>
  buildWhatsAppUrl(
    storeData.value.whatsappNumber,
    storeData.value.whatsappGreeting,
  ),
)

const sections = computed(() => {
  const store = storeData.value
  const result = []

  const paymentMethods = normalizeList(store.paymentMethods)
  if (paymentMethods.length) {
    result.push({
      id: 'payments',
      icon: 'Wallet',
      title: 'Métodos de pago',
      items: paymentMethods,
    })
  }

  if (store.reservationPolicy) {
    result.push({
      id: 'reservations',
      icon: 'CalendarClock',
      title: 'Reservas',
      body: String(store.reservationPolicy),
    })
  }

  const deliveryPolicy =
    store.localDeliveryPolicy ||
    (deliveryCity.value
      ? `Entrega local en ${deliveryCity.value}.`
      : '')

  if (deliveryPolicy) {
    result.push({
      id: 'delivery',
      icon: 'Truck',
      title: 'Entrega local',
      body: String(deliveryPolicy),
    })
  }

  // Older store configs may only provide free-form info sections.
  if (!result.length && Array.isArray(store.infoSections)) {
    for (const [index, section] of store.infoSections.entries()) {
      if (!section || (!section.title && !section.body)) continue

      result.push({
        id: section.id ?? `info-${index}`,
        icon: 'Info',
        title: section.title || 'Información',
        body: section.body ? String(section.body) : '',
      })
    }
  }

  return result
})

const showSummary = computed(
  () => Boolean(priceItems.value.length || deliveryCity.value),
)
const showEmptyState = computed(
  () => !showSummary.value && !sections.value.length && !whatsappUrl.value,
)
</script>

<template>
  <ModalShell
    :open="open"
    title="Información de compra"
    subtitle="Pagos, reservas y entrega local."
    size="lg"
    @close="emit('close')"
  >
    <div class="space-y-4 p-4 sm:p-6">
      <div
        v-if="showSummary"
        class="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-subtle bg-base px-4 py-3.5 sm:px-5"
      >
        <div v-if="priceItems.length">
          <p
            class="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted"
          >
            Precios
          </p>
          <ul class="mt-1 space-y-0.5">
            <li
              v-for="item in priceItems"
              :key="item.id"
              class="flex items-baseline gap-2"
            >
              <span class="text-xs text-muted">{{ item.label }}</span>
              <span
                class="font-display text-lg font-semibold tabular-nums text-main"
              >
                {{ item.value }}
              </span>
            </li>
          </ul>
        </div>

        <p
          v-if="deliveryCity"
          class="flex items-center gap-1.5 text-sm font-medium text-main"
        >
          <component
            :is="MapPinIcon"
            :size="15"
            class="shrink-0 text-accent"
            aria-hidden="true"
          />
          Entrega local en {{ deliveryCity }}
        </p>
      </div>

      <ul v-if="sections.length" class="space-y-3">
        <li
          v-for="(section, sectionIndex) in sections"
          :key="`${section.id}-${sectionIndex}`"
          class="rounded-2xl border border-subtle bg-base p-4 sm:p-5"
        >
          <div class="flex items-start gap-3">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent"
              aria-hidden="true"
            >
              <component
                :is="resolveIcon(section.icon)"
                :size="17"
                :stroke-width="1.8"
              />
            </span>

            <div class="min-w-0">
              <h3 class="font-display text-lg font-semibold text-main">
                {{ section.title }}
              </h3>

              <ul v-if="section.items?.length" class="mt-2 space-y-1.5">
                <li
                  v-for="(item, itemIndex) in section.items"
                  :key="`${section.id}-item-${itemIndex}`"
                  class="flex gap-2 text-sm leading-6 text-muted"
                >
                  <span
                    class="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  <span>{{ item }}</span>
                </li>
              </ul>

              <p
                v-if="section.body"
                class="mt-1.5 text-sm leading-6 text-muted"
              >
                {{ section.body }}
              </p>
            </div>
          </div>
        </li>
      </ul>

      <div v-else-if="showEmptyState" class="py-8 text-center">
        <component
          :is="InfoIcon"
          :size="30"
          :stroke-width="1.5"
          class="mx-auto text-muted"
          aria-hidden="true"
        />
        <p class="mt-3 font-display text-xl font-semibold text-main">
          Información no disponible
        </p>
      </div>

      <a
        v-if="whatsappUrl"
        :href="whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast shadow-soft transition-colors hover:bg-accent-dark hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <component :is="WhatsAppIcon" :size="17" aria-hidden="true" />
        Escribir por WhatsApp
      </a>
    </div>
  </ModalShell>
</template>

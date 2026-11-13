<script setup>
import { computed } from 'vue'

import { resolveIcon } from '../config/icons.registry.js'
import { formatNotificationDate } from '../core/formatters.js'
import ModalShell from './ModalShell.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  notifications: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close'])

const EmptyIcon = resolveIcon('Bell')

const items = computed(() =>
  props.notifications
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      ...item,
      dateLabel: formatNotificationDate(item.date),
    }))
    .sort((a, b) =>
      String(b.date ?? '').localeCompare(String(a.date ?? '')),
    ),
)
</script>

<template>
  <ModalShell
    :open="open"
    title="Novedades"
    subtitle="Anuncios y novedades del taller."
    size="md"
    @close="emit('close')"
  >
    <div class="p-4 sm:p-6">
      <ul v-if="items.length" class="space-y-3">
        <li
          v-for="(item, index) in items"
          :key="item.id ?? `notification-${index}`"
          class="rounded-2xl border bg-base p-4"
          :class="item.active ? 'border-accent/40' : 'border-subtle'"
        >
          <div class="flex items-start gap-3">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-full border"
              :class="
                item.active
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'border-subtle bg-surface text-muted'
              "
              aria-hidden="true"
            >
              <component
                :is="resolveIcon(item.icon)"
                :size="17"
                :stroke-width="1.8"
              />
            </span>

            <div class="min-w-0 flex-1">
              <div
                class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
              >
                <h3 class="font-display text-lg font-semibold text-main">
                  {{ item.title }}
                </h3>
                <time
                  v-if="item.dateLabel"
                  :datetime="item.date"
                  class="shrink-0 text-xs text-muted"
                >
                  {{ item.dateLabel }}
                </time>
              </div>
              <p class="mt-1 text-sm leading-6 text-muted">
                {{ item.message }}
              </p>
            </div>
          </div>
        </li>
      </ul>

      <div v-else class="py-10 text-center">
        <component
          :is="EmptyIcon"
          :size="32"
          :stroke-width="1.5"
          class="mx-auto text-muted"
          aria-hidden="true"
        />
        <p class="mt-3 font-display text-xl font-semibold text-main">
          No hay novedades por ahora
        </p>
        <p class="mt-1 text-sm text-muted">
          Vuelve pronto para conocer los nuevos ingresos.
        </p>
      </div>
    </div>
  </ModalShell>
</template>

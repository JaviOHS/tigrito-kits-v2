<script setup>
import { resolveIcon } from '../config/icons.registry.js'

const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
  categoryOptions: {
    type: Array,
    default: () => [],
  },
  teamOptions: {
    type: Array,
    default: () => [],
  },
  visibleCount: {
    type: Number,
    default: 0,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  searchPlaceholder: {
    type: String,
    default: 'Busca por equipo o temporada',
  },
  retroLabel: {
    type: String,
    default: 'Solo Retro',
  },
  hasActiveFilters: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['filter-change', 'reset'])

const activePillClass =
  'border-accent bg-accent text-accent-contrast shadow-soft'
const idlePillClass =
  'border-subtle bg-base text-muted hover:border-accent hover:text-main'

function changeFilter(key, value) {
  emit('filter-change', key, value)
}
</script>

<template>
  <div class="rounded-2xl border border-subtle bg-surface p-3.5 shadow-soft sm:p-4">
    <div class="flex flex-wrap items-center gap-2">
      <div
        class="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filtrar por categoría"
      >
        <button
          v-for="option in categoryOptions"
          :key="option.value"
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-3.5 sm:text-sm"
          :class="
            filters.category === option.value
              ? activePillClass
              : idlePillClass
          "
          :aria-pressed="filters.category === option.value"
          @click="changeFilter('category', option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <span
        class="hidden h-5 w-px bg-subtle sm:block"
        aria-hidden="true"
      />

      <button
        type="button"
        role="switch"
        :aria-checked="filters.retroOnly"
        class="inline-flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 text-xs font-semibold text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-sm"
        @click="changeFilter('retroOnly', !filters.retroOnly)"
      >
        <span
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors"
          :class="
            filters.retroOnly
              ? 'border-accent bg-accent'
              : 'border-subtle bg-base'
          "
          aria-hidden="true"
        >
          <span
            class="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow-soft transition-transform motion-reduce:transition-none"
            :class="filters.retroOnly ? 'translate-x-5' : 'translate-x-0'"
          />
        </span>
        <span>{{ retroLabel }}</span>
      </button>
    </div>

    <div
      class="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[15rem_minmax(0,1fr)_auto] lg:items-center"
    >
      <div class="relative">
        <label for="team-filter" class="sr-only">Filtrar por equipo</label>
        <select
          id="team-filter"
          :value="filters.team"
          class="w-full appearance-none rounded-xl border border-subtle bg-base py-2.5 pl-3 pr-9 text-sm text-main transition-colors hover:border-accent focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          @change="changeFilter('team', $event.target.value)"
        >
          <option
            v-for="option in teamOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <component
          :is="resolveIcon('ChevronDown')"
          :size="16"
          aria-hidden="true"
          class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>

      <div class="relative">
        <label for="catalog-search" class="sr-only">
          Buscar camisetas
        </label>
        <component
          :is="resolveIcon('Search')"
          :size="16"
          aria-hidden="true"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          id="catalog-search"
          :value="filters.search"
          type="search"
          :placeholder="searchPlaceholder"
          autocomplete="off"
          class="w-full rounded-xl border border-subtle bg-base py-2.5 pl-9 pr-9 text-sm text-main transition-colors placeholder:text-muted hover:border-accent focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          @input="changeFilter('search', $event.target.value)"
        />
        <button
          v-if="filters.search"
          type="button"
          class="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label="Limpiar búsqueda"
          @click="changeFilter('search', '')"
        >
          <component
            :is="resolveIcon('X')"
            :size="14"
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        class="flex items-center justify-between gap-3 pb-0.5 lg:justify-end lg:pb-0"
      >
        <p
          class="text-xs text-muted sm:text-sm"
          aria-live="polite"
          role="status"
        >
          Mostrando
          <span class="font-semibold tabular-nums text-main">
            {{ visibleCount }}
          </span>
          de
          <span class="font-semibold tabular-nums text-main">
            {{ totalCount }}
          </span>
          kits
        </p>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="shrink-0 text-xs font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          @click="emit('reset')"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type='search']::-webkit-search-cancel-button {
  -webkit-appearance: none;
}
</style>

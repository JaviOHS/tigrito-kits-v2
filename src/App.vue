<script setup>
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import AppHeader from './components/AppHeader.vue'
import FilterBar from './components/FilterBar.vue'
import InfoModal from './components/InfoModal.vue'
import KitBoxCard from './components/KitBoxCard.vue'
import KitDetailModal from './components/KitDetailModal.vue'
import NotificationsModal from './components/NotificationsModal.vue'
import ScrollTopButton from './components/ScrollTopButton.vue'
import TopPicksCarousel from './components/TopPicksCarousel.vue'
import {
  CATEGORY_FILTER,
  DEFAULT_FILTER_STATE,
  RETRO_FILTER,
} from './config/filters.config.js'
import { resolveIcon } from './config/icons.registry.js'
import { useCatalog } from './composables/useCatalog.js'

// The admin panel and the Supabase SDK stay in a separate chunk until opened.
const AdminPanel = defineAsyncComponent(() =>
  import('./components/admin/AdminPanel.vue'),
)

const {
  allKits,
  error,
  filteredKits,
  filters,
  hasLoaded,
  hasMore,
  isLoading,
  loadCatalog,
  loadMore,
  notifications,
  resetFilters,
  setFilter,
  storeConfig,
  teamOptions,
  topPickKits,
  visibleKits,
} = useCatalog()

const categoryOptions = CATEGORY_FILTER?.options ?? []
const retroLabel = RETRO_FILTER?.label ?? 'Solo Retro'
const storeData = computed(() => storeConfig.value ?? {})

const activeModal = ref(null)
const selectedKit = ref(null)
const isAdminOpen = ref(
  typeof window !== 'undefined' && window.location.hash === '#admin',
)

function openModal(name) {
  if (name !== 'notifications' && name !== 'info') return
  selectedKit.value = null
  activeModal.value = name
}

function openKitDetail(kit) {
  if (!kit) return
  selectedKit.value = kit
  activeModal.value = 'kit'
}

function closeModal() {
  activeModal.value = null
}

function openAdmin() {
  activeModal.value = null
  selectedKit.value = null
  isAdminOpen.value = true

  if (
    typeof window !== 'undefined' &&
    window.location.hash !== '#admin'
  ) {
    window.location.hash = 'admin'
  }
}

function closeAdmin() {
  isAdminOpen.value = false

  if (typeof window !== 'undefined' && window.location.hash === '#admin') {
    const { pathname, search } = window.location
    window.history.replaceState(null, '', `${pathname}${search}`)
  }
}

function syncAdminFromHash() {
  if (typeof window === 'undefined') return

  if (window.location.hash === '#admin') {
    if (!isAdminOpen.value) {
      activeModal.value = null
      selectedKit.value = null
      isAdminOpen.value = true
    }
    return
  }

  if (isAdminOpen.value) isAdminOpen.value = false
}

async function handleAdminRefresh() {
  selectedKit.value = null
  activeModal.value = null
  await loadCatalog()
}

onMounted(() => {
  syncAdminFromHash()
  window.addEventListener('hashchange', syncAdminFromHash)
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncAdminFromHash)
})

function navigateKit(direction) {
  const kits = visibleKits.value
  if (!kits.length) return

  const currentIndex = kits.findIndex(
    (kit) => kit.id === selectedKit.value?.id,
  )
  const startIndex = currentIndex >= 0 ? currentIndex : 0
  const nextIndex = (startIndex + direction + kits.length) % kits.length

  selectedKit.value = kits[nextIndex]
}

const searchPlaceholder = computed(
  () =>
    storeData.value.ui?.searchPlaceholder ||
    'Busca por equipo o temporada',
)

const emptyStateMessage = computed(
  () =>
    storeData.value.ui?.emptyState ||
    'No encontramos camisetas con esos filtros.',
)

const hasActiveFilters = computed(() =>
  Object.entries(DEFAULT_FILTER_STATE).some(
    ([key, value]) => filters[key] !== value,
  ),
)

const ErrorIcon = resolveIcon('CircleAlert')
const EmptyIcon = resolveIcon('PackageOpen')
const RetryIcon = resolveIcon('RefreshCw')
const LoadMoreIcon = resolveIcon('ChevronDown')
const AdminIcon = resolveIcon('Lock')
</script>

<template>
  <div class="min-h-dvh bg-base text-main">
    <a
      href="#catalogo"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-contrast focus:outline-2 focus:outline-offset-2 focus:outline-accent"
    >
      Saltar al catálogo
    </a>

    <AppHeader
      :store="storeData"
      :notifications="notifications"
      @open-notifications="openModal('notifications')"
      @open-info="openModal('info')"
    />

    <main
      class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-8 sm:py-10 lg:py-12"
    >
      <section
        v-if="isLoading && !hasLoaded"
        aria-label="Cargando catálogo"
        class="space-y-6"
      >
        <div class="space-y-3">
          <div
            class="h-10 w-4/5 max-w-xl animate-pulse rounded-2xl bg-surface motion-reduce:animate-none sm:h-14"
          />
          <div
            class="h-4 w-2/3 max-w-md animate-pulse rounded-full bg-surface motion-reduce:animate-none"
          />
        </div>

        <div
          class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
        >
          <div
            v-for="index in 8"
            :key="index"
            class="overflow-hidden rounded-xl border border-subtle bg-surface"
          >
            <div
              class="kit-stage aspect-[4/5] animate-pulse motion-reduce:animate-none"
            />
            <div class="space-y-2 border-t border-dashed border-subtle p-3">
              <div
                class="h-4 w-3/4 animate-pulse rounded-full bg-base motion-reduce:animate-none"
              />
              <div
                class="h-3 w-1/2 animate-pulse rounded-full bg-base motion-reduce:animate-none"
              />
              <div
                class="h-8 w-full animate-pulse rounded-full bg-base motion-reduce:animate-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        v-else-if="error"
        class="rounded-2xl border border-subtle bg-surface px-6 py-10 text-center shadow-soft sm:px-10"
      >
        <component
          :is="ErrorIcon"
          :size="32"
          :stroke-width="1.5"
          class="mx-auto text-accent"
          aria-hidden="true"
        />
        <h1 class="mt-4 font-display text-2xl font-semibold sm:text-3xl">
          No pudimos cargar el catálogo
        </h1>
        <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          {{ error.message }}
        </p>
        <button
          type="button"
          class="mt-5 inline-flex items-center gap-2 rounded-full border border-subtle bg-base px-5 py-2.5 text-sm font-semibold text-main transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          @click="loadCatalog()"
        >
          <component :is="RetryIcon" :size="16" aria-hidden="true" />
          Reintentar
        </button>
      </section>

      <template v-else>
        <section
          class="grid gap-5 border-b border-subtle pb-7 sm:pb-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12"
        >
          <h1
            class="max-w-2xl text-balance font-display text-[2.15rem] font-semibold leading-[1.04] tracking-[-0.015em] text-main sm:text-5xl lg:text-[3.4rem]"
          >
            {{ storeData.tagline }}
          </h1>
          <div class="max-w-md lg:justify-self-end">
            <p
              class="text-sm leading-6 text-muted sm:text-[1rem] sm:leading-7"
            >
              Clubes, selecciones y camisetas retro. Elige tu kit y coordinamos
              el pedido por WhatsApp.
            </p>
            <p
              v-if="storeData.deliveryCity"
              class="mt-2 text-sm font-medium text-main"
            >
              Entrega local en {{ storeData.deliveryCity }}.
            </p>
          </div>
        </section>

        <TopPicksCarousel
          :kits="topPickKits"
          :store="storeData"
          @select="openKitDetail"
        />

        <section
          id="catalogo"
          aria-labelledby="catalog-title"
          class="scroll-mt-24 space-y-4"
        >
          <div class="flex items-end justify-between gap-4">
            <h2
              id="catalog-title"
              class="font-display text-2xl font-semibold tracking-tight text-main sm:text-3xl"
            >
              Catálogo
            </h2>
            <p class="text-xs text-muted sm:text-sm">
              {{ allKits.length }} kits en el archivo
            </p>
          </div>

          <FilterBar
            :filters="filters"
            :category-options="categoryOptions"
            :team-options="teamOptions"
            :visible-count="visibleKits.length"
            :total-count="filteredKits.length"
            :search-placeholder="searchPlaceholder"
            :retro-label="retroLabel"
            :has-active-filters="hasActiveFilters"
            @filter-change="setFilter"
            @reset="resetFilters"
          />

          <div
            v-if="filteredKits.length"
            class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
          >
            <KitBoxCard
              v-for="kit in visibleKits"
              :key="kit.id"
              :kit="kit"
              :store="storeData"
              @select="openKitDetail"
            />
          </div>

          <div
            v-else
            class="rounded-2xl border border-dashed border-subtle bg-surface px-6 py-10 text-center"
          >
            <component
              :is="EmptyIcon"
              :size="30"
              :stroke-width="1.5"
              class="mx-auto text-muted"
              aria-hidden="true"
            />
            <h3 class="mt-3 font-display text-xl font-semibold">
              Sin resultados
            </h3>
            <p class="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">
              {{ emptyStateMessage }}
            </p>
            <button
              type="button"
              class="mt-4 text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              @click="resetFilters"
            >
              Limpiar filtros
            </button>
          </div>

          <div v-if="hasMore" class="flex justify-center pt-1 sm:pt-2">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-subtle bg-surface px-5 py-2.5 text-sm font-semibold text-main shadow-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              @click="loadMore"
            >
              Cargar más kits
              <component :is="LoadMoreIcon" :size="16" aria-hidden="true" />
            </button>
          </div>
        </section>
      </template>
    </main>

    <footer v-if="storeData.brandName" class="border-t border-subtle">
      <div
        class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8"
      >
        <div>
          <p class="font-display text-lg font-semibold text-main">
            {{ storeData.brandName }}
          </p>
          <p
            v-if="storeData.deliveryCity"
            class="mt-0.5 text-xs text-muted"
          >
            Entrega local en {{ storeData.deliveryCity }}.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:self-auto"
          @click="openAdmin()"
        >
          <component :is="AdminIcon" :size="13" aria-hidden="true" />
          Acceso al taller
        </button>

        <!-- <p v-if="storeData.currency" class="text-xs text-muted">
          Precios en {{ storeData.currency }}.
        </p> -->
      </div>
    </footer>

    <ScrollTopButton />

    <KitDetailModal
      :open="activeModal === 'kit'"
      :kit="selectedKit"
      :kits="visibleKits"
      :store="storeData"
      @close="closeModal"
      @navigate="navigateKit"
    />

    <NotificationsModal
      :open="activeModal === 'notifications'"
      :notifications="notifications"
      @close="closeModal"
    />

    <InfoModal
      :open="activeModal === 'info'"
      :store="storeData"
      @close="closeModal"
    />

    <Suspense>
      <AdminPanel
        v-if="isAdminOpen"
        :open="isAdminOpen"
        :kits="allKits"
        @close="closeAdmin"
        @refresh="handleAdminRefresh"
      />

      <template #fallback>
        <div
          class="fixed inset-0 z-50 grid place-items-center bg-scrim p-6"
          role="status"
          aria-live="polite"
        >
          <div
            class="flex items-center gap-3 rounded-2xl border border-subtle bg-surface px-5 py-4 text-sm font-medium text-main shadow-lifted"
          >
            <span
              class="size-4 animate-spin rounded-full border-2 border-subtle border-t-accent motion-reduce:animate-none"
              aria-hidden="true"
            />
            Abriendo el taller…
          </div>
        </div>
      </template>
    </Suspense>
  </div>
</template>

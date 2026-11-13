<script setup>
import { computed, ref } from 'vue'

import { resolveIcon } from '../config/icons.registry.js'
import { buildWhatsAppUrl } from '../core/formatters.js'
import { useTheme } from '../composables/useTheme.js'

const props = defineProps({
  store: {
    type: Object,
    default: () => ({}),
  },
  notifications: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['open-notifications', 'open-info'])

const { isDark, toggleTheme } = useTheme()

const ThemeIcon = computed(() => resolveIcon(isDark.value ? 'Sun' : 'Moon'))
const activeNotificationCount = computed(
  () => props.notifications.filter((item) => item?.active).length,
)
const hasActiveNotifications = computed(
  () => activeNotificationCount.value > 0,
)

const brandName = computed(() => props.store?.brandName ?? '')
const brandMeta = computed(() =>
  props.store?.deliveryCity
    ? `Entrega local en ${props.store.deliveryCity}`
    : '',
)
const initials = computed(() => {
  const words = brandName.value.trim().split(/\s+/).filter(Boolean)
  const fallback = words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()

  return fallback || 'TK'
})

const avatarFailed = ref(false)

const whatsappUrl = computed(() =>
  buildWhatsAppUrl(
    props.store?.whatsappNumber,
    props.store?.whatsappGreeting,
  ),
)

const themeLabel = computed(() =>
  isDark.value ? 'Cambiar al tema claro' : 'Cambiar al tema oscuro',
)
const notificationsLabel = computed(() =>
  hasActiveNotifications.value
    ? `Notificaciones, ${activeNotificationCount.value} activas`
    : 'Notificaciones',
)

const iconButtonClass =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted transition-colors hover:border-subtle hover:bg-surface hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-10'
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-subtle bg-glass backdrop-blur-xl"
  >
    <div
      class="mx-auto flex h-16 max-w-6xl items-center gap-1.5 px-3 sm:h-20 sm:gap-3 sm:px-8"
    >
      <div class="flex min-w-0 items-center gap-2 sm:gap-3">
        <span
          class="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-subtle bg-surface shadow-soft ring-2 ring-accent/50 sm:size-11"
        >
          <img
            v-if="!avatarFailed"
            src="/brand/tigrito-avatar.webp"
            alt=""
            width="44"
            height="44"
            decoding="async"
            class="size-full object-cover"
            @error="avatarFailed = true"
          />
          <span
            v-else
            class="font-display text-sm font-semibold text-main"
          >
            {{ initials }}
          </span>
        </span>

        <div class="min-w-0">
          <div v-if="brandName" class="flex min-w-0 items-center gap-2">
            <p
              class="min-w-0 truncate font-display text-[1rem] font-semibold leading-tight tracking-tight text-main sm:text-xl"
            >
              {{ brandName }}
            </p>
            <span
              class="hidden shrink-0 items-center gap-1 rounded-full border border-subtle bg-surface px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted sm:inline-flex"
            >
              <span>KITLAB</span>
              <span class="text-accent">1.1</span>
            </span>
          </div>
          <span
            v-else
            class="block h-5 w-28 animate-pulse rounded-full bg-base motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p
            v-if="brandMeta"
            class="hidden truncate text-xs leading-5 text-muted sm:block"
          >
            {{ brandMeta }}
          </p>
        </div>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        <button
          type="button"
          :class="iconButtonClass"
          :aria-label="themeLabel"
          :title="themeLabel"
          :aria-pressed="isDark"
          @click="toggleTheme"
        >
          <component :is="ThemeIcon" :size="18" aria-hidden="true" />
        </button>

        <button
          type="button"
          :class="[iconButtonClass, 'relative']"
          :aria-label="notificationsLabel"
          aria-haspopup="dialog"
          title="Notificaciones"
          @click="emit('open-notifications')"
        >
          <component
            :is="resolveIcon('Bell')"
            :size="18"
            aria-hidden="true"
          />
          <span
            v-if="hasActiveNotifications"
            class="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent ring-2 ring-glass"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          :class="iconButtonClass"
          aria-label="Información de compra"
          aria-haspopup="dialog"
          title="Información de compra"
          @click="emit('open-info')"
        >
          <component
            :is="resolveIcon('Info')"
            :size="18"
            aria-hidden="true"
          />
        </button>

        <a
          v-if="whatsappUrl"
          :href="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Pedir por WhatsApp"
          class="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-accent px-2 text-xs font-semibold text-accent-contrast shadow-soft transition-colors hover:bg-accent-dark hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
        >
          <component
            :is="resolveIcon('MessageCircle')"
            :size="16"
            aria-hidden="true"
          />
          <span class="sm:hidden">Pedir</span>
          <span class="hidden sm:inline">Pedir por WhatsApp</span>
        </a>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

import { resolveIcon } from '../../config/icons.registry.js'
import { useAdminAuth } from '../../composables/useAdminAuth.js'
import ModalShell from '../ModalShell.vue'
import AdminLoginForm from './AdminLoginForm.vue'
import CatalogUploader from './CatalogUploader.vue'
import JsonConfigEditor from './JsonConfigEditor.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  kits: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'refresh'])

const {
  authError,
  authLoading,
  isAuthenticated,
  login,
  logout,
  user,
} = useAdminAuth()

const FileJsonIcon = resolveIcon('FileJson')
const ImagePlusIcon = resolveIcon('ImagePlus')
const LockIcon = resolveIcon('Lock')
const LogOutIcon = resolveIcon('LogOut')

const TOOLS = Object.freeze([
  {
    id: 'config',
    label: 'Configuración',
    description: 'Archivos JSON',
    icon: FileJsonIcon,
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    description: 'Fotos y archivos',
    icon: ImagePlusIcon,
  },
])

const activeTool = ref('config')

const activeToolMeta = computed(
  () => TOOLS.find((tool) => tool.id === activeTool.value) ?? TOOLS[0],
)
const userEmail = computed(
  () => user.value?.email ?? 'Sesión de administración',
)
const catalogCount = computed(
  () => `${props.kits.length} ${props.kits.length === 1 ? 'kit' : 'kits'}`,
)

function toolButtonClass(toolId) {
  return toolId === activeTool.value
    ? 'border-accent/40 bg-surface text-main shadow-soft'
    : 'border-transparent text-muted hover:border-subtle hover:bg-surface/60'
}

function selectTool(toolId) {
  if (TOOLS.some((tool) => tool.id === toolId)) activeTool.value = toolId
}

async function handleLogin(credentials) {
  const nextUser = await login(credentials.email, credentials.password)
  if (nextUser) activeTool.value = 'config'
}

async function handleLogout() {
  await logout()
}

function handleSaved(payload) {
  emit('refresh', payload)
}

function handleChanged(payload) {
  emit('refresh', payload)
}

watch(isAuthenticated, (authenticated) => {
  if (!authenticated) activeTool.value = 'config'
})
</script>

<template>
  <ModalShell
    :open="open"
    title="Taller"
    subtitle="Configuración y catálogo"
    size="xl"
    @close="emit('close')"
  >
    <div
      v-if="authLoading && !isAuthenticated"
      class="grid min-h-[26rem] place-items-center px-6 py-12"
    >
      <div class="text-center">
        <span
          class="mx-auto grid size-12 place-items-center rounded-full border border-subtle bg-base text-accent"
        >
          <component
            :is="LockIcon"
            :size="22"
            aria-hidden="true"
          />
        </span>
        <p class="mt-4 font-display text-lg font-semibold text-main">
          Comprobando tu sesión
        </p>
        <p class="mt-1 text-sm text-muted">Un momento.</p>
        <span
          class="mx-auto mt-4 block size-5 animate-spin rounded-full border-2 border-subtle border-t-accent motion-reduce:animate-none"
          aria-hidden="true"
        />
      </div>
    </div>

    <AdminLoginForm
      v-else-if="!isAuthenticated"
      :loading="authLoading"
      :error="authError"
      @submit="handleLogin"
    />

    <div
      v-else
      class="grid min-h-[32rem] lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <aside
        class="admin-rail flex flex-col border-b border-subtle p-4 sm:p-5 lg:border-b-0 lg:border-r"
      >
        <div class="hidden lg:block">
          <p
            class="font-display text-lg font-semibold tracking-tight text-main"
          >
            Mesa de trabajo
          </p>
          <p class="mt-1 text-xs leading-5 text-muted">
            Publica cambios sin salir del catálogo.
          </p>
        </div>

        <nav
          class="grid grid-cols-2 gap-2 lg:mt-6 lg:grid-cols-1"
          aria-label="Herramientas del taller"
        >
          <button
            v-for="tool in TOOLS"
            :key="tool.id"
            type="button"
            class="flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            :class="toolButtonClass(tool.id)"
            :aria-pressed="activeTool === tool.id"
            @click="selectTool(tool.id)"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-lg border"
              :class="
                activeTool === tool.id
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'border-subtle bg-base text-muted'
              "
              aria-hidden="true"
            >
              <component :is="tool.icon" :size="17" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold">
                {{ tool.label }}
              </span>
              <span class="mt-0.5 hidden truncate text-[11px] lg:block">
                {{
                  tool.id === 'catalog' ? catalogCount : tool.description
                }}
              </span>
            </span>
          </button>
        </nav>

        <div
          class="mt-4 flex w-full items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4 md:mt-6 md:flex-col md:items-stretch md:gap-3 md:p-3.5 lg:sticky lg:bottom-0 lg:z-10 lg:mt-auto lg:bg-base"
        >
          <div class="flex min-w-0 items-center gap-2.5">
            <span
              class="grid size-8 shrink-0 place-items-center rounded-full border border-subtle bg-surface text-accent"
              aria-hidden="true"
            >
              <component :is="LockIcon" :size="15" />
            </span>
            <div class="min-w-0 flex-1">
              <p
                class="truncate text-xs font-semibold text-main"
                :title="userEmail"
              >
                {{ userEmail }}
              </p>
              <p class="truncate text-[11px] text-muted">Sesión activa</p>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-subtle bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:border-accent hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 md:w-full md:px-3 md:py-2 md:text-xs"
            :disabled="authLoading"
            @click="handleLogout"
          >
            <component :is="LogOutIcon" :size="13" aria-hidden="true" />
            Salir
          </button>
        </div>
      </aside>

      <section
        class="min-w-0 p-4 sm:p-6"
        :aria-label="activeToolMeta.label"
      >
        <JsonConfigEditor
          v-if="activeTool === 'config'"
          @saved="handleSaved"
        />
        <CatalogUploader
          v-else
          :kits="kits"
          @changed="handleChanged"
        />
      </section>
    </div>
  </ModalShell>
</template>

<style scoped>
.admin-rail {
  background-image: radial-gradient(
    color-mix(in srgb, var(--border-subtle) 65%, transparent) 0.75px,
    transparent 0.75px
  );
  background-size: 12px 12px;
}
</style>

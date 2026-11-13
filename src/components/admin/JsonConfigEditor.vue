<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { resolveIcon } from '../../config/icons.registry.js'
import { fetchConfig } from '../../core/adapters/catalogAdapter.js'
import { saveConfigJson } from '../../core/adapters/adminStorageAdapter.js'
import { formatJsonConfig, inspectJsonConfig } from '../../core/jsonConfig.js'
import AdminStatusBanner from './AdminStatusBanner.vue'

const emit = defineEmits(['saved'])

const CONFIG_FILES = Object.freeze([
  {
    id: 'store.json',
    label: 'Tienda',
    description: 'Precios, WhatsApp y textos',
  },
  {
    id: 'notifications.json',
    label: 'Novedades',
    description: 'Anuncios del catálogo',
  },
  {
    id: 'top-picks.json',
    label: 'Destacados',
    description: 'Portada y equipos',
  },
])

const FILE_IDS = CONFIG_FILES.map((file) => file.id)

const FileJsonIcon = resolveIcon('FileJson')
const SaveIcon = resolveIcon('Save')
const CheckIcon = resolveIcon('CheckCircle')
const AlertIcon = resolveIcon('AlertCircle')
const RefreshIcon = resolveIcon('RefreshCw')

const activeFile = ref('store.json')
const saving = ref(false)
const saveFeedback = ref(null)

const files = reactive(
  Object.fromEntries(
    FILE_IDS.map((id) => [
      id,
      {
        text: '',
        snapshot: '',
        loaded: false,
        loading: false,
        error: null,
      },
    ]),
  ),
)

const activeEntry = computed(() => files[activeFile.value])
const activeMeta = computed(
  () =>
    CONFIG_FILES.find((file) => file.id === activeFile.value) ??
    CONFIG_FILES[0],
)
const activeText = computed({
  get: () => activeEntry.value?.text ?? '',
  set: (value) => {
    if (activeEntry.value) activeEntry.value.text = value
  },
})
const validation = computed(() => inspectJsonConfig(activeText.value))
const isDirty = computed(
  () =>
    Boolean(activeEntry.value?.loaded) &&
    activeEntry.value.text !== activeEntry.value.snapshot,
)
const lineCount = computed(() =>
  activeText.value ? activeText.value.split('\n').length : 0,
)
const characterCount = computed(() => activeText.value.length)
const canFormat = computed(
  () =>
    Boolean(activeEntry.value?.loaded) &&
    validation.value.valid &&
    !saving.value,
)
const canSave = computed(
  () =>
    Boolean(activeEntry.value?.loaded) &&
    validation.value.valid &&
    !saving.value,
)

function isFileDirty(fileId) {
  const entry = files[fileId]
  return Boolean(entry?.loaded && entry.text !== entry.snapshot)
}

async function loadFile(fileId, { force = false } = {}) {
  const entry = files[fileId]
  if (!entry || entry.loading) return
  if (entry.loaded && !force) return

  entry.loading = true
  entry.error = null

  try {
    const data = await fetchConfig(fileId)
    const text = JSON.stringify(data, null, 2)
    entry.text = text
    entry.snapshot = text
    entry.loaded = true
  } catch (error) {
    entry.error = error instanceof Error ? error.message : String(error)
  } finally {
    entry.loading = false
  }
}

function selectFile(fileId) {
  if (!FILE_IDS.includes(fileId)) return

  activeFile.value = fileId
  saveFeedback.value = null

  if (!files[fileId].loaded) loadFile(fileId)
}

function retryActiveFile() {
  saveFeedback.value = null
  loadFile(activeFile.value, { force: true })
}

function clearFeedback() {
  if (saveFeedback.value) saveFeedback.value = null
}

function formatActiveFile() {
  if (!canFormat.value) return

  const result = formatJsonConfig(activeText.value)
  if (result.valid) {
    activeEntry.value.text = result.text
    saveFeedback.value = null
  }
}

async function saveActiveFile() {
  if (!canSave.value) return

  saving.value = true
  saveFeedback.value = null

  try {
    const result = inspectJsonConfig(activeText.value)

    if (!result.valid) {
      saveFeedback.value = { type: 'error', message: result.error }
      return
    }

    await saveConfigJson(activeFile.value, activeText.value)

    const formatted = JSON.stringify(result.data, null, 2)
    activeEntry.value.text = formatted
    activeEntry.value.snapshot = formatted
    saveFeedback.value = {
      type: 'success',
      message: `${activeFile.value} se guardó. La tienda ya usa esta configuración.`,
    }

    emit('saved', { file: activeFile.value, data: result.data })
  } catch (error) {
    saveFeedback.value = {
      type: 'error',
      message: `No se pudo guardar ${activeFile.value}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  } finally {
    saving.value = false
  }
}

function handleEditorKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    saveActiveFile()
  }
}

onMounted(() => {
  for (const fileId of FILE_IDS) loadFile(fileId)
})
</script>

<template>
  <div class="space-y-5">
    <header
      class="flex flex-wrap items-end justify-between gap-3 border-b border-subtle pb-4"
    >
      <div>
        <div class="flex items-center gap-2">
          <component
            :is="FileJsonIcon"
            :size="18"
            class="text-accent"
            aria-hidden="true"
          />
          <h3
            class="font-display text-2xl font-semibold tracking-tight text-main"
          >
            Configuración
          </h3>
        </div>
        <p class="mt-1 text-sm leading-6 text-muted">
          Edita los archivos que alimentan la tienda.
        </p>
      </div>
      <p class="font-mono text-[11px] text-muted">config/</p>
    </header>

    <div
      class="admin-tabs flex gap-1 overflow-x-auto border-b border-subtle"
      role="group"
      aria-label="Archivo de configuración"
    >
      <button
        v-for="file in CONFIG_FILES"
        :key="file.id"
        type="button"
        class="relative min-w-[8.5rem] shrink-0 border-b-2 px-3 pb-3 pt-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        :class="
          activeFile === file.id
            ? 'border-accent text-main'
            : 'border-transparent text-muted hover:text-main'
        "
        :aria-pressed="activeFile === file.id"
        @click="selectFile(file.id)"
      >
        <span class="flex items-center gap-2">
          <span class="text-sm font-semibold">{{ file.label }}</span>
          <span
            v-if="isFileDirty(file.id)"
            class="size-1.5 rounded-full bg-accent"
            aria-label="Cambios sin guardar"
          />
        </span>
        <span class="mt-0.5 block truncate font-mono text-[10px]">
          {{ file.id }}
        </span>
      </button>
    </div>

    <div
      v-if="activeEntry.loading && !activeEntry.loaded"
      class="space-y-3 rounded-xl border border-subtle bg-base p-4"
      aria-label="Cargando archivo"
    >
      <div
        class="h-3 w-1/3 animate-pulse rounded-full bg-surface motion-reduce:animate-none"
      />
      <div
        class="h-3 w-4/5 animate-pulse rounded-full bg-surface motion-reduce:animate-none"
      />
      <div
        class="h-3 w-2/3 animate-pulse rounded-full bg-surface motion-reduce:animate-none"
      />
      <div
        class="h-3 w-3/4 animate-pulse rounded-full bg-surface motion-reduce:animate-none"
      />
    </div>

    <div
      v-else-if="activeEntry.error && !activeEntry.loaded"
      class="rounded-xl border border-danger bg-danger-soft p-4 text-sm text-danger"
      role="alert"
    >
      <div class="flex min-w-0 items-start gap-2">
        <component
          :is="AlertIcon"
          :size="17"
          class="mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="break-words font-semibold">
            No pudimos cargar {{ activeFile }}.
          </p>
          <p class="mt-1 break-words break-all text-xs leading-5">
            {{ activeEntry.error }}
          </p>
        </div>
      </div>
      <button
        type="button"
        class="mt-3 inline-flex items-center gap-2 rounded-full border border-danger bg-surface px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        @click="retryActiveFile"
      >
        <component :is="RefreshIcon" :size="14" aria-hidden="true" />
        Reintentar
      </button>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span
            class="inline-flex items-center gap-1.5 font-semibold"
            :class="validation.valid ? 'text-success' : 'text-danger'"
          >
            <component
              :is="validation.valid ? CheckIcon : AlertIcon"
              :size="15"
              aria-hidden="true"
            />
            {{ validation.valid ? 'JSON válido' : 'JSON inválido' }}
          </span>
          <span class="h-3 w-px bg-subtle" aria-hidden="true" />
          <span class="text-muted">{{ lineCount }} líneas</span>
          <span class="h-3 w-px bg-subtle" aria-hidden="true" />
          <span
            class="inline-flex items-center gap-1.5"
            :class="isDirty ? 'font-semibold text-main' : 'text-muted'"
          >
            <span
              v-if="isDirty"
              class="size-1.5 rounded-full bg-accent"
              aria-hidden="true"
            />
            {{ isDirty ? 'Cambios sin guardar' : 'Sin cambios' }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-subtle bg-base px-3.5 py-2 text-xs font-semibold text-main transition-colors hover:border-accent hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canFormat"
            @click="formatActiveFile"
          >
            Formatear
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-contrast shadow-soft transition-colors hover:bg-accent-dark hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canSave"
            @click="saveActiveFile"
          >
            <span
              v-if="saving"
              class="size-3.5 animate-spin rounded-full border-2 border-accent-contrast/30 border-t-accent-contrast motion-reduce:animate-none"
              aria-hidden="true"
            />
            <component
              v-else
              :is="SaveIcon"
              :size="14"
              aria-hidden="true"
            />
            {{ saving ? 'Guardando…' : 'Guardar en la nube' }}
          </button>
        </div>
      </div>

      <div
        v-if="!validation.valid"
        class="rounded-xl border border-danger bg-danger-soft px-3.5 py-3 text-xs leading-5 text-danger"
        role="alert"
      >
        <div class="flex min-w-0 items-start gap-2.5">
          <component
            :is="AlertIcon"
            :size="16"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p class="min-w-0 flex-1 break-words break-all">
            {{ validation.error }}
          </p>
        </div>
      </div>

      <AdminStatusBanner
        v-if="saveFeedback"
        :type="saveFeedback.type"
        :message="saveFeedback.message"
        @dismiss="clearFeedback"
      />

      <div
        class="overflow-hidden rounded-xl border border-subtle bg-base shadow-soft transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-2 border-b border-subtle bg-surface px-3 py-2"
        >
          <span class="font-mono text-[11px] text-muted">
            config/{{ activeMeta.id }}
          </span>
          <span class="text-[11px] text-muted">
            {{ characterCount }} caracteres
          </span>
        </div>

        <textarea
          v-model="activeText"
          class="editor-input block min-h-[24rem] w-full resize-y bg-transparent p-4 font-mono text-[13px] leading-6 text-main outline-none placeholder:text-muted sm:min-h-[30rem]"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          wrap="off"
          :aria-label="`Contenido de ${activeMeta.id}`"
          @input="clearFeedback"
          @keydown="handleEditorKeydown"
        />
      </div>

      <p class="text-[11px] leading-5 text-muted">
        Se guarda en Supabase Storage, ruta
        <span class="break-all font-mono">config/{{ activeMeta.id }}</span>. Atajo:
        <span class="font-mono">Ctrl/⌘ + S</span>.
      </p>
    </template>
  </div>
</template>

<style scoped>
.admin-tabs {
  scrollbar-width: none;
}

.admin-tabs::-webkit-scrollbar {
  display: none;
}

.editor-input {
  scrollbar-width: thin;
  scrollbar-color: var(--border-subtle) transparent;
}

.editor-input::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.editor-input::-webkit-scrollbar-track {
  background: transparent;
}

.editor-input::-webkit-scrollbar-thumb {
  background-color: var(--border-subtle);
  border: 3px solid var(--bg-base);
  border-radius: 9999px;
}
</style>

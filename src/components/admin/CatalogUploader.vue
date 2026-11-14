<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { resolveIcon } from '../../config/icons.registry.js'
import {
  deleteCatalogImage,
  uploadCatalogImage,
} from '../../core/adapters/adminStorageAdapter.js'
import {
  GARMENT_OPTIONS as GARMENT_CODES,
  buildCatalogFilename,
} from '../../core/filenameBuilder.js'
import {
  formatFileSize,
  formatGarment,
  formatVariant,
} from '../../core/formatters.js'
import { optimizeImageToWebp } from '../../core/imageOptimizer.js'
import AdminStatusBanner from './AdminStatusBanner.vue'

const props = defineProps({
  kits: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['changed'])

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const CURRENT_YEAR = String(new Date().getFullYear())

const CATEGORY_OPTIONS = Object.freeze([
  { value: 'CLUB', label: 'Club' },
  { value: 'SEL', label: 'Selección' },
  { value: 'MARCA', label: 'Marca' },
])

const GARMENT_OPTIONS = Object.freeze(
  GARMENT_CODES.map((value) => ({ value, label: formatGarment(value) })),
)

const VARIANT_SUGGESTIONS = Object.freeze([
  'LOCAL',
  'VISITA',
  'TERCERA',
  'ED-LIMITADA',
  '100-ANOS-1',
])

const ImagePlusIcon = resolveIcon('ImagePlus')
const UploadIcon = resolveIcon('Upload')
const TrashIcon = resolveIcon('Trash2')
const AlertIcon = resolveIcon('AlertCircle')
const SearchIcon = resolveIcon('Search')
const ShirtIcon = resolveIcon('Shirt')
const ChevronDownIcon = resolveIcon('ChevronDown')

const fileInput = ref(null)
const form = reactive({
  category: 'CLUB',
  team: '',
  season: CURRENT_YEAR,
  variant: 'LOCAL',
  garment: 'CAMISETA',
})

const selectedFile = ref(null)
const optimized = ref(null)
const optimizing = ref(false)
const optimizeError = ref(null)
const uploadError = ref(null)
const uploadFeedback = ref(null)
const uploading = ref(false)
const lastUploadedFilename = ref('')

const isDragging = ref(false)
const dragDepth = ref(0)

const search = ref('')
const pendingDelete = ref(null)
const deleting = ref(null)
const deleteFeedback = ref(null)
const deletedFilenames = ref([])

let optimizeToken = 0

const fieldClass =
  'w-full rounded-xl border border-subtle bg-base px-3 py-2 text-sm text-main shadow-soft outline-none transition-colors placeholder:text-muted focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const teamOptions = computed(() => {
  const teams = new Set()

  for (const kit of props.kits ?? []) {
    if (kit?.team) teams.add(kit.team)
  }

  return [...teams].sort((a, b) => a.localeCompare(b, 'es'))
})

const previewFilename = computed(() => buildCatalogFilename(form))
const previewTeamSegment = computed(
  () => previewFilename.value.split('_')[1] ?? '',
)

const isBrandCategory = computed(() => form.category === 'MARCA')
const teamFieldLabel = computed(() =>
  isBrandCategory.value ? 'Marca' : 'Equipo',
)
const teamPlaceholder = computed(() =>
  isBrandCategory.value ? 'Nike' : 'Barcelona SC',
)

const filenameHint = computed(() => {
  if (previewFilename.value) return ''

  if (!String(form.team ?? '').trim()) {
    return isBrandCategory.value
      ? 'Escribe el nombre de la marca.'
      : 'Escribe el nombre del equipo.'
  }
  if (!String(form.variant ?? '').trim()) return 'Escribe la variante.'
  if (!String(form.season ?? '').trim()) return 'Escribe la temporada.'

  const season = String(form.season).trim().toUpperCase()
  if (season !== 'RETRO' && !/^\d{4}$/.test(season)) {
    return 'La temporada debe ser un año de 4 dígitos o RETRO.'
  }

  return 'Revisa los cinco segmentos: solo letras, números y guiones.'
})

const filenameExists = computed(
  () =>
    Boolean(previewFilename.value) &&
    (props.kits ?? []).some(
      (kit) => kit?.filename === previewFilename.value,
    ),
)

const showOverwriteWarning = computed(
  () =>
    filenameExists.value &&
    previewFilename.value !== lastUploadedFilename.value,
)

const canUpload = computed(
  () =>
    Boolean(optimized.value && previewFilename.value) &&
    !uploading.value &&
    !optimizing.value,
)

const savingsPercent = computed(() => {
  const result = optimized.value
  if (!result || !result.originalSize) return 0
  return Math.round((1 - result.optimizedSize / result.originalSize) * 100)
})

const savingsLabel = computed(() =>
  savingsPercent.value > 0 ? `${savingsPercent.value}% menos` : 'Sin ahorro',
)

const visibleKits = computed(() => {
  const query = search.value.trim().toLowerCase()
  const hidden = new Set(deletedFilenames.value)

  return (props.kits ?? []).filter((kit) => {
    if (!kit || hidden.has(kit.filename)) return false
    if (!query) return true

    return [kit.filename, kit.team, kit.season, kit.variant, kit.garment]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })
})

function isAcceptedImage(file) {
  if (!file) return false
  if (ACCEPTED_TYPES.has(file.type)) return true
  return /\.(jpe?g|png|webp)$/i.test(file.name ?? '')
}

function revokePreview() {
  const url = optimized.value?.previewUrl

  if (
    url &&
    typeof URL !== 'undefined' &&
    typeof URL.revokeObjectURL === 'function'
  ) {
    URL.revokeObjectURL(url)
  }
}

function clearOptimized() {
  revokePreview()
  optimized.value = null
}

function clearSelectedFile() {
  optimizeToken += 1
  selectedFile.value = null
  clearOptimized()
  optimizing.value = false
  optimizeError.value = null

  if (fileInput.value) fileInput.value.value = ''
}

function clearTransientFeedback() {
  optimizeError.value = null
  uploadError.value = null
  uploadFeedback.value = null
  deleteFeedback.value = null
}

async function selectFile(file) {
  clearTransientFeedback()

  if (!isAcceptedImage(file)) {
    clearSelectedFile()
    optimizeError.value = 'Usa una imagen JPG, PNG o WebP.'
    return
  }

  const token = ++optimizeToken
  clearOptimized()

  selectedFile.value = file
  optimizing.value = true

  try {
    const result = await optimizeImageToWebp(file)
    if (token !== optimizeToken) return

    const previewUrl =
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(result.blob)
        : ''

    optimized.value = { ...result, previewUrl }
  } catch (error) {
    if (token !== optimizeToken) return
    optimizeError.value =
      error instanceof Error ? error.message : String(error)
  } finally {
    if (token === optimizeToken) optimizing.value = false
  }
}

function handleFileInput(event) {
  const file = event.target.files?.[0]
  if (file) selectFile(file)
  event.target.value = ''
}

function handleDragEnter(event) {
  const types = event.dataTransfer?.types
  if (types && !Array.from(types).includes('Files')) return

  dragDepth.value += 1
  isDragging.value = true
}

function handleDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) isDragging.value = false
}

function handleDrop(event) {
  dragDepth.value = 0
  isDragging.value = false

  const file = event.dataTransfer?.files?.[0]
  if (file) selectFile(file)
}

function clearSearch() {
  search.value = ''
}

async function uploadSelectedImage() {
  if (!canUpload.value) return

  clearTransientFeedback()
  const filename = previewFilename.value
  uploading.value = true

  try {
    await uploadCatalogImage(filename, optimized.value.blob)
    lastUploadedFilename.value = filename
    uploadFeedback.value = {
      type: 'success',
      message: `“${filename}” ya está en el catálogo.`,
    }
    emit('changed', { type: 'upload', filename })
    clearSelectedFile()
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    uploading.value = false
  }
}

function requestDelete(kit) {
  if (!kit?.filename || deleting.value) return
  clearTransientFeedback()
  pendingDelete.value = kit.filename
}

function cancelDelete() {
  pendingDelete.value = null
}

async function confirmDelete(kit) {
  if (!kit?.filename || deleting.value) return

  clearTransientFeedback()
  deleting.value = kit.filename

  try {
    const removed = await deleteCatalogImage(kit.filename)

    if (!Array.isArray(removed) || removed.length === 0) {
      throw new Error('Storage no confirmó la eliminación del archivo.')
    }

    deletedFilenames.value = [...deletedFilenames.value, kit.filename]
    pendingDelete.value = null
    deleteFeedback.value = {
      type: 'success',
      message: `“${kit.filename}” se eliminó del catálogo.`,
    }
    emit('changed', { type: 'delete', filename: kit.filename })
  } catch (error) {
    deleteFeedback.value = {
      type: 'error',
      message: `No se pudo eliminar “${kit.filename}”: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  } finally {
    deleting.value = null
  }
}

watch(
  () => props.kits,
  (kits) => {
    const present = new Set((kits ?? []).map((kit) => kit?.filename))
    deletedFilenames.value = deletedFilenames.value.filter((filename) =>
      present.has(filename),
    )
  },
)

watch(previewFilename, (filename) => {
  if (filename !== lastUploadedFilename.value) {
    lastUploadedFilename.value = ''
  }

  clearTransientFeedback()
})

onBeforeUnmount(() => {
  optimizeToken += 1
  revokePreview()
})
</script>

<template>
  <div class="space-y-6">
    <header
      class="flex flex-wrap items-end justify-between gap-3 border-b border-subtle pb-4"
    >
      <div>
        <div class="flex items-center gap-2">
          <component
            :is="ImagePlusIcon"
            :size="18"
            class="text-accent"
            aria-hidden="true"
          />
          <h3
            class="font-display text-2xl font-semibold tracking-tight text-main"
          >
            Catálogo
          </h3>
        </div>
        <p class="mt-1 text-sm leading-6 text-muted">
          Sube fotos optimizadas y retira las que ya no están.
        </p>
      </div>
      <p class="font-mono text-[11px] text-muted">catalog/</p>
    </header>

    <div
      class="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
    >
      <div class="min-w-0 space-y-6">
        <section class="space-y-3">
          <div class="flex items-baseline gap-2">
            <span
              class="grid size-5 shrink-0 place-items-center rounded-full border border-subtle bg-base font-mono text-[10px] text-main"
            >
              1
            </span>
            <h4 class="font-display text-lg font-semibold">Elige la foto</h4>
          </div>

          <label
            class="group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-base text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
            :class="[
              optimized || optimizing
                ? 'min-h-0 p-3'
                : 'min-h-48 px-6 py-8',
              isDragging
                ? 'border-accent bg-surface'
                : 'border-subtle hover:border-accent hover:bg-surface',
            ]"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
          >
            <input
              ref="fileInput"
              type="file"
              class="sr-only"
              :accept="ACCEPT_ATTRIBUTE"
              aria-label="Elegir foto del catálogo"
              @change="handleFileInput"
            />

            <template v-if="optimizing">
              <span
                class="flex w-full items-center justify-center gap-3 px-2 py-4"
              >
                <span
                  class="size-5 animate-spin rounded-full border-2 border-subtle border-t-accent motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <span class="text-sm font-semibold text-main">
                  Optimizando imagen…
                </span>
              </span>
            </template>

            <template v-else-if="optimized">
              <span class="flex w-full items-center gap-3 text-left">
                <span
                  class="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-subtle bg-base"
                >
                  <img
                    v-if="optimized.previewUrl"
                    :src="optimized.previewUrl"
                    alt=""
                    class="size-full object-contain"
                  />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-main">
                    {{ selectedFile?.name }}
                  </span>
                  <span class="mt-0.5 block text-xs text-muted">
                    {{ formatFileSize(optimized.originalSize) }} →
                    {{ formatFileSize(optimized.optimizedSize) }}
                  </span>
                  <span
                    class="mt-1 block text-xs font-semibold text-main underline decoration-accent underline-offset-4"
                  >
                    Cambiar foto
                  </span>
                </span>
              </span>
            </template>

            <template v-else>
              <span
                class="grid size-14 place-items-center rounded-full border border-subtle bg-surface text-accent shadow-soft"
                aria-hidden="true"
              >
                <component :is="ImagePlusIcon" :size="24" />
              </span>
              <span class="font-display text-lg font-semibold text-main">
                Arrastra una foto o elige un archivo
              </span>
              <span class="max-w-xs text-xs leading-5 text-muted">
                JPG, PNG o WebP. La convertimos a WebP y reducimos el peso antes
                de subir.
              </span>
            </template>
          </label>

          <dl
            v-if="optimized"
            class="grid grid-cols-3 divide-x divide-subtle overflow-hidden rounded-xl border border-subtle bg-surface text-center"
          >
            <div class="px-2 py-2.5">
              <dt class="text-[11px] font-medium text-muted">Original</dt>
              <dd class="mt-0.5 text-sm font-semibold text-main">
                {{ formatFileSize(optimized.originalSize) }}
              </dd>
            </div>
            <div class="px-2 py-2.5">
              <dt class="text-[11px] font-medium text-muted">WebP</dt>
              <dd class="mt-0.5 text-sm font-semibold text-main">
                {{ formatFileSize(optimized.optimizedSize) }}
              </dd>
            </div>
            <div class="px-2 py-2.5">
              <dt class="text-[11px] font-medium text-muted">Ahorro</dt>
              <dd
                class="mt-0.5 text-sm font-semibold"
                :class="
                  savingsPercent > 0 ? 'text-success' : 'text-muted'
                "
              >
                {{ savingsLabel }}
              </dd>
            </div>
          </dl>

          <p v-if="optimized" class="text-[11px] text-muted">
            Medidas finales:
            <span class="font-mono">
              {{ optimized.width }} × {{ optimized.height }} px
            </span>
          </p>

          <AdminStatusBanner
            v-if="optimizeError"
            type="error"
            :message="optimizeError"
            @dismiss="optimizeError = null"
          />
        </section>

        <section class="space-y-3">
          <div class="flex items-baseline gap-2">
            <span
              class="grid size-5 shrink-0 place-items-center rounded-full border border-subtle bg-base font-mono text-[10px] text-main"
            >
              2
            </span>
            <h4 class="font-display text-lg font-semibold">
              Nombra el archivo
            </h4>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs font-semibold text-main">Categoría</span>
              <span class="relative mt-1.5 block">
                <select
                  v-model="form.category"
                  :class="[fieldClass, 'appearance-none pr-8']"
                >
                  <option
                    v-for="option in CATEGORY_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <component
                  :is="ChevronDownIcon"
                  :size="14"
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
              </span>
            </label>

            <label class="block">
              <span class="text-xs font-semibold text-main">Temporada</span>
              <input
                v-model="form.season"
                type="text"
                placeholder="2026 o RETRO"
                :class="[fieldClass, 'mt-1.5']"
              />
            </label>

            <label class="col-span-2 block">
              <span class="text-xs font-semibold text-main">
                {{ teamFieldLabel }}
              </span>
              <input
                v-model="form.team"
                type="text"
                list="admin-team-options"
                :placeholder="teamPlaceholder"
                :class="[fieldClass, 'mt-1.5']"
              />
              <span class="mt-1 block text-[11px] text-muted">
                <template v-if="previewTeamSegment">
                  Se convierte a {{ previewTeamSegment }}.
                </template>
                <template v-else>
                  Se convierte a MAYÚSCULAS-CON-GUIONES.
                </template>
              </span>
            </label>

            <label class="block">
              <span class="text-xs font-semibold text-main">Variante</span>
              <input
                v-model="form.variant"
                type="text"
                list="admin-variant-options"
                placeholder="LOCAL"
                :class="[fieldClass, 'mt-1.5']"
              />
            </label>

            <label class="block">
              <span class="text-xs font-semibold text-main">Prenda</span>
              <span class="relative mt-1.5 block">
                <select
                  v-model="form.garment"
                  :class="[fieldClass, 'appearance-none pr-8']"
                >
                  <option
                    v-for="option in GARMENT_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <component
                  :is="ChevronDownIcon"
                  :size="14"
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
              </span>
            </label>
          </div>

          <datalist id="admin-team-options">
            <option v-for="team in teamOptions" :key="team" :value="team" />
          </datalist>
          <datalist id="admin-variant-options">
            <option
              v-for="variant in VARIANT_SUGGESTIONS"
              :key="variant"
              :value="variant"
            />
          </datalist>

          <div
            class="rounded-xl border border-subtle bg-accent-dark px-4 py-3 text-surface"
          >
            <p class="text-[11px] font-medium text-surface/70">
              Se guardará como
            </p>
            <p
              class="mt-1 break-all font-mono text-sm font-semibold"
              :class="previewFilename ? 'text-surface' : 'text-surface/60'"
            >
              {{
                previewFilename || 'Completa los cinco segmentos'
              }}
            </p>
          </div>

          <p v-if="filenameHint" class="text-xs leading-5 text-muted">
            {{ filenameHint }}
          </p>

          <p
            v-if="showOverwriteWarning"
            class="flex items-start gap-2 rounded-xl border border-subtle bg-base px-3 py-2 text-xs leading-5 text-main"
          >
            <component
              :is="AlertIcon"
              :size="14"
              class="mt-0.5 shrink-0 text-accent"
              aria-hidden="true"
            />
            Ya existe un archivo con este nombre. Al subir, se reemplazará.
          </p>
        </section>

        <section class="space-y-3">
          <div class="flex items-baseline gap-2">
            <span
              class="grid size-5 shrink-0 place-items-center rounded-full border border-subtle bg-base font-mono text-[10px] text-main"
            >
              3
            </span>
            <h4 class="font-display text-lg font-semibold">Publica</h4>
          </div>

          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast shadow-soft transition-colors hover:bg-accent-dark hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canUpload"
            @click="uploadSelectedImage"
          >
            <span
              v-if="uploading"
              class="size-4 animate-spin rounded-full border-2 border-accent-contrast/30 border-t-accent-contrast motion-reduce:animate-none"
              aria-hidden="true"
            />
            <component
              v-else
              :is="UploadIcon"
              :size="16"
              aria-hidden="true"
            />
            {{ uploading ? 'Subiendo…' : 'Subir al catálogo' }}
          </button>

          <p
            v-if="!optimized && !optimizing"
            class="text-xs leading-5 text-muted"
          >
            Elige una foto para activar la publicación.
          </p>
          <p v-else class="text-[11px] leading-5 text-muted">
            Se guarda en <span class="font-mono">catalog/</span> y el catálogo
            se actualiza al terminar.
          </p>

          <AdminStatusBanner
            v-if="uploadError"
            type="error"
            :message="uploadError"
            @dismiss="uploadError = null"
          />

          <AdminStatusBanner
            v-if="uploadFeedback"
            :type="uploadFeedback.type"
            :message="uploadFeedback.message"
            @dismiss="uploadFeedback = null"
          />
        </section>
      </div>

      <section
        class="min-w-0 self-start rounded-2xl border border-subtle bg-surface p-4 shadow-soft"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="font-display text-lg font-semibold">Catálogo actual</h4>
            <p class="mt-0.5 text-xs text-muted">
              {{ visibleKits.length }} de {{ kits.length }} kits
            </p>
          </div>
        </div>

        <div class="relative mt-4">
          <component
            :is="SearchIcon"
            :size="15"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            v-model="search"
            type="search"
            placeholder="Buscar por equipo o archivo"
            aria-label="Buscar en el catálogo"
            :class="[fieldClass, 'pl-9']"
          />
        </div>

        <AdminStatusBanner
          v-if="deleteFeedback"
          class="mt-3"
          :type="deleteFeedback.type"
          :message="deleteFeedback.message"
          @dismiss="deleteFeedback = null"
        />

        <ul
          v-if="visibleKits.length"
          class="admin-list mt-3 max-h-[24rem] divide-y divide-subtle overflow-y-auto sm:max-h-[32rem]"
        >
          <li
            v-for="kit in visibleKits"
            :key="kit.filename"
            class="py-3 first:pt-0 last:pb-0"
          >
            <div class="flex items-center gap-3">
              <span
                class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-subtle bg-base"
              >
                <img
                  v-if="kit.imageUrl"
                  :src="kit.imageUrl"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  class="size-full object-cover"
                />
                <component
                  v-else
                  :is="ShirtIcon"
                  :size="18"
                  class="text-muted"
                  aria-hidden="true"
                />
              </span>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-main">
                  {{ kit.team }}
                  <span class="font-normal text-muted">{{ kit.season }}</span>
                </p>
                <p class="truncate text-xs text-muted">
                  {{ formatVariant(kit.variant) }},
                  {{ formatGarment(kit.garment) }}
                </p>
                <p
                  class="truncate font-mono text-[10px] text-muted"
                  :title="kit.filename"
                >
                  {{ kit.filename }}
                </p>
              </div>

              <button
                type="button"
                class="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                :aria-label="`Eliminar ${kit.filename}`"
                :disabled="Boolean(deleting)"
                @click="requestDelete(kit)"
              >
                <component
                  :is="TrashIcon"
                  :size="15"
                  aria-hidden="true"
                />
              </button>
            </div>

            <div
              v-if="pendingDelete === kit.filename"
              class="mt-2 rounded-xl border border-danger bg-danger-soft p-3 text-danger"
              role="group"
              aria-label="Confirmar eliminación"
            >
              <p class="text-xs font-semibold">¿Eliminar este archivo?</p>
              <p class="mt-0.5 break-all font-mono text-[10px]">
                {{ kit.filename }}
              </p>
              <div class="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full border border-danger/40 bg-surface px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="deleting === kit.filename"
                  @click="cancelDelete"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-full bg-danger px-3 py-1.5 text-xs font-semibold text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="deleting === kit.filename"
                  @click="confirmDelete(kit)"
                >
                  <span
                    v-if="deleting === kit.filename"
                    class="size-3 animate-spin rounded-full border-2 border-surface/30 border-t-surface motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  {{
                    deleting === kit.filename
                      ? 'Eliminando…'
                      : 'Sí, eliminar'
                  }}
                </button>
              </div>
            </div>
          </li>
        </ul>

        <div
          v-else
          class="mt-6 rounded-xl border border-dashed border-subtle bg-base px-4 py-8 text-center"
        >
          <component
            :is="ShirtIcon"
            :size="26"
            class="mx-auto text-muted"
            aria-hidden="true"
          />
          <p class="mt-2 font-display text-base font-semibold text-main">
            {{ search ? 'No hay coincidencias' : 'El catálogo está vacío' }}
          </p>
          <p class="mt-1 text-xs leading-5 text-muted">
            {{
              search
                ? 'Prueba con otro equipo o archivo.'
                : 'Sube la primera foto para empezar.'
            }}
          </p>
          <button
            v-if="search"
            type="button"
            class="mt-3 text-xs font-semibold text-main underline decoration-accent underline-offset-4 hover:text-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            @click="clearSearch"
          >
            Limpiar búsqueda
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-list {
  scrollbar-width: thin;
  scrollbar-color: var(--border-subtle) transparent;
}

.admin-list::-webkit-scrollbar {
  width: 10px;
}

.admin-list::-webkit-scrollbar-track {
  background: transparent;
}

.admin-list::-webkit-scrollbar-thumb {
  background-color: var(--border-subtle);
  border: 3px solid var(--bg-surface);
  border-radius: 9999px;
}
</style>

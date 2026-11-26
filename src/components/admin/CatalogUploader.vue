<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { resolveIcon } from '../../config/icons.registry.js'
import { FIELD_CONTROL_CLASS } from '../../config/ui.config.js'
import {
  deleteCatalogImage,
  updateCatalogItem,
  uploadCatalogImage,
} from '../../core/adapters/adminStorageAdapter.js'
import {
  buildGarmentOptions,
  buildTeamOptions,
  buildVariantOptions,
} from '../../core/adminOptions.js'
import { buildCatalogFilename } from '../../core/filenameBuilder.js'
import {
  formatFileSize,
  formatGarment,
  formatVariant,
} from '../../core/formatters.js'
import { optimizeImageToWebp } from '../../core/imageOptimizer.js'
import BaseCombobox from '../BaseCombobox.vue'
import AdminStatusBanner from './AdminStatusBanner.vue'

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

const emit = defineEmits(['changed'])

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const CURRENT_YEAR = String(new Date().getFullYear())

const CATEGORY_OPTIONS = Object.freeze([
  { value: 'CLUB', label: 'Club' },
  { value: 'SEL', label: 'Selección' },
  { value: 'MARCA', label: 'Marca' },
])

const ImagePlusIcon = resolveIcon('ImagePlus')
const UploadIcon = resolveIcon('Upload')
const SaveIcon = resolveIcon('Save')
const PencilIcon = resolveIcon('Pencil')
const TrashIcon = resolveIcon('Trash2')
const AlertIcon = resolveIcon('AlertCircle')
const SearchIcon = resolveIcon('Search')
const ShirtIcon = resolveIcon('Shirt')
const XIcon = resolveIcon('X')

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

const editingFilename = ref('')
const editingImageUrl = ref('')
const editOverwriteConfirmed = ref(false)
const savingEdit = ref(false)
const cacheBustedImageUrls = ref({})

const isDragging = ref(false)
const dragDepth = ref(0)

const search = ref('')
const pendingDelete = ref(null)
const deleting = ref(null)
const deleteFeedback = ref(null)
const deletedFilenames = ref([])

let optimizeToken = 0

const fieldClass = FIELD_CONTROL_CLASS

const teamOptions = computed(() => buildTeamOptions(props.kits))
const variantOptions = computed(() => buildVariantOptions(props.kits))
const garmentOptions = computed(() =>
  buildGarmentOptions(props.store, props.kits),
)

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

const isEditing = computed(() => Boolean(editingFilename.value))

const metadataChanged = computed(
  () => isEditing.value && previewFilename.value !== editingFilename.value,
)

const editTargetExists = computed(
  () =>
    metadataChanged.value &&
    Boolean(previewFilename.value) &&
    (props.kits ?? []).some(
      (kit) => kit?.filename === previewFilename.value,
    ),
)

const hasEditChanges = computed(
  () => metadataChanged.value || Boolean(optimized.value),
)

const canSaveEdit = computed(
  () =>
    isEditing.value &&
    Boolean(previewFilename.value) &&
    hasEditChanges.value &&
    !savingEdit.value &&
    !optimizing.value &&
    (!editTargetExists.value || editOverwriteConfirmed.value),
)

const showOverwriteWarning = computed(
  () =>
    !isEditing.value &&
    filenameExists.value &&
    previewFilename.value !== lastUploadedFilename.value,
)

const canUpload = computed(
  () =>
    !isEditing.value &&
    Boolean(optimized.value && previewFilename.value) &&
    !uploading.value &&
    !optimizing.value,
)

const submitBusy = computed(() =>
  isEditing.value ? savingEdit.value : uploading.value,
)

const submitDisabled = computed(() =>
  isEditing.value ? !canSaveEdit.value : !canUpload.value,
)

const submitLabel = computed(() => {
  if (isEditing.value) {
    return savingEdit.value ? 'Guardando…' : 'Guardar cambios'
  }

  return uploading.value ? 'Subiendo…' : 'Subir al catálogo'
})

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

function resolveKitImageUrl(kit) {
  if (!kit?.filename) return ''
  return cacheBustedImageUrls.value[kit.filename] || kit.imageUrl || ''
}

function resetForm() {
  form.category = 'CLUB'
  form.team = ''
  form.season = CURRENT_YEAR
  form.variant = 'LOCAL'
  form.garment = 'CAMISETA'
}

function resetEditState() {
  editingFilename.value = ''
  editingImageUrl.value = ''
  editOverwriteConfirmed.value = false
  clearSelectedFile()
}

function startEdit(kit) {
  if (
    !kit?.filename ||
    deleting.value ||
    savingEdit.value ||
    uploading.value ||
    optimizing.value
  ) {
    return
  }

  clearTransientFeedback()
  pendingDelete.value = null
  clearSelectedFile()
  lastUploadedFilename.value = ''

  const [category, team, season, variant, garment] = kit.filename
    .replace(/\.webp$/i, '')
    .split('_')

  editingFilename.value = kit.filename
  editingImageUrl.value = resolveKitImageUrl(kit)
  editOverwriteConfirmed.value = false

  const normalizedCategory = String(category ?? '').toUpperCase()

  form.category = CATEGORY_OPTIONS.some(
    (option) => option.value === normalizedCategory,
  )
    ? normalizedCategory
    : (kit.category ?? 'CLUB')
  form.team = String(team ?? kit.team ?? '').toUpperCase()
  form.season = String(season ?? kit.season ?? CURRENT_YEAR).toUpperCase()
  form.variant = String(variant ?? kit.variant ?? '').toUpperCase()
  form.garment = String(garment ?? kit.garment ?? 'CAMISETA').toUpperCase()
}

function cancelEdit() {
  if (savingEdit.value) return

  resetEditState()
  resetForm()
  clearTransientFeedback()
}

async function saveEditedItem() {
  if (!canSaveEdit.value) return

  clearTransientFeedback()
  const oldFilename = editingFilename.value
  const newFilename = previewFilename.value
  const replacementBlob = optimized.value?.blob ?? null
  const currentImageUrl = editingImageUrl.value
  const targetImageUrl = editTargetExists.value
    ? ((props.kits ?? []).find((kit) => kit?.filename === newFilename)
        ?.imageUrl ?? '')
    : ''
  savingEdit.value = true

  try {
    await updateCatalogItem({
      oldFilename,
      newFilename,
      newWebpBlob: replacementBlob,
      overwrite: editOverwriteConfirmed.value,
    })

    const renamed = oldFilename !== newFilename

    let cacheBustBaseUrl = ''
    if (renamed) {
      if (editOverwriteConfirmed.value) cacheBustBaseUrl = targetImageUrl
    } else if (replacementBlob) {
      cacheBustBaseUrl = currentImageUrl
    }

    if (cacheBustBaseUrl) {
      const separator = cacheBustBaseUrl.includes('?') ? '&' : '?'
      cacheBustedImageUrls.value = {
        ...cacheBustedImageUrls.value,
        [newFilename]: `${cacheBustBaseUrl}${separator}v=${Date.now()}`,
      }
    }

    resetEditState()
    lastUploadedFilename.value = newFilename
    uploadFeedback.value = {
      type: 'success',
      message: renamed
        ? `“${oldFilename}” se renombró a “${newFilename}”.`
        : `“${newFilename}” se actualizó con la nueva foto.`,
    }
    emit('changed', {
      type: 'update',
      filename: newFilename,
      previousFilename: oldFilename,
      renamed,
      replaced: Boolean(replacementBlob),
    })
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    savingEdit.value = false
  }
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
  if (!kit?.filename || deleting.value || savingEdit.value) return
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

    if (editingFilename.value === kit.filename) {
      resetEditState()
      resetForm()
      await nextTick()
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

    if (
      editingFilename.value &&
      !present.has(editingFilename.value) &&
      !savingEdit.value
    ) {
      resetEditState()
      resetForm()
    }
  },
)

watch(previewFilename, (filename) => {
  if (filename !== lastUploadedFilename.value) {
    lastUploadedFilename.value = ''
  }

  if (isEditing.value) editOverwriteConfirmed.value = false

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
          Sube fotos optimizadas, edita sus datos o retira las que ya no están.
        </p>
      </div>
      <p class="font-mono text-[11px] text-muted">catalog/</p>
    </header>

    <div
      v-if="isEditing"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3"
    >
      <div class="min-w-0">
        <p class="text-xs font-semibold text-accent">Editando kit</p>
        <p
          class="truncate font-mono text-[11px] text-main"
          :title="editingFilename"
        >
          {{ editingFilename }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="savingEdit"
        @click="cancelEdit"
      >
        <component :is="XIcon" :size="13" aria-hidden="true" />
        Cancelar edición
      </button>
    </div>

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
              optimized || optimizing || isEditing
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

            <template v-else-if="isEditing">
              <span class="flex w-full items-center gap-3 text-left">
                <span
                  class="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-subtle bg-base"
                >
                  <img
                    v-if="editingImageUrl"
                    :src="editingImageUrl"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    class="size-full object-contain"
                  />
                  <component
                    v-else
                    :is="ShirtIcon"
                    :size="20"
                    class="text-muted"
                    aria-hidden="true"
                  />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-semibold text-main">
                    Foto actual
                  </span>
                  <span
                    class="mt-0.5 block truncate font-mono text-[11px] text-muted"
                    :title="editingFilename"
                  >
                    {{ editingFilename }}
                  </span>
                  <span
                    class="mt-1 block text-xs font-semibold text-main underline decoration-accent underline-offset-4"
                  >
                    Reemplazar foto
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
            <div class="block">
              <label
                for="admin-category"
                class="block text-xs font-semibold text-main"
              >
                Categoría
              </label>
              <BaseCombobox
                id="admin-category"
                v-model="form.category"
                :options="CATEGORY_OPTIONS"
                :allow-custom="false"
                :searchable="false"
                :show-option-value="false"
                class="mt-1.5"
              />
            </div>

            <label class="block">
              <span class="text-xs font-semibold text-main">Temporada</span>
              <input
                v-model="form.season"
                type="text"
                placeholder="2026 o RETRO"
                :class="[fieldClass, 'mt-1.5']"
              />
            </label>

            <div class="col-span-2 block">
              <label
                for="admin-team"
                class="block text-xs font-semibold text-main"
              >
                {{ teamFieldLabel }}
              </label>
              <BaseCombobox
                id="admin-team"
                v-model="form.team"
                :options="teamOptions"
                :placeholder="teamPlaceholder"
                class="mt-1.5"
              />
              <span class="mt-1 block text-[11px] text-muted">
                <template v-if="previewTeamSegment">
                  Se convierte a {{ previewTeamSegment }}.
                </template>
                <template v-else>
                  Se convierte a MAYÚSCULAS-CON-GUIONES.
                </template>
              </span>
            </div>

            <div class="block">
              <label
                for="admin-variant"
                class="block text-xs font-semibold text-main"
              >
                Variante
              </label>
              <BaseCombobox
                id="admin-variant"
                v-model="form.variant"
                :options="variantOptions"
                placeholder="LOCAL"
                class="mt-1.5"
              />
            </div>

            <div class="block">
              <label
                for="admin-garment"
                class="block text-xs font-semibold text-main"
              >
                Prenda
              </label>
              <BaseCombobox
                id="admin-garment"
                v-model="form.garment"
                :options="garmentOptions"
                placeholder="CAMISETA"
                class="mt-1.5"
              />
            </div>
          </div>

          <p class="text-[11px] leading-5 text-muted">
            Equipo, variante y prenda aceptan valores nuevos. Las sugerencias
            salen del catálogo y de
            <span class="font-mono">store.json</span>.
          </p>

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
            <h4 class="font-display text-lg font-semibold">
              {{ isEditing ? 'Guarda los cambios' : 'Publica' }}
            </h4>
          </div>

          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast shadow-soft transition-colors hover:bg-accent-dark hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="submitDisabled"
            @click="isEditing ? saveEditedItem() : uploadSelectedImage()"
          >
            <span
              v-if="submitBusy"
              class="size-4 animate-spin rounded-full border-2 border-accent-contrast/30 border-t-accent-contrast motion-reduce:animate-none"
              aria-hidden="true"
            />
            <component
              v-else
              :is="isEditing ? SaveIcon : UploadIcon"
              :size="16"
              aria-hidden="true"
            />
            {{ submitLabel }}
          </button>

          <button
            v-if="isEditing"
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-full border border-subtle bg-surface px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="savingEdit"
            @click="cancelEdit"
          >
            <component :is="XIcon" :size="15" aria-hidden="true" />
            Cancelar edición
          </button>

          <p v-if="isEditing" class="text-xs leading-5 text-muted">
            <template v-if="!hasEditChanges">
              Cambia algún dato o elige una foto nueva para guardar.
            </template>
            <template v-else-if="editTargetExists">
              Ya existe un archivo con ese nombre. Confirma el reemplazo para
              continuar.
            </template>
            <template v-else>
              Puedes guardar solo los datos o reemplazar la foto en el mismo
              paso.
            </template>
          </p>
          <p
            v-else-if="!optimized && !optimizing"
            class="text-xs leading-5 text-muted"
          >
            Elige una foto para activar la publicación.
          </p>
          <p v-else class="text-[11px] leading-5 text-muted">
            Se guarda en <span class="font-mono">catalog/</span> y el catálogo
            se actualiza al terminar.
          </p>

          <label
            v-if="isEditing && editTargetExists"
            class="flex items-start gap-2 rounded-xl border border-subtle bg-base px-3 py-2 text-xs leading-5 text-main"
          >
            <input
              v-model="editOverwriteConfirmed"
              type="checkbox"
              class="mt-0.5 size-4 shrink-0 accent-[var(--accent-primary)]"
              :disabled="savingEdit"
            />
            <span>
              Confirmo reemplazar el archivo existente
              <span class="break-all font-mono">{{ previewFilename }}</span>.
            </span>
          </label>

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
            :class="
              editingFilename === kit.filename ? 'bg-accent/5' : ''
            "
          >
            <div class="flex items-center gap-3">
              <span
                class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-subtle bg-base"
              >
                <img
                  v-if="resolveKitImageUrl(kit)"
                  :src="resolveKitImageUrl(kit)"
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

              <div class="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  class="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-transparent px-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                  :aria-label="`Editar ${kit.filename}`"
                  :disabled="
                    Boolean(deleting) || savingEdit || uploading || optimizing
                  "
                  @click="startEdit(kit)"
                >
                  <component
                    :is="PencilIcon"
                    :size="13"
                    aria-hidden="true"
                  />
                  Editar
                </button>

                <button
                  type="button"
                  class="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted transition-colors hover:border-danger hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                  :aria-label="`Eliminar ${kit.filename}`"
                  :disabled="Boolean(deleting) || savingEdit"
                  @click="requestDelete(kit)"
                >
                  <component
                    :is="TrashIcon"
                    :size="15"
                    aria-hidden="true"
                  />
                </button>
              </div>
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

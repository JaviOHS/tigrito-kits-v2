<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue'

import { FIELD_CONTROL_CLASS } from '../config/ui.config.js'
import { resolveIcon } from '../config/icons.registry.js'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  id: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  allowCustom: {
    type: Boolean,
    default: true,
  },
  searchable: {
    type: Boolean,
    default: true,
  },
  showOptionValue: {
    type: Boolean,
    default: true,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  inputClass: {
    type: [String, Array, Object],
    default: FIELD_CONTROL_CLASS,
  },
  emptyText: {
    type: String,
    default: '',
  },
  maxSuggestions: {
    type: Number,
    default: 50,
  },
})

const emit = defineEmits(['update:modelValue'])

const ChevronDownIcon = resolveIcon('ChevronDown')
const CheckIcon = resolveIcon('CheckCircle')

const root = ref(null)
const list = ref(null)
const open = ref(false)
const filterActive = ref(false)
const activeIndex = ref(-1)
const inputValue = ref('')

const generatedId = useId()
const inputId = computed(() => props.id || `combobox-${generatedId}`)
const listboxId = computed(() => `${inputId.value}-listbox`)

let blurTimer = null

function normalizeOption(option) {
  if (option === null || option === undefined) return null

  if (typeof option === 'string' || typeof option === 'number') {
    const value = String(option).trim()
    return value ? { value, label: value } : null
  }

  if (typeof option === 'object') {
    const value = String(option.value ?? '').trim()
    if (!value) return null

    const label = String(option.label ?? value).trim() || value
    return { value, label }
  }

  return null
}

const normalizedOptions = computed(() => {
  const seen = new Set()
  const result = []

  for (const rawOption of props.options ?? []) {
    const option = normalizeOption(rawOption)
    if (!option || seen.has(option.value)) continue

    seen.add(option.value)
    result.push(option)
  }

  return result
})

const currentValue = computed(() => String(props.modelValue ?? ''))

const selectedOption = computed(
  () =>
    normalizedOptions.value.find(
      (option) => option.value === currentValue.value,
    ) ?? null,
)

/**
 * Editable comboboxes display the raw value (admin taxonomy codes). Selection
 * dropdowns display the human label ("Todos los equipos", "Recomendados").
 */
const displayValue = computed(() => {
  if (props.allowCustom) return currentValue.value
  return selectedOption.value?.label ?? currentValue.value
})

function searchKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[-_\s]+/g, ' ')
    .trim()
}

const filteredOptions = computed(() => {
  const query = filterActive.value ? searchKey(inputValue.value) : ''
  const source = query
    ? normalizedOptions.value.filter(
        (option) =>
          searchKey(option.value).includes(query) ||
          searchKey(option.label).includes(query),
      )
    : normalizedOptions.value

  // Fixed option lists must stay complete; suggestions stay bounded.
  return props.allowCustom
    ? source.slice(0, Math.max(1, props.maxSuggestions))
    : source
})

const showList = computed(() => open.value && !props.disabled)
const activeOption = computed(
  () => filteredOptions.value[activeIndex.value] ?? null,
)
const activeDescendantId = computed(() =>
  showList.value && activeOption.value
    ? `${listboxId.value}-option-${activeIndex.value}`
    : undefined,
)

const resolvedEmptyText = computed(
  () =>
    props.emptyText ||
    (props.allowCustom
      ? 'Sin sugerencias. Puedes escribir un valor nuevo.'
      : 'Sin coincidencias.'),
)

watch(
  displayValue,
  (value) => {
    if (filterActive.value) return
    if (inputValue.value !== value) inputValue.value = value
  },
  { immediate: true },
)

watch(filteredOptions, () => {
  if (activeIndex.value >= filteredOptions.value.length) {
    activeIndex.value = filteredOptions.value.length ? 0 : -1
  }
})

watch(activeIndex, async (index) => {
  if (index < 0) return

  await nextTick()
  list.value
    ?.querySelector(`[data-option-index="${index}"]`)
    ?.scrollIntoView({ block: 'nearest' })
})

function clearBlurTimer() {
  if (blurTimer === null) return

  clearTimeout(blurTimer)
  blurTimer = null
}

function restoreInput() {
  inputValue.value = displayValue.value
}

function openList({ highlightSelected = false } = {}) {
  if (props.disabled) return

  clearBlurTimer()
  open.value = true

  if (highlightSelected) {
    activeIndex.value = filteredOptions.value.findIndex(
      (option) => option.value === currentValue.value,
    )
  }
}

function closeList({ restore = true } = {}) {
  clearBlurTimer()
  open.value = false
  filterActive.value = false
  activeIndex.value = -1

  if (restore) restoreInput()
}

/**
 * Selection dropdowns show a label, so typing should replace it instead of
 * inserting characters into the middle of the label at the caret position.
 */
function selectLabelText(event) {
  if (!props.searchable || props.allowCustom) return
  event?.target?.select?.()
}

function handleFocus(event) {
  if (props.disabled) return

  filterActive.value = false
  restoreInput()
  selectLabelText(event)
  openList({ highlightSelected: true })
}

function handleClick(event) {
  if (props.disabled) return

  if (!open.value) {
    filterActive.value = false
    restoreInput()
    openList({ highlightSelected: true })
  }

  if (!filterActive.value) selectLabelText(event)
}

function handleInput(event) {
  if (!props.searchable) return

  const raw = event.target.value

  if (props.allowCustom) {
    inputValue.value = raw
    emit('update:modelValue', raw)
    filterActive.value = true
    openList()
    activeIndex.value = -1
    return
  }

  const label = selectedOption.value?.label ?? ''
  let query = raw

  if (label && raw.startsWith(label)) {
    query = raw.slice(label.length)
  } else if (label && label.startsWith(raw)) {
    // Deleting the selected label clears the search instead of leaving a
    // partial label as a query.
    query = ''
  }

  inputValue.value = query
  filterActive.value = true
  openList()
  activeIndex.value = filteredOptions.value.length ? 0 : -1
}

function handleKeydown(event) {
  if (props.disabled) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!open.value) {
      filterActive.value = false
      restoreInput()
      openList({ highlightSelected: true })
    }
    if (!filteredOptions.value.length) return

    activeIndex.value =
      activeIndex.value < filteredOptions.value.length - 1
        ? activeIndex.value + 1
        : 0
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) {
      filterActive.value = false
      restoreInput()
      openList({ highlightSelected: true })
    }
    if (!filteredOptions.value.length) return

    activeIndex.value =
      activeIndex.value > 0
        ? activeIndex.value - 1
        : filteredOptions.value.length - 1
    return
  }

  if (event.key === 'Enter') {
    if (!showList.value) {
      if (!props.searchable) {
        event.preventDefault()
        filterActive.value = false
        restoreInput()
        openList({ highlightSelected: true })
      }
      return
    }

    event.preventDefault()
    if (activeIndex.value >= 0) {
      selectOption(filteredOptions.value[activeIndex.value])
    } else {
      closeList()
    }
    return
  }

  if (event.key === ' ' && !props.searchable) {
    event.preventDefault()
    if (!showList.value) {
      filterActive.value = false
      restoreInput()
      openList({ highlightSelected: true })
    } else if (activeIndex.value >= 0) {
      selectOption(filteredOptions.value[activeIndex.value])
    }
    return
  }

  if (event.key === 'Escape') {
    if (!open.value) return

    event.preventDefault()
    closeList()
    return
  }

  if (event.key === 'Tab') closeList()
}

function optionDisplayValue(option) {
  return props.allowCustom ? option.value : option.label
}

function selectOption(option) {
  if (!option) return

  clearBlurTimer()
  filterActive.value = false
  inputValue.value = optionDisplayValue(option)
  emit('update:modelValue', option.value)
  closeList({ restore: false })
}

function handleBlur(event) {
  if (root.value?.contains(event.relatedTarget)) return

  clearBlurTimer()
  // Give touch-generated clicks time to land on an option before closing.
  blurTimer = setTimeout(() => {
    blurTimer = null
    closeList()
  }, 120)
}

function handleDocumentPointerDown(event) {
  if (!open.value) return
  if (root.value?.contains(event.target)) return

  closeList()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  clearBlurTimer()
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})
</script>

<template>
  <div ref="root" class="relative min-w-0">
    <div class="relative min-w-0">
      <input
        :id="inputId"
        type="text"
        role="combobox"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        :value="inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="!searchable"
        :aria-label="ariaLabel || undefined"
        :class="[
          inputClass,
          'pr-9',
          !searchable && !disabled ? 'cursor-pointer' : '',
        ]"
        :aria-expanded="showList"
        :aria-controls="showList ? listboxId : undefined"
        :aria-autocomplete="searchable ? 'list' : undefined"
        aria-haspopup="listbox"
        :aria-activedescendant="activeDescendantId"
        @focus="handleFocus"
        @click="handleClick"
        @input="handleInput"
        @keydown="handleKeydown"
        @blur="handleBlur"
      />
      <component
        :is="ChevronDownIcon"
        :size="14"
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-transform"
        :class="showList ? 'rotate-180' : ''"
        aria-hidden="true"
      />
    </div>

    <ul
      v-if="showList"
      :id="listboxId"
      ref="list"
      role="listbox"
      class="combobox-menu absolute z-30 mt-1 max-h-44 w-full overflow-y-auto overscroll-contain rounded-xl border border-subtle bg-elevated p-1 shadow-lifted"
    >
      <li
        v-if="!filteredOptions.length"
        role="presentation"
        class="px-3 py-2 text-xs leading-5 text-muted"
      >
        {{ resolvedEmptyText }}
      </li>

      <li
        v-for="(option, index) in filteredOptions"
        :key="option.value"
        role="presentation"
      >
        <button
          :id="`${listboxId}-option-${index}`"
          type="button"
          role="option"
          tabindex="-1"
          :data-option-index="index"
          :aria-selected="option.value === currentValue"
          class="flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors"
          :class="
            index === activeIndex
              ? 'bg-accent/10 text-main'
              : 'text-main hover:bg-accent/5'
          "
          @mousedown.prevent
          @click="selectOption(option)"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{{ option.label }}</span>
            <span
              v-if="showOptionValue && option.label !== option.value"
              class="mt-0.5 block truncate font-mono text-[10px] text-muted"
            >
              {{ option.value }}
            </span>
          </span>
          <component
            v-if="option.value === currentValue"
            :is="CheckIcon"
            :size="14"
            class="shrink-0 text-accent"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>
  </div>
</template>

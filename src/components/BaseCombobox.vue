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
  inputClass: {
    type: [String, Array, Object],
    default: '',
  },
  emptyText: {
    type: String,
    default: 'Sin sugerencias. Puedes escribir un valor nuevo.',
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
const inputValue = ref(String(props.modelValue ?? ''))

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

  return source.slice(0, Math.max(1, props.maxSuggestions))
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

watch(
  () => props.modelValue,
  (value) => {
    const next = String(value ?? '')
    if (next !== inputValue.value) inputValue.value = next
  },
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

function openList() {
  if (props.disabled) return

  clearBlurTimer()
  open.value = true
}

function closeList() {
  clearBlurTimer()
  open.value = false
  filterActive.value = false
  activeIndex.value = -1
}

function handleFocus() {
  filterActive.value = false
  openList()
}

function handleClick() {
  if (open.value) return

  filterActive.value = false
  openList()
}

function handleInput(event) {
  inputValue.value = event.target.value
  emit('update:modelValue', inputValue.value)
  filterActive.value = true
  openList()
  activeIndex.value = -1
}

function handleKeydown(event) {
  if (props.disabled) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!open.value) openList()
    if (!filteredOptions.value.length) return

    activeIndex.value =
      activeIndex.value < filteredOptions.value.length - 1
        ? activeIndex.value + 1
        : 0
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) openList()
    if (!filteredOptions.value.length) return

    activeIndex.value =
      activeIndex.value > 0
        ? activeIndex.value - 1
        : filteredOptions.value.length - 1
    return
  }

  if (event.key === 'Enter') {
    if (!showList.value) return

    event.preventDefault()
    if (activeIndex.value >= 0) {
      selectOption(filteredOptions.value[activeIndex.value])
    } else {
      closeList()
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

function selectOption(option) {
  if (!option) return

  clearBlurTimer()
  inputValue.value = option.value
  emit('update:modelValue', option.value)
  closeList()
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
        :class="[inputClass, 'pr-9']"
        :aria-expanded="showList"
        :aria-controls="showList ? listboxId : undefined"
        aria-autocomplete="list"
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
      class="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto overscroll-contain rounded-xl border border-subtle bg-surface p-1 shadow-lifted"
    >
      <li
        v-if="!filteredOptions.length"
        role="presentation"
        class="px-3 py-2.5 text-xs leading-5 text-muted"
      >
        {{ emptyText }}
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
          :aria-selected="option.value === modelValue"
          class="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
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
              v-if="option.label !== option.value"
              class="mt-0.5 block truncate font-mono text-[10px] text-muted"
            >
              {{ option.value }}
            </span>
          </span>
          <component
            v-if="option.value === modelValue"
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

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'

import { resolveIcon } from '../../config/icons.registry.js'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: [Object, String],
    default: null,
  },
})

const emit = defineEmits(['submit'])

const LockIcon = resolveIcon('Lock')
const AlertIcon = resolveIcon('AlertCircle')

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const emailInput = ref(null)

const passwordFieldType = computed(() =>
  showPassword.value ? 'text' : 'password',
)

const errorMessage = computed(() => {
  if (!props.error) return ''
  if (typeof props.error === 'string') return props.error
  return (
    props.error.message ||
    'No pudimos iniciar sesión. Revisa tus credenciales.'
  )
})

const fieldClass =
  'w-full rounded-xl border border-subtle bg-base px-3 py-2.5 text-sm text-main shadow-soft outline-none transition-colors placeholder:text-muted focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function submit() {
  if (props.loading) return
  emit('submit', { email: email.value.trim(), password: password.value })
}

onMounted(() => {
  nextTick(() => emailInput.value?.focus())
})
</script>

<template>
  <div class="grid md:grid-cols-[0.9fr_1.1fr]">
    <aside
      class="admin-login-mat relative flex flex-col justify-between overflow-hidden border-b border-subtle bg-base p-5 sm:p-8 md:border-b-0 md:border-r"
    >
      <div>
        <span
          class="inline-flex items-center gap-2 rounded-full border border-subtle bg-surface px-3 py-1 text-xs font-semibold text-main shadow-soft"
        >
          <component
            :is="LockIcon"
            :size="14"
            class="text-accent"
            aria-hidden="true"
          />
          Acceso al taller
        </span>

        <h3
          class="mt-5 max-w-[15ch] text-balance font-display text-3xl font-semibold leading-[1.05] tracking-tight text-main sm:mt-6 sm:text-4xl"
        >
          El catálogo se edita desde aquí.
        </h3>
        <p class="mt-3 max-w-sm text-sm leading-6 text-muted">
          Entra con tu cuenta para cambiar la configuración y
          publicar nuevas fotos.
        </p>
      </div>
    </aside>

    <form
      class="p-5 sm:p-8"
      :aria-busy="loading"
      @submit.prevent="submit"
    >
      <div class="mx-auto max-w-sm">
        <h4 class="font-display text-xl font-semibold tracking-tight">
          Inicia sesión
        </h4>
        <p class="mt-1 text-sm leading-6 text-muted">
          Usa el correo y la contraseña de tu cuenta de administración.
        </p>

        <div class="mt-6 space-y-4">
          <div>
            <label
              for="admin-email"
              class="text-xs font-semibold text-main"
            >
              Correo
            </label>
            <input
              id="admin-email"
              ref="emailInput"
              v-model="email"
              type="email"
              autocomplete="username"
              placeholder="tu@correo.com"
              required
              :class="[fieldClass, 'mt-1.5']"
            />
          </div>

          <div>
            <label
              for="admin-password"
              class="text-xs font-semibold text-main"
            >
              Contraseña
            </label>
            <div class="relative mt-1.5">
              <input
                id="admin-password"
                v-model="password"
                :type="passwordFieldType"
                autocomplete="current-password"
                placeholder="Tu contraseña"
                required
                :class="[fieldClass, 'pr-20']"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-muted transition-colors hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                :aria-label="
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                "
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </div>

          <div
            v-if="errorMessage"
            id="admin-login-error"
            class="flex items-start gap-2 rounded-xl border border-danger bg-danger-soft px-3 py-2.5 text-xs leading-5 text-danger"
            role="alert"
          >
            <component
              :is="AlertIcon"
              :size="15"
              class="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <p class="break-words">{{ errorMessage }}</p>
          </div>

          <button
            type="submit"
            class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-contrast shadow-soft transition-colors hover:bg-accent-dark hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
          >
            <span
              v-if="loading"
              class="size-4 animate-spin rounded-full border-2 border-accent-contrast/30 border-t-accent-contrast motion-reduce:animate-none"
              aria-hidden="true"
            />
            <component
              v-else
              :is="LockIcon"
              :size="16"
              aria-hidden="true"
            />
            {{ loading ? 'Entrando…' : 'Entrar al taller' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.admin-login-mat {
  background-image: radial-gradient(
    color-mix(in srgb, var(--border-subtle) 65%, transparent) 0.75px,
    transparent 0.75px
  );
  background-size: 12px 12px;
}
</style>

import test from 'node:test'
import assert from 'node:assert/strict'

import { createAdminStorageAdapter } from '../src/core/adapters/adminStorageAdapter.js'
import { useAdminAuth } from '../src/composables/useAdminAuth.js'

const VALID_FILENAME = 'CLUB_BARCELONA-SC_2026_LOCAL_CAMISETA.webp'

function createFakeClient(overrides = {}) {
  const calls = {
    signInWithPassword: [],
    signOut: 0,
    getSession: 0,
    upload: [],
    remove: [],
    authListeners: [],
    bucket: '',
  }

  let listener = null
  let unsubscribed = false

  const client = {
    auth: {
      async signInWithPassword(credentials) {
        calls.signInWithPassword.push(credentials)

        return (
          overrides.signIn ?? {
            data: {
              user: { id: 'admin-1', email: credentials.email },
              session: null,
            },
            error: null,
          }
        )
      },
      async signOut() {
        calls.signOut += 1
        return overrides.signOut ?? { error: null }
      },
      async getSession() {
        calls.getSession += 1
        return overrides.getSession ?? { data: { session: null }, error: null }
      },
      onAuthStateChange(callback) {
        calls.authListeners.push(callback)
        listener = callback

        return {
          data: {
            subscription: {
              unsubscribe() {
                unsubscribed = true
                listener = null
              },
            },
          },
        }
      },
    },
    storage: {
      from(bucket) {
        calls.bucket = bucket

        return {
          async upload(path, body, options) {
            calls.upload.push({ path, body, options })

            return (
              overrides.upload ?? {
                data: { path, fullPath: `${bucket}/${path}` },
                error: null,
              }
            )
          },
          async remove(paths) {
            calls.remove.push(paths)

            return (
              overrides.remove ?? {
                data: paths.map((name) => ({ name })),
                error: null,
              }
            )
          },
        }
      },
    },
  }

  return {
    client,
    calls,
    emitAuth(event, session) {
      return listener?.(event, session)
    },
    getUnsubscribed() {
      return unsubscribed
    },
  }
}

function createAdapter(overrides = {}) {
  const fake = createFakeClient(overrides)
  const adapter = createAdminStorageAdapter({
    client: fake.client,
    bucket: 'test-bucket',
  })

  return { adapter, fake }
}

test('saveConfigJson rejects malformed JSON before any upload', async () => {
  const { adapter, fake } = createAdapter()

  await assert.rejects(
    () => adapter.saveConfigJson('store.json', '{"brandName":'),
    /Invalid JSON for config file: store\.json/,
  )

  assert.equal(fake.calls.upload.length, 0)
  assert.equal(fake.calls.bucket, '')
})

test('saveConfigJson rejects malformed JSON before creating the client', async () => {
  let clientCreations = 0
  const adapter = createAdminStorageAdapter({
    supabaseUrl: 'https://demo.supabase.co',
    supabaseAnonKey: 'test-anon-key',
    createClientImpl() {
      clientCreations += 1
      throw new Error('The client must not be created for malformed JSON.')
    },
  })

  await assert.rejects(
    () => adapter.saveConfigJson('store.json', '{"brandName":'),
    /Invalid JSON for config file: store\.json/,
  )

  assert.equal(clientCreations, 0)
})

test('saveConfigJson rejects unsupported config files before any upload', async () => {
  const { adapter, fake } = createAdapter()

  await assert.rejects(
    () => adapter.saveConfigJson('../secrets.json', '{}'),
    /Unsupported config file/,
  )

  assert.equal(fake.calls.upload.length, 0)
})

test('saveConfigJson uploads formatted JSON with cache disabled and upsert', async () => {
  const { adapter, fake } = createAdapter()
  const input = '{"brandName":"Tigrito","whatsappNumber":"593999999999"}'

  const result = await adapter.saveConfigJson('store.json', input)
  const [{ path, body, options }] = fake.calls.upload

  assert.equal(fake.calls.bucket, 'test-bucket')
  assert.equal(path, 'config/store.json')
  assert.deepEqual(JSON.parse(body), JSON.parse(input))
  assert.match(body, /\n {2}"brandName"/)
  assert.equal(body.endsWith('\n'), true)
  assert.deepEqual(options, {
    contentType: 'application/json',
    cacheControl: '0',
    upsert: true,
  })
  assert.equal(result.path, 'config/store.json')
})

test('uploadCatalogImage rejects invalid taxonomy before any upload', async () => {
  const { adapter, fake } = createAdapter()

  await assert.rejects(
    () => adapter.uploadCatalogImage('CLUB_BARCELONA_2026_CAMISETA.webp', new Blob(['x'])),
    /Invalid catalog filename/,
  )

  assert.equal(fake.calls.upload.length, 0)
  assert.equal(fake.calls.bucket, '')
})

test('uploadCatalogImage uploads WebP files with upsert enabled', async () => {
  const { adapter, fake } = createAdapter()
  const image = new Blob(['webp-bytes'], { type: 'image/webp' })

  const result = await adapter.uploadCatalogImage(VALID_FILENAME, image)
  const [{ path, body, options }] = fake.calls.upload

  assert.equal(path, `catalog/${VALID_FILENAME}`)
  assert.equal(body, image)
  assert.deepEqual(options, {
    contentType: 'image/webp',
    upsert: true,
  })
  assert.equal(result.path, `catalog/${VALID_FILENAME}`)
})

test('uploadCatalogImage normalizes the blob MIME type to WebP', async () => {
  const { adapter, fake } = createAdapter()
  const image = new Blob(['webp-bytes'], { type: 'image/png' })

  await adapter.uploadCatalogImage(VALID_FILENAME, image)
  const [{ body }] = fake.calls.upload

  assert.equal(body.type, 'image/webp')
  assert.equal(await body.text(), 'webp-bytes')
})

test('deleteCatalogImage removes the catalog path', async () => {
  const { adapter, fake } = createAdapter()

  const result = await adapter.deleteCatalogImage(VALID_FILENAME)

  assert.deepEqual(fake.calls.remove, [[`catalog/${VALID_FILENAME}`]])
  assert.deepEqual(result, [{ name: `catalog/${VALID_FILENAME}` }])
})

test('auth methods adapt Supabase responses and credentials', async () => {
  const session = { user: { id: 'admin-1', email: 'admin@tigrito.test' } }
  const { adapter, fake } = createAdapter({
    signIn: {
      data: { user: session.user, session },
      error: null,
    },
    getSession: { data: { session }, error: null },
  })

  assert.deepEqual(
    await adapter.signInAdmin('admin@tigrito.test', 'secret'),
    session.user,
  )
  assert.deepEqual(fake.calls.signInWithPassword[0], {
    email: 'admin@tigrito.test',
    password: 'secret',
  })
  assert.deepEqual(await adapter.getAdminSession(), session)
  assert.equal(await adapter.signOutAdmin(), true)
  assert.equal(fake.calls.signOut, 1)
})

test('auth and storage methods surface Supabase errors', async () => {
  const signInError = new Error('Invalid login credentials')
  const uploadError = new Error('new row violates row-level security policy')
  const { adapter } = createAdapter({
    signIn: { data: { user: null, session: null }, error: signInError },
    upload: { data: null, error: uploadError },
  })

  await assert.rejects(
    () => adapter.signInAdmin('admin@tigrito.test', 'wrong'),
    /Invalid login credentials/,
  )
  await assert.rejects(
    () => adapter.saveConfigJson('store.json', '{}'),
    /row-level security policy/,
  )
})

test('onAdminAuthChange forwards normalized payloads and unsubscribes', () => {
  const { adapter, fake } = createAdapter()
  const received = []

  const stop = adapter.onAdminAuthChange((payload) => {
    received.push(payload)
  })

  const user = { id: 'admin-1', email: 'admin@tigrito.test' }
  const session = { user }
  fake.emitAuth('SIGNED_IN', session)

  assert.deepEqual(received, [{ event: 'SIGNED_IN', session, user }])

  stop()
  assert.equal(fake.getUnsubscribed(), true)

  fake.emitAuth('SIGNED_OUT', null)
  assert.equal(received.length, 1)
})

test('useAdminAuth exposes login, logout, reactive user and auth errors', async () => {
  const { adapter, fake } = createAdapter()
  const auth = useAdminAuth({ adapter, autoRestore: false })

  assert.equal(auth.user.value, null)
  assert.equal(auth.isAuthenticated.value, false)

  const user = await auth.login('admin@tigrito.test', 'secret')

  assert.deepEqual(user, { id: 'admin-1', email: 'admin@tigrito.test' })
  assert.deepEqual(auth.user.value, user)
  assert.equal(auth.isAuthenticated.value, true)
  assert.equal(auth.authLoading.value, false)
  assert.equal(auth.authError.value, null)

  fake.emitAuth('SIGNED_OUT', null)

  assert.equal(auth.user.value, null)
  assert.equal(auth.isAuthenticated.value, false)

  await auth.login('admin@tigrito.test', 'secret')
  assert.equal(await auth.logout(), true)
  assert.equal(auth.user.value, null)
})

test('useAdminAuth restores the session and captures auth failures', async () => {
  const user = { id: 'admin-restored', email: 'admin@tigrito.test' }
  const first = createAdapter({
    getSession: { data: { session: { user } }, error: null },
  })
  const restored = useAdminAuth({ adapter: first.adapter })

  await restored.ready
  assert.deepEqual(restored.user.value, user)
  assert.equal(restored.authLoading.value, false)
  restored.stopAuthListener()

  const signInError = new Error('Invalid login credentials')
  const second = createAdapter({
    signIn: { data: { user: null, session: null }, error: signInError },
  })
  const rejected = useAdminAuth({
    adapter: second.adapter,
    autoRestore: false,
  })

  assert.equal(await rejected.login('admin@tigrito.test', 'wrong'), null)
  assert.equal(rejected.authError.value?.message, signInError.message)
  assert.equal(rejected.isAuthenticated.value, false)
  rejected.stopAuthListener()
})

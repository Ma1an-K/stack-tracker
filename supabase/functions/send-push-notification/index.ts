import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://cardcrewledger.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VAPID_PUBLIC_KEY = 'BP9Z5RasNjMn4BQ_bUyAHKoIAH1t7Arh_oAuIZXjuiUULpOUbDBgRB57r998FrM1v9F9hBTY0h9lstgm4Oosu1Q'

// ── Base64 helpers ──

function base64UrlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (b64.length % 4)) % 4
  const raw = atob(b64 + '='.repeat(pad))
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

// ── HKDF (RFC 5869) via Web Crypto ──

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const hkdfKey = await crypto.subtle.importKey('raw', toArrayBuffer(ikm), 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: toArrayBuffer(salt), info: toArrayBuffer(info) },
    hkdfKey,
    length * 8
  )
  return new Uint8Array(bits)
}

// ── Concat helper ──

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0)
  const result = new Uint8Array(len)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

// ── Create info for HKDF (RFC 8291) ──

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder()
  const typeBytes = encoder.encode(type)
  // "Content-Encoding: <type>\0" + "P-256\0" + len(client) + client + len(server) + server
  const header = encoder.encode('Content-Encoding: ')
  const nul = new Uint8Array([0])
  const p256 = encoder.encode('P-256')
  const clientLen = new Uint8Array(2)
  clientLen[0] = 0; clientLen[1] = clientPublicKey.length
  const serverLen = new Uint8Array(2)
  serverLen[0] = 0; serverLen[1] = serverPublicKey.length
  return concat(header, typeBytes, nul, p256, nul, clientLen, clientPublicKey, serverLen, serverPublicKey)
}

// ── Encrypt payload (RFC 8291 aes128gcm) ──

async function encryptPayload(
  clientPublicKeyBytes: Uint8Array,
  clientAuthBytes: Uint8Array,
  payload: string
): Promise<{ ciphertext: Uint8Array; serverPublicKey: Uint8Array; salt: Uint8Array }> {
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey))

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey('raw', toArrayBuffer(clientPublicKeyBytes), { name: 'ECDH', namedCurve: 'P-256' }, false, [])

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublicKey }, serverKeys.privateKey, 256))

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // IKM = HKDF(auth, sharedSecret, "WebPush: info\0" + client + server, 32)
  const encoder = new TextEncoder()
  const authInfo = concat(encoder.encode('WebPush: info\0'), clientPublicKeyBytes, serverPublicKeyRaw)
  const ikm = await hkdf(clientAuthBytes, sharedSecret, authInfo, 32)

  // CEK = HKDF(salt, ikm, cekInfo, 16)
  const cekInfo = concat(encoder.encode('Content-Encoding: aes128gcm\0'))
  const contentEncryptionKey = await hkdf(salt, ikm, cekInfo, 16)

  // Nonce = HKDF(salt, ikm, nonceInfo, 12)
  const nonceInfo = concat(encoder.encode('Content-Encoding: nonce\0'))
  const nonce = await hkdf(salt, ikm, nonceInfo, 12)

  // Pad and encrypt
  const payloadBytes = encoder.encode(payload)
  const paddedPayload = concat(payloadBytes, new Uint8Array([2])) // delimiter byte

  const aesKey = await crypto.subtle.importKey('raw', toArrayBuffer(contentEncryptionKey), { name: 'AES-GCM' }, false, ['encrypt'])
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(nonce) }, aesKey, toArrayBuffer(paddedPayload)))

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = new Uint8Array(4)
  const recordSize = 4096
  rs[0] = (recordSize >> 24) & 0xff
  rs[1] = (recordSize >> 16) & 0xff
  rs[2] = (recordSize >> 8) & 0xff
  rs[3] = recordSize & 0xff

  const idLen = new Uint8Array([serverPublicKeyRaw.length])

  const body = concat(salt, rs, idLen, serverPublicKeyRaw, encrypted)

  return { ciphertext: body, serverPublicKey: serverPublicKeyRaw, salt }
}

// ── VAPID JWT ──

async function createVapidJwt(endpoint: string, vapidPrivateKeyB64: string): Promise<string> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const encoder = new TextEncoder()

  const header = base64UrlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: 'mailto:push@cardcrewledger.app',
  })))

  const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY)

  // Normalize private key to base64url (no padding, URL-safe chars, trim whitespace)
  const dNormalized = vapidPrivateKeyB64.trim()
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const xVal = base64UrlEncode(publicKeyBytes.slice(1, 33))
  const yVal = base64UrlEncode(publicKeyBytes.slice(33, 65))

  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC', crv: 'P-256',
      d: dNormalized,
      x: xVal,
      y: yVal,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const unsigned = `${header}.${payload}`
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned)))

  return `${unsigned}.${base64UrlEncode(sig)}`
}

// ── Send a single push ──

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPrivateKey: string
) {
  const jwt = await createVapidJwt(sub.endpoint, vapidPrivateKey)

  // The subscription keys are standard base64, convert if needed
  let p256dhBytes: Uint8Array
  let authBytes: Uint8Array
  try {
    p256dhBytes = new Uint8Array(
      atob(sub.p256dh.replace(/-/g, '+').replace(/_/g, '/'))
        .split('').map(c => c.charCodeAt(0))
    )
  } catch {
    p256dhBytes = base64UrlDecode(sub.p256dh)
  }
  try {
    authBytes = new Uint8Array(
      atob(sub.auth.replace(/-/g, '+').replace(/_/g, '/'))
        .split('').map(c => c.charCodeAt(0))
    )
  } catch {
    authBytes = base64UrlDecode(sub.auth)
  }

  const { ciphertext } = await encryptPayload(p256dhBytes, authBytes, payload)

  const response = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: ciphertext,
  })

  return response
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Verify caller is authenticated ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser()
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { homegame_id, session_date, homegame_name } = await req.json()

    if (!homegame_id) {
      return new Response(
        JSON.stringify({ error: 'homegame_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    if (!vapidPrivateKey) {
      throw new Error('VAPID_PRIVATE_KEY not configured')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── Verify caller is a member of this homegame ──────────────────────────
    const { data: membership } = await supabaseAdmin
      .from('homegame_members')
      .select('id')
      .eq('homegame_id', homegame_id)
      .eq('user_id', caller.id)
      .maybeSingle()

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('homegame_id', homegame_id)

    if (subError) throw subError

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = JSON.stringify({
      title: `${homegame_name || 'Homegame'} - New Session`,
      body: `A new session has been logged${session_date ? ` for ${session_date}` : ''}. Check your results!`,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      url: '/sessions',
    })

    let sent = 0
    let failed = 0
    const staleEndpoints: string[] = []

    for (const sub of subscriptions) {
      try {
        const res = await sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPrivateKey
        )

        if (res.status === 201 || res.status === 200) {
          sent++
        } else if (res.status === 404 || res.status === 410) {
          staleEndpoints.push(sub.endpoint)
          failed++
        } else {
          const body = await res.text()
          console.error(`Push failed for ${sub.endpoint}: ${res.status} ${body}`)
          failed++
        }
      } catch (err) {
        console.error(`Push error for ${sub.endpoint}:`, err)
        failed++
      }
    }

    if (staleEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', staleEndpoints)
    }

    return new Response(
      JSON.stringify({ sent, failed, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error sending push notifications:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

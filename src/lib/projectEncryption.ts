const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_LENGTH = 256
const ITERATIONS = 100000

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  )
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  )
}

export interface EncryptedPayload {
  ciphertext: ArrayBuffer
  salt: Uint8Array<ArrayBuffer>
  iv: Uint8Array<ArrayBuffer>
}

export async function encryptProject(data: object, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)
  const enc = new TextEncoder()
  const plaintext = enc.encode(JSON.stringify(data))

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  )

  return { ciphertext, salt, iv }
}

export async function decryptProject(payload: EncryptedPayload, password: string): Promise<object> {
  const key = await deriveKey(password, payload.salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: payload.iv },
    key,
    payload.ciphertext,
  )

  const dec = new TextDecoder()
  return JSON.parse(dec.decode(decrypted))
}

export async function encryptProjectToJson(data: object, password: string): Promise<string> {
  const payload = await encryptProject(data, password)
  const base64 = (buf: ArrayBuffer | Uint8Array) => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    return btoa(String.fromCharCode(...bytes))
  }
  return JSON.stringify({
    ciphertext: base64(payload.ciphertext),
    salt: base64(payload.salt),
    iv: base64(payload.iv),
  })
}

export async function decryptProjectFromJson(jsonStr: string, password: string): Promise<object> {
  const parsed = JSON.parse(jsonStr)
  const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return decryptProject(
    {
      ciphertext: fromBase64(parsed.ciphertext).buffer,
      salt: fromBase64(parsed.salt),
      iv: fromBase64(parsed.iv),
    },
    password,
  )
}

export function generateProjectKey(): string {
  return crypto.getRandomValues(new Uint8Array(32)).join("")
}
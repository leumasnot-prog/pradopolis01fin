const SESSION_SECRET = process.env.SESSION_SECRET || "pradopolis_secret_session_key_2026_default";
const COOKIE_NAME = "pradopolis_session";

const { subtle } = globalThis.crypto;

// Helper: ArrayBuffer -> base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Helper: base64url -> ArrayBuffer
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getHMACKey(secretString: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretString);
  return await subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export interface SessionPayload {
  userId: number;
  name: string;
  email: string;
  expiresAt: number;
}

export async function signSession(payload: Omit<SessionPayload, "expiresAt">, durationMs = 24 * 60 * 60 * 1000): Promise<string> {
  const expiresAt = Date.now() + durationMs;
  const fullPayload: SessionPayload = { ...payload, expiresAt };
  
  const encoder = new TextEncoder();
  const payloadStr = JSON.stringify(fullPayload);
  
  // Base64url encode the payload
  const payloadBase64 = btoa(payloadStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  
  // Compute signature
  const key = await getHMACKey(SESSION_SECRET);
  const signature = await subtle.sign("HMAC", key, encoder.encode(payloadBase64));
  const signatureBase64 = arrayBufferToBase64Url(signature);
  
  return `${payloadBase64}.${signatureBase64}`;
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    
    const [payloadBase64, signatureBase64] = parts;
    
    // Verify signature
    const key = await getHMACKey(SESSION_SECRET);
    const encoder = new TextEncoder();
    const signatureBuffer = base64UrlToArrayBuffer(signatureBase64);
    
    const isValid = await subtle.verify("HMAC", key, signatureBuffer, encoder.encode(payloadBase64));
    if (!isValid) return null;
    
    // Decode payload
    let base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const payloadStr = atob(base64);
    const payload = JSON.parse(payloadStr) as SessionPayload;
    
    // Check expiration
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error("verifySession error:", err);
    return null;
  }
}

export { COOKIE_NAME };

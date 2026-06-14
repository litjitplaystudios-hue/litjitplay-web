// AES-256-GCM encrypt/decrypt — same key must be used in DuelCrypto.cs (Unity build).
// Client-side use is acceptable: this provides tamper-detection + replay-protection,
// not true secrecy (attacker always has the key in a web build).
//
// IMPORTANT: replace KEY_HEX with the real shared secret before shipping.
const KEY_HEX = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';

let _key = null;
async function _getKey() {
  if (_key) return _key;
  const raw = new Uint8Array(KEY_HEX.match(/../g).map(b => parseInt(b, 16)));
  _key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return _key;
}

function _b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function _b64urlBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export async function encryptPayload(obj) {
  const key = await _getKey();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const pt  = new TextEncoder().encode(JSON.stringify(obj));
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), 12);
  return _b64url(out.buffer);
}

export async function decryptPayload(encoded) {
  const key   = await _getKey();
  const bytes = _b64urlBytes(encoded);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

/** BASE64 ÇÖZÜCÜ — P2.4C
 *
 *  Üretilmiş Moradon tabloları kaynak dosyada base64 metin olarak durur.
 *  Çözme BURADA yapılır ve KASITEN saf TypeScript'tir: `atob` (tarayıcı) ya da
 *  `Buffer` (Node) KULLANILMAZ, çünkü aynı kod hem tarayıcıda hem headless
 *  testte çalışmak zorundadır ve ortam farkı sessiz bir sapma kaynağıdır.
 *
 *  ══════════ BU DOSYA THREE İMPORT ETMEZ ══════════ */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Ters tablo: karakter kodu → 6 bit değer. -1 = geçersiz. */
const LOOKUP: number[] = (() => {
  const t = new Array<number>(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) t[ALPHABET.charCodeAt(i)] = i;
  return t;
})();

/** base64 metin → bayt dizisi. Geçersiz karakterde FIRLATIR (sessiz atlama yok:
 *  bozuk tablo runtime'a sızmamalı). */
export function decodeBase64(text: string): Uint8Array {
  let pad = 0;
  let end = text.length;
  while (end > 0 && text.charCodeAt(end - 1) === 61 /* '=' */) { end--; pad++; }
  if (pad > 2) throw new Error('[P2.4C] base64: fazla dolgu');
  const outLen = Math.floor((end * 6) / 8);
  const out = new Uint8Array(outLen);
  let acc = 0, bits = 0, o = 0;
  for (let i = 0; i < end; i++) {
    const code = text.charCodeAt(i);
    const v = code < 128 ? LOOKUP[code]! : -1;
    if (v < 0) throw new Error(`[P2.4C] base64: geçersiz karakter (${i})`);
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}

/** Bayt dizisini little-endian float32 dizisine çevirir.
 *  `DataView` kullanılır — platformun kendi endian'ından BAĞIMSIZDIR. */
export function bytesToFloat32(bytes: Uint8Array): Float32Array {
  if (bytes.length % 4 !== 0) throw new Error('[P2.4C] float32: bayt sayısı 4\'ün katı değil');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}

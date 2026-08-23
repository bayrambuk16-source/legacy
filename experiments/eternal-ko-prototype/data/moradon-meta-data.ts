/** MORADON SUNUCU META VERİSİ — P2.4C · ÜRETİLMİŞ DOSYA, ELLE DÜZENLEME.
 *  üretildi: tools/build-moradon-data.mjs · kaynak moradon_0826.smd
 *  Yeniden üretmek için: node experiments/eternal-ko-prototype/tools/build-moradon-data.mjs <paketDizini>
 */

/** SUNUCU regene bölgeleri — world koordinatına çevrilmiş. VERİDİR: hiçbir
 *  gameplay davranışına BAĞLANMAMIŞTIR (P2.4D). `index 0` şehir içindedir;
 *  ilk doğuş noktası DEĞİLDİR (o `MORADON_WORLD_SPAWN`'dır). */
export const MORADON_REGENE_AREAS = [
  { index: 0, worldX: 1824.5, worldY: 1798.1, areaX: 158.35, areaY: 207.35 },
  { index: 1, worldX: 2028.1, worldY: 694.7, areaX: 218.75, areaY: 181.05 },
  { index: 2, worldX: 1141.85, worldY: 1424.75, areaX: 152.4, areaY: 120.6 },
] as const;

/** SUNUCU object event'leri (kapılar vb.) — world koordinatına çevrilmiş.
 *  VERİDİR: davranış bağlanmamıştır. */
export const MORADON_OBJECT_EVENTS = [
  { nation: 1, index: 5001, type: 8, controlNpcRef: 0, worldX: 1689.439, worldY: 1949.738 },
  { nation: 2, index: 4013, type: 5, controlNpcRef: 212, worldX: 1690.481, worldY: 1590.518 },
  { nation: 1, index: 4014, type: 5, controlNpcRef: 211, worldX: 1410.193, worldY: 1869.717 },
] as const;

/** TEST REFERANSI — doğrudan kaynak GLB vertekslerinden alınmış ızgara düğümü
 *  yükseklikleri. `heightAt()` bunlarla BİT DÜZEYİNDE eşleşmelidir. */
/* P2.19.1 — KOORDİNATLAR ×2. Harita ölçeği ikiye katlandığında (P2.12)
   `MORADON_NODE_STEP` de 20'den 40'a çıktı. Fixture "şu IZGARA DÜĞÜMÜ şu
   world noktasında ve şu yükseklikte" der; düğümler ve YÜKSEKLİKLER
   değişmedi, yalnız world karşılıkları iki katına çıktı. */
export const MORADON_HEIGHT_FIXTURE = [
  { worldX: 0, worldY: 0, height: 5.877471754111438e-38 },
  { worldX: 120, worldY: 120, height: 5.513169288635254 },
  { worldX: 1600, worldY: 400, height: 5.687803268432617 },
  { worldX: 2560, worldY: 1280, height: -12.809043884277344 },
  { worldX: 3520, worldY: 1760, height: 8.058695793151855 },
  { worldX: 2560, worldY: 2560, height: 36.09010314941406 },
  { worldX: 1800, worldY: 2800, height: 5.513169288635254 },
  { worldX: 3040, worldY: 3520, height: 43.57904052734375 },
  { worldX: 800, worldY: 4000, height: 5.513169288635254 },
  { worldX: 4400, worldY: 4400, height: 85.74927520751953 },
  { worldX: 5120, worldY: 5120, height: 85.74927520751953 },
  { worldX: 0, worldY: 2560, height: -53.88268280029297 },
] as const;

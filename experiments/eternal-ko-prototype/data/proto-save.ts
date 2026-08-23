/** PROTOTİP KAYDI — P2.15
 *
 *  ══════════════ NEDEN AYRI BİR KAYIT ══════════════
 *  Ana oyunun `SaveSystem`i kendi şemasını taşır (3 slotluk bar, zone,
 *  v1→v2 migration zinciri). Prototipin kaydetmesi gereken şeyler farklı:
 *  dağıtılan stat puanları, sınıf aşaması, oto giy/sat ayarları, 5 slotluk
 *  bar, Genie ayarları. Ana şemayı bunlarla kirletmek yerine AYRI ANAHTAR
 *  ve AYRI ŞEMA kullanılır — ikisi birbirini bozmaz.
 *
 *  ══════════════ KAYIT OTORİTE DEĞİLDİR ══════════════
 *  Kayıt tamamen istemci tarafındadır ve oyuncu tarafından düzenlenebilir.
 *  Buradaki doğrulamalar GÜVENLİK DEĞİL, DAYANIKLILIK içindir: bozuk kayıt
 *  oyunu düşürmez, sessizce varsayılana döner.
 *
 *  ══════════════ GERİ YÜKLEME SIRASI ÖNEMLİDİR ══════════════
 *      1. seviye        → puan bütçesi ve stat tavanları buna bağlı
 *      2. dağıtım       → bütçe belli olmadan kırpılamaz
 *      3. envanter      → ekipman doğrulaması buna bağlı
 *      4. ekipman       → envanterdeki instance'lara işaret eder
 *      5. can/mana      → tavanlar 1-4 sonrası kesinleşir
 *  Sıra bozulursa puanlar kırpılır ya da ekipman düşer. */

import type { ItemInstance } from '../../../src/game/systems/InventoryState.js';
import type { AutoGearSettings } from '../world/AutoGearSystem.js';

export const PROTO_SAVE_VERSION = 1;
const KEY = 'project-legacy-proto';

export interface ProtoSaveData {
  saveVersion: number;
  player: { level: number; exp: number; hp: number; mp: number; coins: number };
  /** Dağıtılan stat puanları — bütçe seviyeden TÜRER, burada tutulmaz. */
  allocation: { dex: number; hp: number };
  inventory: { entries: ItemInstance[]; nextInstanceId: number };
  /** slotId → instanceId */
  equipment: Record<string, number>;
  /** 5 slotluk aktif bar (null = boş). */
  skills: { loadout: Array<number | null> };
  autoGear: AutoGearSettings;
  /** Oyuncunun dünyadaki konumu. */
  world: { x: number; y: number };
}

interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
}

/** Depolama seçimi. Kısıtlı ortamda (gizli sekme, iframe) bellek-içi
 *  yedeğe düşer — oyun kayıtsız da çalışmaya devam eder. */
function pickStorage(): StorageLike {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('__proto_probe__', '1');
      localStorage.removeItem('__proto_probe__');
      return localStorage;
    }
  } catch { /* kısıtlı ortam */ }
  return new MemoryStorage();
}

/** Bozuk/eksik kaydı reddeder. Eksik alan `undefined` olabilir; o zaman
 *  varsayılan üretilir — ama YARIM kayıt kabul edilmez. */
function looksValid(d: unknown): d is ProtoSaveData {
  if (typeof d !== 'object' || d === null) return false;
  const o = d as Partial<ProtoSaveData>;
  if (typeof o.saveVersion !== 'number') return false;
  if (!o.player || typeof o.player.level !== 'number') return false;
  if (!o.inventory || !Array.isArray(o.inventory.entries)) return false;
  return true;
}

export class ProtoSaveSystem {
  private storage: StorageLike;
  /** Yazım gerçekten kalıcı mı? (UI bilgilendirmesi) */
  readonly persistent: boolean;

  constructor(storage?: StorageLike) {
    this.storage = storage ?? pickStorage();
    this.persistent = !(this.storage instanceof MemoryStorage);
  }

  save(data: ProtoSaveData): boolean {
    try {
      this.storage.setItem(KEY, JSON.stringify({ ...data, saveVersion: PROTO_SAVE_VERSION }));
      return true;
    } catch {
      return false;
    }
  }

  load(): ProtoSaveData | null {
    try {
      const raw = this.storage.getItem(KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return looksValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  wipe(): void {
    try { this.storage.removeItem(KEY); } catch { /* yoksay */ }
  }

  get hasSave(): boolean { return this.load() !== null; }
}

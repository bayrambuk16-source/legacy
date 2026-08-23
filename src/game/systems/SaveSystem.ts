/** Yerel kayıt — saveVersion'lı şema + migration zinciri.
 *
 *  GÜVENLİK NOTU: Kayıt tamamen İSTEMCİ tarafındadır (localStorage) ve kullanıcı
 *  tarafından serbestçe düzenlenebilir. Buradaki doğrulamalar bir GÜVENLİK sistemi
 *  DEĞİLDİR — amaç bozuk/eski state'e karşı dayanıklılık (crash yerine temiz düşüş).
 *  Otoriter doğrulama ancak online/server-authoritative aşamada mümkündür.
 *
 *  Depolama erişimi her yerde try/catch'lidir; kısıtlı ortamlarda bellek-içi
 *  yedeğe düşer, oyun kayıtsız da çalışır. */
import type { ItemInstance } from './InventoryState.js';
import { DEFAULT_LOADOUT } from '../data/skill-behaviors.js';

export const SAVE_VERSION = 2;
const KEY = 'mobile-rpg-save';

export interface SaveData {
  saveVersion: number;
  player: { level: number; exp: number; hp: number; mp: number; coins: number };
  inventory: { entries: ItemInstance[]; nextInstanceId: number };
  equipment: Record<string, number>;
  /** v2: aktif skill barı (3 slot; null = boş) */
  skills: { loadout: Array<number | null> };
  currentZoneId: string;
}

interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
}

function pickStorage(): StorageLike {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('__probe__', '1');
      localStorage.removeItem('__probe__');
      return localStorage;
    }
  } catch { /* kısıtlı ortam */ }
  return new MemoryStorage();
}

interface SaveV1 {
  saveVersion: 1;
  player: SaveData['player'];
  inventory: SaveData['inventory'];
  equipment: Record<string, number>;
  currentZoneId: string;
}

/** v1 → v2: skill loadout alanı yoktu; varsayılan bar atanır. Böylece Faz 4 kaydı
 *  bozulmadan açılır ve oyuncu skillsiz kalmaz. */
function v1_to_v2(d: SaveV1): SaveData {
  return { ...d, saveVersion: 2, skills: { loadout: [...DEFAULT_LOADOUT] } };
}

function hasCore(d: Partial<SaveData>): boolean {
  return !!d.player && !!d.inventory && Array.isArray(d.inventory.entries)
    && !!d.equipment && typeof d.currentZoneId === 'string';
}

/** Eski şemaları güncel sürüme taşır; taşınamayan/bozuk kayıt için null. */
export function migrate(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Partial<SaveData> & { saveVersion?: number };
  if (!hasCore(d)) return null;
  switch (d.saveVersion) {
    case 1: return v1_to_v2(d as unknown as SaveV1);
    case 2: return { ...(d as SaveData), skills: { loadout: d.skills?.loadout ?? [] } };
    default: return null; // bilinmeyen/gelecek sürüm: yok say (yeni oyun)
  }
}

export class SaveSystem {
  private storage: StorageLike;
  /** son yazımın kalıcı olup olmadığı (UI bilgilendirmesi için) */
  persistent = true;

  constructor(storage?: StorageLike) {
    this.storage = storage ?? pickStorage();
    this.persistent = !(this.storage instanceof MemoryStorage);
  }

  save(data: SaveData): boolean {
    try {
      this.storage.setItem(KEY, JSON.stringify({ ...data, saveVersion: SAVE_VERSION }));
      return true;
    } catch {
      this.persistent = false;
      return false;
    }
  }

  load(): SaveData | null {
    try {
      const raw = this.storage.getItem(KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  wipe(): void {
    try { this.storage.removeItem(KEY); } catch { /* yoksay */ }
  }
}

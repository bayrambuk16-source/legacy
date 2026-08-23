/** Engine katmanı — oyun kodu SADECE bu arayüzleri görür.
 *  İleride Phaser'a geçiş: bu arayüzlerin Phaser implementasyonu yazılır,
 *  game/ klasörüne dokunulmaz. */

export interface Vec2 { x: number; y: number }

export interface DrawApi {
  /** Mantıksal çözünürlük (portrait tasarım alanı). */
  readonly width: number;
  readonly height: number;
  clear(color: string): void;
  rect(x: number, y: number, w: number, h: number, color: string, alpha?: number): void;
  circle(x: number, y: number, r: number, color: string, alpha?: number): void;
  /** key: AssetStore'a yüklenmiş görsel anahtarı. Kaynak dikdörtgeni verilirse sprite-sheet kesimi yapılır. */
  image(key: string, x: number, y: number, opts?: {
    w?: number; h?: number;
    sx?: number; sy?: number; sw?: number; sh?: number;
    flipX?: boolean; alpha?: number; originX?: number; originY?: number;
  }): void;
  text(str: string, x: number, y: number, opts?: {
    size?: number; color?: string; align?: CanvasTextAlign; bold?: boolean; alpha?: number;
  }): void;
}

export interface PointerEventInfo { x: number; y: number; id: number }

export interface InputApi {
  onDown(cb: (p: PointerEventInfo) => void): () => void;
  onUp(cb: (p: PointerEventInfo) => void): () => void;
  onMove(cb: (p: PointerEventInfo) => void): () => void;
}

export interface AssetStore {
  /** data: URI, yol veya Blob URL'den görsel yükler. */
  loadImage(key: string, src: string): Promise<void>;
  has(key: string): boolean;
  size(key: string): { w: number; h: number } | null;
}

export interface Scene {
  readonly key: string;
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
  render(g: DrawApi): void;
}

/** Uçuşan yazı + parçacık efektleri. Update/render motoru engine'de;
 *  game tarafı yalnız spawn çağrısı yapar. */
export interface FxApi {
  floatText(x: number, y: number, str: string, opts?: {
    color?: string; size?: number; bold?: boolean; riseSpeed?: number; lifeSec?: number;
  }): void;
  particles(x: number, y: number, opts?: {
    count?: number; color?: string; speed?: number; lifeSec?: number; radius?: number;
  }): void;
  update(dt: number): void;
  render(g: DrawApi): void;
  clear(): void;
}

/** Ses soyutlaması. Canvas implementasyonu WebAudio synth;
 *  Phaser'a geçişte Phaser.Sound implementasyonu yazılır. */
export type SoundKey = 'attack' | 'hit' | 'skill' | 'loot' | 'death' | 'levelup' | 'ui';
export interface AudioApi {
  play(key: SoundKey): void;
  setEnabled(on: boolean): void;
  readonly enabled: boolean;
}

export interface GameHost {
  readonly draw: DrawApi;
  readonly input: InputApi;
  readonly assets: AssetStore;
  readonly fx: FxApi;
  readonly audio: AudioApi;
  goTo(sceneKey: string): void;
  register(scene: Scene): void;
}

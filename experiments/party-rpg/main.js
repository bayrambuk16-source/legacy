import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';

/* ═══════════ AYAR ═══════════
   Model bakış yönleri testle doğrulanacak. yawEk: modelin doğal bakışı
   hareket yönünden sapıyorsa buradan düzeltilir (radyan).            */
const AYAR = {
  okcuYawEk: 0,          // okçu hedefe bakarken ek dönüş
  mobYawEk: 0,           // tüm moblar için ortak ek dönüş
  mobYaw: {              // tür bazlı ek dönüş (ortak yeterli gelmezse)
    goblin:0, kecoon:0, crab:0, monsterx:0, mutant:0, rhino:0, spike:0
  }
};

/* Mob türleri: sayfa anahtarı, ölçek, can, hız, hasar, animasyon adları */
/* ═══ VFX DOKU KAYDI (Kenney CC0 + üretilen; gri → kod renklendirir) ═══ */
/* VFX dokulari ../../public/assets/party/vfx/ altinda dosya olarak durur. */
const VFX_ADLAR = ["01_flame_sheet","02_smoke","03a_snow","03b_ice","04a_bolt","04b_arc","05_holy","06_droplet","07_hitspark","08_ring","09_rune","10_spark","11_dust","12_splatter","13_sparkle","14_shield","15_muzzle","16_slash","17_scorch"];
const DOKU = {};
{
  const yukleyici = new THREE.TextureLoader();
  for(const ad of VFX_ADLAR){
    const t2 = yukleyici.load('../../public/assets/party/vfx/' + ad + '.png');
    t2.colorSpace = THREE.SRGBColorSpace;
    DOKU[ad] = t2;
  }
}
function vfxMatA(ad, renk, op){                        /* parlayanlar: additive */
  return new THREE.MeshBasicMaterial({map: DOKU[ad], color: renk, transparent: true,
    opacity: op===undefined ? 1 : op, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: false});   /* VFX-1d: sis kareyi boyuyordu */
}
function vfxMatK(ad, renk, op){                        /* koyular: parlaklık = alfa */
  return new THREE.MeshBasicMaterial({color: renk, alphaMap: DOKU[ad], transparent: true,
    opacity: op===undefined ? 1 : op, depthWrite: false, side: THREE.DoubleSide, fog: false});
}
/* ═══ VFX-2: alev flipbook (4×4, 16 kare) + duman ═══ */
const ALEV_FPS = 14;
function alevTexAl(){
  const t2 = DOKU['01_flame_sheet'].clone();
  t2.repeat.set(0.25, 0.25); t2.offset.set(0, 0.75);
  t2.needsUpdate = true;
  return t2;
}
function alevKareSet(mat, sayac){
  const f = Math.floor(sayac) % 16;
  mat.map.offset.set((f%4)*0.25, 0.75 - Math.floor(f/4)*0.25);
}
function alevEfekt(x, y, z, olcek, sure, loop){
  const tex = alevTexAl();
  const mat = new THREE.MeshBasicMaterial({map: tex, color: 0xffc070, transparent: true,
    opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false});
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.scale.setScalar(olcek);
  mesh.position.set(x, y, z);
  sahne.add(mesh);
  D.efektler.push({kok: mesh, mat, tex, tip:'alev', omur: sure, top: sure, loop: !!loop,
    faz: Math.random()*16, op0: loop ? 0.95 : 1, olc0: olcek});
}
function dumanEfekt(x, y, z, olcek, renk){
  const mat = new THREE.MeshBasicMaterial({color: renk||0x23201c, alphaMap: DOKU['02_smoke'], transparent: true,
    opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, fog: false});
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.scale.setScalar(olcek);
  mesh.rotation.z = Math.random()*Math.PI*2;
  mesh.position.set(x, y, z);
  sahne.add(mesh);
  D.efektler.push({kok: mesh, mat, tip:'duman', omur: 1.4});
}
function patEfekt(x, y, z, doku, renk, olcek, sure){   /* VFX-3: genel billboard çakması */
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), vfxMatA(doku, renk, 1));
  mesh.scale.setScalar(olcek);
  mesh.position.set(x, y, z);
  mesh.rotation.z = Math.random()*Math.PI*2;
  sahne.add(mesh);
  D.efektler.push({kok: mesh, mat: mesh.material, tip:'pat', omur: sure, top: sure, olc0: olcek});
}
const alevHavuz = [];                                  /* yanan moblar için döngülü alev */
function mobAlevAl(olcek){
  let mesh = alevHavuz.pop();
  if(!mesh){
    const mat = new THREE.MeshBasicMaterial({map: alevTexAl(), color: 0xffc070, transparent: true,
      opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false});
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  }
  mesh.scale.setScalar(olcek);
  sahne.add(mesh);
  return mesh;
}
function mobAlevBirak(mesh){
  sahne.remove(mesh);
  if(alevHavuz.length < 14) alevHavuz.push(mesh);
  else { mesh.material.map.dispose(); mesh.material.dispose(); }
}
const TURLER = {
  goblin:  {olc:1.00, can:60,  hiz:2.1, vurus:7,  yuru:'03_WALK', vur:'05_ATTACK_1', olum:'12_DEATH'},
  kecoon:  {olc:1.05, can:70,  hiz:1.9, vurus:8,  yuru:'02_WALK', vur:'03_ATTACK_SLAM', olum:'05_DEATH'},
  crab:    {olc:1.10, can:80,  hiz:1.5, vurus:9,  yuru:'03_WALK', vur:'05_ATTACK_1', olum:'12_DEATH'},
  monsterx:{olc:1.00, can:75,  hiz:2.0, vurus:9,  yuru:'03_WALK', vur:'05_ATTACK_1', olum:'12_DEATH'},
  spike:   {olc:0.85, can:95,  hiz:1.7, vurus:11, yuru:'03_WALK', vur:'05_ATTACK_1', olum:'12_DEATH'},
  mutant:  {olc:0.95, can:130, hiz:1.4, vurus:14, yuru:'03_WALK', vur:'05_ATTACK_SWIPE', olum:'08_DEATH'},
  rhino:   {olc:0.80, can:170, hiz:1.2, vurus:17, yuru:'03_WALK', vur:'05_ATTACK_1', olum:'12_DEATH'}
};
const TUR_SIRA = ['goblin','kecoon','crab','monsterx','spike','mutant','rhino'];
/* ═══ ENCOUNTER DIRECTOR: her bölüm tasarlanmış bir savaş ═══
   ana = bölgenin imza mobu (bölgeyle döner), iki = yardımcısı */
function anaTur(){ return TUR_SIRA[(D.bolge-1) % 7]; }
function bossTur(n){ return TUR_SIRA[((D.bolge-1)+(n||0)) % 7]; }   /* ENC-3: boss = bölge imzası */
function ikiTur(){ return TUR_SIRA[D.bolge % 7]; }
const ENC_SABLON = [
  null,
  {ana:70, iki:20, goblin:10},                             /* B1 Tanışma */
  {goblin:45, kecoon:35, ana:20},                          /* B2 Sürü Baskını — frenzy sahnesi */
  {crab:30, spike:35, rhino:15, ana:20},                   /* B3 Zırhlı Hat — ön zırh + arka diken */
  {rhino:35, mutant:35, ana:20, spike:10},                 /* B4 Ağır Baskı — az ama tok */
  {ana:30, mutant:25, rhino:20, spike:15, goblin:10}       /* B5 Muhafız Eskortu — boss hazırlığı */
];
function encounterSec(){
  if(D.zindan) return TUR_SIRA[Math.random()*TUR_SIRA.length|0];   /* zindanlar serbest karışım */
  const sab = ENC_SABLON[Math.min(5, Math.max(1, D.bolum))];
  let top = 0;
  const par = [];
  for(const [k, a] of Object.entries(sab)){
    const tur = k==='ana' ? anaTur() : k==='iki' ? ikiTur() : k;
    top += a; par.push([top, tur]);
  }
  const r = Math.random()*top;
  for(const [esik, tur] of par) if(r < esik) return tur;
  return anaTur();
}

/* Denge */
const OK_HASAR = 26, OK_ARALIK = 1.05, OK_HIZ = 26, OK_MENZIL = 20.4;   /* -%15 */
const CEK_PAY = 0.62, GERI_PAY = 0.34;   // atış aralığının çekişe/geri tepmeye ayrılan payı
/* Bekleme duruşu: telafi YOK (kullanıcı kararı) — karakter ham modelle
   ileri (yol yukarısına) bakar. Çekişte NISAN_EK'e kayar, ok hedefte. */
const DURUS_EK = 0, NISAN_EK = -0.11, EK_KAYMA_HIZ = 6, DONUS_HIZ = 10;
const KIRIS_EL = {x:-0.17, y:1.41, z:0.08};   // ok çıkış noktası (kiriş eli, model uzayı)
const OKCU_CAN = 160, BRUTE_CAN = 260;   // brute tank, canı yüksek (MAGE_CAN aşağıda)
const DIRILME_SN = 10;                    // düşen kahraman 10 sn sonra dirilir
const DOGUM_ARALIK = 2.1, AZAMI_MOB = 6;
const YOL_YARIM = 2.6;            // patika yarı genişliği
const DOGUM_Z = -30, SAHNE_Z = 5, OKCU_Z = 2.4;   // okçu çapadan 2,6 birim önde
const VUR_MESAFE = 1.7;           // mob durma mesafesi

/* ═══ BRUTE (baltalı yakın dövüşçü) ═══
   Hızlar ve vuruş anları manifest raporundan: kök hareketi kliplerden
   temizlenmiş, koşu 2.92 / yürüme 1.20 birim-sn kodda uygulanır ki ayak
   kaymasın. Vuruş pencereleri klip zamanına göre ÖLÇÜLMÜŞ değerler. */
const BRUTE_AYAR = {
  yuvaX: 0, yuvaZ: OKCU_Z - 2.8,   // warrior tek başına ÖNDE bekler
  olcek: 0.93,
  tetikZ: -8,          // düşman patikanın 2/3'ünü geçince (z > -8) harekete geçer
  kosu: 2.92, yuru: 1.20, kosuEsik: 5,
  menzil: 1.85, kopus: 2.7, hasar: 24, donus: 10   /* mob durma mesafesi 1,7'nin üstünde: duvar kilitlenmesi imkânsız */
};
const BRUTE_SALDIRI = [   // klip adları registry v2 (role_ordinals) düzeni
  {klip:'05_ATTACK_HORIZONTAL', vurus:[{t:0.967, erisim:1.85}]},
  {klip:'07c_ATTACK_360_LOW',   vurus:[{t:0.967, erisim:1.74}]},
  {klip:'13c_COMBO_3',          vurus:[{t:1.000, erisim:1.84},{t:1.233, erisim:1.13},{t:1.767, erisim:1.59}]}
];

/* ═══ ARISSA (büyücü — uzaktan büyü) ═══
   Bırakış anları ve el konumları manifest ölçümleri: mermi tam o karede,
   elin gerçek yerinden çıkar. Koşu/yürüme yok — okçu gibi sabit durur. */
const MAGE_AYAR = { yuvaX: -1.8, menzil: 20.4, hasar: 34, ara: 0.25 };   /* okçuyla eşit menzil */
/* ═══ hat hareketi: menzilliler ilerler, gezinir, gerekirse geri çekilir ═══ */
const HAT = { sinirZ: OKCU_Z, onZ: -8, bruteSinir: -16, kacis: 4.5,
              hiz: 1.05, kacisHiz: 0.8, gezHiz: 0.55, donusHiz: 1.0 };
const OK_YURUME = {F:'07_AIM_WALK_FORWARD', B:'08_AIM_WALK_BACK', L:'09_AIM_WALK_LEFT', R:'10_AIM_WALK_RIGHT'};
const AR_YURUME = {F:'03_WALK', B:'03b_WALK_BACK', L:'03c_WALK_LEFT', R:'03d_WALK_RIGHT'};
const OK_YUR_SET = new Set(Object.values(OK_YURUME));
const AR_YUR_SET = new Set(Object.values(AR_YURUME));
function yonHarf(yaw, dx, dz){
  const ileri = dx*Math.sin(yaw) + dz*Math.cos(yaw);
  const yan   = dx*Math.cos(yaw) - dz*Math.sin(yaw);
  if(Math.abs(ileri) >= Math.abs(yan)) return ileri>=0 ? 'F' : 'B';
  return yan>=0 ? 'L' : 'R';
}
function kahramanAyrik(){
  const L=[];
  if(okcu && !okcu.olu) L.push(okcu);
  if(mage && !mage.olu) L.push(mage);
  if(priest && !priest.olu) L.push(priest);
  for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++){
    const a=L[i].kok.position, b=L[j].kok.position;
    const dx=b.x-a.x, dz=b.z-a.z;
    const d=Math.hypot(dx,dz) || 0.001;
    if(d < 1.3){
      const it=(1.3-d)/2, nx=dx/d, nz=dz/d;
      a.x-=nx*it; a.z-=nz*it; b.x+=nx*it; b.z+=nz*it;
      for(const q of [a,b]){
        q.x=Math.max(-YOL_YARIM+0.25, Math.min(YOL_YARIM-0.25, q.x));
        q.z=Math.min(HAT.sinirZ, q.z);
      }
    }
  }
}
function durusHasarK(){ return ENV.durus==='saldirgan' ? 1.10 : ENV.durus==='savunmaci' ? 0.90 : 1; }
function durusSavK(){ return ENV.durus==='saldirgan' ? 1.10 : ENV.durus==='savunmaci' ? 0.85 : 1; }
function tekKlipOynuyor(hh, idleAd){
  const a = hh.aktif; if(!a) return false;
  const ad = a.getClip().name;
  return a.isRunning() && ad !== idleAd && ad !== '01_IDLE' && !AR_YUR_SET.has(ad);
}
function menzilliYuru(hh, tabanX, menzil, dt, mesgul, klipSec, darbeli, kacisSerbest){
  const p = hh.kok.position;
  const canliM = D.moblar.filter(m=>m.durum!=='olu');
  let hedef=null, mod='dur';
  if(canliM.length){
    let enY=1e9, enM=null;
    for(const m of canliM){
      const u=m.kok.position.distanceTo(p);
      if(u<enY){ enY=u; enM=m; }
    }
    const dIl = ENV.durus==='saldirgan' ? 3.0 : ENV.durus==='savunmaci' ? 0.8 : 1.5;
    if(enY < HAT.kacis * (ENV.durus==='savunmaci' ? 1.35 : ENV.durus==='saldirgan' ? 0.8 : 1)){
      mod='kacis';
      if(darbeli){
        /* adım at → dur ve ateş et → adım at (0,55 sn yürü / 0,8 sn dur) */
        hh.adimS = (hh.adimS===undefined ? 0.55 : hh.adimS) - dt;
        if(hh.adimS <= -0.8) hh.adimS = 0.55;
        if(hh.adimS <= 0) return false;
      }
      hedef={x: p.x + (tabanX - p.x)*0.15, z: p.z + 1.2};
    } else if(enY > menzil - dIl){
      mod='ilerle';
      hedef={x: p.x + (enM.kok.position.x - p.x)*0.25, z: p.z - 1.5};
    } else if(!mesgul){
      hh.gezS -= dt;
      if(hh.gezS<=0 || !hh.gezP){
        hh.gezS = 2.5 + Math.random()*2.5;
        hh.gezP = {x: tabanX + (Math.random()*2-1)*0.9,
                   z: p.z + (Math.random()*2-1)*0.9};
      }
      mod='gez'; hedef=hh.gezP;
    }
  } else {
    mod='don'; hedef={x: tabanX, z: HAT.sinirZ};
    hh.gezP=null;
  }
  hh.mod = mod;
  if(!hedef || (mesgul && !(mod==='kacis' && kacisSerbest))) return false;
  hedef.z = Math.min(HAT.sinirZ, Math.max(HAT.onZ, hedef.z));
  hedef.x = Math.max(-YOL_YARIM+0.25, Math.min(YOL_YARIM-0.25, hedef.x));
  const dx=hedef.x-p.x, dz=hedef.z-p.z;
  const u=Math.hypot(dx,dz);
  if(u<0.08) return false;
  const kimH = hh===okcu ? 'okcu' : hh===mage ? 'mage' : 'priest';
  const hiz = (mod==='kacis'?HAT.kacisHiz : mod==='gez'?HAT.gezHiz : mod==='don'?HAT.donusHiz : HAT.hiz) * (1+pHiz(kimH));
  p.x += dx/u*hiz*dt; p.z += dz/u*hiz*dt;
  klipSec(dx, dz);
  return true;
}
const MAGE_CAN = 140;
const MAGE_BUYU = [   // asa ölçümüne göre seçildi: 05 dik öne sunum (69°), 07 yukarı kaldırış — 06 mızrak gibi yatıyordu, çıkarıldı
  {klip:'05_CAST_1H_1', t:1.133, el:[ 0.082, 1.218, 0.834]},
  {klip:'07_CAST_1H_3', t:0.883, el:[-0.093, 1.197, 0.710]}
];
const BUYU_HIZ = 20;

/* ═══ PRIEST (rahip) — GEÇİCİ GÖVDE: Arissa modeli açık tonla.
   Gerçek priest mesh'i Meshy'den gelince yalnız model değişecek;
   klipler ve bırakış anları priest_role_map ölçümleri (Arissa iskeleti). */
const PRIEST_AYAR = { yuvaX: 1.8, yuvaZek: 0, menzil: 20.4, hasar: 38, ara: 0.3,
                      healTek: 34, healGrup: 18, esik: 0.85 };
const PRIEST_CAN = 130;
const PRIEST_ATAK = {klip:'07e_CAST_2H_4', t:1.495, el:[0.016, 1.067, 1.008], hiz:1.35};
const PRIEST_IDLE = '02_IDLE_FIDGET';   // büyücüden ayrışan duruş (5,2 sn kusursuz döngü)
const HEAL_TEK   = {klip:'22_CHANNEL_1H',  t:0.583, el:[-0.646, 1.511, 0.138]};
const HEAL_GRUP  = {klip:'22b_CHANNEL_2H', t:0.617, el:[-0.553, 0.933, 0.086]};

/* ═══════════ SAHNE ═══════════ */
const kap = document.getElementById('sahne');
const renderer = new THREE.WebGLRenderer({antialias:true});
/* V1e: kalite preseti — çözünürlük / gölge / parçacık / bitki yoğunluğu */
function kaliteAl(){ return (typeof ENV!=='undefined' && ENV.kalite) || 'orta'; }
function pkCarpan(){ return {dusuk:0.4, orta:0.75, yuksek:1}[kaliteAl()]; }
let dinPR = null, dinKare = 0, dinSure = 0;
function kaliteUygula(){
  dinPR = null; dinKare = 0; dinSure = 0;              /* preset değişince dinamik sıfırlanır */
  const k2 = kaliteAl();
  renderer.setPixelRatio(k2==='dusuk' ? 1 : k2==='orta' ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = k2 !== 'dusuk';
  if(typeof gunes !== 'undefined') gunes.castShadow = k2 !== 'dusuk';
  if(typeof sonTema !== 'undefined') sonTema = -1;   /* çevre yeniden kurulsun */
  if(typeof postBoyutla === 'function') postBoyutla();
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;   /* V1b: sinematik ton eğrisi */
renderer.toneMappingExposure = 1.22;
function gorunurBoyut(){
  const vv = window.visualViewport;
  return vv ? [Math.round(vv.width), Math.round(vv.height)] : [innerWidth, innerHeight];
}
let [GW, GH] = gorunurBoyut();
renderer.setSize(GW, GH);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
kap.appendChild(renderer.domElement);

const sahne = new THREE.Scene();
sahne.background = new THREE.Color(0x1c2a16);
sahne.fog = new THREE.Fog(0x1c2a16, 26, 44);

const kamera = new THREE.PerspectiveCamera(46, GW/GH, 0.1, 120);
function kameraKur(){
  kamera.aspect = GW/GH;
  kamera.position.set(0, 15.5, SAHNE_Z + 9.5);
  kamera.lookAt(0, 0, SAHNE_Z - 12);
  kamera.updateProjectionMatrix();
}
kameraKur();
function yenidenBoyutla(){
  const [w,h] = gorunurBoyut();
  if(w===GW && h===GH) return;
  GW=w; GH=h;
  renderer.setSize(GW, GH);
  if(typeof postBoyutla === 'function') postBoyutla();
  kameraKur();
}
addEventListener('resize', yenidenBoyutla);
addEventListener('orientationchange', ()=>setTimeout(yenidenBoyutla, 250));
if(window.visualViewport) visualViewport.addEventListener('resize', yenidenBoyutla);
/* iOS: adres çubuğu ilk saniyelerde oturur — birkaç kez tekrar ölç */
for(const g of [300, 800, 1600, 3000]) setTimeout(yenidenBoyutla, g);

/* ışık */
const gok = new THREE.HemisphereLight(0xc8dce0, 0x3d4a34, 1.25);   /* V1b2: dolgu güçlü, zemin yansıması açık — gölgeler ezilmesin */
sahne.add(gok);
const gunes = new THREE.DirectionalLight(0xffe0b0, 2.1);              /* V1b: güneş sıcak, ACES için güçlü */
gunes.position.set(-8, 18, 6);
gunes.castShadow = true;
gunes.shadow.mapSize.set(1024,1024);
gunes.shadow.camera.left=-14; gunes.shadow.camera.right=14;
gunes.shadow.camera.top=12; gunes.shadow.camera.bottom=-40;
sahne.add(gunes);
const rim = new THREE.DirectionalLight(0xa8c8ff, 0.8);                /* V1b2: kenar ışığı belirgin */
rim.position.set(4, 9, -14);
sahne.add(rim);

/* ═══ V1a: bölge temaları — zemin + sis + ışık + bitki örtüsü ═══ */
const BOLGE_TEMA = [
  { cim:'#3f6b2a', cimB:[40,90,30], patika:'#a5814e', topB:[120,95,55], kenar:'rgba(30,42,18,.5)',
    sis:0x1a2612, gokU:0xc8dce0, gokA:0x3d4a34, kaya:0x5d6258, agac:0x2f5426, govde:0x5a4430, cali:0x3a6330, cimH:100 },
  { cim:'#5a5348', patika:'#8a6a4a', cimB:[70,62,50], topB:[130,100,65], kenar:'rgba(38,30,22,.5)',
    sis:0x241f18, gokU:0xd6c8b4, gokA:0x453c30, kaya:0x4c4842, agac:0x54432f, govde:0x3e3226, cali:0x5c4c34, cimH:62 },
  { cim:'#8494a2', patika:'#9aa6ae', cimB:[150,165,185], topB:[165,175,185], kenar:'rgba(52,66,84,.5)',
    sis:0x2c3a48, gokU:0xd8e6f2, gokA:0x4a5866, kaya:0x67727f, agac:0x3c5a52, govde:0x4a3f38, cali:0x50707f, cimH:168 },
  { cim:'#4b4438', patika:'#7d6748', cimB:[80,68,58], topB:[115,95,72], kenar:'rgba(30,24,34,.5)',
    sis:0x221a28, gokU:0xc8b8d4, gokA:0x3e3644, kaya:0x564a5e, agac:0x453b52, govde:0x3a3040, cali:0x4e4260, cimH:82 }
];
function zeminDoku(T3){
  const c = document.createElement('canvas'); c.width=512; c.height=1024;
  const x = c.getContext('2d');
  x.fillStyle = T3.cim; x.fillRect(0,0,512,1024);
  for(let i=0;i<2600;i++){                       // çim/zemin benekleri
    const [r,g,b] = T3.cimB;
    x.fillStyle = `rgba(${r+Math.random()*50|0},${g+Math.random()*60|0},${b+Math.random()*40|0},.5)`;
    x.fillRect(Math.random()*512, Math.random()*1024, 3, 5);
  }
  const kenarX = (y)=>{
    const w = 118 + Math.sin(y*0.008)*14;
    const cx = 256 + Math.sin(y*0.004)*10;
    return [cx-w, cx+w, cx, w];
  };
  // patika
  x.save(); x.beginPath();
  for(let y=0;y<=1024;y+=32){ const [a] = kenarX(y); if(y===0) x.moveTo(a,y); else x.lineTo(a,y); }
  for(let y=1024;y>=0;y-=32){ const [,b2] = kenarX(y); x.lineTo(b2,y); }
  x.closePath();
  x.fillStyle = T3.patika; x.fill(); x.clip();
  for(let i=0;i<1800;i++){
    const [r,g,b] = T3.topB;
    x.fillStyle = `rgba(${r+Math.random()*50|0},${g+Math.random()*40|0},${b+Math.random()*25|0},.45)`;
    x.fillRect(Math.random()*512, Math.random()*1024, 4, 4);
  }
  // çakıl döşemesi: her taşın altı gölgeli, üstü açık (referans görsel dili)
  for(let i=0;i<1500;i++){
    const y3 = Math.random()*1024;
    const [a2,b4] = kenarX(y3);
    const px = a2 + 6 + Math.random()*(b4-a2-12);
    const r3 = 0.8 + Math.random()*1.5;
    x.fillStyle = 'rgba(30,22,12,.16)';
    x.beginPath(); x.ellipse(px, y3+0.8, r3*1.1, r3*0.78, 0, 0, 7); x.fill();
    const [tr2,tg2,tb2] = T3.topB;
    const ac = Math.random()*38 - 8;
    x.fillStyle = Math.random()<0.1
      ? `rgba(${126+Math.random()*26|0},${122+Math.random()*22|0},${114+Math.random()*18|0},.6)`
      : `rgba(${tr2+ac+14|0},${tg2+ac+11|0},${tb2+ac+8|0},.55)`;
    x.beginPath(); x.ellipse(px, y3, r3, r3*0.74, Math.random()*3, 0, 7); x.fill();
  }
  // patika üstü taş + yaprak decal'leri
  for(let i=0;i<70;i++){
    const y2 = Math.random()*1024; const [a,b3] = kenarX(y2);
    const px = a + 14 + Math.random()*(b3-a-28);
    x.fillStyle = Math.random()<0.75 ? 'rgba(105,100,92,.55)' : T3.kenar.replace('.5','.22');
    x.beginPath(); x.ellipse(px, y2, 3+Math.random()*5, 2+Math.random()*3, Math.random()*3, 0, 7); x.fill();
  }
  x.restore();
  // ekran dışı ağaçların yumuşak gölge yamaları
  for(let i=0;i<6;i++){
    const gx = Math.random()*512, gy = Math.random()*760;
    const gr = 90 + Math.random()*160;
    const grd = x.createRadialGradient(gx, gy, gr*0.15, gx, gy, gr);
    grd.addColorStop(0, 'rgba(16,24,10,.20)');
    grd.addColorStop(1, 'rgba(16,24,10,0)');
    x.fillStyle = grd;
    x.fillRect(gx-gr, gy-gr, gr*2, gr*2);
  }
  // kenar gölge bandı: patika ile çim buluşması koyu
  x.strokeStyle = T3.kenar; x.lineWidth = 14;
  for(const taraf of [0,1]){
    x.beginPath();
    for(let y=0;y<=1024;y+=16){ const k2 = kenarX(y)[taraf]; if(y===0) x.moveTo(k2,y); else x.lineTo(k2,y); }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/* zemin: alt bölünmüş + kenarlarda ±30 cm yükseklik */
const zemGeo = new THREE.PlaneGeometry(26, 52, 26, 52);
{
  const poz = zemGeo.attributes.position;
  for(let i=0;i<poz.count;i++){
    const vx = poz.getX(i);
    const d = Math.abs(vx) - (YOL_YARIM + 1.4);
    if(d > 0){
      const guc = Math.min(1, d/4);
      poz.setZ(i, (Math.sin(vx*2.7 + poz.getY(i)*0.9) + Math.sin(poz.getY(i)*1.7)) * 0.15 * guc + 0.06*guc);
    }
  }
  zemGeo.computeVertexNormals();
}
const zemin = new THREE.Mesh(zemGeo, new THREE.MeshLambertMaterial({map: zeminDoku(BOLGE_TEMA[0])}));
zemin.rotation.x = -Math.PI/2;
zemin.position.set(0, 0, SAHNE_Z - 18);
zemin.receiveShadow = true;
sahne.add(zemin);

/* çevre grubu: kayalar + ağaç/çalı/kütük + arka plan silüetleri */
let cevreG = null;
function cimDoku(T3){                              /* çapraz düzlem çim öbeği sprite'ı */
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  for(let i=0;i<13;i++){
    const bx = 6 + Math.random()*52;
    const boy = 30 + Math.random()*26;
    x.strokeStyle = `hsl(${T3.cimH + Math.random()*22-8}, 34%, ${22 + Math.random()*14}%)`;
    x.lineWidth = 3 + Math.random()*2.2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(bx, 64);
    x.quadraticCurveTo(bx + (Math.random()*14-7), 64-boy*0.55, bx + (Math.random()*20-10), 64-boy);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function kayaYap(s, mat, seed){                    /* referans görsel: yüzlü kaya + ince kenar hattı */
  const g2 = new THREE.IcosahedronGeometry(s, 1);
  const poz = g2.attributes.position;
  const v = new THREE.Vector3();
  for(let i=0;i<poz.count;i++){
    v.set(poz.getX(i), poz.getY(i), poz.getZ(i));
    const h2 = Math.sin(Math.round(v.x*53)*12.9898 + Math.round(v.y*53)*78.233 +
                        Math.round(v.z*53)*37.719 + seed*97.3) * 43758.5453;
    const k3 = 1 + (h2 - Math.floor(h2) - 0.5) * 0.42;
    poz.setXYZ(i, v.x*k3, v.y*k3*0.82, v.z*k3);
  }
  g2.computeVertexNormals();
  const mesh = new THREE.Mesh(g2, mat);
  const kenar = new THREE.LineSegments(
    new THREE.EdgesGeometry(g2, 10),
    new THREE.LineBasicMaterial({color: 0xc2c8bc, transparent: true, opacity: 0.22}));
  mesh.add(kenar);
  return mesh;
}
function cevreKur(T3){
  if(cevreG){
    cevreG.traverse(o=>{ if(o.isMesh){ o.geometry.dispose(); if(o.material.dispose) o.material.dispose(); } });
    sahne.remove(cevreG);
  }
  cevreG = new THREE.Group();
  const kayaM = new THREE.MeshLambertMaterial({color: T3.kaya, flatShading: true});
  const agacM = new THREE.MeshLambertMaterial({color: T3.agac});
  const govdeM = new THREE.MeshLambertMaterial({color: T3.govde});
  const caliM = new THREE.MeshLambertMaterial({color: T3.cali});
  const R = (i)=> (Math.sin(i*127.1 + D.bolge*311.7)*43758.5453) % 1 * 0.5 + 0.5;
  for(let i=0;i<14;i++){                                     /* kayalar: yüzlü + kenar hatlı */
    const s = 0.9 + R(i)*1.4;
    const k = kayaYap(s, kayaM, i*13 + D.bolge*7);
    const yan = i%2 ? 1 : -1;
    k.position.set(yan*(4.6+R(i+50)*2.2), s*0.34, SAHNE_Z + 2 - i*3.1 - R(i+90)*1.5);
    k.rotation.y = R(i+3)*3.14;
    k.castShadow = true;
    cevreG.add(k);
  }
  const agacN = kaliteAl()==='dusuk' ? 7 : 12;
  for(let i=0;i<agacN;i++){                                  /* ağaçlar: gövde + iki kademe taç */
    const yan = i%2 ? 1 : -1;
    const ax = yan*(YOL_YARIM + 2.6 + R(i+10)*3.2);
    const az = SAHNE_Z + 1 - i*3.4 - R(i+20)*2;
    const olc = 0.85 + R(i+30)*0.5;
    const gv = new THREE.Mesh(new THREE.CylinderGeometry(0.11*olc, 0.17*olc, 1.1*olc, 6), govdeM);
    gv.position.set(ax, 0.55*olc, az); gv.castShadow = true;
    const t1 = new THREE.Mesh(new THREE.ConeGeometry(0.9*olc, 1.5*olc, 7), agacM);
    t1.position.set(ax, 1.6*olc, az); t1.castShadow = true;
    const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.62*olc, 1.1*olc, 7), agacM);
    t2.position.set(ax, 2.35*olc, az);
    cevreG.add(gv, t1, t2);
  }
  for(let i=0;i<10;i++){                                     /* çalılar */
    const yan = i%2 ? 1 : -1;
    const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 + R(i+40)*0.25, 0), caliM);
    b2.position.set(yan*(YOL_YARIM + 1.5 + R(i+60)*1.6), 0.24, SAHNE_Z + 2 - i*4.1 - R(i+70)*2);
    b2.scale.y = 0.7;
    cevreG.add(b2);
  }
  for(let i=0;i<4;i++){                                      /* devrik kütükler */
    const kt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 7), govdeM);
    const yan = i%2 ? 1 : -1;
    kt.position.set(yan*(YOL_YARIM + 1.9 + R(i+80)*1.2), 0.2, SAHNE_Z - 4 - i*8 - R(i+85)*3);
    kt.rotation.z = Math.PI/2; kt.rotation.y = R(i+88)*3;
    kt.castShadow = true;
    cevreG.add(kt);
  }
  {                                                          /* çim öbekleri: çapraz düzlem sprite */
    const cimT = cimDoku(T3);
    const cimM = new THREE.MeshBasicMaterial({map: cimT, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide});
    const cimG = new THREE.PlaneGeometry(0.8, 0.8);
    const cimN = kaliteAl()==='dusuk' ? 18 : 40;
    for(let i=0;i<cimN;i++){
      const yan = i%2 ? 1 : -1;
      const cx2 = yan*(YOL_YARIM + 0.35 + R(i+110)*3.4);
      const cz2 = SAHNE_Z + 3 - i*1.2 - R(i+120)*1.4;
      const ob = new THREE.Group();
      for(const dn of [0, Math.PI/2]){
        const y4 = new THREE.Mesh(cimG, cimM);
        y4.rotation.y = dn + R(i+130)*0.8;
        y4.position.y = 0.38;
        ob.add(y4);
      }
      ob.scale.setScalar(0.7 + R(i+140)*0.7);
      ob.position.set(cx2, 0, cz2);
      cevreG.add(ob);
    }
    const cicekR = [0xfff4e0, 0xffd24a, 0x7aa8ff, 0xff7a5c, 0xc08aff];
    for(let i=0;i<18;i++){                                   /* çiçekler: renk noktaları */
      const yan = i%2 ? 1 : -1;
      const cm = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5),
        new THREE.MeshBasicMaterial({color: cicekR[(i + D.bolge)%cicekR.length]}));
      cm.position.set(yan*(YOL_YARIM + 0.3 + R(i+150)*3.2), 0.12,
                      SAHNE_Z + 2.5 - R(i+160)*34);
      cevreG.add(cm);
    }
    for(let i=0;i<6;i++){                                    /* mantarlar */
      const yan = i%2 ? 1 : -1;
      const sap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.08, 6),
        new THREE.MeshLambertMaterial({color: 0xe8dcc4}));
      const sapka = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.06, 8),
        new THREE.MeshLambertMaterial({color: i%3 ? 0xa8543a : 0xc4b090}));
      const mx = yan*(YOL_YARIM + 0.5 + R(i+170)*2.6);
      const mz = SAHNE_Z + 1 - R(i+180)*30;
      sap.position.set(mx, 0.04, mz);
      sapka.position.set(mx, 0.1, mz);
      cevreG.add(sap, sapka);
    }
  }
  for(let i=0;i<9;i++){                                      /* arka plan silüetleri: sisin içinde */
    const buyuk = i%3===0;
    const m2 = buyuk
      ? kayaYap(3.2 + R(i+95)*2.4, kayaM, i*5 + D.bolge*3)
      : new THREE.Mesh(new THREE.ConeGeometry(1.9 + R(i+96)*1.3, 5 + R(i+97)*3.5, 7), agacM);
    m2.position.set((R(i+98)*2-1)*13, buyuk ? 1.2 : 2.6, SAHNE_Z - 40 - R(i+99)*5);
    cevreG.add(m2);
  }
  sahne.add(cevreG);
}
let sonTema = -1;
let kaliteIlk = false;
function temaUygula(){
  if(!kaliteIlk){ kaliteIlk = true; kaliteUygula(); }
  const T3 = BOLGE_TEMA[(D.bolge-1) % 4];
  sahne.fog = new THREE.Fog(T3.sis, 18, 50);
  gok.color.set(T3.gokU); gok.groundColor.set(T3.gokA);
  const eskiMap = zemin.material.map;
  zemin.material.map = zeminDoku(T3);
  zemin.material.needsUpdate = true;
  if(eskiMap) eskiMap.dispose();
  cevreKur(T3);
}
function temaSur(){
  const i = (D.bolge-1) % 4;
  if(i !== sonTema){ sonTema = i; temaUygula(); }
}

/* ═══════════ VARLIK YÜKLEME ═══════════ */
/* Modeller ../../public/assets/party/models/ altinda .gltf olarak durur (kendi kendine yeterli). */
const VARLIK = ['okcu','ok','goblin','kecoon','crab','monsterx','spike','mutant','rhino','brute','mage','priest'];
const loader = new GLTFLoader();
const yukCubuk = document.getElementById('yukCubuk');
const yukYazi = document.getElementById('yukYazi');

/* Modeller data-URI'li glTF JSON olarak gömülü: dokular ve tampon
   blob adresi kullanılmadan yükleniyor (kısıtlı önizleme ortamları
   blob'u engelleyebiliyor, data: her yerde çalışır). */
function glbYukle(anahtar){
  return new Promise((cz, rd)=>{
    loader.load('../../public/assets/party/models/' + anahtar + '.gltf', g=>cz(g), undefined, e=>rd(e));
  });
}

const MODEL = {};   // anahtar -> {sahneKok, animasyonlar}
async function hepsiniYukle(){
  const liste = VARLIK;
  for(let i=0;i<liste.length;i++){
    const g = await glbYukle(liste[i]);
    g.scene.traverse(o=>{ if(o.isMesh){ o.castShadow = true; } });
    MODEL[liste[i]] = g;
    /* V1b materyal ayrımı: silahlar parlak, gövde atlasları forma izin verecek matlıkta */
    g.scene.traverse(o=>{
      if(!o.isMesh || !o.material) return;
      const mm = Array.isArray(o.material) ? o.material : [o.material];
      for(const M of mm){
        const ad = (M.name||'').toLowerCase();
        if(ad==='asa' || ad==='topuz'){ M.metalness = 0.2; M.roughness = 0.42; }
        else if(M.roughness != null) M.roughness = Math.min(M.roughness, 0.72);
      }
    });
    yukCubuk.style.width = ((i+1)/liste.length*100)+'%';
    yukYazi.textContent = `Varlıklar yükleniyor… ${i+1}/${liste.length}`;
  }
}

/* SkeletonUtils yerine hafif klon: her mob kendi GLB'sinden bir kez
   yükleniyor gibi davranmak pahalı; skinned mesh klonu gerekli.      */
import { clone as iskeletKlon } from 'three/addons/utils/SkeletonUtils.js';

/* ═══════════ CAN BARI (sprite) ═══════════ */
function canBariYap(){
  const c = document.createElement('canvas'); c.width=64; c.height=10;
  const t = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:t, depthTest:false}));
  sp.scale.set(1.15, 0.18, 1);
  sp.renderOrder = 10;
  return {sp, c, t};
}
/* ═══ KAHRAMAN BAŞ ÜSTÜ BARI ═══
   Can ve ulti kartlardan buraya taşındı (kullanıcı kararı): alt kartlar
   dört kahraman × iki bar × iki sayı ile okunmaz olmuştu. Bilgi artık
   ait olduğu yerde — karakterin üstünde.
   Mob barından ayrı bir çizici, çünkü İKİ katmanlı (can + ulti) ve ulti
   dolunca parlıyor; ölüyken üst şerit diriliş sayacına dönüşüyor. */
const KB_W = 72, KB_H = 20;
function kahramanBariYap(){
  const c = document.createElement('canvas'); c.width=KB_W; c.height=KB_H;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;      /* yoksa kirmizi soluk pembeye kayiyor */
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:t, depthTest:false}));
  sp.renderOrder = 11;
  return {sp, c, t, sonCan:-1, sonUst:-1, sonOlu:null};
}

function kahramanBariCiz(b, canOran, ustOran, olu){
  const x = b.c.getContext('2d');
  x.clearRect(0,0,KB_W,KB_H);
  x.fillStyle = 'rgba(8,10,6,.86)'; x.fillRect(0,0,KB_W,KB_H);
  x.strokeStyle = olu ? 'rgba(200,70,50,.75)' : 'rgba(201,162,77,.55)';
  x.lineWidth = 1; x.strokeRect(0.5,0.5,KB_W-1,KB_H-1);
  /* can — kart diliyle aynı: kırmızı */
  if(!olu){
    x.fillStyle = canOran>0.5 ? '#e0503a' : (canOran>0.25 ? '#d9853e' : '#c9452e');
    x.fillRect(2,2, Math.max(0,(KB_W-4)*canOran), 8);
  }
  /* alt şerit: canlıyken ulti şarjı, ölüyken diriliş ilerlemesi */
  x.fillStyle = olu ? '#7fa8d8' : (ustOran>=1 ? '#ffe98f' : '#c79a30');
  x.fillRect(2, 12, Math.max(0,(KB_W-4)*ustOran), 6);
  b.t.needsUpdate = true;
}

/* Barı kahramanın köküne asar. kok ÖLÇEKLİ olduğu için hem konum hem
   sprite ölçeği bölünür: bar her kahramanda ekranda aynı boyda çıkar. */
function kahramanBariEkle(kh){
  if(!kh || !kh.kok || kh.bar) return;
  const s = kh.kok.scale.x || 1;
  const b = kahramanBariYap();
  b.sp.scale.set(0.86/s, 0.239/s, 1);   /* kume halinde durduklari icin dar */
  b.sp.position.y = 2.12/s;
  kh.kok.add(b.sp);
  kh.bar = b;
  kahramanBariCiz(b, 1, 0, false);
}

function kahramanBarlariKur(){
  [okcu, brute, mage, priest].forEach(kahramanBariEkle);
}

/* Değer değişmediyse canvas'a dokunma — her karede yeniden çizmek pahalı.
   Bar 68px geniş, o yüzden 1/68'lik adımlara yuvarlanır. */
function kahramanBarlariGuncelle(){
  const kaynak = {
    okcu:   [okcu,   D.okcuCan,   kMax('okcu')],
    brute:  [brute,  D.bruteCan,  bruteMax()],
    mage:   [mage,   D.mageCan,   kMax('mage')],
    priest: [priest, D.priestCan, kMax('priest')],
  };
  for(const kim of KIMLER){
    const [kh, can, azami] = kaynak[kim];
    if(!kh || !kh.bar) continue;
    const olu = !!kh.olu;
    const c = olu ? 0 : Math.round(Math.max(0, Math.min(1, can/azami))*68)/68;
    const u = Math.round(Math.max(0, Math.min(1,
      olu ? 1 - kh.dirilme/DIRILME_SN : (D.ulti[kim]||0)))*68)/68;
    if(kh.bar.sonCan===c && kh.bar.sonUst===u && kh.bar.sonOlu===olu) continue;
    kh.bar.sonCan=c; kh.bar.sonUst=u; kh.bar.sonOlu=olu;
    kahramanBariCiz(kh.bar, c, u, olu);
  }
}

function canBariCiz(b, oran){
  const x = b.c.getContext('2d');
  x.clearRect(0,0,64,10);
  x.fillStyle='rgba(10,12,8,.85)'; x.fillRect(0,0,64,10);
  x.fillStyle = oran>0.5 ? '#6ecb4e' : (oran>0.25 ? '#d9b23e' : '#c9452e');
  x.fillRect(1,1, Math.max(0,62*oran), 8);
  b.t.needsUpdate = true;
}

/* ═══════════ DURUM ═══════════ */
const D = {
  moblar: [], oklar: [], buyular: [], efektler: [],
  okcuCan: OKCU_CAN, bruteCan: BRUTE_CAN,
  kesim: 0, sure: 0, sonSavas: -9,
  dogumSayac: 1.2, atisSayac: 0.6, bitti: false, sonDirenis: 0,
  bolge: 1, bolum: 1, bolumKesim: 0, bossAktif: false, sarsinti: 0,
  scd: {okcu:[0,0,0,0,0,0], brute:[0,0,0,0,0,0], mage:[0,0,0,0,0,0], priest:[0,0,0,0,0,0]},
  gel: {okcu:0, brute:0, mage:0, priest:0},
  ulti: {okcu:0, brute:0, mage:0, priest:0},
  kutsama: 0, ilahi: 0, gecikme: [], alevler: [],
  seviye: 1, sevKesim: 0, puan: 0,
  skill: {okcu:0, brute:0, mage:0, priest:0},     // 0=yok 1=ilk 2=ikinci
  cd: {okcu:0, brute:0, mage:0, priest:0},
  cd2: {okcu:0, brute:0, mage:0, priest:0},
  nara: 0, cdN: 0,
  cd3: {okcu:0, mage:0, priest:0},
  kalkan: null, yagmur: null,
  /* Kahraman başına SON ALINAN HASAR izi (üstel sönümlü). Kalkan hedefi
     bununla seçilir — "saldırı altında olan" kahramanı gösterir. */
  hasarIz: {okcu:0, brute:0, mage:0, priest:0}
};
const NARA = {klip:'10_TAUNT_BATTLECRY', cd:35, sure:10, taban:0.15, sevBasi:0.03};
function skillTavan(kim){ return 9; }
function naraKat(){ return D.nara>0 ? 1 + NARA.taban + NARA.sevBasi*D.seviye : 1; }
/* ═══ SİLAH 2 (grade 1) — drop + kalıcı envanter ═══ */
const SILAH2 = {
  okcu:  {ad:'Sadak',        em:'🪶', anaAd:'Atış Hızı', ana:[4,7,11,15,20,26,34]},
  brute: {ad:'Kalkan',       em:'🛡️', anaAd:'Blok Şansı', ana:[12,18,26,35,43,52,62]},
  mage:  {ad:'Küre',         em:'🔮', anaAd:'Cast Hızı',  ana:[5,8,12,17,23,30,39]},
  priest:{ad:'Kutsal Kitap', em:'📖', anaAd:'Heal Gücü',  ana:[8,13,19,26,35,46,60]}
};
/* ═══ İKİ DİL: tüm metinler DIL sözlüğünden ═══ */
const DIL = {
 tr:{seviye:'Seviye', kesim:'Kesim', yenildin:'Yenildin', tekrar:'Tekrar Dene', sure:'Süre', sn:'sn',
     sekmeler:['Ekipman','Depo','Skiller','Nitelikler','Yükseltme','Başarımlar','Ocak'], yakinda:'Yakında…',
     kagit:'Kağıt',
     slotE:{slot:'Kayıt', yeni:'— Yeni Oyun —', test:'Her şey ×10: exp, altın, drop, kağıt'},
     nit:{guc:'Güç', hasar:'Hasar', can:'Max Can', krit:'Kritik', blok:'Blok', cd:'Skill CD',
          skill:'Skill Gücü', atak:'Saldırı Hızı'},
     genelAd:{dukkan:'Şans Ocağı', takimdepo:'Takım Deposu', klan:'Klan', arena:'Arena',
              zindan:'Zindanlar', nitelikler:'Nitelikler', basarimlar:'Başarımlar', ayarlar:'Ayarlar', bolumsec:'Bölüm Seç', uniqav:'Unique Avı'},
     bsec:{bolge:'Bölge', git:'GİT', not:'Rozete dokunarak buraya gelirsin — geri dönüp farm yapabilirsin.'},
     bolgeAd:['Yeşilorman','Kül Geçidi','Buzul Vadisi','Kadim Harabeler'],
     bossAd:'Bölge Muhafızı',
     uq:{pity:'Acıma', odak:'Düşürdüğü slotlar', dustu:'✦ UNIQUE DÜŞTÜ! ✦',
         kacti:'Süre doldu — boss kaçtı', oldun:'Takım düştü — kazanç yok',
         teselli:'Unique düşmedi — Efsanevi teselli + kısmi iade',
         zor:['Normal','Kahraman','Efsane','Kabus'],
         boss:['Kanlı Diş Garguk','Buz Yürek Morvan','Kül Gözlü Vessa','Taş Çene Brok','Gece Pençesi Nyra',
               'Alev Dilli Skorn','Zehir Soluk Vex','Demir Kabuk Thurgan','Fırtına Boynuz Ragmar','Karanlık Efendi Malzor']},
     yakinda:'Yakında...',
     tDepo:{not:'Kağıt havuzu ortaktır — 4 alt kağıt 1 üst kağıda katlanır.'},
     ayar:{dil:'Dil', mod:'Mod', kayit:'Kayıt ekranına dön', otoSat:'Beyaz dropları otomatik sat', ses:'Ses efektleri', kalite:'Grafik kalitesi'},
     kaliteAd:{dusuk:'Düşük', orta:'Orta', yuksek:'Yüksek'},
     bsrAl:'AL',
     arn:{ad:'Oyuncu adın', kodum:'KODUM (paylaş)', kopyala:'KOPYALA', plan:'Savaş Planı',
          hedef:'⚔ Saldırı önceliği', kosul:'↪ Tank düşünce yeni hedef', durus:'🛡 Warrior duruşu (can %40 altında Kale)',
          sifa:'✚ Şifa önceliği (acil: %35 altına koşar)', ulti:'⚡ Ulti zamanlaması', diz:'📐 Dizilim',
          o:{sifaci:'Şifacı', buyucu:'Büyücü', okcu:'Okçu', tank:'Tank', zayif:'En zayıf',
             saldirgan:'Saldırgan', dengeli:'Dengeli', kale:'Kale', yarali:'En yaralı', hasarci:'Hasarcılar',
             acilis:'Açılışta', yari:'Rakip %50', zor:'Takım zorda', standart:'Standart', kaplumbaga:'Kaplumbağa', baskin:'Baskın'},
          rakip:'Rakip kodu', savas:'SAVAŞ', gecersiz:'Geçersiz kod!', gecmis:'Geçmiş',
          kazandin:'🏆 KAZANDIN!', kaybettin:'💀 KAYBETTİN'},
     zin:{sonraki:'Sonraki anahtar', gir:'GİR', son:'Son koşu', yarim:'yarıda bitti', surer:'Zindan sürüyor...',
          altinAd:'Altın Zindanı', altinNot:'3 dk · altın ×6 · bitişte +%50 bonus · item düşmez',
          kagitAd:'Kağıt Zindanı', kagitNot:'3 dk · kağıt şansı %60 · boss +3 · item düşmez',
          bossAd:'Boss Geçidi', bossNot:'5 boss art arda · her boss garantili item · sandık: Efsanevi 📜 (%25 Mitik 📜)'},
     bsrAd:{kesim:'Kesim Ustası', boss:'Boss Avcısı', bolge:'Kaşif', seviye:'Kıdemli',
            basma:'Demirci', zirve:'Zirve', ocak:'Ocakçı', kolek:'Koleksiyoncu',
            degirmen:'Değirmen', kosu:'Azimli', kademe:'Gelişim', hazine:'Hazine'},
  encAd: ['Tanışma','Sürü Baskını','Zırhlı Hat','Ağır Baskı','Muhafız Eskortu'],
  durusAd: {normal:'Dengeli Duruş', saldirgan:'Saldırgan Duruş', savunmaci:'Savunmacı Duruş'},
  bossTur: {goblin:'Sürü Kralı', kecoon:'Gölge Sıçrayan', crab:'Kadim Kabuk', monsterx:'Kararsız Dev',
            spike:'Diken Ana', mutant:'Kadim Öfke', rhino:'Demir Boynuz'},
     oto:{dur:'OTO durdu — düşme!', esit:'⚖ Eşit', odak:'🎯 Odak'},
     skillAd:{okcu:['Delici Ok','Şarjlı Atış','Ok Yağmuru','Çoklu Atış','Zehirli Ok','Sakatlayan Ok','Keskin Nişancı','Geri Takla','Yaylım'],
              brute:['Sıçrama','Savurma Tekmesi','Savaş Narası','Yatay Biçme','Yıkıcı Darbe','Kasırga','Kombo Zinciri','Kalkan Duvarı','Yere Vuruş'],
              mage:['Alan Büyüsü','Zincir Yıldırım','Donma','Ateş Topu','Yıldırım Çarpması','Meteor Kanalı','Alev Duvarı','Buz Sağanağı','Mana Novası'],
              priest:['Grup Heal','Diriliş','Kutsal Kalkan','Kutsal Ateş','Arınma','Şifa Kanalı','Kutsama','Işık Patlaması','Ceza']},
     ultiAd:{okcu:'Ok Kasırgası', brute:'Deprem', mage:'Kıyamet Meteoru', priest:'İlahi Müdahale'},
     skl:{kademe:'Geliştirme', kilit:'puanla açılır', ulti:'ULTİ — vuruşlarla dolar, 1. seviyeden açık'},
     depoT:{alti:'altı', sat:'TOPLU SAT', kagit:'TOPLU KAĞIT', yok:'Eşiğin altında uygun item yok',
            korunan:'Kuşanılandan iyi olanlar (▲) toplu işlemde korunur'},
     depo:{baslik:'Depo', dolu:'DOLU — yeni droplar kağıda dönüşür',
           bos:'Depo boş — yeni droplar burada birikecek', geri:'← Geri', giy:'GİY', sat:'SAT',
           kagitYap:'KAĞIDA ÇEVİR', birlestir:'BİRLEŞTİR 4→1', gecer:'olunca kuşanılanı geçer'},
     bosNot:'Boş — düşmanlardan düşecek', taban:'TABAN', malzeme:'Malzeme',
     nadirlik:['NORMAL','İYİ','NADİR','EFSANEVİ','MİTİK','KADİM','UNIQUE'],
     kahraman:{okcu:'Okçu', brute:'Warrior', mage:'Büyücü', priest:'Priest'},
     slot:{zirh:'Zırh', pelerin:'Pelerin', kolye:'Kolye', yuzuk:'Yüzük', kupe:'Küpe'}, silah2ek:'(Silah 2)',
     tabanItem:{okcu:{ad:'Acemi Yayı', tur:'Fiziksel Hasar', satir:'Atış aralığı 1,05 sn · Menzil 20,4 m', soz:'Köy yapımı; cılız ama seni hiç yarı yolda bırakmadı.'},
                brute:{ad:'Acemi Baltası', tur:'Fiziksel Hasar', satir:'Yakın dövüş · Erişim 1,85 m', soz:'Ağzı körelmiş; sahibinin öfkesi keskin.'},
                mage:{ad:'Acemi Asası', tur:'Büyü Hasarı', satir:'Mermi hızı 20 m/sn · Menzil 18,7 m', soz:'Çarpık bir dal; içinden ne geçtiğini kimse bilmiyor.'},
                priest:{ad:'Acemi Topuzu', tur:'Kutsal Hasar', satir:'Menzil 18,7 m · Şifa büyülerini taşır', soz:'Başındaki taş, üç neslin duasını dinledi.'}},
     silah2:{okcu:{ad:'Sadak', anaAd:'Atış Hızı'}, brute:{ad:'Kalkan', anaAd:'Blok Şansı'},
             mage:{ad:'Küre', anaAd:'Cast Hızı'}, priest:{ad:'Kutsal Kitap', anaAd:'Heal Gücü'}},
     satir2:'Hasar', satir3:{okcu:'Menzil', brute:'Max Can', mage:'Skill Bekleme', priest:'Skill Bekleme'},
     ozel:{okcu:['Çift Ok','%10 şansla ok ikizlenir'], brute:['Diken','Bloklanan hasarın %25’i saldırgana döner'],
           mage:['Yankı','%12 şansla skill bedavaya tekrarlanır'], priest:['Taşkın','Taşan şifa kalkana dönüşür']},
     silah1:{okcu:'Avcı Yayı', brute:'Savaş Baltası', mage:'Meşe Asası', priest:'Taş Topuz'},
     zirhAd:{okcu:'Deri Zırh', brute:'Zincir Zırh', mage:'Keten Cübbe', priest:'Kutsal Cübbe'},
     pelerinAd:{okcu:'Gezgin Pelerini', brute:'Kürk Pelerin', mage:'Rüzgâr Pelerini', priest:'Beyaz Pelerin'},
     pSatir1:'Hasar Azaltma', pSatir2:'Hareket Hızı', pSatir3:'Sarsılmazlık (tepki −%40)',
     kolyeAd:{okcu:'Kurt Dişi', brute:'Kemik Kolye', mage:'Lapis Kolye', priest:'Dua Boncuğu'},
     kSatir1:'Skill Gücü', kSatir2:'Şifa Alımı', kSatir3:'Kontrol Süreleri',
     ozelK:{okcu:['Ok Fırtınası','Ok Yağmuru +3 ok'], brute:['Deprem','Sıçrama inişi 0,8 sn sersemletir'],
            mage:['Uzun Zincir','Zincir Yıldırım +2 sıçrama'], priest:['Tam Diriliş','Diriliş tam canla kaldırır']},
     yuzukAd:{okcu:'Bakır Yüzük', brute:'Demir Mühür', mage:'Gümüş Halka', priest:'Akik Yüzük'},
     ySatir1:'Skill Bekleme', ySatir2:'Saldırı Hızı', ySatir3:'Savaş Açlığı (kesim başına CD −0,2 sn)',
     ozelY:{okcu:['İmza: Delici','Delici Ok beklemesi yarıya iner'], brute:['İmza: Sıçrama','Sıçrama beklemesi yarıya iner'],
            mage:['İmza: Zincir','Zincir Yıldırım beklemesi yarıya iner'], priest:['İmza: Grup Heal','Grup Heal beklemesi yarıya iner']},
     kupeAd:{okcu:'Çakmaktaşı Küpe', brute:'Bronz Halka', mage:'Kristal Küpe', priest:'İnci Küpe'},
     eSatir1:'Kritik Şansı', eSatir2:'Kritik Hasarı ×1,8', eSatir3:'Skill’ler kritik vurabilir',
     ozelE:{okcu:['Kanatma','Kritik 2 sn kanatır (sn başına %10)'], brute:['Ezici','Kritik 0,5 sn sersemletir'],
            mage:['Patlayan Güç','Kritik çevreye %30 sıçrar'], priest:['Kutsal Yankı','Kritik kadar şifa en yaralıya akar']},
     ozelP:{okcu:['Gölge Adım','Kaçarken +%30 hasar azaltma'], brute:['Yıkılmaz','Can %30 altında azaltma iki katına çıkar'],
            mage:['İntikam','Her vuruşta skill CD’leri 0,8 sn kısalır'], priest:['Koruyucu Örtü','Priest ayaktayken tüm takım +%3 azaltma']},
     zSatir1:'Max Can', zSatir2:'Can Yenileme', zSatir3:'Diriliş Süresi',
     ozelZ:{okcu:['Kaçınma','%12 şansla vuruş tamamen ıskalar'], brute:['Son Direniş','Ölümcül darbe 1 canla atlatılır (60 sn)'],
            mage:['Buz Zırhı','Vuran mob 1,5 sn %50 yavaşlar'], priest:['Adanmışlık','Yenen hasarın %20’si en yaralıya şifa olur']},
     satir3s1:{okcu:'Skill Hasarı', brute:'Skill Hasarı', mage:'Skill Hasarı', priest:'Skill Gücü'},
     ozel1:{okcu:['Sekme','Ok %15 şansla ikinci hedefe sıçrar (%60)'], brute:['Parçala','Vuruş yandaki moba %50 geçer'],
            mage:['Tutuşturma','Hedef 3 sn yanar (sn başına %15)'], priest:['Yargı','%15 şansla çift hasar + sersemletme']},
     acilir:['','İyi’de açılır','Nadir’de açılır','Efsanevi’de açılır'],
     bolum:'Bölüm',
     ocak:{baslik:'Şans Ocağı', alt:'Drop nadirlik olasılıkları', yukselt:'YÜKSELT', maks:'MAKS',
           seviye:'Seviye', simdiki:'Şimdi', sonraki:'Sonraki', bossNot:'Boss kesiminde tüm oranlar ×3'},
     ors:{baslik:'Yükseltme Örsü', bas:'BAS', max:'MAX (+10)', kagitKisa:'kağıt', kBir:'Kağıt birleştir 4→1:',
          basari:'Başarılı!', kirik:'Başarısız — seviye düştü', kaldi:'Başarısız — seviye korundu',
          yok:'O renkte kağıt yetmiyor'}},
 en:{seviye:'Level', kesim:'Kills', yenildin:'Defeated', tekrar:'Try Again', sure:'Time', sn:'s',
     sekmeler:['Gear','Storage','Skills','Attributes','Upgrade','Achievements','Forge'], yakinda:'Coming soon…',
     kagit:'Papers',
     slotE:{slot:'Save', yeni:'— New Game —', test:'Everything ×10: exp, gold, drops, papers'},
     nit:{guc:'Power', hasar:'Damage', can:'Max HP', krit:'Critical', blok:'Block', cd:'Skill CD',
          skill:'Skill Power', atak:'Attack Speed'},
     genelAd:{dukkan:'Lucky Forge', takimdepo:'Team Storage', klan:'Clan', arena:'Arena',
              zindan:'Dungeons', nitelikler:'Attributes', basarimlar:'Achievements', ayarlar:'Settings', bolumsec:'Stage Select', uniqav:'Unique Hunt'},
     bsec:{bolge:'Region', git:'GO', not:'Tap the badge to open this — go back and farm earlier regions.'},
     bolgeAd:['Greenwood','Ash Pass','Frozen Vale','Ancient Ruins'],
     bossAd:'Region Guardian',
     uq:{pity:'Pity', odak:'Drops for slots', dustu:'✦ UNIQUE DROPPED! ✦',
         kacti:'Time up — the boss escaped', oldun:'Team fell — no reward',
         teselli:'No unique — Legendary consolation + partial refund',
         zor:['Normal','Heroic','Legend','Nightmare'],
         boss:['Bloodfang Garguk','Iceheart Morvan','Ashgaze Vessa','Stonejaw Brok','Nightclaw Nyra',
               'Flametongue Skorn','Venombreath Vex','Ironhide Thurgan','Stormhorn Ragmar','Dark Lord Malzor']},
     yakinda:'Coming soon...',
     tDepo:{not:'The paper pool is shared — 4 lower papers fold into 1 higher.'},
     ayar:{dil:'Language', mod:'Mode', kayit:'Back to save screen', otoSat:'Auto-sell common drops', ses:'Sound effects', kalite:'Graphics quality'},
     kaliteAd:{dusuk:'Low', orta:'Medium', yuksek:'High'},
     bsrAl:'CLAIM',
     arn:{ad:'Your name', kodum:'MY CODE (share)', kopyala:'COPY', plan:'Battle Plan',
          hedef:'⚔ Attack priority', kosul:'↪ New target when tank falls', durus:'🛡 Warrior stance (Fortress under 40%)',
          sifa:'✚ Heal priority (emergency: rushes under 35%)', ulti:'⚡ Ultimate timing', diz:'📐 Formation',
          o:{sifaci:'Healer', buyucu:'Mage', okcu:'Archer', tank:'Tank', zayif:'Weakest',
             saldirgan:'Aggressive', dengeli:'Balanced', kale:'Fortress', yarali:'Most hurt', hasarci:'Damage dealers',
             acilis:'Opening', yari:'Enemy 50%', zor:'Team in danger', standart:'Standard', kaplumbaga:'Turtle', baskin:'Rush'},
          rakip:'Opponent code', savas:'FIGHT', gecersiz:'Invalid code!', gecmis:'History',
          kazandin:'🏆 VICTORY!', kaybettin:'💀 DEFEAT'},
     zin:{sonraki:'Next key', gir:'ENTER', son:'Last run', yarim:'ended early', surer:'Dungeon in progress...',
          altinAd:'Gold Dungeon', altinNot:'3 min · gold ×6 · +50% bonus at the end · no item drops',
          kagitAd:'Paper Dungeon', kagitNot:'3 min · paper chance 60% · boss +3 · no item drops',
          bossAd:'Boss Gauntlet', bossNot:'5 bosses in a row · guaranteed item each · chest: Legendary 📜 (25% Mythic 📜)'},
     bsrAd:{kesim:'Slayer', boss:'Boss Hunter', bolge:'Explorer', seviye:'Veteran',
            basma:'Blacksmith', zirve:'Pinnacle', ocak:'Forge Keeper', kolek:'Collector',
            degirmen:'The Mill', kosu:'Relentless', kademe:'Growth', hazine:'Treasury'},
  encAd: ['First Contact','Swarm Raid','Armored Line','Heavy Pressure','Guard Escort'],
  durusAd: {normal:'Balanced Stance', saldirgan:'Aggressive Stance', savunmaci:'Defensive Stance'},
  bossTur: {goblin:'Swarm King', kecoon:'Shadow Pouncer', crab:'Ancient Shell', monsterx:'Unstable Colossus',
            spike:'Thorn Mother', mutant:'Elder Wrath', rhino:'Iron Horn'},
     oto:{dur:'AUTO stopped — downgrade!', esit:'⚖ Even', odak:'🎯 Focus'},
     skillAd:{okcu:['Piercing Arrow','Charged Shot','Arrow Rain','Multishot','Venom Arrow','Crippling Shot','Deadeye','Disengage','Volley'],
              brute:['Leap','Sweeping Kick','Battle Cry','Cleave Swing','Crushing Blow','Whirlwind','Combo Chain','Shield Wall','Ground Thump'],
              mage:['Area Blast','Chain Lightning','Freeze','Fireball','Thunderbolt','Meteor Channel','Flame Wall','Ice Barrage','Arcane Nova'],
              priest:['Group Heal','Revival','Holy Shield','Holy Fire','Cleanse','Healing Channel','Blessing','Radiance','Retribution']},
     ultiAd:{okcu:'Arrow Tempest', brute:'Earthshatter', mage:'Doomfall', priest:'Divine Intervention'},
     skl:{kademe:'Enhancement', kilit:'unlocks with a point', ulti:'ULT — charges with hits, open from level 1'},
     depoT:{alti:'and below', sat:'SELL ALL', kagit:'PAPER ALL', yok:'No eligible items below threshold',
            korunan:'Items better than equipped (▲) are protected'},
     depo:{baslik:'Storage', dolu:'FULL — new drops turn into paper',
           bos:'Storage is empty — new drops pile up here', geri:'← Back', giy:'EQUIP', sat:'SELL',
           kagitYap:'TO PAPER', birlestir:'MERGE 4→1', gecer:'and above beats equipped'},
     bosNot:'Empty — drops from enemies', taban:'BASE', malzeme:'Material',
     nadirlik:['COMMON','UNCOMMON','RARE','LEGENDARY','MYTHIC','ANCIENT','UNIQUE'],
     kahraman:{okcu:'Archer', brute:'Warrior', mage:'Mage', priest:'Priest'},
     slot:{zirh:'Armor', pelerin:'Cloak', kolye:'Necklace', yuzuk:'Ring', kupe:'Earring'}, silah2ek:'(Weapon 2)',
     tabanItem:{okcu:{ad:'Novice Bow', tur:'Physical Damage', satir:'Attack interval 1.05 s · Range 20.4 m', soz:'Village-made; frail, but it never let you down.'},
                brute:{ad:'Novice Axe', tur:'Physical Damage', satir:'Melee · Reach 1.85 m', soz:'The edge is dull; its owner’s fury is sharp.'},
                mage:{ad:'Novice Staff', tur:'Magic Damage', satir:'Projectile 20 m/s · Range 18.7 m', soz:'A crooked branch; no one knows what flows through it.'},
                priest:{ad:'Novice Mace', tur:'Holy Damage', satir:'Range 18.7 m · Carries healing prayers', soz:'The stone atop it has heard three generations of prayers.'}},
     silah2:{okcu:{ad:'Quiver', anaAd:'Attack Speed'}, brute:{ad:'Shield', anaAd:'Block Chance'},
             mage:{ad:'Orb', anaAd:'Cast Speed'}, priest:{ad:'Holy Tome', anaAd:'Heal Power'}},
     satir2:'Damage', satir3:{okcu:'Range', brute:'Max HP', mage:'Skill Cooldown', priest:'Skill Cooldown'},
     ozel:{okcu:['Twin Shot','10% chance to fire a second arrow'], brute:['Thorns','25% of blocked damage is returned'],
           mage:['Echo','12% chance to recast for free'], priest:['Overflow','Excess healing becomes a shield']},
     silah1:{okcu:'Hunter Bow', brute:'War Axe', mage:'Oak Staff', priest:'Stone Mace'},
     zirhAd:{okcu:'Leather Armor', brute:'Chainmail', mage:'Linen Robe', priest:'Holy Robe'},
     pelerinAd:{okcu:'Traveler Cloak', brute:'Fur Cloak', mage:'Wind Cloak', priest:'White Cloak'},
     pSatir1:'Damage Reduction', pSatir2:'Move Speed', pSatir3:'Steadfast (flinch −40%)',
     kolyeAd:{okcu:'Wolf Fang', brute:'Bone Charm', mage:'Lapis Amulet', priest:'Prayer Beads'},
     kSatir1:'Skill Power', kSatir2:'Healing Received', kSatir3:'Control Duration',
     ozelK:{okcu:['Arrow Storm','Arrow Rain +3 arrows'], brute:['Quake','Leap slam stuns for 0.8 s'],
            mage:['Long Chain','Chain Lightning +2 jumps'], priest:['True Revival','Revival restores full HP']},
     yuzukAd:{okcu:'Copper Ring', brute:'Iron Signet', mage:'Silver Band', priest:'Agate Ring'},
     ySatir1:'Skill Cooldown', ySatir2:'Attack Speed', ySatir3:'Battle Hunger (−0.2 s CD per kill)',
     ozelY:{okcu:['Signature: Pierce','Piercing Arrow cooldown halved'], brute:['Signature: Leap','Leap cooldown halved'],
            mage:['Signature: Chain','Chain Lightning cooldown halved'], priest:['Signature: Group Heal','Group Heal cooldown halved']},
     kupeAd:{okcu:'Flint Earring', brute:'Bronze Hoop', mage:'Crystal Earring', priest:'Pearl Earring'},
     eSatir1:'Critical Chance', eSatir2:'Critical Damage ×1.8', eSatir3:'Skills can crit',
     ozelE:{okcu:['Rend','Crits bleed for 2 s (10% per second)'], brute:['Crusher','Crits stun for 0.5 s'],
            mage:['Bursting Power','Crits splash 30% nearby'], priest:['Holy Echo','Crit amount heals the most wounded ally']},
     ozelP:{okcu:['Shadow Step','+30% reduction while retreating'], brute:['Unyielding','Reduction doubles below 30% HP'],
            mage:['Vengeance','Each hit taken shortens skill CDs by 0.8 s'], priest:['Guardian Veil','While the Priest stands, the whole team gains +3% reduction']},
     zSatir1:'Max HP', zSatir2:'HP Regen', zSatir3:'Revive Time',
     ozelZ:{okcu:['Evasion','12% chance to fully dodge a hit'], brute:['Last Stand','Survive a killing blow at 1 HP (60 s)'],
            mage:['Frost Armor','Attacker is slowed 50% for 1.5 s'], priest:['Devotion','20% of damage taken heals the most wounded ally']},
     satir3s1:{okcu:'Skill Damage', brute:'Skill Damage', mage:'Skill Damage', priest:'Skill Power'},
     ozel1:{okcu:['Ricochet','15% chance to bounce to a second target (60%)'], brute:['Cleave','Hits carry 50% to a nearby foe'],
            mage:['Ignite','Target burns for 3 s (15% per second)'], priest:['Smite','15% chance to deal double damage + stun']},
     acilir:['','Unlocks at Uncommon','Unlocks at Rare','Unlocks at Legendary'],
     bolum:'Stage',
     ocak:{baslik:'Lucky Forge', alt:'Drop rarity chances', yukselt:'UPGRADE', maks:'MAX',
           seviye:'Level', simdiki:'Now', sonraki:'Next', bossNot:'All rates ×3 on boss kills'},
     ors:{baslik:'Upgrade Anvil', bas:'FORGE', max:'MAX (+10)', kagitKisa:'paper', kBir:'Merge papers 4→1:',
          basari:'Success!', kirik:'Failed — level dropped', kaldi:'Failed — level kept',
          yok:'Not enough papers of that color'}}
};
let SLOT = 1;
try{ SLOT = parseInt(localStorage.getItem('legacyAktifSlot')||'1'); }catch(e){}
if(!(SLOT>=1 && SLOT<=6)) SLOT = 1;
const HIZ = SLOT===6 ? 10 : 1;                       /* slot 6: ×10 TEST */
function sk(ad){ return 'legacy_s'+SLOT+'_'+ad; }
let SLOT_SILINDI = false;                              /* HATA DÜZELTMESİ: silinen slota hayalet kayıt yazılmasın */
try{                                                 /* eski tek kayıt → slot 1 göçü */
  if(localStorage.getItem('legacyEnv') && !localStorage.getItem('legacy_s1_env')){
    for(const [e2,y2] of [['legacyEnv','legacy_s1_env'],['legacyStage','legacy_s1_stage'],['legacyLvl','legacy_s1_lvl']]){
      const v2 = localStorage.getItem(e2);
      if(v2) localStorage.setItem(y2, v2);
    }
  }
}catch(e){}
let DKOD='tr'; try{ DKOD = localStorage.getItem('legacyDil') || 'tr'; }catch(e){}
function T(){ return DIL[DKOD]; }
function dilUygula(){
  document.querySelectorAll('.sekme').forEach((s,i)=>{ s.textContent = T().sekmeler[i]; });
  document.querySelector('#olum h2').textContent = T().yenildin;
  document.getElementById('tekrar').textContent = T().tekrar;
  expSvE.textContent = T().seviye + ' ' + D.seviye;
  rozetGuncelle();
  const db = document.getElementById('dilBtn');
  if(db) db.textContent = DKOD==='tr' ? 'EN' : 'TR';
}
const YAN_HASAR = [2,3,5,7];   /* (eski kademeli yan hasar — satır kilidiyle sabit %3'e döndü) */
const NAD_AD   = ['NORMAL','İYİ','NADİR','EFSANEVİ'];
const NAD_RENK = ['#9aa4ad','#7fd87a','#6fb2ff','#ffa04a','#ff5f4d','#4de8d2','#fff3c4'];
const MOB_SINIR_Z = 1.2;   /* kahraman hattı 2.4 − vuruş payı: moblar bu çizgiyi geçemez */
let ENV;
try{ ENV = JSON.parse(localStorage.getItem(sk('env')) || 'null'); }catch(e){ ENV = null; }
if(!ENV || !ENV.don) ENV = {don:{}, malzeme:{okcu:0,brute:0,mage:0,priest:0}};
for(const k of ['okcu','brute','mage','priest']){          /* eski tek-slot kayıtları göçür */
  const d = ENV.don[k];
  if(d && typeof d.n === 'number') ENV.don[k] = {s1:null, s2:{n:d.n}};
  else if(!d || !('s1' in d)) ENV.don[k] = {s1:null, s2:null};
  if(!('z' in ENV.don[k])) ENV.don[k].z = null;
  if(!('p' in ENV.don[k])) ENV.don[k].p = null;
  for(const t of ['k','y','e']) if(!(t in ENV.don[k])) ENV.don[k][t] = null;
  for(const s of ['s1','s2','z','p','k','y','e']){
    const it = ENV.don[k][s];
    if(it && !('b' in it)) it.b = 0;
  }
}
const BASMA_GUC = 0.10;   /* basma: ana satır +%10/seviye — alt renk +7, üst rengin +0/+1'ini geçebilir */
function bK(it){ return it ? 1 + BASMA_GUC*(it.b||0) : 1; }
try{ const st = JSON.parse(localStorage.getItem(sk('stage'))||'null');
     if(st){ D.bolge = st.bolge||1; D.bolum = st.bolum||1; } }catch(e){}
try{ const lv = JSON.parse(localStorage.getItem(sk('lvl'))||'null');
     if(lv){ D.seviye = lv.seviye||1; D.sevKesim = lv.sevKesim||0; D.puan = lv.puan||0;
             if(lv.skill) D.skill = lv.skill;
             if(lv.gel) D.gel = lv.gel; } }catch(e){}
function lvlKaydet(){
  if(SLOT_SILINDI) return;
  try{ localStorage.setItem(sk('lvl'), JSON.stringify(
    {seviye:D.seviye, sevKesim:D.sevKesim, puan:D.puan, skill:D.skill, gel:D.gel})); }catch(e){}
}
function zk(){ return ((D.bolge-1)*5 + (D.bolum-1))*20 + D.bolumKesim; }   /* zorluk = bölüm ilerleyişi */
function stageKaydet(){ if(SLOT_SILINDI) return; try{ localStorage.setItem(sk('stage'), JSON.stringify({bolge:D.bolge, bolum:D.bolum})); }catch(e){} }
/* ═══ GÜÇ GÖSTERGESİ — YALNIZ EKRAN, SAVAŞA GİRMEZ ═══
   Bu üç fonksiyon sadece üst şerit rozetinde ve karakter panelinde
   yazı üretir; hiçbir hasar/can/doğum hesabına girmez. Denge DEĞİŞMEZ.

   ESKİ HÂLİ YANILTIYORDU: takım gücü 'seviye·15 + eşya' idi, yani
   neredeyse tamamen EŞYA SAYISINI ölçüyordu — 28 yuva dolunca tek
   başına ~670 veriyordu. Önerilen güç ise 13·S^1.28 ile ayrı bir
   eğriydi. İkisi farklı birimdi; rozet 715/129 (oran 5.5, yeşil)
   gösterirken takım ölüyordu.

   YENİ ÖLÇÜ: iki taraf da oyunun KENDİ sayılarından türer.
   Takım  = gerçek can havuzu (kMax) + eşya katkısı
   Düşman = sahada aynı anda duran mob sayısı × ortalama can × zorluk
   Böylece oran uydurma bir sabite değil, sahnedeki gerçek baskıya bakar. */
const GUC_BOL = 4;   /* yalnız gösterim: rozet 3 hanede kalsın, oran değişmez */

function esyaGucu(kim){
  let g = 0;
  for(const s of ['s1','s2','z','p','k','y','e']){
    const it = ENV.don[kim][s];
    if(it) g += (it.n+1)*12 + (it.b||0)*4;    /* eşya terimi AYNEN korundu */
  }
  return g;
}

function takimGucu(){
  let g = 0;
  for(const k of ['okcu','brute','mage','priest']) g += kMax(k) + esyaGucu(k);
  return Math.round(g / GUC_BOL);
}
/* Güç oranı → renk. Altı kademe: yeşilden kırmızıya.
   Eşikler ORAN üzerindendir (takım gücü / önerilen güç). */
const GUC_SKALA = [
  [0.60, '#ff5a4d'],   /* çok zayıf   — kırmızı   */
  [0.85, '#ff9448'],   /* zayıf       — turuncu   */
  [1.00, '#ffd23e'],   /* sınırda     — sarı      */
  [1.30, '#d7e04a'],   /* yeterli     — sarı-yeşil*/
  [1.80, '#9ede5a'],   /* rahat       — açık yeşil*/
  [Infinity, '#6ee06e']/* fazlasıyla  — yeşil     */
];
function gucRengi(oran){
  for(const [esik, renk] of GUC_SKALA) if(oran < esik) return renk;
  return '#6ee06e';
}

/* Sahada aynı anda AZAMI_MOB kadar mob durur; her birinin canı
   taban·(1 + zk·0.035) ile büyür — mobDogur ile BİREBİR aynı çarpan.
   zk>300'den sonra hasar da büyümeye başlar, o da katılır. */
const MOB_ORT_CAN = (()=>{
  const v = Object.values(TURLER);
  return v.reduce((t,x)=>t+x.can,0) / v.length;
})();
/* Bölüm BAŞINDAKİ zorluk değeri: zk() bölüm içinde her kesimle artar
   (bölümKesim terimi), o yüzden rozet bölüm ortasında sürünüyordu.
   Gösterge bir HEDEF olmalı — "bu bölüm için şu güç gerekir" — o yüzden
   bölüm başında sabitlenir. Mob doğumu canlı zk() kullanmaya devam eder;
   oradaki davranış DEĞİŞMEZ. */
function zkBolumBasi(){ return ((D.bolge-1)*5 + (D.bolum-1))*20; }

function onerilenGuc(){
  const z = zkBolumBasi();
  const canCarpan   = 1 + z*0.035;                          /* mobDogur ile aynı formül */
  const hasarCarpan = 1 + Math.max(0, z-300)*0.008;         /* geç oyun hasar artışı */
  const baski = AZAMI_MOB * MOB_ORT_CAN * canCarpan * hasarCarpan;
  return Math.round(baski / GUC_BOL);
}
function rozetGuncelle(){
  rozet.textContent = D.zindan
    ? (D.zindan.tip==='uniq'
        ? `👑 ${Math.floor(Math.max(0,D.zindan.kalan)/60)}:${('0'+Math.floor(Math.max(0,D.zindan.kalan)%60)).slice(-2)}`
        : D.zindan.tip==='boss'
        ? `👑 ${5-D.zindan.bossKalan}/5`
        : `${D.zindan.tip==='altin' ? '💰' : '📜'} ${Math.floor(Math.max(0,D.zindan.kalan)/60)}:${('0'+Math.floor(Math.max(0,D.zindan.kalan)%60)).slice(-2)}`)
    : (D.bossAktif ? `${D.bolge}-${D.bolum} · BOSS` : `${D.bolge}-${D.bolum} · ${D.bolumKesim}/20`) + (SLOT===6 ? ' ×10' : '');
  {                                            /* V1f: bölüm ilerleme şeridi */
    const se = document.getElementById('serit');
    if(se){
      se.style.display = D.zindan ? 'none' : 'flex';
      if(!D.zindan){
        const noktalar = se.querySelectorAll('i');
        noktalar.forEach((nk,i2)=>{
          nk.className = (i2+1) < D.bolum ? 'gecti' : (i2+1) === D.bolum && !D.bossAktif ? 'aktif' : '';
        });
        se.querySelector('b').className = D.bossAktif ? 'aktif' : '';
        document.getElementById('seritBar').style.setProperty('--kp', Math.min(100, D.bolumKesim/20*100)+'%');
      }
    }
  }
  const tg = takimGucu(), rec = onerilenGuc();
  gucRozet.textContent = `⚔ ${tg} / ${rec}`;
  gucRozet.style.color = gucRengi(tg / Math.max(1, rec));
  altinRozet.textContent = '🪙 ' + altinYaz(ENV.altin);
}
const SKILL9 = {   /* idx 3-8: [cd] — etkiler yeniSkillSur'da */
  okcu:  [9, 8, 10, 22, 14, 12],
  brute: [8, 11, 14, 16, 24, 13],
  mage:  [9, 8, 20, 16, 12, 15],
  priest:[9, 18, 20, 26, 14, 10]
};
function canliListe(){ return D.moblar.filter(m=>m.durum!=='olu' && m.can>0); }
function mobMerkez(liste){
  const p = new THREE.Vector3();
  for(const m of liste) p.add(m.kok.position);
  return p.multiplyScalar(1/Math.max(1, liste.length));
}
function acikMi(kim, i){ return D.skill[kim] >= i+1; }
function skillHalka(poz, renk){
  const hlk = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    vfxMatA('08_ring', renk, 0.9));                   /* VFX-1: yumuşak ışıklı halka */
  hlk.rotation.x = -Math.PI/2;
  hlk.position.set(poz.x, 0.07, poz.z);
  sahne.add(hlk);
  D.efektler.push({kok:hlk, omur:0.55, tip:'heal'});
}
/* ── V2a: Focus Target — moba dokun, okçu+mage kilitlensin ── */
const focusH = new THREE.Group();                      /* P6: iki katmanlı hedef işareti */
{
  const dis = new THREE.Mesh(
    new THREE.RingGeometry(0.46, 0.58, 4),
    new THREE.MeshBasicMaterial({color: 0xffb84d, transparent: true, opacity: 0.95, side: THREE.DoubleSide}));
  dis.rotation.x = -Math.PI/2;
  const ic = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.34, 24),
    new THREE.MeshBasicMaterial({color: 0xffe2a8, transparent: true, opacity: 0.8, side: THREE.DoubleSide}));
  ic.rotation.x = -Math.PI/2; ic.position.y = 0.012;
  focusH.add(dis); focusH.add(ic);
  focusH.userData.dis = dis; focusH.userData.ic = ic;
}
focusH.visible = false;
function focusAta(m){
  if(focusH.parent) focusH.parent.remove(focusH);
  D.focus = m || null;
  if(m){
    focusH.userData.olc = m.T ? m.T.olc : 1;
    focusH.scale.setScalar(focusH.userData.olc);
    focusH.position.set(0, 0.06, 0);
    m.kok.add(focusH);
    focusH.visible = true;
  } else focusH.visible = false;
}
const rayci = new THREE.Raycaster();
const ndcV = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', ev=>{
  if(!D || !D.moblar || D.bitti) return;
  const rc = renderer.domElement.getBoundingClientRect();            /* p157: mobil viewport kayması düzeltmesi */
  ndcV.set((ev.clientX - rc.left)/rc.width*2 - 1, -((ev.clientY - rc.top)/rc.height)*2 + 1);
  rayci.setFromCamera(ndcV, kamera);
  let sec = null, sd = 1e9;
  for(const m of D.moblar){
    if(m.durum==='olu') continue;
    const hit = rayci.intersectObject(m.kok, true);
    if(hit.length && hit[0].distance < sd){ sd = hit[0].distance; sec = m; }
  }
  focusAta(sec);
});
const kalkanTop = new THREE.Mesh(
  new THREE.PlaneGeometry(2.0, 2.0),
  new THREE.MeshBasicMaterial({map: DOKU['14_shield'], color: 0xffe6b0, transparent: true,
    opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false}));
/* VFX-1b: doku zaten küre resmi — küreye sarınca buruluyordu; billboard + altın ton */
kalkanTop.visible = false;
sahne.add(kalkanTop);
function frenzySur(dt){                                /* V2b: 3+ goblin yakınsa sürü çılgınlığı */
  const gobs = D.moblar ? D.moblar.filter(m2=>m2.tur==='goblin' && m2.durum!=='olu') : [];
  for(const g2 of gobs){
    if(g2.frenzyZor > 0) g2.frenzyZor -= dt;           /* ENC-3: Sürü Kralı aurası */
    let yak = 0;
    for(const g3 of gobs)
      if(g3!==g2 && g3.kok.position.distanceTo(g2.kok.position) < 3.5) yak++;
    const yeni = yak >= 2 || (g2.frenzyZor||0) > 0;
    if(yeni && !g2.frenzy)
      parcaEfekt({x: g2.kok.position.x, y: 0.8*g2.T.olc, z: g2.kok.position.z}, 0xff5a4d, 4, 1.5, true);
    g2.frenzy = yeni;
  }
}
/* İz ~6 saniyede yarılanır: eski dayak yeni dayağı gölgelemesin. */
function hasarIziSur(dt){
  if(!D.hasarIz) return;
  const k = Math.pow(0.5, dt/6);
  for(const kim in D.hasarIz) D.hasarIz[kim] *= k;
}

function kalkanSur(){
  const kh = D.kalkan && D.kalkan.mik > 0
    ? ({okcu, brute, mage, priest})[D.kalkan.kim] : null;
  if(kh && !kh.olu){
    kalkanTop.visible = true;
    kalkanTop.position.copy(kh.kok.position);
    /* Merkez GÖVDE ORTASINDA. Eskiden y=0.75 idi: 2.0 birimlik düzlem
       −0.25…1.75 arasını kaplıyordu, kahraman ~1.9 birim boyunda —
       BAŞ kalkanın dışında kalıyordu. */
    kalkanTop.position.y = 1.02;
    const n = 1 + Math.sin(performance.now()*0.004)*0.05;
    kalkanTop.scale.setScalar(n * (D.kalkan.kim==='brute' ? 1.62 : 1.46));
    kalkanTop.quaternion.copy(kamera.quaternion);          /* VFX-1b: baloncuk hep kameraya bakar */
    /* rotateZ, quaternion'u ÇARPAR. Eskiden 'rotation.z = …' yazılıyordu;
       Euler'e yazmak quaternion'u baştan hesaplatıp kameraya bakışı
       siliyordu — karakter hareket edince kapsama kayıyordu. */
    kalkanTop.rotateZ(D.sure * 0.5);                       /* ağır dönüş — canlılık */
  } else kalkanTop.visible = false;
}
/* ═══ V1e: WebAudio prosedürel ses — dosya yok, saf sentez ═══ */
let AC = null;
function sesAc(){
  if(!AC){ try{ AC = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} }
  if(AC && AC.state === 'suspended') AC.resume();
}
addEventListener('pointerdown', sesAc, {passive: true});
function sfx(fn){
  if(!AC || AC.state !== 'running' || ENV.sesAcik === false) return;
  try{ fn(AC.currentTime); }catch(e){}
}
function sOsc(t0, o2){
  const {tip='sine', f0=440, f1, sure=0.15, v=0.3, gec=0.008} = o2;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = tip; o.frequency.setValueAtTime(f0, t0);
  if(f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + sure);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(v, t0 + gec);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + sure);
  o.connect(g).connect(AC.destination);
  o.start(t0); o.stop(t0 + sure + 0.03);
}
function sGur(t0, o2){
  const {sure=0.12, v=0.25, tipF='lowpass', frek=800, q=1} = o2;
  if(!sGur.buf){
    const b = AC.createBuffer(1, AC.sampleRate*0.5|0, AC.sampleRate);
    const d = b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    sGur.buf = b;
  }
  const n = AC.createBufferSource(); n.buffer = sGur.buf; n.loop = true;
  const f = AC.createBiquadFilter(); f.type = tipF; f.frequency.value = frek; f.Q.value = q;
  const g = AC.createGain();
  g.gain.setValueAtTime(v, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + sure);
  n.connect(f).connect(g).connect(AC.destination);
  n.start(t0); n.stop(t0 + sure + 0.03);
}
const sesSon = {};
function seyrek(ad, aralik){ const n2 = performance.now(); if(sesSon[ad] && n2 - sesSon[ad] < aralik) return false; sesSon[ad] = n2; return true; }
const SES = {
  ok(){ sfx(t=>{ if(seyrek('ok', 60)) sGur(t, {sure:0.05, v:0.09, tipF:'highpass', frek:2600}); }); },
  isabet(){ sfx(t=>{ if(!seyrek('isabet', 50)) return;
    sGur(t, {sure:0.06, v:0.13, frek:950}); sOsc(t, {f0:175, f1:90, sure:0.08, v:0.15}); }); },
  boom(){ sfx(t=>{ sOsc(t, {f0:110, f1:42, sure:0.4, v:0.5}); sGur(t, {sure:0.28, v:0.28, frek:420}); }); },
  simsek(){ sfx(t=>{ sGur(t, {sure:0.05, v:0.38, tipF:'highpass', frek:1400});
    sGur(t+0.06, {sure:0.15, v:0.2, tipF:'bandpass', frek:2400, q:2}); }); },
  ates(){ sfx(t=>{ if(!seyrek('ates', 200)) return;
    sGur(t, {sure:0.32, v:0.24, frek:640}); sOsc(t, {tip:'sawtooth', f0:300, f1:80, sure:0.3, v:0.11}); }); },
  buz(){ sfx(t=>{ sOsc(t, {f0:1180, f1:1560, sure:0.17, v:0.11});
    sOsc(t+0.05, {f0:1560, f1:2050, sure:0.19, v:0.08}); }); },
  heal(){ sfx(t=>{ if(!seyrek('heal', 180)) return;
    [660, 830, 990].forEach((f,i)=> sOsc(t + i*0.065, {f0:f, sure:0.15, v:0.09})); }); },
  ulti(){ sfx(t=>{ sOsc(t, {tip:'sawtooth', f0:70, f1:240, sure:0.5, v:0.18}); sOsc(t, {f0:52, sure:0.55, v:0.4}); }); },
  boss(){ sfx(t=>{ sOsc(t, {f0:60, f1:34, sure:0.9, v:0.55}); sGur(t, {sure:0.5, v:0.18, frek:220}); }); },
  olum(){ sfx(t=>{ if(seyrek('olum', 80)) sOsc(t, {tip:'sawtooth', f0:150, f1:55, sure:0.15, v:0.09}); }); },
  seviye(){ sfx(t=>{ [523, 659, 784, 1046].forEach((f,i)=> sOsc(t + i*0.075, {tip:'triangle', f0:f, sure:0.14, v:0.11})); }); },
  melee(){ sfx(t=>{ if(!seyrek('melee', 90)) return;
    sGur(t, {sure:0.06, v:0.16, frek:520}); sOsc(t, {f0:130, f1:70, sure:0.09, v:0.2}); }); },
  loot(n){ sfx(t=>{ if(!seyrek('loot', 120)) return;
    const par = n>=4;
    sOsc(t, {tip:'triangle', f0:1180, sure:0.1, v: par?0.14:0.09});
    sOsc(t+0.07, {tip:'triangle', f0:1560, sure:0.13, v: par?0.16:0.1});
    if(par) sOsc(t+0.15, {tip:'sine', f0:2090, sure:0.18, v:0.12}); }); },
  swing(){ sfx(t=>{ if(!seyrek('swing', 110)) return;
    sGur(t, {sure:0.09, v:0.15, tipF:'bandpass', frek:900, q:1.4});
    sGur(t+0.02, {sure:0.05, v:0.08, tipF:'highpass', frek:2000}); }); },
  buff(){ sfx(t=>{ if(!seyrek('buff', 150)) return;
    sOsc(t, {tip:'triangle', f0:620, f1:930, sure:0.12, v:0.1});
    sOsc(t+0.08, {tip:'sine', f0:1240, sure:0.14, v:0.08}); }); },
  nova(){ sfx(t=>{ sOsc(t, {f0:200, f1:58, sure:0.3, v:0.3});
    sGur(t, {sure:0.2, v:0.2, tipF:'highpass', frek:1100}); }); },
  kutsal(){ sfx(t=>{ if(!seyrek('kutsal', 140)) return;
    sOsc(t, {tip:'sine', f0:840, f1:560, sure:0.16, v:0.11});
    sGur(t, {sure:0.08, v:0.07, tipF:'highpass', frek:2400}); }); },
  firlat(){ sfx(t=>{ if(!seyrek('firlat', 140)) return;
    sOsc(t, {tip:'sine', f0:520, f1:310, sure:0.1, v:0.07}); }); },
  bossGiris(tur){ sfx(t=>{
    if(tur==='rhino'){ sOsc(t,{f0:75,f1:42,sure:0.5,v:0.4}); sGur(t+0.15,{sure:0.25,v:0.22,tipF:'lowpass',frek:300}); }
    else if(tur==='mutant'){ sOsc(t,{f0:60,f1:60,sure:0.18,v:0.35}); sOsc(t+0.28,{f0:55,f1:55,sure:0.2,v:0.4}); }
    else if(tur==='goblin'){ for(let i=0;i<3;i++) sOsc(t+i*0.14,{tip:'square',f0:900+i*140,f1:640,sure:0.09,v:0.09}); }
    else if(tur==='kecoon'){ sGur(t,{sure:0.12,v:0.16,tipF:'bandpass',frek:1400,q:2}); sGur(t+0.2,{sure:0.12,v:0.16,tipF:'bandpass',frek:1800,q:2}); }
    else if(tur==='crab'){ for(let i=0;i<3;i++) sGur(t+i*0.11,{sure:0.05,v:0.18,tipF:'highpass',frek:2600}); }
    else if(tur==='spike'){ sOsc(t,{tip:'sine',f0:420,f1:260,sure:0.14,v:0.1}); sOsc(t+0.18,{tip:'sine',f0:420,f1:260,sure:0.14,v:0.1}); }
    else if(tur==='monsterx'){ sOsc(t,{tip:'sine',f0:120,f1:78,sure:0.5,v:0.28}); sGur(t+0.1,{sure:0.35,v:0.12,tipF:'lowpass',frek:500}); }
  }); },
  ors(basarili){ sfx(t=>{
    sGur(t, {sure:0.05, v:0.28, tipF:'highpass', frek:1800});
    sOsc(t, {tip:'square', f0:230, f1:180, sure:0.09, v:0.12});
    if(basarili) sOsc(t+0.1, {tip:'triangle', f0:880, f1:1180, sure:0.2, v:0.12});
    else sOsc(t+0.08, {tip:'sawtooth', f0:120, f1:65, sure:0.28, v:0.16}); }); }
};
let drone = null;
function droneBasla(){
  if(drone || !AC || AC.state!=='running' || ENV.sesAcik===false) return;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, AC.currentTime);
  g.gain.linearRampToValueAtTime(0.045, AC.currentTime + 1.4);
  const o1 = AC.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
  const o2 = AC.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 82.5;
  o1.connect(g); o2.connect(g); g.connect(AC.destination);
  o1.start(); o2.start();
  drone = {g, o1, o2};
}
function droneDur(){
  if(!drone) return;
  const d = drone; drone = null;
  try{
    d.g.gain.linearRampToValueAtTime(0.0001, AC.currentTime + 0.8);
    setTimeout(()=>{ try{ d.o1.stop(); d.o2.stop(); }catch(e){} }, 900);
  }catch(e){}
}
const bossGirisE = document.getElementById('bossGiris');
function bossGirisJest(m){                             /* P2: kimliğe göre giriş jesti */
  const p = m.kok.position, o = m.T.olc*1.6;
  if(m.tur==='rhino'){                                  /* yeri eşeler: öne toz */
    parcaEfekt({x:p.x, y:0.25, z:p.z+0.8}, 0x9a7c52, 8, 2.2, false);
    parcaEfekt({x:p.x, y:0.2, z:p.z+1.4}, 0x6b6b66, 4, 1.6, false);
  } else if(m.tur==='mutant'){                          /* göğüs döver: kızıl duman */
    parcaEfekt({x:p.x, y:0.9*o, z:p.z}, 0xff4030, 8, 2.4, true);
    D.sarsinti = Math.max(D.sarsinti, 0.3);
  } else if(m.tur==='goblin'){                          /* cıyaklama: üç kızıl parıltı */
    for(let i=0;i<3;i++)
      parcaEfekt({x:p.x+(i-1)*0.7, y:0.7*o, z:p.z}, 0xff5a4d, 3, 1.4, true);
  } else if(m.tur==='kecoon'){                          /* gölge dumanı */
    parcaEfekt({x:p.x, y:0.5*o, z:p.z}, 0x2a2438, 10, 1.8, true);
  } else if(m.tur==='crab'){                            /* kabuk tıkırtısı: gri kıvılcım halkası */
    for(let i=0;i<6;i++){
      const a = i/6*Math.PI*2;
      parcaEfekt({x:p.x+Math.sin(a)*0.9, y:0.4*o, z:p.z+Math.cos(a)*0.9}, 0x9aa4ad, 2, 1.0, false);
    }
  } else if(m.tur==='spike'){                           /* zeminden diken habercisi */
    parcaEfekt({x:p.x, y:0.15, z:p.z}, 0x6a5a42, 10, 1.6, false);
  } else if(m.tur==='monsterx'){                        /* yeşil kabarcık seli */
    parcaEfekt({x:p.x, y:0.6*o, z:p.z}, 0x8fe05a, 12, 2.2, true);
  }
  SES.bossGiris(m.tur);
}
function bossSunum(){
  D.kamZoom = {tip:'boss', t:0};
  SES.boss();
  const bm = D.moblar.filter(m2=>m2.bossMu).pop();
  if(bm) setTimeout(()=>{ try{ bossGirisJest(bm); }catch(e){} }, 350);
  bossGirisE.classList.add('acik');
  setTimeout(()=>{ bossGirisE.classList.remove('acik'); }, 950);
}
function ultiDuyur(ad){
  D.kamZoom = {tip:'ulti', t:0};
  SES.ulti();
  duyuruE.textContent = '⚡ ' + ad + ' ⚡';
  duyuruE.style.opacity = '1';
  clearTimeout(duyuruE._t);
  duyuruE._t = setTimeout(()=>{ duyuruE.style.opacity='0'; }, 1600);
}
function yeniSkillSur(dt){
  if(!D.ultiIstek) D.ultiIstek = {okcu:false, brute:false, mage:false, priest:false};
  if(D.bitti) return;
  /* süreler */
  if(D.kutsama>0) D.kutsama -= dt;
  if(D.ilahi>0) D.ilahi -= dt;
  if(okcu){ if(okcu.nisan>0) okcu.nisan -= dt; if(okcu.kacinma>0) okcu.kacinma -= dt; }
  if(brute && brute.duvar>0) brute.duvar -= dt;
  if(priest && priest.kanal){
    const kHedef = ({okcu, brute, mage, priest})[priest.kanal.k];
    if(!kHedef || kHedef.olu) priest.kanal = null;     /* skill denetimi: ölüye şifa akmasın */
  }
  if(priest && priest.kanal){
    priest.kanal.sure -= dt;
    canEkle(priest.kanal.k, {okcu:kMax('okcu'),brute:bruteMax(),mage:kMax('mage'),priest:kMax('priest')}[priest.kanal.k]*0.12*gelK('priest')*dt);
    if(priest.kanal.sure<=0) priest.kanal = null;
  }
  for(let i=D.gecikme.length-1;i>=0;i--){
    D.gecikme[i].t -= dt;
    if(D.gecikme[i].t<=0){ D.gecikme[i].fn(); D.gecikme.splice(i,1); }
  }
  const canli = canliListe();
  for(let i=D.alevler.length-1;i>=0;i--){
    const a = D.alevler[i]; a.sure -= dt;
    for(const m of canli) if(Math.abs(m.kok.position.z - a.z) < 0.9) mobaVur(m, a.dps*dt, true);
    if(a.sure<=0) D.alevler.splice(i,1);
  }
  for(const kim of KIMLER) for(let i=0;i<6;i++) if(D.scd[kim][i]>0) D.scd[kim][i] -= dt;
  if(!canli.length) return;
  const L = T();
  const yakin = (p, r)=> canli.filter(m=>m.kok.position.distanceTo(p)<r);
  const enYakin = (p)=> canli.reduce((a,m)=> !a || m.kok.position.distanceTo(p)<a.kok.position.distanceTo(p) ? m : a, null);
  const US = 1 + 0.06*(D.seviye-1);
  const MZL = 20.4;                                                        /* skill menzili = savaş menzili */
  const mzlIci = (m, p)=> m && m.kok.position.distanceTo(p) <= MZL;
  const mzlCanli = (p)=> canli.filter(m=> m.kok.position.distanceTo(p) <= MZL);
  /* ── OKÇU ── */
  if(okcu && !okcu.olu){
    const op = okcu.kok.position, g = gelK('okcu');
    const at = (m,k)=> okAt(m, k);
    const kul = (i)=>{ D.scd.okcu[i-3] = SKILL9.okcu[i-3]; };
    if(acikMi('okcu',3) && D.scd.okcu[0]<=0 && mzlCanli(op).length>=2){   /* Çoklu Atış */
      mzlCanli(op).sort((a,b)=>a.kok.position.distanceTo(op)-b.kok.position.distanceTo(op))
        .slice(0,3).forEach(m=>at(m, 0.9*g)); kul(3);
    } else if(acikMi('okcu',4) && D.scd.okcu[1]<=0 && mzlIci(enYakin(op), op)){   /* Zehirli Ok */
      const m = enYakin(op);
      m.yanma = {sure:4, dps: OK_HASAR*itemKat('okcu')*0.35*g}; at(m, 0.6); kul(4);
    } else if(acikMi('okcu',5) && D.scd.okcu[2]<=0 && mzlIci(enYakin(op), op)){   /* Sakatlayan Ok */
      const m = enYakin(op); m.buz = Math.max(m.buz||0, 3); at(m, 0.6);
      patEfekt(m.kok.position.x, 0.7*m.T.olc, m.kok.position.z, '03b_ice', 0xbfeaff, 1.0, 0.4);   /* VFX-3 */
      kul(5);
    } else if(acikMi('okcu',6) && D.scd.okcu[3]<=0 && mzlCanli(op).length>=3){    /* Keskin Nişancı */
      SES.buff(); okcu.nisan = 6; kul(6);
    } else if(acikMi('okcu',7) && D.scd.okcu[4]<=0 && enYakin(op).kok.position.distanceTo(op)<2.3){ /* Geri Takla */
      SES.buff(); okcu.kacinma = 1.0; kul(7);
    } else if(acikMi('okcu',8) && D.scd.okcu[5]<=0 && mzlIci(enYakin(op), op)){   /* Yaylım */
      const m = enYakin(op); for(let j=0;j<3;j++) at(m, 0.8*g); kul(8);
    }
    if(D.ulti.okcu>=1 && (ENV.auto ? (canli.length>=4 || D.bossAktif) : D.ultiIstek.okcu)){   /* ⚡ Ok Kasırgası */
      D.yagmur = {p: mobMerkez(canli), bekle:0.4, kalan:26, ara:0, r:5.5, kat: 1.5*US*g};
      okcuOynat('12_AIM_OVERDRAW', true);
      D.ulti.okcu = 0; D.ultiIstek.okcu = false; ultiDuyur(L.ultiAd.okcu);
    }
  }
  /* ── WARRIOR ── */
  if(brute && !brute.olu){
    const bp = brute.kok.position, g = gelK('brute');
    const kul = (i)=>{ D.scd.brute[i-3] = SKILL9.brute[i-3]; };
    const cevre = (r)=> yakin(bp, r);
    if(acikMi('brute',3) && D.scd.brute[0]<=0 && cevre(2.4).length>=2){    /* Yatay Biçme */
      SES.swing(); bruteOynat('05_ATTACK_HORIZONTAL', true);
      cevre(2.4).forEach(m=> mobaVur(m, krit('brute', m, 20*itemKat('brute')*skill1Kat('brute')*g, true))); kul(3);
    } else if(acikMi('brute',4) && D.scd.brute[1]<=0 && cevre(2.2).length){ /* Yıkıcı Darbe */
      SES.swing(); bruteOynat('06_ATTACK_DOWNWARD', true);
      const m = enYakin(bp); mobaVur(m, krit('brute', m, 72*itemKat('brute')*skill1Kat('brute')*g, true)); kul(4);
    } else if(acikMi('brute',5) && D.scd.brute[2]<=0 && cevre(3.1).length>=3){ /* Kasırga */
      SES.swing(); bruteOynat('07b_ATTACK_360_HIGH', true);
      cevre(3.1).forEach(m=> mobaVur(m, krit('brute', m, 30*itemKat('brute')*skill1Kat('brute')*g, true))); kul(5);
    } else if(acikMi('brute',6) && D.scd.brute[3]<=0 && cevre(2.2).length){ /* Kombo Zinciri */
      SES.swing(); bruteOynat('13_COMBO_1', true);
      const m = enYakin(bp);
      for(let j=0;j<3;j++) if(m.can>0) mobaVur(m, krit('brute', m, 20*itemKat('brute')*skill1Kat('brute')*g, true));
      kul(6);
    } else if(acikMi('brute',7) && D.scd.brute[4]<=0 && D.bruteCan < bruteMax()*0.5){ /* Kalkan Duvarı */
      SES.buff(); brute.duvar = 3; bruteOynat('17_BLOCK_HIT', true);
      sayiGoster(bp, L.skillAd.brute[7], 'syB', 2.1); skillHalka(bp, 0x9fd4ff); kul(7);
    } else if(acikMi('brute',8) && D.scd.brute[5]<=0 && cevre(2.8).length>=3){ /* Yere Vuruş */
      bruteOynat('21_TAUNT_THUMP', true);
      parcaEfekt({x: bp.x, y: 0.25, z: bp.z}, 0x9a7c52, 9, 3.2, false);   /* V1c: toz + taş */
      parcaEfekt({x: bp.x, y: 0.2, z: bp.z}, 0x6b6b66, 5, 2.2, false);
      dumanEfekt(bp.x, 0.5, bp.z, 2.3, 0x8f8066);      /* VFX-3: dokulu toz pufu */
      patEfekt(bp.x, 0.15, bp.z, '11_dust', 0xb8a888, 2.6, 0.45);
      D.hitStop = Math.max(D.hitStop||0, 0.07); SES.boom();
      cevre(2.8).forEach(m=>{ mobaVur(m, krit('brute', m, 16*itemKat('brute')*g, true));
        if(m.can>0){ m.tepkiS = Math.max(m.tepkiS,1.0); m.tepkiB = Math.max(m.tepkiB,1.3); } });
      skillHalka(bp, 0xffb84d); kul(8);
    }
    if(D.ulti.brute>=1 && (ENV.auto ? (canli.length>=4 || D.bossAktif) : D.ultiIstek.brute)){   /* ⚡ Deprem */
      for(const m of canli){
        mobaVur(m, krit('brute', m, 60*itemKat('brute')*US*g, true));
        if(m.can>0){ m.tepkiS = Math.max(m.tepkiS,1.5); m.tepkiB = Math.max(m.tepkiB,1.8); }
      }
      bruteOynat('14_LEAP_ATTACK', true);
      D.sarsinti = 0.6; D.ulti.brute = 0; D.ultiIstek.brute = false; ultiDuyur(L.ultiAd.brute);
    }
  }
  /* ── MAGE ── */
  if(mage && !mage.olu){
    const mp = mage.kok.position, g = gelK('mage');
    const kul = (i)=>{ D.scd.mage[i-3] = SKILL9.mage[i-3]; };
    const km = kumeBul();
    const kmP = km ? (km.p||mobMerkez(km.uyeler||canli)) : null;
    if(acikMi('mage',3) && D.scd.mage[0]<=0 && km && kmP.distanceTo(mp) <= MZL){   /* Ateş Topu */
      mageOynat('07b_CAST_2H_1', true);
      izBirak(kmP, 1.0); SES.ates();
      alevEfekt(kmP.x, 0.7, kmP.z, 2.0, 0.55, false);  /* VFX-2: gerçek patlama */
      dumanEfekt(kmP.x, 1.0, kmP.z, 1.5);
      parcaEfekt({x: kmP.x, y: 0.5, z: kmP.z}, 0xff9040, 6, 2.6, true);
      yakin(kmP, 1.8).forEach(m=>{
        mobaVur(m, krit('mage', m, 45*itemKat('mage')*skill1Kat('mage')*g, true));
        if(m.can>0) m.yanma = {sure:2, dps: 10*itemKat('mage')*g};
      }); kul(3);
    } else if(acikMi('mage',4) && D.scd.mage[1]<=0 && mzlIci(enYakin(mp), mp)){   /* Yıldırım Çarpması */
      mageOynat('06_CAST_1H_2', true);
      const m = enYakin(mp);
      yildirimEfekt(m.kok.position);                                        /* V1c: gerçek şimşek */
      mobaVur(m, krit('mage', m, 85*itemKat('mage')*skill1Kat('mage')*g, true)); kul(4);
    } else if(acikMi('mage',5) && D.scd.mage[2]<=0 && mzlCanli(mp).length>=3){    /* Meteor Kanalı */
      mageOynat('22b_CHANNEL_2H', true);
      const p = mobMerkez(mzlCanli(mp)).clone();
      D.gecikme.push({t:1.2, fn: ()=>{
        izBirak(p, 1.35); SES.ates();
        alevEfekt(p.x, 0.8, p.z, 2.7, 0.6, false);
        dumanEfekt(p.x, 1.2, p.z, 2.0);
        parcaEfekt({x: p.x, y: 0.5, z: p.z}, 0xff8030, 8, 3.2, true);
        for(const m of canliListe()) if(m.kok.position.distanceTo(p)<2.6){
          mobaVur(m, krit('mage', m, 90*itemKat('mage')*skill1Kat('mage')*g, true));
          if(m.can>0) m.yanma = {sure:2, dps: 12*itemKat('mage')*g};
        }
        D.sarsinti = Math.max(D.sarsinti, 0.3);
      }}); kul(5);
    } else if(acikMi('mage',6) && D.scd.mage[3]<=0 && mzlCanli(mp).length>=3){    /* Alev Duvarı */
      SES.ates(); mageOynat('23_AREA_1', true);
      const ydv = mzlCanli(mp);
      const zort = ydv.reduce((a,m)=>a+m.kok.position.z,0)/ydv.length;
      D.alevler.push({z: zort, sure:4, dps: 12*itemKat('mage')*g});
      for(let i2=0;i2<5;i2++)                          /* VFX-2: duvar gerçek alevle yanar */
        alevEfekt((i2/4*2-1)*YOL_YARIM*0.8, 0.5, zort, 1.5, 4, true);
      kul(6);
    } else if(acikMi('mage',7) && D.scd.mage[4]<=0 && mzlCanli(mp).length>=2){    /* Buz Sağanağı */
      mageOynat('07c_CAST_2H_2', true);
      SES.buz();
      mzlCanli(mp).sort((a,b)=>a.kok.position.distanceTo(mp)-b.kok.position.distanceTo(mp)).slice(0,3).forEach(m=>{ mobaVur(m, krit('mage', m, 20*itemKat('mage')*g, true));
        if(m.can>0){ m.buz = Math.max(m.buz||0, 2);
          patEfekt(m.kok.position.x, 0.7*m.T.olc, m.kok.position.z, '03b_ice', 0xbfeaff, 0.85, 0.35); } });   /* VFX-3 */
      kul(7);
    } else if(acikMi('mage',8) && D.scd.mage[5]<=0 && yakin(mp,3).length){ /* Mana Novası */
      SES.nova(); mageOynat('23b_AREA_2', true);
      yakin(mp,3).forEach(m=>{ mobaVur(m, krit('mage', m, 26*itemKat('mage')*g, true));
        if(m.can>0 && !m.bossMu) m.kok.position.z -= 1.8; }); skillHalka(mp, 0xb48cff); kul(8);   /* skill denetimi: boss itilemez */
    }
    if(D.ulti.mage>=1 && (ENV.auto ? (canli.length>=3 || D.bossAktif) : D.ultiIstek.mage)){   /* ⚡ Kıyamet Meteoru */
      const hedefler = canli.slice().sort((a,b)=>b.can-a.can).slice(0,3).map(m=>m.kok.position.clone());
      const gg = g;
      D.gecikme.push({t:1.2, fn: ()=>{
        for(const p of hedefler){
          izBirak(p, 1.35);
          alevEfekt(p.x, 0.8, p.z, 2.7, 0.6, false);
          dumanEfekt(p.x, 1.2, p.z, 2.0);
          parcaEfekt({x: p.x, y: 0.5, z: p.z}, 0xff8030, 7, 3.2, true);
          for(const m of canliListe()) if(m.kok.position.distanceTo(p)<2.6){
            mobaVur(m, krit('mage', m, 90*itemKat('mage')*US*gg, true));
            if(m.can>0) m.yanma = {sure:3, dps: 15*itemKat('mage')*gg};
          }
        }
        D.sarsinti = 0.6;
      }});
      mageOynat('22b_CHANNEL_2H', true);
      D.ulti.mage = 0; D.ultiIstek.mage = false; ultiDuyur(L.ultiAd.mage);
    }
  }
  /* ── PRIEST ── */
  if(priest && !priest.olu){
    const pp = priest.kok.position, g = gelK('priest');
    const kul = (i)=>{ D.scd.priest[i-3] = SKILL9.priest[i-3]; };
    const canlar = [['okcu', D.okcuCan, kMax('okcu'), okcu], ['brute', D.bruteCan, bruteMax(), brute],
                    ['mage', D.mageCan, kMax('mage'), mage], ['priest', D.priestCan, kMax('priest'), priest]]
                   .filter(x=>x[3] && !x[3].olu);
    const yarali = canlar.filter(x=>x[1]/x[2] < 0.85);
    if(acikMi('priest',3) && D.scd.priest[0]<=0 && mzlIci(enYakin(pp), pp)){      /* Kutsal Ateş */
      const m = enYakin(pp);
      SES.kutsal(); priestOynat('05_CAST_1H_1', true);
      mobaVur(m, krit('priest', m, 30*itemKat('priest')*skill1Kat('priest')*g, true));
      if(m.can>0) m.yanma = {sure:3, dps: 8*itemKat('priest')*g}; kul(3);
    }
    if(acikMi('priest',4) && D.scd.priest[1]<=0 && yarali.length>=2){      /* Arınma */
      SES.heal(); priestOynat('06_CAST_1H_2', true);
      canlar.forEach(x=> canEkle(x[0], x[2]*0.12*g)); kul(4);
    }
    if(acikMi('priest',5) && D.scd.priest[2]<=0 && !priest.kanal){         /* Şifa Kanalı */
      const enK = canlar.slice().sort((a,b)=>a[1]/a[2]-b[1]/b[2])[0];
      if(enK && enK[1]/enK[2] < 0.55){ SES.heal(); priest.kanal = {k: enK[0], sure:3}; priestOynat('22_CHANNEL_1H', true); kul(5); }
    }
    if(acikMi('priest',6) && D.scd.priest[3]<=0 && mzlCanli(pp).length>=3){       /* Kutsama */
      SES.buff(); D.kutsama = 10; priestOynat('07d_CAST_2H_3', true);
      skillHalka(priest.kok.position, 0xffe08a); kul(6);
    }
    if(acikMi('priest',7) && D.scd.priest[4]<=0 && yakin(pp,3).length>=2){ /* Işık Patlaması */
      yakin(pp,3).forEach(m=> mobaVur(m, krit('priest', m, 24*itemKat('priest')*g, true)));
      canlar.forEach(x=> canEkle(x[0], x[2]*0.08*g));
      SES.kutsal(); priestOynat('23_AREA_1', true); skillHalka(pp, 0xffe08a); kul(7);
    }
    if(acikMi('priest',8) && D.scd.priest[5]<=0 && mzlIci(enYakin(pp), pp)){      /* Ceza */
      const m = enYakin(pp);
      SES.kutsal(); priestOynat('07b_CAST_2H_1', true);
      mobaVur(m, krit('priest', m, 60*itemKat('priest')*skill1Kat('priest')*g, true));
      if(m.can>0){ m.tepkiS = Math.max(m.tepkiS,0.5); m.tepkiB = Math.max(m.tepkiB,0.8); } kul(8);
    }
    const ortCan = canlar.reduce((a,x)=>a+x[1]/x[2],0)/Math.max(1,canlar.length);
    const oluVar = [okcu,brute,mage,priest].some(k=>k && k.olu);
    if(D.ulti.priest>=1 && (ENV.auto ? (ortCan<0.55 || oluVar || (D.bossAktif && ortCan<0.75)) : D.ultiIstek.priest)){   /* ⚡ İlahi Müdahale */
      D.okcuCan = kMax('okcu'); D.bruteCan = bruteMax(); D.mageCan = kMax('mage'); D.priestCan = kMax('priest');
      D.ilahi = 5;
      if(okcu && okcu.olu){ okcu.olu=false; okcu.dirilme=0; D.okcuCan = kMax('okcu')*0.5; }
      if(brute && brute.olu){ brute.olu=false; brute.dirilme=0; D.bruteCan = bruteMax()*0.5;
        brute.durum = 'don'; bruteOynat('01_IDLE'); } /* HATA DÜZELTMESİ */
      if(mage && mage.olu){ mage.olu=false; mage.dirilme=0; D.mageCan = kMax('mage')*0.5; }
      if(priest && priest.olu){ priest.olu=false; priest.dirilme=0; D.priestCan = kMax('priest')*0.5; }
      priestOynat('07f_CAST_2H_5', true);
      skillHalka(priest.kok.position, 0xfff3c4);
      D.ulti.priest = 0; D.ultiIstek.priest = false; ultiDuyur(L.ultiAd.priest);
    }
  }
}
const sayiKap = [];
let kritOldu = false;
function sayiGoster(poz, metin, cls, yuk, renk){
  const kap = document.getElementById('sayilar');
  let s = sayiKap.find(x=>!x.aktif);
  if(!s){
    if(sayiKap.length>=24) return;
    s = {el: document.createElement('div'), p: new THREE.Vector3(), t:0, aktif:false};
    kap.appendChild(s.el);
    sayiKap.push(s);
  }
  s.aktif = true; s.t = 0;
  s.p.set(poz.x + (Math.random()-0.5)*0.5, (yuk||1.7), poz.z);
  s.el.className = 'sy ' + cls;
  s.el.style.color = renk || '';
  s.el.textContent = metin;
  s.el.style.opacity = '1';
}
function sayiGuncelle(dt){
  for(const s of sayiKap){
    if(!s.aktif) continue;
    s.t += dt;
    if(s.t >= 0.85){ s.aktif=false; s.el.style.opacity='0'; s.el.style.transform='translate(-9999px,-9999px)'; continue; }
    s.p.y += dt*1.3;
    const v = s.p.clone().project(kamera);
    s.el.style.transform = `translate(${((v.x*0.5+0.5)*innerWidth).toFixed(0)}px, ${((-v.y*0.5+0.5)*innerHeight).toFixed(0)}px) translate(-50%,-50%)`;
    s.el.style.opacity = String(Math.min(1, (0.85-s.t)/0.35));
  }
}
function bolumDuyur(bossMu){
  const bMob2 = bossMu ? D.moblar.filter(m2=>m2.bossMu).pop() : null;
  duyuruE.textContent = bossMu ? ('☠ ' + ((bMob2 && T().bossTur[bMob2.tur]) || 'BOSS') + ' ☠')
    : `${T().bolgeAd[(D.bolge-1)%4]} · ${D.bolge}-${D.bolum} · ${T().encAd[Math.min(5,Math.max(1,D.bolum))-1]}`;
  duyuruE.style.opacity = '1';
  clearTimeout(duyuruE._t);
  duyuruE._t = setTimeout(()=>{ duyuruE.style.opacity = '0'; }, 1800);
}
if(!ENV.malzeme) ENV.malzeme = {okcu:0,brute:0,mage:0,priest:0};
if(!('altin' in ENV)) ENV.altin = 0;
if(!('ocak' in ENV)) ENV.ocak = 0;
if(!ENV.depo) ENV.depo = {okcu:[], brute:[], mage:[], priest:[]};
if(!('esik' in ENV)) ENV.esik = 2;   /* toplu işlem eşiği: bu nadirliğin ALTI etkilenir */
if(!ENV.oto) ENV.oto = {acik:false, mod:'esit'};   /* örs OTO ayarı */
if(!('auto' in ENV)) ENV.auto = true;              /* V2a: ulti otomatiği */
if(!ENV.durus) ENV.durus = 'normal';               /* V2a: takım duruşu */
if(!ENV.ist) ENV.ist = {kesim:0, boss:0, kosu:0, basma:0, kagit:0};   /* başarım sayaçları */
if(!ENV.zin) ENV.zin = {anahtar:3, son:Date.now()};   /* zindan anahtarları: 3 hak, 8 saatte 1 dolar */
if(!ENV.plan) ENV.plan = {hedef:'zayif', kosul:'sifaci', durus:'dengeli', durusK:true, sifa:'yarali', acil:true, ulti:'zor', diz:'standart'};
if(!('ad' in ENV)) ENV.ad = '';
if(!ENV.arena) ENV.arena = [];
if(!ENV.maxB) ENV.maxB = 1;   /* ulaşılan en yüksek bölge */
if(!ENV.uniq) ENV.uniq = {pity:{}};   /* unique avı acıma sayaçları (bölge başına) */
if(!('otoSat' in ENV)) ENV.otoSat = false;   /* beyaz dropları otomatik sat */
if(!ENV.bsr) ENV.bsr = {};   /* alınan başarım kademeleri */
if(!ENV.kagit){
  ENV.kagit = [0,0,0,0,0,0,0];
  let eski = 0;                              /* eski malzeme stoğu beyaz kağıda göçer */
  for(const k of ['okcu','brute','mage','priest']){ eski += ENV.malzeme[k]||0; ENV.malzeme[k]=0; }
  ENV.kagit[0] += eski;
}
const ITEM_FIYAT = [25, 100, 400, 1500, 6000, 25000, 0];   /* Unique satılmaz */
const KIRIM = [1,1,1,1,1,2,3,5,10,20,40];   /* eritme kağıdı: +5→2 … +8→10, +9→20, +10→40 */
const DEPO_KAP = 30;                          /* kahraman başına depo slotu */
function depoEkle(kim, it){
  if(ENV.depo[kim].length >= DEPO_KAP){
    ENV.kagit[it.n] += KIRIM[Math.min(it.b||0, 10)];   /* depo dolu: item kağıda dönüşür, emek kaybolmaz */
    return false;
  }
  ENV.depo[kim].push(it);
  return true;
}
const OCAK_MAX = 15;
/* her satır: [İyi, Nadir, Efsanevi, Mitik, Kadim, Unique] yüzdeleri — Normal kalan.
   L1 İyi %1 · L3 Nadir açılır · L5 Efsanevi · L8 Mitik · L11 Kadim · L14 Unique. Bosslarda hepsi ×3 */
const OCAK_TABLO = [
  [0,0,0,0,0,0], [1,0,0,0,0,0], [2,0,0,0,0,0], [3,0.5,0,0,0,0], [4,1,0,0,0,0],
  [5,1.5,0.25,0,0,0], [6,2.2,0.5,0,0,0], [7,3,0.8,0,0,0], [8,4,1.2,0.12,0,0],
  [9,5,1.7,0.25,0,0], [10,6,2.3,0.45,0,0], [11,7,3,0.7,0.06,0], [12,8,3.8,1.0,0.15,0],
  [13,9,4.7,1.4,0.3,0], [14,10,5.6,1.8,0.5,0.03], [15,11,6.5,2.2,0.7,0.08]
];
function ocakMaliyet(L){ return Math.round(300*Math.pow(1.55, L)); }
function altinYaz(v){ return v>=100000 ? Math.round(v/1000)+'k' : v>=1000 ? (v/1000).toFixed(1)+'k' : String(v); }
function s1n(kim){ const d=ENV.don[kim]; return (d && d.s1) ? d.s1.n : -1; }
function s2n(kim){ const d=ENV.don[kim]; return (d && d.s2) ? d.s2.n : -1; }
const ANA1 = [8,12,18,25,34,45,60];                                  /* Silah 1 ana hasar merdiveni */
function h1Kat(kim){ const n=s1n(kim); return n>=0 ? 1+ANA1[n]*bK(ENV.don[kim].s1)/100 : 1; }
function hiz1(kim){ return s1n(kim)>=1 ? 0.04 : 0; }        /* 2. satır: saldırı/cast hızı */
function skill1Kat(kim){ return (s1n(kim)>=2 ? 1.10 : 1) * (knn(kim)>=0 ? 1+KOLYE_ANA[knn(kim)]*bK(ENV.don[kim].k)/100 : 1); }
function ozel1(kim){ return s1n(kim)>=3; }                  /* 4. satır: Sekme/Parçala/Tutuşturma/Yargı */
function envKaydet(){ if(SLOT_SILINDI) return; try{ localStorage.setItem(sk('env'), JSON.stringify(ENV)); }catch(e){} }
function itemKat(kim){ return (s2n(kim)>=1 ? 1.03 : 1) * h1Kat(kim); }   /* iki silahın hasar çarpanı birlikte */
function nitelik3(kim){ return s2n(kim)>=2; }
function ozel(kim){ return s2n(kim)>=3; }
function okMenzil(){ return OK_MENZIL * (nitelik3('okcu') ? 1.08 : 1); }
const ZANA = [6,9,13,18,24,31,40];                                  /* zırh: max can merdiveni */
function zn(kim){ const d=ENV.don[kim]; return (d && d.z) ? d.z.n : -1; }
function canKat(kim){ const n=zn(kim); return n>=0 ? 1+ZANA[n]*bK(ENV.don[kim].z)/100 : 1; }
function yenilen(kim){ return zn(kim)>=1 ? 0.004 : 0; }    /* 2. satır: sn'de max %0,4 */
function dirilKat(kim){ return zn(kim)>=2 ? 0.8 : 1; }     /* 3. satır: diriliş −%20 */
function zOzel(kim){ return zn(kim)>=3; }
function kMax(kim){
  const taban = {okcu:OKCU_CAN, brute:BRUTE_CAN, mage:MAGE_CAN, priest:PRIEST_CAN}[kim];
  const k3 = (kim==='brute' && nitelik3('brute')) ? 1.06 : 1;   /* kalkanın can satırı */
  return Math.round(taban * k3 * canKat(kim));
}
function bruteMax(){ return kMax('brute'); }
const PANA = [4,6,9,12,15,18,22];                                    /* pelerin: hasar azaltma % */
function pn(kim){ const d=ENV.don[kim]; return (d && d.p) ? d.p.n : -1; }
function pHiz(kim){ return pn(kim)>=1 ? 0.05 : 0; }         /* 2. satır: hareket hızı */
function pSars(kim){ return pn(kim)>=2; }                   /* 3. satır: tepki −%40 */
function pOzel(kim){ return pn(kim)>=3; }
const KOLYE_ANA=[6,9,13,18,24,31,40], YUZUK_ANA=[5,8,12,16,20,25,31], KUPE_ANA=[5,8,12,16,20,25,30];
function knn(kim){ const d=ENV.don[kim]; return (d && d.k) ? d.k.n : -1; }
function yn2(kim){ const d=ENV.don[kim]; return (d && d.y) ? d.y.n : -1; }
function en2(kim){ const d=ENV.don[kim]; return (d && d.e) ? d.e.n : -1; }
function kOz(kim){ return knn(kim)>=3; }                    /* kolye efsanevi */
function imza(kim){ return yn2(kim)>=3; }                   /* yüzük efsanevi: imza skill CD yarı */
function cdSure(kim, v){
  return v * cdKat(kim) * (yn2(kim)>=0 ? Math.max(0.45, 1-YUZUK_ANA[yn2(kim)]*bK(ENV.don[kim].y)/100) : 1);
}
function atakHiz(kim){ return hiz1(kim) + (yn2(kim)>=1 ? 0.03 : 0); }
const KRIT_TEMEL = 1.6;
function kritSans(kim){
  let s = en2(kim)>=0 ? KUPE_ANA[en2(kim)]*bK(ENV.don[kim].e)/100 : 0;
  if(kim==='okcu' && typeof okcu!=='undefined' && okcu && (okcu.nisan||0)>0) s += 0.30;   /* Keskin Nişancı */
  return Math.min(0.75, s);
}
function kritCarp(kim){ return en2(kim)>=1 ? 1.8 : KRIT_TEMEL; }
const ULTI_ESIK = {okcu:60, brute:40, mage:45, priest:40};
function ultiSarj(kim){
  if(D.ulti[kim] >= 1) return;
  D.ulti[kim] = Math.min(1, D.ulti[kim] + (D.bossAktif?2:1)/ULTI_ESIK[kim]);
}
function krit(kim, m, hasar, skillMi){
  ultiSarj(kim);
  if(skillMi && en2(kim)<2) return hasar;                  /* skill kritiği 3. satır ister */
  if(Math.random() >= kritSans(kim)) return hasar;
  const h2 = hasar * kritCarp(kim);
  if(en2(kim)>=3 && m && m.durum!=='olu'){                  /* küpe efsanevileri */
    if(kim==='okcu') m.kanama = {sure: 2, dps: hasar*0.10};
    else if(kim==='brute'){ m.tepkiS = Math.max(m.tepkiS||0, 0.5); m.tepkiB = Math.max(m.tepkiB||0, 0.9); }
    else if(kim==='mage'){
      for(const m2 of D.moblar){
        if(m2===m || m2.durum==='olu') continue;
        if(m2.kok.position.distanceTo(m.kok.position) < 2.0) mobaVur(m2, h2*0.30);
      }
    } else if(kim==='priest'){
      let enK=null, enO=1;
      for(const kk of kahramanListesi())
        if(!kk.olu && kk.can/kk.max<enO){ enO=kk.can/kk.max; enK=kk.kim; }
      if(enK) canEkle(enK, h2);
    }
  }
  kritOldu = true;
  return h2;
}
function drOran(kim){
  let d = pn(kim)>=0 ? PANA[pn(kim)]*bK(ENV.don[kim].p)/100 : 0;
  if(kim==='brute' && pOzel('brute') && D.bruteCan/kMax('brute') < 0.30) d *= 2;      /* ★ Yıkılmaz */
  if(kim==='okcu' && pOzel('okcu') && okcu && okcu.mod==='kacis') d += 0.30;          /* ★ Gölge Adım */
  if(pOzel('priest') && priest && !priest.olu) d += 0.03;                             /* ★ Koruyucu Örtü */
  return Math.min(d, 0.65);
}
function cdKat(kim){ return nitelik3(kim) ? 0.92 : 1; }
function yankiCd(v){ return (ozel('mage') && Math.random()<0.12) ? 0.6 : v; }
function sadakHiz(){ const n=s2n('okcu');  return n>=0 ? SILAH2.okcu.ana[n]*bK(ENV.don.okcu.s2)/100  : 0; }
function okAralik(){ return OK_ARALIK/(1+sadakHiz()+atakHiz('okcu')); }
function blokSans(){ const n=s2n('brute'); return n>=0 ? Math.min(0.75, SILAH2.brute.ana[n]*bK(ENV.don.brute.s2)/100) : 0; }
function kureHiz(){  const n=s2n('mage');  return n>=0 ? SILAH2.mage.ana[n]*bK(ENV.don.mage.s2)/100  : 0; }
function mageHiz(){ return kureHiz() + atakHiz('mage'); }
function healKat(){  const n=s2n('priest');return n>=0 ? 1 + SILAH2.priest.ana[n]*bK(ENV.don.priest.s2)/100 : 1; }
function nadirlikSec(bossMu){
  const p = OCAK_TABLO[Math.min(ENV.ocak||0, OCAK_MAX)];
  const kat = bossMu ? 3 : 1;
  const r = Math.random()*100;
  let esik = 0;
  for(let n=6; n>=1; n--){
    esik += p[n-1]*kat;
    if(r < esik) return n;
  }
  return 0;
}
function bossOdul(){
  const p = OCAK_TABLO[Math.min(ENV.ocak||0, OCAK_MAX)];
  let acikEn = 0;
  for(let i=0;i<6;i++) if(p[i]>0) acikEn = i+1;
  return Math.max(nadirlikSec(true), Math.min(2, acikEn));   /* en az: Nadir'e kadar açık en yüksek */
}
const BASMA_MAX = 10;
/* [hedef, kağıt bedeli, başarı şansı, başarısızlıkta düşme şansı] */
const BASMA = [
  [1, 1, 1.00, 0   ], [2, 1, 1.00, 0   ], [3, 1, 1.00, 0   ],
  [4, 2, 0.90, 0.10], [5, 4, 0.80, 0.20], [6, 6, 0.60, 0.35],
  [7, 8, 0.40, 0.50], [8, 10, 0.30, 0.65], [9, 20, 0.20, 0.80],
  [10, 40, 0.10, 0.95]
];
let orsMesaj = '';
function basmaDene(kim, slot){
  const it = ENV.don[kim][slot];
  if(!it || (it.b||0) >= BASMA_MAX) return;
  const [hedef, bedel, sans, dusme] = BASMA[it.b||0];
  const L = T();
  if(ENV.kagit[it.n] < bedel){ orsMesaj = '✖ ' + L.ors.yok; return; }
  ENV.kagit[it.n] -= bedel;
  if(Math.random() < sans){
    it.b = (it.b||0) + 1;
    orsMesaj = '✔ ' + L.ors.basari + ' +' + it.b;
  } else if(Math.random() < dusme){
    it.b = Math.max(0, (it.b||0) - 1);
    orsMesaj = '✖ ' + L.ors.kirik + ' (+' + (it.b||0) + ')';
  } else {
    orsMesaj = '✖ ' + L.ors.kaldi;
  }
  envKaydet();
  panelYenile();
  try{ rozetGuncelle(); }catch(e){}
}
function itemVer(kim, n, poz){
  if(poz) SES.loot(n);
  if(poz && n>=1)
    sayiGoster(poz, (T().nadirlik[n]||'').toUpperCase(), 'syL', 2.7, NAD_RENK[n]);   /* P6: loot kimliği sahnede */
  const r7 = Math.random();
  const slot = r7<0.18 ? 's1' : r7<0.36 ? 's2' : r7<0.54 ? 'z' : r7<0.72 ? 'p'
             : r7<0.8133 ? 'k' : r7<0.9067 ? 'y' : 'e';
  const mev = ENV.don[kim][slot];
  if(!mev || n > mev.n){
    if(mev) depoEkle(kim, {slot, n: mev.n, b: mev.b||0});   /* eskisi depoya iner */
    ENV.don[kim][slot] = {n, b:0};
  }
  else if(ENV.otoSat && n === 0) ENV.altin += ITEM_FIYAT[0];   /* beyaz oto-sat açık */
  else depoEkle(kim, {slot, n, b:0});                        /* yenisi depoya */
  envKaydet();
  const nRenk = new THREE.Color(NAD_RENK[n] || '#ffe08a');
  const hlk = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.5, 20),
    new THREE.MeshBasicMaterial({color: nRenk, transparent:true, opacity:0.95, side:THREE.DoubleSide}));
  hlk.rotation.x = -Math.PI/2;
  hlk.position.set(poz.x, 0.07, poz.z);
  sahne.add(hlk);
  D.efektler.push({kok:hlk, omur:0.8, tip:'heal'});
  if(n < 3){                                   /* V1f: düşük kademelerde kısa, ince beam */
    const bm2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.15, 1.7, 8, 1, true),
      new THREE.MeshBasicMaterial({color: nRenk, transparent:true, opacity:0.6, side:THREE.DoubleSide, depthWrite:false}));
    bm2.position.set(poz.x, 0.9, poz.z);
    sahne.add(bm2);
    D.efektler.push({kok: bm2, omur: 1.0, tip:'sutun'});
  }
  {                                            /* V1f: yerde dönen ganimet → envantere uçuş */
    const gn = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.15, 0),
      new THREE.MeshBasicMaterial({color: nRenk, transparent: true, opacity: 0.95}));
    gn.position.set(poz.x, 0.4, poz.z);
    sahne.add(gn);
    D.efektler.push({kok: gn, omur: 1.7, tip:'ganimet', tabanY: 0.4});
  }
  if(n===6){                                   /* UNIQUE: duyuru */
    duyuruE.textContent = '✦ UNIQUE! ✦';
    duyuruE.style.opacity = '1';
    clearTimeout(duyuruE._t);
    duyuruE._t = setTimeout(()=>{ duyuruE.style.opacity='0'; }, 2400);
  }
  if(n>=3){                                    /* Efsanevi+: ışık sütunu, kademe rengiyle */
    const sut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.36, 4.4, 10, 1, true),
      new THREE.MeshBasicMaterial({color: n>=6 ? 0xfff3c4 : n>=5 ? 0x4de8d2 : n>=4 ? 0xff5f4d : 0xffd27a,
        transparent:true, opacity:0.85, side:THREE.DoubleSide, depthWrite:false}));
    sut.position.set(poz.x, 2.2, poz.z);
    sahne.add(sut);
    D.efektler.push({kok:sut, omur:1.5, tip:'sutun'});
  }
  if(typeof bildirimler !== 'undefined' && bildirimler[kim]) bildirimler[kim].style.display='block';
  try{ rozetGuncelle(); }catch(e){}
}
function dropDene(m){
  if(D.zindan) return;                                 /* uzun oyun testi: pity sayacı zindan yasağını deliyordu */
  const sans = Math.min(1, ((m.tur==='mutant' || m.tur==='rhino') ? 0.12 : 0.06) * HIZ);
  D.dropKuru = (D.dropKuru||0) + 1;
  if(Math.random() < sans || D.dropKuru >= 26){
    D.dropKuru = 0;
    itemVer(KIMLER[Math.random()*4|0], nadirlikSec(m.bossMu), m.kok.position);
  }
}
function sevEsik(s){ return 6 + (s-1)*4; }   // seviye başına gereken kesim
const rozet = document.getElementById('rozet');
rozet.style.cursor = 'pointer';
rozet.addEventListener('click', ()=>{
  if(D.zindan) return;
  genelAc('bolumsec');
});
const orsAcBtn = document.getElementById('orsAc');
const hizliOrsE = document.getElementById('hizliOrs');
/* Örs aç/kapa TEK KAPIDAN geçer: hem ray düğmesi hem panelin kendi
   kapatma düğmesi buraya bağlanır. Gövdeye 'ors-acik' sınıfı basılır ki
   CSS düğmeyi panelin üstünde tutabilsin. */
function orsAyarla(ac){
  if(!ac){
    hizliOrsE.style.display = 'none';
    if(hoZaman){ clearInterval(hoZaman); hoZaman = null; }
  } else {
    hizliOrsE.style.display = 'block';
    hoCiz();
    if(hoZaman) clearInterval(hoZaman);
    hoZaman = setInterval(()=>{
      if(hizliOrsE.style.display==='none' || basKilit) return;
      hoCiz();
      if(ENV.oto.acik) otoAdim();
    }, 2500);
  }
  document.body.classList.toggle('ors-acik', !!ac);
}
orsAcBtn.addEventListener('click', ()=>{
  orsAyarla(hizliOrsE.style.display === 'none');
});
document.getElementById('hoKapat').addEventListener('click', (e)=>{
  e.stopPropagation();
  orsAyarla(false);
});
const bsrRayBtn = document.querySelector('.rayBtn[data-p="basarimlar"]');
const zinRayBtn = document.querySelector('.rayBtn[data-p="zindan"]');
setInterval(()=>{ try{
  zinYenile();
  orsAcBtn.classList.toggle('hazir', hoHazirVar());
  bsrRayBtn.classList.toggle('hazir', bsrHazir());
  zinRayBtn.classList.toggle('hazir', ENV.zin.anahtar > 0 && !D.zindan);
}catch(e){} }, 1500);
const gucRozet = document.getElementById('gucRozet');
const altinRozet = document.getElementById('altinRozet');
const duyuruE = document.getElementById('duyuru');
const okCanE = document.getElementById('okCan'), okSarjE = document.getElementById('okSarj');
const barY = {};
for(const bid of ['okCanY','okSarjY','brCanY','brSarjY','mgCanY','mgSarjY','prCanY','prSarjY'])
  barY[bid] = document.getElementById(bid);
const brCanE = document.getElementById('brCan'), brSarjE = document.getElementById('brSarj');
const mgCanE = document.getElementById('mgCan'), mgSarjE = document.getElementById('mgSarj');
const prCanE = document.getElementById('prCan'), prSarjE = document.getElementById('prSarj');
function kahramanaVur(kim, hasar){
  if(D.hasarIz && D.hasarIz[kim] !== undefined) D.hasarIz[kim] += hasar;   /* saldırı baskısı izi */
  if(D.zindan && D.zindan.tip==='uniq') hasar *= D.zindan.vurK;   /* unique zorluk çarpanı */
  if(D.ilahi > 0) hasar *= 0.5;                        /* ★ İlahi Müdahale */
  hasar *= (1 - drOran(kim));           /* pelerin: hasar azaltma */
  hasar *= durusSavK();                                /* V2a: duruş savunması */
  if(D.kalkan && D.kalkan.kim===kim){
    const em = Math.min(D.kalkan.mik, hasar);
    D.kalkan.mik -= em; hasar -= em;
    if(D.kalkan.mik<=0) D.kalkan = null;
    if(hasar<=0) return;
  }
  if(kim==='brute'){
    if(!brute || brute.olu) return;
    if((brute.duvar||0) > 0) hasar *= 0.3;             /* ★ Kalkan Duvarı */
    if(blokSans()>0 && Math.random() < blokSans()){
      const bloklanan = hasar * 0.6;
      hasar *= 0.4;                     /* blok: hasarın %60'ı silinir */
      if(ozel('brute')){
        let enY=null, enU=2.4;          /* ★ Diken: bloklananın %25'i en yakın saldırgana */
        for(const m2 of D.moblar){
          if(m2.durum==='olu') continue;
          const u2 = m2.kok.position.distanceTo(brute.kok.position);
          if(u2<enU){ enU=u2; enY=m2; }
        }
        if(enY) mobaVur(enY, bloklanan*0.25);
      }
      sayiGoster(brute.kok.position, 'BLOK', 'syB', 2.0);
      skillHalka(brute.kok.position, 0x9fd4ff);          /* blok parıltısı */
      if(brute.durum==='bekle' && brute.tepkiS<=0){
        const ab = bruteOynat('17_BLOCK_HIT', true);
        brute.tepkiS = Math.min(ab.getClip().duration, 0.7);
      }
    }
    if(hasar>=1) sayiGoster(brute.kok.position, '-'+Math.round(hasar), 'syH', 2.0);
    D.bruteCan -= hasar;
    if(D.bruteCan<=0){
      if(zOzel('brute') && D.sonDirenis<=0){ D.bruteCan = 1; D.sonDirenis = 60; }   /* ★ Son Direniş */
      else { D.bruteCan=0; bruteOl(); }
    }
    else if(brute.durum==='bekle' && brute.tepkiB<=0){
      brute.tepkiB = 1.0;
      const a = bruteOynat('18_HIT_GUT', true);
      if(pSars('brute')) a.timeScale = 1.67;
      brute.tepkiS = Math.min(a.getClip().duration, 0.8) * (pSars('brute')?0.6:1);
    }
  } else if(kim==='mage'){
    if(!mage || mage.olu) return;
    if(pOzel('mage')){                    /* ★ İntikam: her vuruşta skill CD'leri 0,8 sn kısalır */
      for(const c of [D.cd, D.cd2, D.cd3]) if(c.mage>0) c.mage = Math.max(0, c.mage-0.8);
    }
    if(hasar>=1) sayiGoster(mage.kok.position, '-'+Math.round(hasar), 'syH', 1.9);
    D.mageCan -= hasar;
    if(D.mageCan<=0){ D.mageCan=0; mageOl(); }
    else if(!mage.buyu && !mage.tepki && mage.tepkiB<=0){
      mage.tepkiB = 1.0;
      mage.tepki = mageOynat('19_FLINCH_FRONT', true);
      if(pSars('mage')) mage.tepki.timeScale = 1.67;
    }
  } else if(kim==='priest'){
    if(!priest || priest.olu) return;
    if(zOzel('priest') && hasar>0){                   /* ★ Adanmışlık: %20'si en yaralıya */
      let enK=null, enO=1;
      for(const kk of kahramanListesi())
        if(!kk.olu && kk.kim!=='priest' && kk.can/kk.max<enO){ enO=kk.can/kk.max; enK=kk.kim; }
      if(enK) canEkle(enK, hasar*0.2);
    }
    if(hasar>=1) sayiGoster(priest.kok.position, '-'+Math.round(hasar), 'syH', 1.9);
    D.priestCan -= hasar;
    if(D.priestCan<=0){ D.priestCan=0; priestOl(); }
    else if(!priest.is && !priest.tepki && priest.tepkiB<=0){
      priest.tepkiB = 1.0;
      priest.tepki = priestOynat('19_FLINCH_FRONT', true);
      if(pSars('priest')) priest.tepki.timeScale = 1.67;
    }
  } else {
    if(okcu.olu) return;
    if((okcu.kacinma||0) > 0 || (zOzel('okcu') && Math.random()<0.12)){ sayiGoster(okcu.kok.position, 'MISS', 'syB', 1.9); return; }   /* ★ Kaçınma / Geri Takla */
    if(hasar>=1) sayiGoster(okcu.kok.position, '-'+Math.round(hasar), 'syH', 1.9);
    D.okcuCan -= hasar;
    if(D.okcuCan<=0){ D.okcuCan=0; okcuOl(); }
    else if(okcu.tepkiB<=0 && okcu.aktif===okcu.idle){
      okcu.tepkiB = 1.0;
      { const aT = okcuOynat('14_HIT_REACT', true); if(pSars('okcu')) aT.timeScale = 1.67; }
    }
  }
}
function okcuOl(){
  okcu.olu = true; okcu.dirilme = DIRILME_SN*dirilKat('okcu');
  okcu.kilit = null; okcu.bekleyen = null; okcu.yagmurP = null;   /* HATA DÜZELTMESİ: bayat yağmur noktası */
  okcuOynat('15_DEATH', true);
  for(const m of D.moblar) if(m.hedefKim==='okcu') m.hedefSayac = 0;
  yenilgiKontrol();
}
function bruteOl(){
  brute.olu = true; brute.dirilme = DIRILME_SN*dirilKat('brute');
  brute.kilit = null; brute.vuruslar = null; brute.durum = 'olu';
  /* 90_OLUM: okçunun ölüm klibi delta düzeltmeli retarget ile brute
     iskeletine aktarıldı — gerçek yığılma animasyonu */
  bruteOynat('90_OLUM', true);
  for(const m of D.moblar) if(m.hedefKim==='brute') m.hedefSayac = 0;
  yenilgiKontrol();
}
function bruteSeffaf(o){
  brute.kok.traverse(n=>{
    if(n.isMesh){ n.material.transparent = o < 1; n.material.opacity = o; }
  });
}
function yenilgiKontrol(){
  if(okcu.olu && (!brute || brute.olu) && (!mage || mage.olu) && (!priest || priest.olu)) oyunBitti();
}
/* kahraman listesi: heal hedef seçimi ve can işlemleri için tek yer */
function kahramanListesi(){
  const L = [{kim:'okcu', olu: okcu.olu, can: D.okcuCan, max: kMax('okcu'), p: okcu.kok.position}];
  if(brute) L.push({kim:'brute', olu: brute.olu, can: D.bruteCan, max: bruteMax(), p: brute.kok.position});
  if(mage)  L.push({kim:'mage',  olu: mage.olu,  can: D.mageCan,  max: kMax('mage'),  p: mage.kok.position});
  if(priest)L.push({kim:'priest',olu: priest.olu,can: D.priestCan,max: kMax('priest'),p: priest.kok.position});
  return L;
}
/* Kalkan EN ÇOK HASAR ALANA gider — en düşük can oranına DEĞİL.
   Eskiden can oranı bakılıyordu: okçu tek sıyrık alınca oranı en düşük
   olabiliyor ve kalkan ona gidiyordu, halbuki dayağı yiyen brute'du.
   Ölçü artık son hasar izi; hiç kimse hasar almadıysa eski davranışa
   düşülür (yaralı varsa ona). */
function kalkanHedefBul(){
  const L = kahramanListesi().filter(k=>!k.olu);
  if(!L.length) return null;
  const iz = (k)=> (D.hasarIz && D.hasarIz[k.kim]) || 0;
  const dovulen = L.filter(k=> iz(k) > 0).sort((a,b)=> iz(b) - iz(a));
  if(dovulen.length) return dovulen[0];
  const zayif = L.slice().sort((a,b)=> a.can/a.max - b.can/b.max);
  return zayif[0].can/zayif[0].max < 1.0 ? zayif[0] : null;
}
function kahramanDirilt(kim){
  if(kim==='okcu' && okcu.olu){
    okcu.olu=false; okcu.dirilme=0; D.okcuCan=kMax('okcu')*(kOz('priest')?1:0.5);
    okcuOynat('01_IDLE'); healEfekt(okcu.kok.position);
  } else if(kim==='brute' && brute && brute.olu){
    brute.olu=false; brute.dirilme=0; D.bruteCan=bruteMax()*(kOz('priest')?1:0.5);
    brute.durum='don'; bruteOynat('01_IDLE'); healEfekt(brute.kok.position);
  } else if(kim==='mage' && mage && mage.olu){
    mage.olu=false; mage.dirilme=0; D.mageCan=kMax('mage')*(kOz('priest')?1:0.5);
    mageOynat('01_IDLE'); healEfekt(mage.kok.position);
  }
}
function canEkle(kim, mik){
  const mx = {okcu:kMax('okcu'), brute:kMax('brute'), mage:kMax('mage'), priest:kMax('priest')}[kim];
  const alan = {okcu:'okcuCan', brute:'bruteCan', mage:'mageCan', priest:'priestCan'}[kim];
  mik *= (knn(kim)>=1 ? 1.06 : 1);        /* kolye 2. satır: şifa alımı */
  if(mik>=5 && !D.bitti){
    const kp = {okcu, brute, mage, priest}[kim];
    if(kp) sayiGoster(kp.kok.position, '+'+Math.round(mik), 'syI', 2.0);
  }
  const yeni = D[alan] + mik;
  if(yeni > mx && ozel('priest')){       /* ★ Taşkın: taşan şifa kalkana */
    const tasan = Math.min(yeni - mx, mx*0.30);
    if(!D.kalkan) D.kalkan = {kim, mik: tasan};
    else if(D.kalkan.kim === kim) D.kalkan.mik = Math.min(D.kalkan.mik + tasan, mx*0.40);
  }
  D[alan] = Math.min(mx, yeni);
}
function dirilisGuncelle(dt){
  if(okcu.olu){
    okcu.dirilme -= dt;
    if(okcu.dirilme <= 0){
      okcu.olu = false; D.okcuCan = kMax('okcu');
      okcuOynat('01_IDLE');
    }
  }
  if(brute && brute.olu){
    brute.dirilme -= dt;
    if(brute.dirilme <= 0){
      brute.olu = false; D.bruteCan = bruteMax();
      brute.durum = 'don'; bruteOynat('01_IDLE');
    }
  }
  if(mage && mage.olu){
    mage.dirilme -= dt;
    if(mage.dirilme <= 0){
      mage.olu = false; D.mageCan = kMax('mage');
      mageOynat('01_IDLE');
    }
  }
  if(priest && priest.olu){
    priest.dirilme -= dt;
    if(priest.dirilme <= 0){
      priest.olu = false; D.priestCan = kMax('priest');
      priestOynat(PRIEST_IDLE);
    }
  }
}
const kartIkonlar = document.querySelectorAll('.kartIkon');
const sevYazilar = document.querySelectorAll('.sevYazi');
const artiBtnler = document.querySelectorAll('.artiBtn');
const expSvE = document.getElementById('expSv');
const expBarE = document.getElementById('expBar');
const KIMLER = ['okcu','brute','mage','priest'];   // kart sırası
const skillKutular = document.querySelectorAll('.skillKutu');
function puanVerilebilir(kim){
  if(D.puan<=0) return false;
  if(D.skill[kim] >= skillTavan(kim)) return true;      /* tavandan sonra: geliştirme kademesi */
  const digerMin = Math.min(...KIMLER.filter(k=>k!==kim).map(k=>D.skill[k]));
  return (D.skill[kim]+1) - digerMin <= 2;
}
function gelK(kim){ return 1 + 0.06*(D.gel[kim]||0); }   /* kademe: skill etkileri +%6 */
function sevArayuz(){
  expSvE.textContent = T().seviye + ' ' + D.seviye;
  expBarE.style.width = Math.min(100, D.sevKesim/sevEsik(D.seviye)*100) + '%';
  sevYazilar.forEach((s,i)=>{
    const p = D.skill[KIMLER[i]], g = D.gel[KIMLER[i]]||0;
    s.textContent = g>0 ? p+'★'+g : p;
    s.style.display = p>0 ? 'flex' : 'none';
  });
  for(const b of artiBtnler)
    b.classList.toggle('gorunur', puanVerilebilir(b.dataset.kim));
}
sevArayuz();
for(const b of artiBtnler){
  b.addEventListener('click', (e)=>{
    e.stopPropagation();               /* kart paneli açılmasın */
    const kim = b.dataset.kim;
    if(!puanVerilebilir(kim)) return;
    if(D.skill[kim] >= skillTavan(kim)) D.gel[kim] = (D.gel[kim]||0) + 1;
    else D.skill[kim]++;
    D.puan--; lvlKaydet();
    sevArayuz();
  });
}
/* ═══ karakter paneli ═══ */
const KAHRAMAN_AD = {okcu:'Okçu', brute:'Warrior', mage:'Büyücü', priest:'Priest'};
const TABAN_ITEM = {
  okcu:  {ad:'Acemi Yayı',    em:'🏹', hasar:26, tur:'Fiziksel Hasar',
          satir:'Atış aralığı 1,05 sn · Menzil 20,4 m',
          soz:'Köy yapımı; cılız ama seni hiç yarı yolda bırakmadı.'},
  brute: {ad:'Acemi Baltası', em:'🪓', hasar:24, tur:'Fiziksel Hasar',
          satir:'Yakın dövüş · Erişim 1,85 m · Kombo yeteneği',
          soz:'Ağzı körelmiş; sahibinin öfkesi keskin.'},
  mage:  {ad:'Acemi Asası',   em:'🪄', hasar:34, tur:'Büyü Hasarı',
          satir:'Mermi hızı 20 m/sn · Menzil 18,7 m',
          soz:'Çarpık bir dal; içinden ne geçtiğini kimse bilmiyor.'},
  priest:{ad:'Acemi Topuzu',  em:'🔨', hasar:38, tur:'Kutsal Hasar',
          satir:'Menzil 18,7 m · Şifa büyülerini taşır',
          soz:'Başındaki taş, üç neslin duasını dinledi.'}
};
const ITEM_SVG = {
 's1_okcu': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="none" stroke="#e3c06a" stroke-width="2" d="M7 3c6 2 9 8 9 9s-3 7-9 9"/><path stroke="#f0e2b8" stroke-width="1" d="M7 3L7 21"/><path fill="#8a6a2c" d="M6 11h11l-2.4-1.6v3.2L17 11z" transform="translate(1.5 1)"/><path fill="#8a6a2c" d="M4 10.8h9.5v2.4H4z"/><path fill="#e3c06a" d="M17.5 10l3.5 2-3.5 2v-4zM3 10.5L5.5 12 3 13.5v-3z"/></svg>',
 's1_brute': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><rect x="11" y="4" width="2.4" height="17" rx="1" fill="#8a6a2c"/><path fill="#e3c06a" d="M12.2 3C8 4 5.5 6.5 4.5 10c2.6-1.2 5.2-1.6 7.7-1.2V3zm0 0c4.2 1 6.7 3.5 7.7 7-2.6-1.2-5.2-1.6-7.7-1.2V3z"/><rect x="10.4" y="19" width="3.6" height="2.4" rx="1" fill="#e3c06a"/></svg>',
 's1_mage': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><rect x="11" y="7" width="2" height="15" rx="1" fill="#8a6a2c" transform="rotate(6 12 14)"/><circle cx="12.6" cy="5.6" r="3" fill="#e3c06a"/><circle cx="11.6" cy="4.7" r="0.9" fill="#f0e2b8"/><path fill="#8a6a2c" d="M9.6 7.8l2-2.8 3 .6 1 2.6-2.8 1.4z" opacity=".45"/></svg>',
 's1_priest': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><rect x="11" y="8" width="2.2" height="14" rx="1" fill="#8a6a2c"/><path fill="#e3c06a" d="M8 3h8.2l1.6 3-1.6 3H8L6.4 6 8 3z"/><rect x="10.8" y="2" width="2.6" height="1.6" fill="#f0e2b8"/></svg>',
 's2_okcu': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="#e3c06a" d="M8 8h8l-1.4 14H9.4L8 8z"/><path fill="#8a6a2c" d="M8.6 10.5h6.8l-.25 2.4H8.85z"/><g stroke="#8a6a2c" stroke-width="1.6"><path d="M10 8V3.6M12 8V2.6M14 8V3.6"/></g><path fill="#f0e2b8" d="M9.2 3.8L10 1.8l.8 2zM11.2 2.8L12 .8l.8 2zM13.2 3.8L14 1.8l.8 2z"/></svg>',
 's2_brute': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="#e3c06a" d="M5 4h14v9c0 4-3 7.4-7 9-4-1.6-7-5-7-9V4z"/><path fill="#8a6a2c" d="M12 6.5l4.5 2.6v3.2L12 15l-4.5-2.7V9.1L12 6.5z"/><circle cx="12" cy="10.8" r="1.6" fill="#f0e2b8"/></svg>',
 's2_mage': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><circle cx="12" cy="10" r="6" fill="#e3c06a"/><circle cx="10.2" cy="8.2" r="1.6" fill="#f0e2b8"/><path fill="#8a6a2c" d="M7 17.5h10l1.4 3.5H5.6L7 17.5z"/><path fill="#8a6a2c" d="M9.5 15.5h5v2.5h-5z"/></svg>',
 's2_priest': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="#8a6a2c" d="M5 4h6.6v17H6.4A1.4 1.4 0 015 19.6V4z"/><path fill="#e3c06a" d="M12 4h7v15.6A1.4 1.4 0 0117.6 21H12V4z"/><path fill="#f0e2b8" d="M14 8h2v2.4h2.2v2H16V15h-2v-2.6h-2.2v-2H14V8z"/></svg>',
 'z': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="#e3c06a" d="M8 4l4-1.6L16 4l4 2.4-1.6 3.4-1.4-.6V21H7V9.2l-1.4.6L4 6.4 8 4z"/><path fill="#8a6a2c" d="M12 5.4c1.4 2 1.4 4.4 0 6.6-1.4-2.2-1.4-4.6 0-6.6zM8.6 13h6.8v1.8H8.6z"/></svg>',
 'p': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="#e3c06a" d="M12 3c-4 1.6-6.4 4.6-6.8 9-.3 3.4.4 6.6 1.8 9.5 1-1.6 2.2-2.4 3.6-2.5-.6-3.8-.4-7.6.6-11.4l.8-4.6zm0 0c4 1.6 6.4 4.6 6.8 9 .3 3.4-.4 6.6-1.8 9.5-1-1.6-2.2-2.4-3.6-2.5.6-3.8.4-7.6-.6-11.4L12 3z"/><circle cx="12" cy="4.6" r="1.7" fill="#f0e2b8"/><path fill="#8a6a2c" d="M11 6h2c.8 4 .8 8.2 0 12.6h-2C10.2 14.2 10.2 10 11 6z"/></svg>',
 'k': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="none" stroke="#e3c06a" stroke-width="1.8" stroke-dasharray="2.5 1.6" d="M4 4c1.6 5.4 4.3 8.4 8 9 3.7-.6 6.4-3.6 8-9"/><path fill="#8a6a2c" d="M12 13.4l3 3.4-3 4.6-3-4.6 3-3.4z"/><path fill="#f0e2b8" d="M12 15l1.5 1.7L12 19l-1.5-2.3L12 15z"/></svg>',
 'y': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><circle cx="12" cy="14" r="6.2" fill="none" stroke="#e3c06a" stroke-width="2.6"/><path fill="#8a6a2c" d="M12 2.6l3.4 3.2L12 9.2 8.6 5.8 12 2.6z"/><path fill="#f0e2b8" d="M12 4.3l1.7 1.5L12 7.5l-1.7-1.7L12 4.3z"/></svg>',
 'e': '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="none" stroke="#e3c06a" stroke-width="1.8" d="M13 3c2.8 0 3.6 3 1.6 4.4"/><circle cx="12.5" cy="11" r="4" fill="none" stroke="#e3c06a" stroke-width="2"/><path fill="#8a6a2c" d="M12.5 14.6l2.4 2.6-2.4 3.8-2.4-3.8 2.4-2.6z"/><circle cx="12.5" cy="17.6" r="1" fill="#f0e2b8"/></svg>'
};
function IIK(kim, slot){                                /* ENC-5a: item ikonları — emojiler emekli */
  if(slot==='s1' || slot==='s2') return ITEM_SVG[slot + '_' + kim];
  return ITEM_SVG[slot] || '';
}
const SLOT_ADLAR = {
  okcu:['Sadak'], brute:['Kalkan'], mage:['Küre'], priest:['Kutsal Kitap']
};
const panelE = document.getElementById('panel');
const panelIc = document.getElementById('panelIc');
const panelAdE = document.getElementById('panelAd');
const panelIkonE = document.getElementById('panelIkon');
let panelKim = null;
function envanterCiz(kim){
  const L = T();
  const t = TABAN_ITEM[kim], tm = L.tabanItem[kim];
  let s = '<div id="envGrid">';
  const d1 = ENV.don[kim].s1;
  const satirG = (acikMi, ic, kademe) => acikMi
    ? `<div class="nSatir">${ic}</div>`
    : `<div class="nSatir kilitli">🔒 ${ic} · ${L.acilir[kademe]}</div>`;
  if(d1){
    s += `<div class="itemKart" style="border-color:${NAD_RENK[d1.n]}55">
      <div class="itemGorsel">${IIK(kim,'s1')}</div>
      <div class="itemAd">${(d1.b?'+'+d1.b+' ':'')}${L.silah1[kim]}</div>
      <div class="nadirlik" style="color:${NAD_RENK[d1.n]}">${L.nadirlik[d1.n]}</div>
      <div class="itemStat"><b>+%${ANA1[d1.n]}</b><span>${L.satir2}</span></div>
      ${satirG(d1.n>=1, `${L.silah2[kim].anaAd} <b>+%4</b>`, 1)}
      ${satirG(d1.n>=2, `${L.satir3s1[kim]} <b>+%10</b>`, 2)}
      ${satirG(d1.n>=3, `<span class="oz">★ ${L.ozel1[kim][0]}</span> — ${L.ozel1[kim][1]}`, 3)}

    </div>`;
  } else {
    s += `<div class="itemKart">
      <div class="itemGorsel">${IIK(kim,'s1')}</div>
      <div class="itemAd">${tm.ad}</div>
      <div class="nadirlik taban">${L.taban}</div>
      <div class="itemStat"><b>${t.hasar}</b><span>${tm.tur}</span></div>
      <div class="itemSatir">${tm.satir}</div>
      <div class="itemSoz">${tm.soz}</div>
    </div>`;
  }
  const s2 = ENV.don[kim].s2;
  if(s2){
    const S = SILAH2[kim], sm = L.silah2[kim];
    const u3 = {okcu:'+%8', brute:'+%6', mage:'−%8', priest:'−%8'}[kim];
    s += `<div class="itemKart" style="border-color:${NAD_RENK[s2.n]}55">
      <div class="itemGorsel">${IIK(kim,'s2')}</div>
      <div class="itemAd">${(s2.b?'+'+s2.b+' ':'')}${sm.ad}</div>
      <div class="nadirlik" style="color:${NAD_RENK[s2.n]}">${L.nadirlik[s2.n]}</div>
      <div class="itemStat"><b>+%${S.ana[s2.n]}</b><span>${sm.anaAd}</span></div>
      ${satirG(s2.n>=1, `${L.satir2} <b>+%3</b>`, 1)}
      ${satirG(s2.n>=2, `${L.satir3[kim]} <b>${u3}</b>`, 2)}
      ${satirG(s2.n>=3, `<span class="oz">★ ${L.ozel[kim][0]}</span> — ${L.ozel[kim][1]}`, 3)}

    </div>`;
  } else {
    s += `<div class="bosKart"><div class="bosAd">${L.silah2[kim].ad} ${L.silah2ek}</div><div class="bosNot">${L.bosNot}</div></div>`;
  }
  const dp = ENV.don[kim].p;
  const dz = ENV.don[kim].z;
  const ZEM = {okcu:'🧥', brute:'⛓️', mage:'👘', priest:'⚜️'};
  if(dz){
    s += `<div class="itemKart" style="border-color:${NAD_RENK[dz.n]}55">
      <div class="itemGorsel">${IIK(kim,'z')}</div>
      <div class="itemAd">${(dz.b?'+'+dz.b+' ':'')}${L.zirhAd[kim]}</div>
      <div class="nadirlik" style="color:${NAD_RENK[dz.n]}">${L.nadirlik[dz.n]}</div>
      <div class="itemStat"><b>+%${ZANA[dz.n]}</b><span>${L.zSatir1}</span></div>
      ${satirG(dz.n>=1, `${L.zSatir2} <b>+%0,4/sn</b>`, 1)}
      ${satirG(dz.n>=2, `${L.zSatir3} <b>−%20</b>`, 2)}
      ${satirG(dz.n>=3, `<span class="oz">★ ${L.ozelZ[kim][0]}</span> — ${L.ozelZ[kim][1]}`, 3)}

    </div>`;
  } else {
    s += `<div class="bosKart"><div class="bosAd">${L.slot.zirh}</div><div class="bosNot">${L.bosNot}</div></div>`;
  }
  if(dp){
    s += `<div class="itemKart" style="border-color:${NAD_RENK[dp.n]}55">
      <div class="itemGorsel">${IIK(kim,'p')}</div>
      <div class="itemAd">${(dp.b?'+'+dp.b+' ':'')}${L.pelerinAd[kim]}</div>
      <div class="nadirlik" style="color:${NAD_RENK[dp.n]}">${L.nadirlik[dp.n]}</div>
      <div class="itemStat"><b>−%${PANA[dp.n]}</b><span>${L.pSatir1}</span></div>
      ${satirG(dp.n>=1, `${L.pSatir2} <b>+%5</b>`, 1)}
      ${satirG(dp.n>=2, `${L.pSatir3}`, 2)}
      ${satirG(dp.n>=3, `<span class="oz">★ ${L.ozelP[kim][0]}</span> — ${L.ozelP[kim][1]}`, 3)}

    </div>`;
  } else {
    s += `<div class="bosKart"><div class="bosAd">${L.slot.pelerin}</div><div class="bosNot">${L.bosNot}</div></div>`;
  }
  const taki = (d2, em, adT, st1, deger, s2m, s3m, oz2) => {
    if(!d2) return `<div class="bosKart"><div class="bosAd">${adT}</div><div class="bosNot">${L.bosNot}</div></div>`;
    return `<div class="itemKart" style="border-color:${NAD_RENK[d2.n]}55">
      <div class="itemGorsel">${em}</div>
      <div class="itemAd">${adT}</div>
      <div class="nadirlik" style="color:${NAD_RENK[d2.n]}">${L.nadirlik[d2.n]}</div>
      <div class="itemStat"><b>${deger}</b><span>${st1}</span></div>
      ${satirG(d2.n>=1, s2m, 1)}
      ${satirG(d2.n>=2, s3m, 2)}
      ${satirG(d2.n>=3, `<span class="oz">★ ${oz2[0]}</span> — ${oz2[1]}`, 3)}

    </div>`;
  };
  const dk2=ENV.don[kim].k, dy2=ENV.don[kim].y, de2=ENV.don[kim].e;
  s += taki(dk2, IIK(kim,'k'), dk2?(dk2.b?'+'+dk2.b+' ':'')+L.kolyeAd[kim]:L.slot.kolye, L.kSatir1, dk2?`+%${KOLYE_ANA[dk2.n]}`:'',
            `${L.kSatir2} <b>+%6</b>`, `${L.kSatir3} <b>+%25</b>`, L.ozelK[kim]);
  s += taki(dy2, IIK(kim,'y'), dy2?(dy2.b?'+'+dy2.b+' ':'')+L.yuzukAd[kim]:L.slot.yuzuk, L.ySatir1, dy2?`−%${YUZUK_ANA[dy2.n]}`:'',
            `${L.ySatir2} <b>+%3</b>`, `${L.ySatir3}`, L.ozelY[kim]);
  s += taki(de2, IIK(kim,'e'), de2?(de2.b?'+'+de2.b+' ':'')+L.kupeAd[kim]:L.slot.kupe, L.eSatir1, de2?`%${KUPE_ANA[de2.n]}`:'',
            `${L.eSatir2}`, `${L.eSatir3}`, L.ozelE[kim]);
  return s + '</div>';
}
function orsCiz(kim){
  const L = T();
  const adlar = {s1:()=>L.silah1[kim], s2:()=>L.silah2[kim].ad, z:()=>L.zirhAd[kim], p:()=>L.pelerinAd[kim],
                 k:()=>L.kolyeAd[kim], y:()=>L.yuzukAd[kim], e:()=>L.kupeAd[kim]};
  let s = `<div class="orsUst"><span>🔨 ${L.ors.baslik}</span><b>${ENV.kagit.map((v,i)=>`<span style="color:${NAD_RENK[i]}">${v}</span>`).join('·')}</b></div>`;
  s += `<div class="orsSatir" style="gap:4px;flex-wrap:wrap">
    <span class="orsNot">${L.ors.kBir}</span>
    ${[0,1,2,3,4,5].map(i=>
      `<button class="basBtn kBir" data-i="${i}" style="border-color:${NAD_RENK[i]}88;color:${NAD_RENK[i]};padding:4px 9px"
        ${ENV.kagit[i]>=4?'':'disabled'}>▲</button>`).join('')}
  </div>`;
  if(orsMesaj) s += `<div class="orsMesaj">${orsMesaj}</div>`;
  for(const slot of ['s1','s2','z','p','k','y','e']){
    const it = ENV.don[kim][slot];
    if(!it){
      s += `<div class="orsSatir bos"><span class="orsAd">${{s1:L.slot.silah2?L.silah1[kim]:'',s2:L.silah2[kim].ad,z:L.slot.zirh,p:L.slot.pelerin,k:L.slot.kolye,y:L.slot.yuzuk,e:L.slot.kupe}[slot] || adlar[slot]()}</span><span class="orsNot">${L.bosNot}</span></div>`;
      continue;
    }
    const b = it.b||0;
    const ad = (b>0?'+'+b+' ':'') + adlar[slot]();
    if(b >= BASMA_MAX){
      s += `<div class="orsSatir"><span class="orsAd" style="color:${NAD_RENK[it.n]}">${ad}</span><span class="orsNot">${L.ors.max}</span></div>`;
    } else {
      const [hedef, bedel, sans, dusme] = BASMA[b];
      const yeter = ENV.kagit[it.n] >= bedel;
      s += `<div class="orsSatir">
        <span class="orsAd" style="color:${NAD_RENK[it.n]}">${ad}</span>
        <span class="orsNot">+${hedef} · %${Math.round(sans*100)}${dusme>0?' <span style="color:#ff8d80">▼%'+Math.round(dusme*100)+'</span>':''} · ${bedel} <span style="color:${NAD_RENK[it.n]}">${L.ors.kagitKisa}</span></span>
        <button class="basBtn" data-slot="${slot}" ${yeter?'':'disabled'}>${L.ors.bas}</button>
      </div>`;
    }
  }
  return s;
}
/* ─── HIZLI ÖRS ŞERİDİ: savaş ekranında yalnız basma ─── */
let hoKim = 'okcu', hoSlot = null, hoZaman = null;
const HO_SIRA = ['s1','s2','z','p','k','y','e'];
function hoIkon(kim, slot){ return IIK(kim, slot); }   /* ENC-5a */
function hoBasilabilir(kim, slot){
  const it = ENV.don[kim][slot];
  if(!it || (it.b||0) >= BASMA_MAX) return false;
  return ENV.kagit[it.n] >= BASMA[it.b||0][1];
}
function hoHazirVar(){
  for(const k of KIMLER) for(const s of HO_SIRA) if(hoBasilabilir(k, s)) return true;
  return false;
}
let basKilit = false;
function hoBasAnim(kim, slot){
  if(basKilit) return;
  const it = ENV.don[kim][slot];
  if(!it || (it.b||0) >= BASMA_MAX) return;
  const b = it.b||0, [hedef, bedel, sans, dusme] = BASMA[b];
  if(ENV.kagit[it.n] < bedel) return;
  basKilit = true;
  ENV.kagit[it.n] -= bedel; ENV.ist.kagit += bedel; envKaydet();
  const r = Math.random(), basarili = r < sans;
  const dustu = !basarili && Math.random() < dusme;
  const bar = document.getElementById('hoBar'), yes = document.getElementById('hoYesil'),
        ibre = document.getElementById('hoIbre');
  bar.style.display = 'block'; bar.classList.remove('ok','fail');
  yes.style.width = (sans*100)+'%';
  ibre.style.display = 'block';
  const sure = hedef*1000, bas = performance.now();
  function kare(t){
    const g = t - bas;
    let pos;
    if(g < sure - 550){
      const tri = (g/1000*2.1) % 2;
      pos = tri < 1 ? tri : 2 - tri;
    } else if(g < sure){
      const k = (g - (sure-550)) / 550;
      const tri0 = ((sure-550)/1000*2.1) % 2;
      const p0 = tri0 < 1 ? tri0 : 2 - tri0;
      pos = p0 + (r - p0) * (1 - Math.pow(1-k, 3));
    } else {
      ibre.style.left = 'calc('+(r*100)+'% - 1px)';
      bitir(); return;
    }
    ibre.style.left = 'calc('+(pos*100)+'% - 1px)';
    requestAnimationFrame(kare);
  }
  function bitir(){
    if(basarili){
      it.b = b + 1;
      bar.classList.add('ok');
      ENV.ist.basma++;
      SES.ors(true);
    } else {
      SES.ors(false);
      if(dustu) it.b = Math.max(0, b - 1);
      bar.classList.add('fail');
      const v = document.getElementById('vinyet');
      v.style.opacity = '1';
      setTimeout(()=>{ v.style.opacity = '0'; }, dustu ? 800 : 450);
      D.sarsinti = Math.max(D.sarsinti, dustu ? 0.7 : 0.4);
      const so = document.getElementById('hizliOrs');
      so.classList.remove('sars'); void so.offsetWidth; so.classList.add('sars');
      if(dustu && ENV.oto.acik){ ENV.oto.acik = false; }
    }
    envKaydet();
    try{ rozetGuncelle(); }catch(e){}
    setTimeout(()=>{
      basKilit = false;
      hoCiz();
      const onE = document.getElementById('hoOnizleme');
      if(!basarili && dustu)
        onE.insertAdjacentHTML('beforeend', `<span style="width:100%;color:#ff8d80;font-weight:800">▼ ${T().oto.dur}</span>`);
      if(ENV.oto.acik) setTimeout(otoAdim, 550);
    }, 700);
  }
  requestAnimationFrame(kare);
}
function otoAdim(){
  if(!ENV.oto.acik || basKilit) return;
  if(ENV.oto.mod === 'odak'){
    if(hoSlot && hoBasilabilir(hoKim, hoSlot)) hoBasAnim(hoKim, hoSlot);
    return;
  }
  let enK = null, enB = 99;
  for(const k of KIMLER) for(const s of HO_SIRA){
    const it = ENV.don[k][s];
    if(it && hoBasilabilir(k, s) && (it.b||0) < enB){ enB = it.b||0; enK = [k, s]; }
  }
  if(enK){ hoKim = enK[0]; hoSlot = enK[1]; hoCiz(); hoBasAnim(enK[0], enK[1]); }
}
function hoCiz(){
  const L = T();
  const kh = document.getElementById('hoKahraman');
  kh.innerHTML = KIMLER.map(k=>
    `<div class="hoKh ${k===hoKim?'aktif':''}" data-k="${k}">${L.kahraman[k]}</div>`).join('')
    + `<div class="hoKh oto ${ENV.oto.acik?'aktif':''}" id="hoOto">OTO</div>`
    + `<div class="hoKh oto" id="hoMod">${ENV.oto.mod==='esit' ? L.oto.esit : L.oto.odak}</div>`;
  kh.querySelectorAll('.hoKh[data-k]').forEach(b=> b.addEventListener('click', ()=>{
    hoKim = b.dataset.k; hoSlot = null; hoCiz();
  }));
  const ot = document.getElementById('hoOto');
  if(ot) ot.addEventListener('click', ()=>{
    ENV.oto.acik = !ENV.oto.acik; envKaydet(); hoCiz();
    if(ENV.oto.acik) otoAdim();
  });
  const md = document.getElementById('hoMod');
  if(md) md.addEventListener('click', ()=>{
    ENV.oto.mod = ENV.oto.mod==='esit' ? 'odak' : 'esit'; envKaydet(); hoCiz();
  });
  const itk = document.getElementById('hoItemler');
  itk.innerHTML = HO_SIRA.map(s=>{
    const it = ENV.don[hoKim][s];
    return `<div class="hoIt ${s===hoSlot?'secili':''} ${it?'':'bos'}" data-s="${s}"
      style="${it?`border-color:${s===hoSlot?'#ffd95e':NAD_RENK[it.n]+'88'}`:''}">
      ${hoIkon(hoKim, s)}
      ${it&&it.b?`<span class="hoB">+${it.b}</span>`:''}
      ${hoBasilabilir(hoKim,s)?'<span class="hoN"></span>':''}
    </div>`;
  }).join('');
  itk.querySelectorAll('.hoIt').forEach(b=> b.addEventListener('click', ()=>{
    hoSlot = b.dataset.s; hoCiz();
  }));
  const on = document.getElementById('hoOnizleme');
  const it = hoSlot ? ENV.don[hoKim][hoSlot] : null;
  if(!it){
    on.innerHTML = '';
    if(!basKilit) document.getElementById('hoBar').style.display = 'none';
    return;
  }
  const b = it.b||0;
  if(b >= BASMA_MAX){
    on.innerHTML = `<span style="color:${NAD_RENK[it.n]}">+${b} ${slotAdi(hoKim,hoSlot)}</span><b>${T().ors.max}</b>`;
    if(!basKilit) document.getElementById('hoBar').style.display = 'none';
    return;
  }
  const [hedef, bedel, sans, dusme] = BASMA[b];
  const isaret = {p:'−%', y:'−%', e:'%'}[hoSlot] || '+%';
  const dizi = anaDizi(hoKim, hoSlot);
  const eski = dizi[it.n]*(1+BASMA_GUC*b), yeni = dizi[it.n]*(1+BASMA_GUC*(b+1));
  const yeter = ENV.kagit[it.n] >= bedel;
  on.innerHTML = `
    <span style="color:${NAD_RENK[it.n]};font-weight:800">+${b}→+${hedef}</span>
    <span>%${Math.round(sans*100)}${dusme>0?` <span style="color:#ff8d80">▼%${Math.round(dusme*100)}</span>`:''}</span>
    <span><b>${isaret}${eski.toFixed(1)}</b> → <b>${isaret}${yeni.toFixed(1)}</b></span>
    <span style="color:${NAD_RENK[it.n]}">${bedel} 📜 (${ENV.kagit[it.n]})</span>
    <button class="basBtn" id="hoBas" ${yeter?'':'disabled'}>${T().ors.bas}</button>`;
  const bb = document.getElementById('hoBas');
  if(bb) bb.addEventListener('click', ev=>{
    ev.stopPropagation();
    hoBasAnim(hoKim, hoSlot);
  });
  /* statik risk önizlemesi: yeşil bölge = gerçek şans */
  const bar = document.getElementById('hoBar');
  if(it && (it.b||0) < BASMA_MAX && !basKilit){
    bar.style.display = 'block'; bar.classList.remove('ok','fail');
    document.getElementById('hoYesil').style.width = (BASMA[it.b||0][2]*100)+'%';
    document.getElementById('hoIbre').style.display = 'none';
  } else if(!basKilit){
    bar.style.display = 'none';
  }
}
function nadirlikPay(L){
  const p = OCAK_TABLO[Math.min(L, OCAK_MAX)];
  const top = p.reduce((a,b)=>a+b, 0);
  return [Math.max(0, 100-top), ...p];
}
function ocakCiz(){
  const L = T(), oc = ENV.ocak || 0;
  const s0 = nadirlikPay(oc), s1v = nadirlikPay(Math.min(OCAK_MAX, oc+1));
  const maksMu = oc >= OCAK_MAX;
  let s = `<div class="orsUst"><span>🔥 ${L.ocak.baslik} · ${L.ocak.seviye} ${oc}/${OCAK_MAX}</span><b>🪙 ${altinYaz(ENV.altin)}</b></div>`;
  s += `<div class="orsMesaj">${L.ocak.alt} · ${L.ocak.bossNot}</div>`;
  s += `<div class="orsSatir" style="opacity:.7"><span class="orsAd"></span><span class="orsNot">${L.ocak.simdiki}</span><span class="orsNot" style="width:52px;text-align:right">${maksMu?'—':L.ocak.sonraki}</span></div>`;
  for(let n=0;n<7;n++){
    s += `<div class="orsSatir">
      <span class="orsAd" style="color:${NAD_RENK[n]}">${L.nadirlik[n]}</span>
      <span class="orsNot">%${s0[n].toFixed(2).replace(/\.?0+$/,'')}</span>
      <span class="orsNot" style="width:52px;text-align:right;color:${maksMu?'#666':'#ffd97a'}">${maksMu?'':'%'+s1v[n].toFixed(2).replace(/\.?0+$/,'')}</span>
    </div>`;
  }
  const bedel = ocakMaliyet(oc);
  const yeter = ENV.altin >= bedel;
  s += maksMu
    ? `<div class="orsMesaj" style="text-align:center;padding-top:10px">✔ ${L.ocak.maks}</div>`
    : `<div style="padding:12px;text-align:center">
        <button class="basBtn" id="ocakBtn" style="padding:9px 26px;font-size:13px" ${yeter?'':'disabled'}>
          ${L.ocak.yukselt} · 🪙 ${altinYaz(bedel)}</button></div>`;
  return s;
}
let depoSec = null, topluMsg = '', envSec = null;
function itemKartHTML(kim, it){
  const L = T();
  const u3 = {okcu:'+%8', brute:'+%6', mage:'−%8', priest:'−%8'}[kim];
  const ana = {s1:['+%'+Math.round(ANA1[it.n]*(1+BASMA_GUC*(it.b||0))), L.satir2],
    s2:['+%'+Math.round(SILAH2[kim].ana[it.n]*(1+BASMA_GUC*(it.b||0))), L.silah2[kim].anaAd],
    z:['+%'+Math.round(ZANA[it.n]*(1+BASMA_GUC*(it.b||0))), L.zSatir1],
    p:['−%'+Math.round(PANA[it.n]*(1+BASMA_GUC*(it.b||0))), L.pSatir1],
    k:['+%'+Math.round(KOLYE_ANA[it.n]*(1+BASMA_GUC*(it.b||0))), L.kSatir1],
    y:['−%'+Math.round(YUZUK_ANA[it.n]*(1+BASMA_GUC*(it.b||0))), L.ySatir1],
    e:['%'+Math.round(KUPE_ANA[it.n]*(1+BASMA_GUC*(it.b||0))), L.eSatir1]}[it.slot];
  const sat2 = {s1:`${L.silah2[kim].anaAd} <b>+%4</b>`, s2:`${L.satir2} <b>+%3</b>`, z:`${L.zSatir2} <b>+%0,4/sn</b>`,
    p:`${L.pSatir2} <b>+%5</b>`, k:`${L.kSatir2} <b>+%6</b>`, y:`${L.ySatir2} <b>+%3</b>`, e:`${L.eSatir2}`}[it.slot];
  const sat3 = {s1:`${L.satir3s1[kim]} <b>+%10</b>`, s2:`${L.satir3[kim]} <b>${u3}</b>`, z:`${L.zSatir3} <b>−%20</b>`,
    p:`${L.pSatir3}`, k:`${L.kSatir3} <b>+%25</b>`, y:`${L.ySatir3}`, e:`${L.eSatir3}`}[it.slot];
  const oz = {s1:L.ozel1[kim], s2:L.ozel[kim], z:L.ozelZ[kim], p:L.ozelP[kim],
              k:L.ozelK[kim], y:L.ozelY[kim], e:L.ozelE[kim]}[it.slot];
  const kilitli = (a,ic,kd)=> a ? `<div class="nSatir">${ic}</div>` : `<div class="nSatir kilitli">🔒 ${ic} · ${L.acilir[kd]}</div>`;
  return `<div class="itemKart" style="border-color:${NAD_RENK[it.n]};margin-top:8px;max-width:280px;
      background:linear-gradient(180deg, ${NAD_RENK[it.n]}30, rgba(12,12,16,.25) 58%)">
    <div class="itemGorsel">${hoIkon(kim, it.slot)}</div>
    <div class="itemAd">${(it.b?'+'+it.b+' ':'')}${slotAdi(kim, it.slot)}</div>
    <div class="nadirlik" style="color:${NAD_RENK[it.n]}">${L.nadirlik[it.n]}</div>
    <div class="itemStat"><b>${ana[0]}</b><span>${ana[1]}</span></div>
    ${kilitli(it.n>=1, sat2, 1)}
    ${kilitli(it.n>=2, sat3, 2)}
    ${kilitli(it.n>=3, `<span class="oz">★ ${oz[0]}</span> — ${oz[1]}`, 3)}
  </div>`;
}
function tahminiDps(kim){
  const kritB = 1 + kritSans(kim)*(kritCarp(kim)-1);
  let taban = 0, aralik = 1;
  if(kim==='okcu'){ taban = OK_HASAR*itemKat('okcu'); aralik = okAralik(); }
  else if(kim==='brute'){ taban = BRUTE_AYAR.hasar*itemKat('brute'); aralik = 1.3/(1+atakHiz('brute')); }
  else if(kim==='mage'){ taban = MAGE_AYAR.hasar*itemKat('mage'); aralik = 1.13/(1+kureHiz()+atakHiz('mage')); }
  else { taban = PRIEST_AYAR.hasar*itemKat('priest'); aralik = 0.87/(1+atakHiz('priest')); }
  return taban*kritB/aralik;
}
/* Takım ölçüsüyle aynı birimde: kendi canı + kendi eşyası. */
function bireyselGuc(kim){
  return Math.round((kMax(kim) + esyaGucu(kim)) / GUC_BOL);
}
function nitelikOzeti(kim){
  const L = T();
  const can = kim==='brute' ? bruteMax() : kMax(kim);
  const satirlar = [];
  satirlar.push(`⚔️ ${L.nit.hasar} <b>+%${Math.round((itemKat(kim)-1)*100)}</b>`);
  satirlar.push(`❤️ ${L.nit.can} <b>${Math.round(can)}</b>${zn(kim)>=1 ? ` <span style="color:#7dde8a">(+%0,4/sn)</span>` : ''}`);
  satirlar.push(`💥 ${L.nit.krit} <b>%${Math.round(kritSans(kim)*100)}</b> · ×${kritCarp(kim)}`);
  const dr = Math.round(drOran(kim)*100);
  if(dr>0) satirlar.push(`🛡️ ${L.pSatir1} <b>−%${dr}</b>`);
  if(kim==='brute' && blokSans()>0) satirlar.push(`🧱 ${L.nit.blok} <b>%${Math.round(blokSans()*100)}</b>`);
  const cdKes = Math.round(100 - cdSure(kim, 100));
  if(cdKes>0) satirlar.push(`⏱️ ${L.nit.cd} <b>−%${cdKes}</b>`);
  const skG = Math.round((skill1Kat(kim)-1)*100);
  if(skG>0) satirlar.push(`✨ ${L.nit.skill} <b>+%${skG}</b>`);
  const ah = Math.round((atakHiz(kim) + (kim==='okcu'?sadakHiz():0) + (kim==='mage'?kureHiz():0))*100);
  if(ah>0) satirlar.push(`⚡ ${L.nit.atak} <b>+%${ah}</b>`);
  if(pn(kim)>=1) satirlar.push(`👟 ${L.pSatir2} <b>+%5</b>`);
  const ozler = [];
  const ozMap = {s1:L.ozel1, s2:L.ozel, z:L.ozelZ, p:L.ozelP, k:L.ozelK, y:L.ozelY, e:L.ozelE};
  for(const s of HO_SIRA){
    const it = ENV.don[kim][s];
    if(it && it.n>=3) ozler.push(ozMap[s][kim][0]);
  }
  if(ozler.length) satirlar.push(`🌟 <span class="oz">${ozler.join(' · ')}</span>`);
  if((D.gel[kim]||0)>0) satirlar.push(`⭐ ${L.skl.kademe} <b>+%${6*(D.gel[kim]||0)}</b>`);
  return `<div class="nitKutu">
    <div class="orsUst" style="border:none;padding:6px 2px"><span>⚔ ${L.nit.guc}: <b>${bireyselGuc(kim)}</b></span>
      <b>DPS ~${Math.round(tahminiDps(kim))}</b></div>
    ${satirlar.map(x=>`<div class="nSatir">${x}</div>`).join('')}
  </div>`;
}
function envanterCiz2(kim){
  let s = `<div class="envIzgara">`;
  for(const slot of HO_SIRA){
    const it = ENV.don[kim][slot];
    if(it){
      s += `<div class="envIz" data-slot="${slot}" style="background:${NAD_RENK[it.n]}2b;border-color:${NAD_RENK[it.n]}${slot===envSec ? ';box-shadow:0 0 0 2px '+NAD_RENK[it.n] : ''}">
        <span class="envEm">${hoIkon(kim, slot)}</span>
        ${it.b ? `<span class="envB">+${it.b}</span>` : ''}
      </div>`;
    } else {
      s += `<div class="envIz bos"><span class="envEm">${hoIkon(kim, slot)}</span></div>`;
    }
  }
  s += `</div>`;
  const it = envSec ? ENV.don[kim][envSec] : null;
  if(it) s += itemKartHTML(kim, {slot: envSec, n: it.n, b: it.b||0});
  s += nitelikOzeti(kim);
  return s;
}
function topluIslem(kim, sat){
  const L = T(), liste = ENV.depo[kim];
  let say = 0, kazanc = 0;
  for(let i = liste.length-1; i >= 0; i--){
    const it = liste[i];
    if(it.n >= ENV.esik) continue;
    if(kiyas(kim, it).tip === 'iyi') continue;          /* ▲ olanlar korunur */
    liste.splice(i, 1); say++;
    if(sat) kazanc += ITEM_FIYAT[it.n];
    else { const k = KIRIM[Math.min(it.b||0, 10)]; ENV.kagit[it.n] += k; kazanc += k; }
  }
  if(sat) ENV.altin += kazanc;
  topluMsg = say > 0
    ? `${say} item → +${kazanc} ${sat ? '🪙' : '📜'}`
    : L.depoT.yok;
  envKaydet();
  panelYenile();
  try{ rozetGuncelle(); }catch(e){}
}
function anaDizi(kim, slot){
  return {s1:ANA1, s2:SILAH2[kim].ana, z:ZANA, p:PANA, k:KOLYE_ANA, y:YUZUK_ANA, e:KUPE_ANA}[slot];
}
function etkiDeger(kim, slot, it){ return anaDizi(kim, slot)[it.n] * (1 + BASMA_GUC*(it.b||0)); }
function kiyas(kim, it){
  const mev = ENV.don[kim][it.slot];
  if(!mev) return {tip:'iyi'};
  const e = etkiDeger(kim, it.slot, it), mv = etkiDeger(kim, it.slot, mev);
  if(e > mv) return {tip:'iyi'};
  for(let b=(it.b||0)+1; b<=BASMA_MAX; b++)
    if(anaDizi(kim,it.slot)[it.n]*(1+BASMA_GUC*b) > mv) return {tip:'olabilir', b};
  return {tip:'kotu'};
}
function kiyasIkon(ky){
  return ky.tip==='iyi' ? '<span class="kys" style="color:#7dde8a">▲</span>'
       : ky.tip==='olabilir' ? '<span class="kys" style="color:#ffd97a">＋</span>'
       : '<span class="kys" style="color:#ff7d6e">▼</span>';
}
function slotAdi(kim, slot){
  const L = T();
  return {s1:L.silah1[kim], s2:L.silah2[kim].ad, z:L.zirhAd[kim], p:L.pelerinAd[kim],
          k:L.kolyeAd[kim], y:L.yuzukAd[kim], e:L.kupeAd[kim]}[slot];
}
function depoCiz(kim){
  const L = T(), liste = ENV.depo[kim];
  if(depoSec!==null && liste[depoSec]) return depoDetay(kim, liste[depoSec]);
  depoSec = null;
  if(!liste.length) return `<div class="yakinda">${L.depo.bos}</div>`;
  const dolu = liste.length >= DEPO_KAP;
  let s = `<div class="orsUst"><span>🎒 ${L.depo.baslik} ${liste.length}/${DEPO_KAP}</span>${dolu?`<b style="color:#ff8d80">${L.depo.dolu}</b>`:''}</div>`;
  s += `<div class="orsSatir" style="gap:6px;flex-wrap:wrap">
    <button class="basBtn" id="dEsik" style="border-color:${NAD_RENK[ENV.esik]}88;color:${NAD_RENK[ENV.esik]}">${L.nadirlik[ENV.esik]} ${L.depoT.alti} ▾</button>
    <button class="basBtn" id="dTopluSat">${L.depoT.sat}</button>
    <button class="basBtn" id="dTopluKagit">${L.depoT.kagit}</button>
  </div>
  <div class="orsMesaj">${topluMsg || L.depoT.korunan}</div><div>`;
  liste.forEach((it,i)=>{
    const ky = kiyas(kim, it);
    s += `<div class="orsSatir depoSatir" data-i="${i}">
      <span class="orsAd" style="color:${NAD_RENK[it.n]}">${(it.b?'+'+it.b+' ':'')}${slotAdi(kim,it.slot)}</span>
      <span class="orsNot">${L.nadirlik[it.n]}</span>${kiyasIkon(ky)}</div>`;
  });
  return s + '</div>';
}
function depoDetay(kim, it){
  const L = T();
  const u3 = {okcu:'+%8', brute:'+%6', mage:'−%8', priest:'−%8'}[kim];
  const ana = {s1:['+%'+ANA1[it.n], L.satir2], s2:['+%'+SILAH2[kim].ana[it.n], L.silah2[kim].anaAd],
    z:['+%'+ZANA[it.n], L.zSatir1], p:['−%'+PANA[it.n], L.pSatir1], k:['+%'+KOLYE_ANA[it.n], L.kSatir1],
    y:['−%'+YUZUK_ANA[it.n], L.ySatir1], e:['%'+KUPE_ANA[it.n], L.eSatir1]}[it.slot];
  const sat2 = {s1:`${L.silah2[kim].anaAd} <b>+%4</b>`, s2:`${L.satir2} <b>+%3</b>`, z:`${L.zSatir2} <b>+%0,4/sn</b>`,
    p:`${L.pSatir2} <b>+%5</b>`, k:`${L.kSatir2} <b>+%6</b>`, y:`${L.ySatir2} <b>+%3</b>`, e:`${L.eSatir2}`}[it.slot];
  const sat3 = {s1:`${L.satir3s1[kim]} <b>+%10</b>`, s2:`${L.satir3[kim]} <b>${u3}</b>`, z:`${L.zSatir3} <b>−%20</b>`,
    p:`${L.pSatir3}`, k:`${L.kSatir3} <b>+%25</b>`, y:`${L.ySatir3}`, e:`${L.eSatir3}`}[it.slot];
  const oz = {s1:L.ozel1[kim], s2:L.ozel[kim], z:L.ozelZ[kim], p:L.ozelP[kim],
              k:L.ozelK[kim], y:L.ozelY[kim], e:L.ozelE[kim]}[it.slot];
  const ayni = ENV.depo[kim].filter(x=>x.slot===it.slot && x.n===it.n).length;
  const kilitli = (a,ic,kd)=> a ? `<div class="nSatir">${ic}</div>` : `<div class="nSatir kilitli">🔒 ${ic} · ${L.acilir[kd]}</div>`;
  return `<div style="padding:10px 12px">
    <button class="basBtn" id="depoGeri">${L.depo.geri}</button>
    <div class="itemKart" style="border-color:${NAD_RENK[it.n]};margin-top:8px;max-width:270px;
      background:linear-gradient(180deg, ${NAD_RENK[it.n]}30, rgba(12,12,16,.25) 58%)">
      <div class="itemAd">${(it.b?'+'+it.b+' ':'')}${slotAdi(kim,it.slot)} ${kiyasIkon(kiyas(kim,it))}</div>
      <div class="nadirlik" style="color:${NAD_RENK[it.n]}">${L.nadirlik[it.n]}</div>
      ${(()=>{ const ky=kiyas(kim,it); return ky.tip==='olabilir'
        ? `<div class="nSatir" style="color:#ffd97a">＋${ky.b} ${T().depo.gecer}</div>` : ''; })()}
      <div class="itemStat"><b>${ana[0]}</b><span>${ana[1]}</span></div>
      ${kilitli(it.n>=1, sat2, 1)}
      ${kilitli(it.n>=2, sat3, 2)}
      ${kilitli(it.n>=3, `<span class="oz">★ ${oz[0]}</span> — ${oz[1]}`, 3)}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="basBtn" id="dGiy">${L.depo.giy}</button>
      ${it.n<6 ? `<button class="basBtn" id="dSat">${L.depo.sat} · 🪙${altinYaz(ITEM_FIYAT[it.n])}</button>` : ''}
      <button class="basBtn" id="dKagit">${L.depo.kagitYap} (${KIRIM[Math.min(it.b||0,10)]})</button>
      ${(ayni>=4 && it.n<=4) ? `<button class="basBtn" id="dBirlestir">${L.depo.birlestir}</button>` : ''}
    </div></div>`;
}
function panelYenile(){
  if(!panelKim && !genelEkran) return;
  const aktifSekme = genelEkran || document.querySelector('.sekme.aktif').dataset.s;
  if(aktifSekme==='envanter'){
    panelIc.innerHTML = envanterCiz2(panelKim);
    panelIc.querySelectorAll('.envIz[data-slot]').forEach(k=>{
      k.addEventListener('click', ()=>{
        envSec = (envSec === k.dataset.slot) ? null : k.dataset.slot;
        panelYenile();
      });
    });
  }
  else if(aktifSekme==='depo'){
    panelIc.innerHTML = depoCiz(panelKim);
    panelIc.querySelectorAll('.depoSatir').forEach(sat=>{
      sat.addEventListener('click', ()=>{ depoSec = +sat.dataset.i; panelYenile(); });
    });
    const g = document.getElementById('depoGeri');
    if(g) g.addEventListener('click', ()=>{ depoSec = null; panelYenile(); });
    const bagT = (id, fn)=>{ const b = document.getElementById(id);
      if(b) b.addEventListener('click', ev=>{ ev.stopPropagation(); fn(); }); };
    bagT('dEsik', ()=>{ ENV.esik = ENV.esik % 5 + 1; topluMsg = ''; envKaydet(); panelYenile(); });
    bagT('dTopluSat', ()=> topluIslem(panelKim, true));
    bagT('dTopluKagit', ()=> topluIslem(panelKim, false));
    const liste = ENV.depo[panelKim];
    const it = depoSec!==null ? liste[depoSec] : null;
    const bagla = (id, fn)=>{ const b=document.getElementById(id); if(b) b.addEventListener('click', ev=>{ ev.stopPropagation(); fn(); }); };
    if(it){
      bagla('dGiy', ()=>{
        const mev = ENV.don[panelKim][it.slot];
        ENV.don[panelKim][it.slot] = {n: it.n, b: it.b||0};
        liste.splice(depoSec, 1);
        if(mev) depoEkle(panelKim, {slot: it.slot, n: mev.n, b: mev.b||0});
        depoSec = null; envKaydet(); panelYenile(); rozetGuncelle();
      });
      bagla('dSat', ()=>{
        ENV.altin += ITEM_FIYAT[it.n];
        liste.splice(depoSec, 1);
        depoSec = null; envKaydet(); panelYenile(); rozetGuncelle();
      });
      bagla('dKagit', ()=>{
        ENV.kagit[it.n] += KIRIM[Math.min(it.b||0, 10)];   /* HATA DÜZELTMESİ: tavan 7→10, +8/+9/+10 emeği kaybolmasın */
        liste.splice(depoSec, 1);
        depoSec = null; envKaydet(); panelYenile();
      });
      bagla('dBirlestir', ()=>{
        let kalan = 4;
        for(let i = liste.length-1; i>=0 && kalan>0; i--)
          if(liste[i].slot===it.slot && liste[i].n===it.n){ liste.splice(i,1); kalan--; }
        liste.push({slot: it.slot, n: it.n+1, b: 0});
        depoSec = null; envKaydet(); panelYenile();
      });
    }
  }
  else if(aktifSekme==='skiller'){
    const L = T(), kim = panelKim, g = D.gel[kim]||0;
    let s = `<div class="orsUst"><span>✨ ${L.sekmeler[2]}</span><b>${L.skl.kademe}: ${g>0?'+%'+(6*g):'—'}</b></div>`;
    for(let i=0;i<9;i++){
      const acik = D.skill[kim] > i;
      s += `<div class="orsSatir" style="${acik?'':'opacity:.45'}">
        <span class="orsAd">${acik?'✔':'🔒'} ${L.skillAd[kim][i]}</span>
        <span class="orsNot">${acik ? (i>=3 ? 'CD '+SKILL9[kim][i-3]+' sn' : '') : (i+1)+'. '+L.skl.kilit}</span></div>`;
    }
    s += `<div class="orsSatir" style="border-top:1px solid #4a3d22">
      <span class="orsAd" style="color:#ffd95e">⚡ ${L.ultiAd[kim]}</span>
      <span class="orsNot">${L.skl.ulti}</span></div>`;
    panelIc.innerHTML = s;
  }
  else if(aktifSekme==='nitelikler'){
    const L = T();
    const kolon = KIMLER.map(k=>{
      const can = k==='brute' ? bruteMax() : kMax(k);
      return `<div style="flex:1;min-width:0;text-align:center">
        <div class="orsAd" style="margin-bottom:4px">${L.kahraman[k]}</div>
        <div class="nSatir" style="justify-content:center">⚔ <b>${bireyselGuc(k)}</b></div>
        <div class="nSatir" style="justify-content:center">DPS <b>${Math.round(tahminiDps(k))}</b></div>
        <div class="nSatir" style="justify-content:center">❤️ <b>${Math.round(can)}</b></div>
        <div class="nSatir" style="justify-content:center">💥 <b>%${Math.round(kritSans(k)*100)}</b></div>
        <div class="nSatir" style="justify-content:center">🛡 <b>−%${Math.round(drOran(k)*100)}</b></div>
        <div class="nSatir" style="justify-content:center">✨ <b>+%${Math.round((skill1Kat(k)-1)*100)}</b></div>
        <div class="nSatir" style="justify-content:center">⭐ <b>${D.gel[k]||0}</b></div>
      </div>`;
    }).join('');
    panelIc.innerHTML = `<div class="orsUst"><span>📊 ${L.genelAd.nitelikler}</span></div>
      <div style="display:flex;gap:4px;padding:8px 6px">${kolon}</div>
      <div class="orsNot" style="padding:0 12px">⚔ · DPS · ❤️ Can · 💥 Kritik · 🛡 Azaltma · ✨ Skill Gücü · ⭐ ${L.skl.kademe}</div>`;
  }
  else if(aktifSekme==='takimdepo'){
    const L = T();
    panelIc.innerHTML = `<div class="orsUst"><span>📦 ${L.genelAd.takimdepo}</span><b>🪙 ${Math.floor(ENV.altin)}</b></div>
      <div class="orsSatir" style="gap:7px;flex-wrap:wrap">
        ${ENV.kagit.map((v,i)=>`<span style="color:${NAD_RENK[i]};font-weight:800">${v} 📜</span>`).join('')}
      </div>
      <div class="orsSatir" style="gap:4px;flex-wrap:wrap">
        <span class="orsNot">${L.ors.kBir}</span>
        ${[0,1,2,3,4,5].map(i=>
          `<button class="basBtn kBir" data-i="${i}" style="border-color:${NAD_RENK[i]}88;color:${NAD_RENK[i]};padding:4px 9px"
            ${ENV.kagit[i]>=4?'':'disabled'}>▲</button>`).join('')}
      </div>
      <div class="orsNot" style="padding:6px 12px">${L.tDepo.not}</div>`;
    panelIc.querySelectorAll('.kBir').forEach(bt=>{          /* HATA DÜZELTMESİ: depo sekmesinde ▲ ölüydü */
      bt.addEventListener('click', ev=>{
        ev.stopPropagation();
        const i = +bt.dataset.i;
        if(ENV.kagit[i] >= 4){
          ENV.kagit[i] -= 4; ENV.kagit[i+1] += 1;
          envKaydet(); panelYenile();
        }
      });
    });
  }
  else if(aktifSekme==='basarimlar'){
    const L = T();
    let s = `<div class="orsUst"><span>🏆 ${L.genelAd.basarimlar}</span></div>`;
    for(const b of BSR){
      const i = ENV.bsr[b.id]||0, bitti = i >= b.k.length;
      const deger = bsrDeger(b.id), hedef = bitti ? b.k[b.k.length-1] : b.k[i];
      const oran = Math.min(1, deger/hedef);
      const alinabilir = !bitti && deger >= hedef;
      const od = bitti ? null : b.o[i];
      const odStr = od ? (od.a ? `${kisaSayi(od.a)} 🪙`
        : `<span style="color:${NAD_RENK[od.r]}">${od.p} 📜</span>`) : '';
      s += `<div class="orsSatir" style="flex-wrap:wrap;row-gap:3px">
        <span class="orsAd">${b.em} ${L.bsrAd[b.id]} <span class="orsNot">${i}/${b.k.length}</span></span>
        <span class="orsNot">${kisaSayi(Math.min(deger,hedef))} / ${kisaSayi(hedef)} · ${odStr}</span>
        ${bitti ? `<b style="color:#7dde8a">✓</b>`
          : `<button class="basBtn bsrAl" data-id="${b.id}" ${alinabilir?'':'disabled'}>${L.bsrAl}</button>`}
        <div style="flex-basis:100%;height:5px;border-radius:3px;background:#241f12;overflow:hidden">
          <div style="width:${oran*100}%;height:100%;background:${bitti||alinabilir ? '#7dde8a' : '#c9a52f'}"></div>
        </div></div>`;
    }
    panelIc.innerHTML = s;
    panelIc.querySelectorAll('.bsrAl').forEach(bt=> bt.addEventListener('click', ev=>{
      ev.stopPropagation();
      const b = BSR.find(x=> x.id === bt.dataset.id);
      const i = ENV.bsr[b.id]||0;
      if(i >= b.k.length || bsrDeger(b.id) < b.k[i]) return;
      const od = b.o[i];
      if(od.a) ENV.altin += od.a; else ENV.kagit[od.r] += od.p;
      ENV.bsr[b.id] = i + 1;
      envKaydet(); panelYenile();
      try{ rozetGuncelle(); }catch(e){}
    }));
  }
  else if(aktifSekme==='zindan'){
    const L = T();
    zinYenile();
    let s = `<div class="orsUst"><span>🗝 ${L.genelAd.zindan}</span><b>🗝 ${ENV.zin.anahtar}/3</b></div>`;
    if(ENV.zin.anahtar < 3){
      const kalanMs = ZIN_DOLUM - (Date.now() - ENV.zin.son);
      const sa = Math.floor(kalanMs/3600e3), dk = Math.floor((kalanMs%3600e3)/60e3);
      s += `<div class="orsNot" style="padding:0 12px">${L.zin.sonraki}: ${sa}s ${dk}dk</div>`;
    }
    if(zinSon){
      const z = zinSon;
      let oz = z.tip==='altin' ? `💰 +${Math.round(z.topA)} 🪙${z.bonus ? ` <span style="color:#7dde8a">(+${z.bonus})</span>` : ''}`
        : z.tip==='kagit' ? `📜 +${z.topK}`
        : `👑 ${5-z.bossKalan}/5 · +${z.topI} item${z.sandik ? ` · <span style="color:${NAD_RENK[3]}">+1 📜</span>${z.sandik.mitik ? ` <span style="color:${NAD_RENK[4]}">+1 📜!</span>` : ''} +${z.sandik.alt} 🪙` : ''}`;
      s += `<div class="orsSatir"><span class="orsNot">${L.zin.son}:</span><span>${oz}${z.erken ? ` · <span style="color:#ff8d80">${L.zin.yarim}</span>` : ''}</span></div>`;
    }
    if(D.zindan){
      s += `<div class="orsSatir"><b style="color:#ffd95e">${L.zin.surer}</b></div>`;
    } else {
      for(const [tip, em2] of [['altin','💰'], ['kagit','📜'], ['boss','👑']]){
        s += `<div class="orsSatir" style="flex-wrap:wrap;row-gap:3px">
          <span class="orsAd">${em2} ${L.zin[tip+'Ad']}</span>
          <button class="basBtn zinGir" data-tip="${tip}" ${ENV.zin.anahtar>0 ? '' : 'disabled'}>${L.zin.gir}</button>
          <span class="orsNot" style="flex-basis:100%">${L.zin[tip+'Not']}</span></div>`;
      }
    }
    panelIc.innerHTML = s;
    panelIc.querySelectorAll('.zinGir').forEach(bt=> bt.addEventListener('click', ev=>{
      ev.stopPropagation();
      zindanBaslat(bt.dataset.tip);
    }));
  }
  else if(aktifSekme==='arena'){
    const L = T();
    if(arnOyna){
      const f = arnOyna.son || arnOyna.veri.frames[0];
      const bar = (o,i)=> `<div style="height:7px;border-radius:4px;background:#241f12;overflow:hidden;margin:2px 0">
        <div style="width:${o*100}%;height:100%;background:${o>0.35?'#7dde8a':'#ff7a6a'}"></div></div>`;
      panelIc.innerHTML = `<div class="orsUst"><span>⚔️ ${ENV.ad||'Sen'} vs ${arnOyna.rakip}</span>
          <b id="arnHiz" style="cursor:pointer">${arnOyna.hiz}×⏩</b></div>
        <div style="display:flex;gap:10px;padding:6px 12px">
          <div style="flex:1"><b style="font-size:11px;color:#e8d9a8">${ENV.ad||'Sen'}</b>
            ${KIMLER.map((k,i)=> `<div class="orsNot">${L.kahraman[k]}${bar(f.a[i])}</div>`).join('')}</div>
          <div style="flex:1;text-align:right"><b style="font-size:11px;color:#e8d9a8">${arnOyna.rakip}</b>
            ${KIMLER.map((k,i)=> `<div class="orsNot">${L.kahraman[k]}${bar(f.b[i])}</div>`).join('')}</div>
        </div>
        <div id="arnLog" style="padding:4px 12px;font-size:10.5px;color:#cfd6c4;min-height:74px">${(arnOyna.loglar||[]).slice(-6).map(x=>`<div>${x}</div>`).join('')}</div>
        <div id="arnSonuc" style="text-align:center;padding:6px"></div>`;
      const hz = document.getElementById('arnHiz');
      if(hz) hz.addEventListener('click', ()=>{ arnOyna.hiz = arnOyna.hiz===1 ? 4 : 1; });
      return;
    }
    let s = `<div class="orsUst"><span>⚔️ ${L.genelAd.arena}</span></div>
      <div class="orsSatir"><span class="orsAd">${L.arn.ad}</span>
        <input id="arnAd" maxlength="12" value="${(ENV.ad||'').replace(/"/g,'')}" placeholder="..."
          style="width:110px;background:#171410;border:1px solid #4a4432;border-radius:8px;color:#f0e6c8;padding:5px 8px;font-size:12px"></div>
      <div class="orsSatir" style="flex-wrap:wrap;row-gap:4px">
        <span class="orsAd">${L.arn.kodum}</span>
        <button class="basBtn" id="arnKopya">📋 ${L.arn.kopyala}</button>
        <textarea id="arnKodum" readonly style="flex-basis:100%;height:34px;background:#12100b;border:1px solid #33301f;border-radius:8px;color:#8a836b;font-size:9px;padding:4px">${kodUret()}</textarea>
      </div>`;
    const PLN = [
      ['hedef', L.arn.hedef, [['sifaci','🎯'],['buyucu','🔮'],['okcu','🏹'],['tank','🛡'],['zayif','💔']]],
      ['kosul', L.arn.kosul, [['sifaci','🎯'],['buyucu','🔮'],['okcu','🏹'],['zayif','💔']]],
      ['durus', L.arn.durus, [['saldirgan','⚔'],['dengeli','⚖'],['kale','🧱']]],
      ['sifa',  L.arn.sifa,  [['tank','🧱'],['yarali','❤️'],['hasarci','🗡']]],
      ['ulti',  L.arn.ulti,  [['acilis','🔥'],['yari','⏳'],['zor','🆘']]],
      ['diz',   L.arn.diz,   [['standart','▫'],['kaplumbaga','🐢'],['baskin','💨']]]
    ];
    s += `<div class="orsUst" style="border:none"><span>📋 ${L.arn.plan}</span></div>`;
    for(const [k, ad, ops] of PLN){
      s += `<div class="orsSatir" style="gap:4px;flex-wrap:wrap"><span class="orsNot" style="flex-basis:100%">${ad}</span>
        ${ops.map(([v,em2])=> `<button class="basBtn plnBtn" data-k="${k}" data-v="${v}"
          style="padding:4px 8px;${ENV.plan[k]===v ? 'border-color:#ffd95e;color:#ffd95e' : 'opacity:.6'}">${em2} ${L.arn.o[v]}</button>`).join('')}</div>`;
    }
    s += `<div class="orsSatir" style="flex-wrap:wrap;row-gap:4px">
        <span class="orsAd">${L.arn.rakip}</span>
        <button class="basBtn" id="arnSavas">⚔ ${L.arn.savas}</button>
        <textarea id="arnRakip" placeholder="LGC1..." style="flex-basis:100%;height:34px;background:#171410;border:1px solid #4a4432;border-radius:8px;color:#c9bfa4;font-size:9px;padding:4px"></textarea>
        <span class="orsNot" id="arnHata" style="color:#ff8d80"></span></div>`;
    if(ENV.arena.length){
      s += `<div class="orsUst" style="border:none"><span>📜 ${L.arn.gecmis}</span></div>`;
      for(const g of ENV.arena.slice(0,10))
        s += `<div class="orsSatir"><span class="orsAd">${g.w?'🏆':'💀'} vs ${g.ad}</span><span class="orsNot">${g.s[0]} — ${g.s[1]}</span></div>`;
    }
    panelIc.innerHTML = s;
    const ai = document.getElementById('arnAd');
    if(ai) ai.addEventListener('change', ()=>{ ENV.ad = ai.value.slice(0,12); envKaydet(); panelYenile(); });
    const kp = document.getElementById('arnKopya');
    if(kp) kp.addEventListener('click', ()=>{
      const ta = document.getElementById('arnKodum');
      ta.select(); ta.setSelectionRange(0, 99999);
      try{ navigator.clipboard.writeText(ta.value); kp.textContent = '✓'; }catch(e){ document.execCommand('copy'); kp.textContent = '✓'; }
    });
    panelIc.querySelectorAll('.plnBtn').forEach(bt=> bt.addEventListener('click', ev=>{
      ev.stopPropagation();
      ENV.plan[bt.dataset.k] = bt.dataset.v;
      envKaydet(); panelYenile();
    }));
    const sv = document.getElementById('arnSavas');
    if(sv) sv.addEventListener('click', ()=>{
      const rk = kodOku(document.getElementById('arnRakip').value);
      if(!rk){ document.getElementById('arnHata').textContent = T().arn.gecersiz; return; }
      const ben = kodOku(kodUret());
      const veri = arenaSimule(ben, rk);
      arnOyna = {veri, i:0, rakip: rk.ad||'???', hiz:1, loglar:[], son:null};
      panelYenile();
      const adimla = ()=>{
        if(!arnOyna) return;
        arnOyna.i += arnOyna.hiz;
        const fi = Math.min(arnOyna.i, arnOyna.veri.frames.length-1);
        arnOyna.son = arnOyna.veri.frames[fi];
        for(let j=Math.max(0,fi-arnOyna.hiz+1); j<=fi; j++)
          for(const [,msg] of arnOyna.veri.frames[j].log) arnOyna.loglar.push(msg);
        if(genelEkran==='arena') panelYenile();
        const lg = document.getElementById('arnLog');
        if(lg) lg.innerHTML = arnOyna.loglar.slice(-6).map(x=>`<div>${x}</div>`).join('');
        if(fi >= arnOyna.veri.frames.length-1){
          clearInterval(arnOyna.z);
          const v = arnOyna.veri;
          ENV.arena.unshift({ad: arnOyna.rakip, w: v.kazandi, s: v.skor});
          ENV.arena = ENV.arena.slice(0,10);
          envKaydet();
          const sn = document.getElementById('arnSonuc');
          if(sn) sn.innerHTML = `<b style="font-size:16px;color:${v.kazandi?'#7dde8a':'#ff8d80'}">${v.kazandi ? T().arn.kazandin : T().arn.kaybettin}</b>
            <div class="orsNot">${v.skor[0]} — ${v.skor[1]}</div>
            <button class="basBtn" id="arnGeri">↩</button>`;
          const gr = document.getElementById('arnGeri');
          if(gr) gr.addEventListener('click', ()=>{ arnOyna = null; panelYenile(); });
        }
      };
      arnOyna.z = setInterval(adimla, 500);
    });
  }
  else if(aktifSekme==='bolumsec'){
    const L = T();
    if(D.bolge > ENV.maxB) ENV.maxB = D.bolge;
    let s = `<div class="orsUst"><span>🗺 ${L.genelAd.bolumsec}</span><b>${D.bolge}-${D.bolum}</b></div>
      <div class="orsSatir"><span class="orsAd" style="color:#ffd95e">👑 ${L.genelAd.uniqav}</span>
        <button class="basBtn" id="uniqAc">▶</button></div>
      <div class="orsNot" style="padding:0 12px">${L.bsec.not}</div>`;
    for(let bg = ENV.maxB; bg >= 1; bg--){
      const burasi = bg === D.bolge;
      s += `<div class="orsSatir">
        <span class="orsAd">${L.bsec.bolge} ${bg} <span class="orsNot">(${L.nit.guc} ~${Math.round(13*Math.pow((bg-1)*5+1, 1.28))}+)</span></span>
        ${burasi ? `<b style="color:#7dde8a">✓</b>` : `<button class="basBtn bsecGit" data-b="${bg}">${L.bsec.git}</button>`}
      </div>`;
    }
    panelIc.innerHTML = s;
    const ua = document.getElementById('uniqAc');
    if(ua) ua.addEventListener('click', ()=>{ uniqSecB = Math.min(uniqSecB, ENV.maxB); genelAc('uniqav'); });
    panelIc.querySelectorAll('.bsecGit').forEach(bt=> bt.addEventListener('click', ev=>{
      ev.stopPropagation();
      if(D.zindan) return;
      D.bolge = +bt.dataset.b; D.bolum = 1; D.bolumKesim = 0;
      zinTemizle();
      stageKaydet();
      try{ rozetGuncelle(); bolumDuyur(); }catch(e){}
      document.getElementById('panelX').click();
    }));
  }
  else if(aktifSekme==='uniqav'){
    const L = T();
    uniqSecB = Math.max(1, Math.min(uniqSecB, ENV.maxB));
    const bs = UNIQ_BOSS[(uniqSecB-1) % 10];
    const ad = L.uq.boss[(uniqSecB-1) % 10];
    const p = ENV.uniq.pity[uniqSecB]||0;
    let s = `<div class="orsUst"><span>👑 ${L.genelAd.uniqav}</span></div>`;
    if(uniqSon){
      const u = uniqSon;
      s += `<div class="orsSatir"><span class="orsNot">${L.zin.son}:</span><span>${
        u.sonuc ? `<b style="color:#ffd95e">${L.uq.dustu}</b>${u.kazanilan ? ' · '+hoIkon(u.kazanilan.kim, u.kazanilan.slot)+' '+L.kahraman[u.kazanilan.kim] : ''}`
        : u.erken ? `<span style="color:#ff8d80">${L.uq.oldun}</span>`
        : u.sonuc===false && u.iade!=null ? `${L.uq.teselli} (+${u.iade} 🪙)`
        : `<span style="color:#ff8d80">${L.uq.kacti}</span>`}</span></div>`;
    }
    s += `<div class="orsSatir">
        <button class="basBtn" id="uqSol">◀</button>
        <span class="orsAd" style="flex:1;text-align:center">${L.bsec.bolge} ${uniqSecB} — <b style="color:#ffd95e">${ad}</b></span>
        <button class="basBtn" id="uqSag">▶</button></div>
      <div class="orsSatir"><span class="orsNot">${L.uq.odak}:</span>
        <span>${bs.s.map(sl=> hoIkon('okcu', sl)).join(' ')}</span>
        <span class="orsNot">🎯 ${L.uq.pity}: ${p}/25</span></div>`;
    for(let zi=0; zi<4; zi++){
      const Z = UNIQ_ZOR[zi], bedel = uniqBedel(uniqSecB, zi);
      const yeter = ENV.altin >= bedel && !D.zindan;
      s += `<div class="orsSatir" style="flex-wrap:wrap;row-gap:3px">
        <span class="orsAd">${L.uq.zor[zi]}</span>
        <button class="basBtn uqGir" data-z="${zi}" ${yeter?'':'disabled'}>${bedel} 🪙</button>
        <span class="orsNot" style="flex-basis:100%">❤️ ×${Z.can} · ⚔ ×${Z.vur} · ✦ %${Math.round(Z.sans*100)} · 🎯+${[1,2,3,5][zi]} · 90 ${L.sn}</span></div>`;
    }
    panelIc.innerHTML = s;
    const us = document.getElementById('uqSol'), ud = document.getElementById('uqSag');
    if(us) us.addEventListener('click', ()=>{ uniqSecB = Math.max(1, uniqSecB-1); panelYenile(); });
    if(ud) ud.addEventListener('click', ()=>{ uniqSecB = Math.min(ENV.maxB, uniqSecB+1); panelYenile(); });
    panelIc.querySelectorAll('.uqGir').forEach(bt=> bt.addEventListener('click', ev=>{
      ev.stopPropagation();
      uniqBaslat(uniqSecB, +bt.dataset.z);
    }));
  }
  else if(aktifSekme==='klan'){
    const L = T(), em = 'klan' && '🏰';
    panelIc.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:70%;gap:10px">
      <div style="font-size:52px">${em}</div>
      <div class="orsAd" style="font-size:17px">${L.genelAd[aktifSekme]}</div>
      <div class="orsNot">${L.yakinda}</div></div>`;
  }
  else if(aktifSekme==='ayarlar'){
    const L = T();
    panelIc.innerHTML = `<div class="orsUst"><span>⚙️ ${L.genelAd.ayarlar}</span></div>
      <div class="orsSatir"><span class="orsAd">${L.ayar.dil}</span>
        <button class="basBtn" id="ayarDil">${DKOD==='tr' ? 'EN' : 'TR'}</button></div>
      <div class="orsSatir"><span class="orsAd">${L.ayar.mod}</span>
        <span class="orsNot">${SLOT===6 ? '×10 TEST' : L.slotE.slot+' '+SLOT}</span></div>
      <div class="orsSatir"><span class="orsAd">${L.ayar.otoSat}</span>
        <button class="basBtn" id="ayarOtoSat" style="${ENV.otoSat ? 'border-color:#7dde8a;color:#7dde8a' : 'opacity:.6'}">${ENV.otoSat ? 'ON' : 'OFF'}</button></div>
      <div class="orsSatir"><span class="orsAd">${L.ayar.kalite}</span>
        <button class="basBtn" id="ayarKalite">${L.kaliteAd[(typeof ENV!=='undefined' && ENV.kalite) || 'orta']}</button></div>
      <div class="orsSatir"><span class="orsAd">${L.ayar.ses}</span>
        <button class="basBtn" id="ayarSes" style="${ENV.sesAcik!==false ? 'border-color:#7dde8a;color:#7dde8a' : 'opacity:.6'}">${ENV.sesAcik!==false ? 'ON' : 'OFF'}</button></div>
      <div class="orsSatir"><span class="orsAd">${L.ayar.kayit}</span>
        <button class="basBtn" id="ayarSlot">↩</button></div>`;
    const ao2 = document.getElementById('ayarOtoSat');
    if(ao2) ao2.addEventListener('click', ()=>{ ENV.otoSat = !ENV.otoSat; envKaydet(); panelYenile(); });
    const kb2 = document.getElementById('ayarKalite');
    if(kb2) kb2.addEventListener('click', ()=>{
      const sira = ['dusuk','orta','yuksek'];
      ENV.kalite = sira[(sira.indexOf(ENV.kalite || 'orta') + 1) % 3];
      envKaydet(); kaliteUygula(); panelYenile();
    });
    const sb2 = document.getElementById('ayarSes');
    if(sb2) sb2.addEventListener('click', ()=>{ ENV.sesAcik = ENV.sesAcik===false ? true : false; envKaydet(); panelYenile(); });
    const ad2 = document.getElementById('ayarDil');
    if(ad2) ad2.addEventListener('click', ()=> document.getElementById('dilBtn').click());
    const as2 = document.getElementById('ayarSlot');
    if(as2) as2.addEventListener('click', ()=>{
      try{ sessionStorage.removeItem('legacyOtoBasla'); }catch(e){}
      location.reload();
    });
  }
  else if(aktifSekme==='dukkan'){
    panelIc.innerHTML = ocakCiz();
    const ob = document.getElementById('ocakBtn');
    if(ob) ob.addEventListener('click', ev=>{
      ev.stopPropagation();
      const bedel = ocakMaliyet(ENV.ocak||0);
      if(ENV.altin >= bedel && (ENV.ocak||0) < OCAK_MAX){
        ENV.altin -= bedel; ENV.ocak = (ENV.ocak||0)+1;
        envKaydet(); panelYenile(); rozetGuncelle();
      }
    });
  }
  else if(aktifSekme==='yukseltme'){
    panelIc.innerHTML = orsCiz(panelKim);
    panelIc.querySelectorAll('.basBtn[data-slot]').forEach(bt=>{
      bt.addEventListener('click', ev=>{ ev.stopPropagation(); basmaDene(panelKim, bt.dataset.slot); });
    });
    panelIc.querySelectorAll('.kBir').forEach(bt=>{
      bt.addEventListener('click', ev=>{
        ev.stopPropagation();
        const i = +bt.dataset.i;
        if(ENV.kagit[i] >= 4){
          ENV.kagit[i] -= 4; ENV.kagit[i+1] += 1;
          envKaydet(); panelYenile();
        }
      });
    });
  }
  else panelIc.innerHTML = '<div class="yakinda">'+T().yakinda+'</div>';
}
let genelEkran = null;
let zinSon = null, uniqSon = null, uniqSecB = 1;
const UNIQ_BOSS = [
  {s:['s1','s2']}, {s:['z','p']}, {s:['k','y']}, {s:['e','s1']}, {s:['s2','z']},
  {s:['p','k']}, {s:['y','e']}, {s:['s1','z']}, {s:['s2','k']}, {s:['s1','s2','z','p','k','y','e']}
];
const UNIQ_ZOR = [
  {can:1.5, vur:1.0, sans:0.02, bedelK:1},
  {can:3,   vur:1.5, sans:0.04, bedelK:2.5},
  {can:6,   vur:2.2, sans:0.07, bedelK:6},
  {can:10,  vur:3.0, sans:0.12, bedelK:15}
];
function uniqBedel(bolge, zi){ return Math.round(200 * bolge * UNIQ_ZOR[zi].bedelK); }
function uniqVer(z, poz){
  const bs = UNIQ_BOSS[(z.bolge-1) % 10];
  const slot = bs.s[Math.random()*bs.s.length|0];
  const kim = KIMLER[Math.random()*4|0];
  const mev = ENV.don[kim][slot];
  if(!mev || mev.n < 6){
    if(mev) depoEkle(kim, {slot, n:mev.n, b:mev.b||0});
    ENV.don[kim][slot] = {n:6, b:0};
  } else depoEkle(kim, {slot, n:6, b:0});
  envKaydet();
  duyuruE.textContent = '✦ UNIQUE! ✦';
  duyuruE.style.opacity = '1';
  clearTimeout(duyuruE._t);
  duyuruE._t = setTimeout(()=>{ duyuruE.style.opacity='0'; }, 2400);
  if(poz) skillHalka(poz, 0xfff3c4);
  z.kazanilan = {kim, slot};
}
function uniqBaslat(bolge, zi){
  const bedel = uniqBedel(bolge, zi);
  if(ENV.altin < bedel || D.zindan) return;
  ENV.altin -= bedel; envKaydet();
  zinTemizle();
  D.zindan = {tip:'uniq', kalan:90, bolge, zi, sans:UNIQ_ZOR[zi].sans, vurK:UNIQ_ZOR[zi].vur,
              bedel, eskiB:D.bolge, eskiBolum:D.bolum, topA:0, topK:0, topI:0, bossKalan:0};
  D.bolge = bolge; D.bolum = 5;
  D.bossAktif = true; D.sarsinti = 0.6;
  mobDogur(bossTur(0), true);
  bossSunum();
  const bm = D.moblar[D.moblar.length-1];
  if(bm && bm.bossMu){ bm.can *= UNIQ_ZOR[zi].can; bm.azami *= UNIQ_ZOR[zi].can; }
  document.getElementById('panelX').click();
  rozetGuncelle();
}
/* ─── ARENA: kod + parametrik stat + tik simülasyonu ─── */
function ozet6(s){
  let x = 5381;
  for(let i=0;i<s.length;i++) x = ((x<<5)+x+s.charCodeAt(i))|0;
  return ('000000'+(x>>>0).toString(36)).slice(-6);
}
function kodUret(){
  const don = {};
  for(const k of KIMLER){
    don[k] = {};
    for(const s of HO_SIRA){
      const it = ENV.don[k][s];
      if(it) don[k][s] = [it.n, it.b||0];
    }
  }
  const obj = {v:1, ad:ENV.ad||'???', sv:D.seviye, gel:D.gel, sk:D.skill, don, plan:ENV.plan};
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  return 'LGC1.'+b64+'.'+ozet6(b64);
}
function kodOku(s){
  try{
    s = (s||'').trim();
    const p = s.split('.');
    if(p.length !== 3 || p[0] !== 'LGC1') return null;
    if(ozet6(p[1]) !== p[2]) return null;
    const o = JSON.parse(decodeURIComponent(escape(atob(p[1]))));
    if(!o || !o.don || !o.plan) return null;
    return o;
  }catch(e){ return null; }
}
const ARN_TABAN = {
  okcu:  {hp:170, atk:26, ar:1.05, sira:'arka'},
  brute: {hp:430, atk:24, ar:1.30, sira:'on'},
  mage:  {hp:150, atk:34, ar:1.13, sira:'arka'},
  priest:{hp:195, atk:30, ar:0.95, sira:'arka', heal:24}
};
function arnStat(obj){
  const takim = {};
  const svK = 1 + (obj.sv-1)*0.025;
  for(const k of KIMLER){
    const T2 = ARN_TABAN[k], d = obj.don[k]||{};
    const e = (dizi, slot)=> d[slot] ? dizi[d[slot][0]]*(1+BASMA_GUC*d[slot][1])/100 : 0;
    const gelK = 1 + 0.04*((obj.gel||{})[k]||0);
    const atkKat = (1 + e(ANA1,'s1')) * (d.s2 ? 1.03 : 1);
    let ar = T2.ar;
    if(k==='okcu' || k==='mage') ar /= (1 + e(SILAH2[k].ana,'s2'));
    const krS = Math.min(0.75, e(KUPE_ANA,'e'));
    const krC = d.e && d.e[0]>=1 ? 1.8 : 1.6;
    takim[k] = {
      kim:k, sira:T2.sira,
      max: Math.round(T2.hp * (1 + e(ZANA,'z')) * svK * (1 + 0.03*((obj.sk||{})[k]||0))),
      dps: T2.atk * atkKat / ar * (1 + krS*(krC-1)) * svK * gelK * (1 + 0.06*Math.min(9,(obj.sk||{})[k]||0)),
      dr: Math.min(0.65, e(PANA,'p')),
      blok: k==='brute' ? Math.min(0.75, e(SILAH2.brute.ana,'s2')) : 0,
      heal: T2.heal ? T2.heal * (1 + (d.s2 ? SILAH2.priest.ana[d.s2[0]]*(1+BASMA_GUC*d.s2[1])/100 : 0)) * svK * gelK : 0,
      sarj: 0, stun: 0
    };
    takim[k].hp = takim[k].max;
  }
  return takim;
}
function arnHedefSec(plan, rakip, tankOldu){
  const ad = tankOldu ? plan.kosul : plan.hedef;
  const canli = KIMLER.filter(k=> rakip[k].hp > 0);
  if(!canli.length) return null;
  const dogrudan = {sifaci:'priest', buyucu:'mage', okcu:'okcu', tank:'brute'}[ad];
  if(dogrudan && rakip[dogrudan].hp > 0) return dogrudan;
  return canli.reduce((a,k)=> rakip[k].hp/rakip[k].max < rakip[a].hp/rakip[a].max ? k : a, canli[0]);
}
function arenaSimule(benObj, rkObj){
  const A = arnStat(benObj), B = arnStat(rkObj);
  const pA = benObj.plan, pB = rkObj.plan;
  const sA = 0.95 + Math.random()*0.10, sB = 0.95 + Math.random()*0.10;
  const frames = [], log = [];
  const durusK = (p, br)=> p.durus==='saldirgan' ? [1.15,1.12] : p.durus==='kale' ? [0.85,0.85] : [1,1];
  const dizK = (p)=> p.diz==='kaplumbaga' ? [0.90,0.88] : p.diz==='baskin' ? [1.10,1.10] : [1,1];
  function taraf(T, P, R, pR, sans, adim, benMi){
    const isim = benMi ? 'A' : 'B';
    const tankOldu = R.brute.hp <= 0;
    const [dV, dY] = dizK(P);
    for(const k of KIMLER){
      const c = T[k];
      if(c.hp <= 0) continue;
      if(c.stun > 0){ c.stun--; continue; }
      c.sarj = Math.min(1, c.sarj + 1/28);
      /* duruş (yalnız brute) */
      let vurKat = 1, brDurus = P.durus;
      if(k==='brute' && P.durusK && c.hp < c.max*0.4) brDurus = 'kale';
      if(k==='brute') vurKat = brDurus==='saldirgan' ? 1.15 : brDurus==='kale' ? 0.85 : 1;
      /* ulti */
      const toplamR = KIMLER.reduce((a,x)=> a + Math.max(0,R[x].hp)/R[x].max, 0)/4;
      const toplamT = KIMLER.reduce((a,x)=> a + Math.max(0,T[x].hp)/T[x].max, 0)/4;
      const ultiOk = P.ulti==='acilis' || (P.ulti==='yari' && toplamR < 0.5) || (P.ulti==='zor' && toplamT < 0.55);
      if(c.sarj >= 1 && ultiOk){
        c.sarj = 0;
        if(k==='okcu'){
          for(const x of KIMLER) if(R[x].hp>0) R[x].hp -= c.dps*1.1*sans;
          log.push([adim, `⚡ ${isim}·🏹 Ok Kasırgası!`]);
        } else if(k==='brute'){
          for(const x of KIMLER) if(R[x].hp>0){ R[x].hp -= c.dps*0.9*sans; R[x].stun = Math.max(R[x].stun, 2); }
          log.push([adim, `⚡ ${isim}·🪓 Deprem — rakip sersemledi!`]);
        } else if(k==='mage'){
          const h3 = KIMLER.filter(x=>R[x].hp>0).sort((a,b)=>R[b].hp-R[a].hp).slice(0,3);
          for(const x of h3) R[x].hp -= c.dps*2.2*sans;
          log.push([adim, `⚡ ${isim}·🪄 Kıyamet Meteoru!`]);
        } else {
          for(const x of KIMLER) if(T[x].hp>0) T[x].hp = T[x].max;
          T.koruma = 6;
          log.push([adim, `⚡ ${isim}·✚ İlahi Müdahale — tam şifa!`]);
        }
        continue;
      }
      if(k==='priest'){
        let hk = P.sifa==='tank' ? 'brute' : null;
        const yarali = KIMLER.filter(x=> T[x].hp>0 && T[x].hp < T[x].max);
        if(P.acil){
          const kritik = yarali.filter(x=> T[x].hp/T[x].max < 0.35);
          if(kritik.length) hk = kritik.sort((a,b)=> T[a].hp/T[a].max - T[b].hp/T[b].max)[0];
        }
        if(!hk || T[hk].hp<=0 || T[hk].hp>=T[hk].max){
          if(P.sifa==='hasarci'){
            const hs = ['okcu','mage'].filter(x=> T[x].hp>0 && T[x].hp<T[x].max);
            hk = hs.sort((a,b)=> T[a].hp/T[a].max - T[b].hp/T[b].max)[0];
          }
          if(!hk) hk = yarali.sort((a,b)=> T[a].hp/T[a].max - T[b].hp/T[b].max)[0];
        }
        if(hk){ T[hk].hp = Math.min(T[hk].max, T[hk].hp + c.heal*0.62*sans); continue; }
      }
      const hedef = arnHedefSec(P, R, tankOldu);
      if(!hedef) continue;
      let dmg = c.dps * 0.5 * sans * vurKat * dV;
      if(R[hedef].sira==='arka' && R.brute.hp > 0) dmg *= 0.70;          /* koruma cezası */
      if(R[hedef].blok > 0 && Math.random() < R[hedef].blok) dmg *= 0.4;
      let rDr = R[hedef].dr;
      if(hedef==='brute'){
        let rd = pR.durus;
        if(pR.durusK && R.brute.hp < R.brute.max*0.4) rd = 'kale';
        if(rd==='kale') rDr = Math.min(0.75, rDr + 0.18);
        if(rd==='saldirgan') dmg *= 1.15;
      }
      dmg *= (1 - rDr) * dizK(pR)[1];   /* savunanın dizilim koruması */
      if(R.koruma > 0) dmg *= 0.5;
      const onceki = R[hedef].hp;
      R[hedef].hp -= dmg;
      if(onceki > 0 && R[hedef].hp <= 0){
        log.push([adim, `💀 ${benMi?'B':'A'}·${hedef} düştü!`]);
        if(hedef==='brute') log.push([adim, `🧱 ${benMi?'B':'A'} koruması kalktı!`]);
      }
    }
    if(T.koruma > 0) T.koruma--;
  }
  for(let i=0; i<90; i++){
    if(i % 2 === 0){ taraf(A, pA, B, pB, sA, i, true); taraf(B, pB, A, pA, sB, i, false); }
    else { taraf(B, pB, A, pA, sB, i, false); taraf(A, pA, B, pB, sA, i, true); }
    frames.push({
      a: KIMLER.map(k=> Math.max(0, A[k].hp)/A[k].max),
      b: KIMLER.map(k=> Math.max(0, B[k].hp)/B[k].max),
      log: log.splice(0)
    });
    const aOl = KIMLER.every(k=> A[k].hp<=0), bOl = KIMLER.every(k=> B[k].hp<=0);
    if(aOl || bOl) break;
  }
  const son = frames[frames.length-1];
  const aT = son.a.reduce((x,y)=>x+y,0), bT = son.b.reduce((x,y)=>x+y,0);
  return {frames, kazandi: aT > bT, skor: [Math.round(aT*25), Math.round(bT*25)]};
}
let arnOyna = null;
const ZIN_DOLUM = 8*3600e3;
function zinYenile(){
  if(ENV.zin.anahtar >= 3){ ENV.zin.son = Date.now(); return; }
  const kazan = Math.floor((Date.now() - ENV.zin.son) / ZIN_DOLUM);
  if(kazan > 0){
    ENV.zin.anahtar = Math.min(3, ENV.zin.anahtar + kazan);
    ENV.zin.son = ENV.zin.anahtar >= 3 ? Date.now() : ENV.zin.son + kazan*ZIN_DOLUM;
    envKaydet();
  }
}
function mobVfxTemizle(m){                             /* p157: mob üstü sahne-VFX'i tek noktadan */
  if(m._alevF){ mobAlevBirak(m._alevF); m._alevF = null; }
  if(m._karF){ sahne.remove(m._karF); m._karF.material.dispose(); m._karF = null; }
  if(m._buzH){
    m.kok.remove(m._buzH);
    m._buzH.traverse(o2=>{ if(o2.isMesh){ o2.geometry.dispose(); o2.material.dispose(); } });
    m._buzH = null;
  }
}
function combatStateReset(){                           /* p157: savaş sahnesinin tüm geçici durumu */
  for(const m of D.moblar){ mobVfxTemizle(m); sahne.remove(m.kok); }
  D.moblar.length = 0;
  for(const o of D.oklar) okBirak(o.kok);
  D.oklar.length = 0;
  for(const o of D.buyular) sahne.remove(o.kok);
  D.buyular.length = 0;
  if(D.dikenler){ for(const dk of D.dikenler) dikenBirak(dk.kok); D.dikenler.length = 0; }
  for(const e of D.efektler){
    sahne.remove(e.kok);
    if(e.tex) e.tex.dispose();
    if(e.tip==='parca' && parcaHavuz.length < 130) parcaHavuz.push(e.kok);
  }
  D.efektler.length = 0;
  D.gecikme.length = 0;
  D.alevler.length = 0;                                /* p157: alev duvarı tiki yeni sahneye taşınmasın */
  D.yagmur = null; D.kalkan = null;
  if(D.hasarIz) for(const kim in D.hasarIz) D.hasarIz[kim] = 0;
  focusAta(null);
  D.sarsinti = 0; D.hitStop = 0;
  D.kamZoom = null; kamera.fov = 46; kamera.updateProjectionMatrix();
  if(okcu){ okcu.kilit = null; okcu.bekleyen = null; okcu.yagmurP = null; okcu.nisan = 0; okcu.kacinma = 0; }
  if(brute){ brute.kilit = null; brute.vuruslar = null; }
  if(mage){ mage.kilit = null; mage.buyu = null; mage.bekleme = 0; }
  if(priest){ priest.kilit = null; priest.is = null; priest.bekleme = 0; }
}
function zinTemizle(){
  combatStateReset();                                  /* p157: temizlik tek merkezden — sıra hatası imkânsız */
  D.bossAktif = false; D.dogumSayac = 1.4;
  D.okcuCan = kMax('okcu'); D.bruteCan = bruteMax(); D.mageCan = kMax('mage'); D.priestCan = kMax('priest');
  for(const kh of [okcu, brute, mage, priest])
    if(kh && kh.olu){ kh.olu = false; kh.dirilme = 0; }
  if(brute && brute.durum === 'olu'){                  /* HATA DÜZELTMESİ: yerde kalma kilidi */
    brute.durum = 'don'; bruteOynat('01_IDLE');
  }
}
function zinBossIncelt(){
  const m = D.moblar[D.moblar.length-1];
  if(m && m.bossMu){ m.can *= 0.7; m.azami *= 0.7; }   /* Geçit bossları %70 canla */
}
function zindanBaslat(tip){
  zinYenile();
  if(ENV.zin.anahtar <= 0 || D.zindan) return;
  if(ENV.zin.anahtar >= 3) ENV.zin.son = Date.now();
  ENV.zin.anahtar--; envKaydet();
  zinTemizle();
  D.zindan = {tip, kalan: tip==='boss' ? null : 180, bossKalan: tip==='boss' ? 5 : 0, topA:0, topK:0, topI:0};
  if(tip==='boss'){
    D.bossAktif = true; D.sarsinti = 0.5;
    mobDogur(bossTur(0), true);
    zinBossIncelt();
    bossSunum();
  }
  document.getElementById('panelX').click();
  rozetGuncelle();
}
function zindanBitir(erken){
  const z = D.zindan; if(!z) return;
  D.zindan = null;
  if(z.tip==='uniq'){
    D.bolge = z.eskiB; D.bolum = z.eskiBolum;
    z.erken = erken;
    uniqSon = z;
    envKaydet();
    zinTemizle();
    try{ rozetGuncelle(); }catch(e){}
    genelAc('uniqav');
    return;
  }
  if(z.tip==='altin' && !erken){ z.bonus = Math.round(z.topA*0.5); ENV.altin += z.bonus; }
  if(z.tip==='boss' && !erken && z.bossKalan<=0){
    ENV.kagit[3] += 1;
    const mitik = Math.random() < 0.25;
    if(mitik) ENV.kagit[4] += 1;
    const alt = 2000 + zk()*3;
    ENV.altin += alt;
    z.sandik = {mitik, alt};
  }
  z.erken = erken;
  zinSon = z;
  envKaydet();
  zinTemizle();
  try{ rozetGuncelle(); }catch(e){}
  genelAc('zindan');
}
function zindanSur(dt){
  const z = D.zindan;
  if(!z || z.kalan == null) return;
  const onceki = Math.ceil(z.kalan);
  z.kalan -= dt;
  if(Math.ceil(z.kalan) !== onceki) rozetGuncelle();
  if(z.kalan <= 0) zindanBitir(false);
}
const BSR = [
  {id:'kesim',    em:'🗡', k:[500,5000,25000,100000], o:[{a:400},{a:1500},{a:6000},{a:25000}]},
  {id:'boss',     em:'👑', k:[10,50,200,1000],        o:[{p:3,r:2},{p:8,r:2},{p:20,r:2},{p:60,r:2}]},
  {id:'bolge',    em:'🌍', k:[3,6,10,15],             o:[{a:300},{a:1000},{a:4000},{a:12000}]},
  {id:'seviye',   em:'⬆️', k:[10,25,50,80],           o:[{p:4,r:1},{p:10,r:1},{p:20,r:1},{p:40,r:1}]},
  {id:'basma',    em:'🔨', k:[25,100,400,1500],       o:[{p:4,r:2},{p:10,r:2},{p:25,r:2},{p:60,r:2}]},
  {id:'zirve',    em:'⚒',  k:[5,7,8,9,10],            o:[{p:1,r:3},{p:2,r:3},{p:4,r:3},{p:8,r:3},{p:16,r:3}]},
  {id:'ocak',     em:'🔥', k:[5,9,12,15],             o:[{a:500},{a:2000},{a:8000},{a:20000}]},
  {id:'kolek',    em:'🧡', k:[1,5,15,28],             o:[{p:2,r:3},{p:4,r:3},{p:8,r:3},{p:16,r:3}]},
  {id:'degirmen', em:'📜', k:[100,500,2000,8000],     o:[{p:1,r:4},{p:2,r:4},{p:4,r:4},{p:8,r:4}]},
  {id:'kosu',     em:'🔁', k:[10,50,200],             o:[{a:300},{a:1200},{a:5000}]},
  {id:'kademe',   em:'⭐', k:[4,12,24],               o:[{a:1000},{a:4000},{a:12000}]},
  {id:'hazine',   em:'💰', k:[5000,25000,100000],     o:[{p:5,r:2},{p:12,r:2},{p:30,r:2}]}
];
function bsrDeger(id){
  if(id==='kesim') return ENV.ist.kesim;
  if(id==='boss') return ENV.ist.boss;
  if(id==='bolge') return D.bolge;
  if(id==='seviye') return D.seviye;
  if(id==='basma') return ENV.ist.basma;
  if(id==='zirve'){
    let m2 = 0;
    for(const k of KIMLER) for(const s of HO_SIRA){
      const it = ENV.don[k][s];
      if(it && (it.b||0) > m2) m2 = it.b||0;
    }
    return m2;
  }
  if(id==='ocak') return ENV.ocak;
  if(id==='kolek'){
    let n2 = 0;
    for(const k of KIMLER){
      for(const s of HO_SIRA){ const it = ENV.don[k][s]; if(it && it.n>=3) n2++; }
      for(const it of ENV.depo[k]) if(it.n>=3) n2++;
    }
    return n2;
  }
  if(id==='degirmen') return ENV.ist.kagit;
  if(id==='kosu') return ENV.ist.kosu;
  if(id==='kademe') return (D.gel.okcu||0)+(D.gel.brute||0)+(D.gel.mage||0)+(D.gel.priest||0);
  if(id==='hazine') return Math.floor(ENV.altin);
  return 0;
}
function bsrHazir(){
  for(const b of BSR){
    const i = ENV.bsr[b.id]||0;
    if(i < b.k.length && bsrDeger(b.id) >= b.k[i]) return true;
  }
  return false;
}
function kisaSayi(n){
  return n >= 1000 ? (Math.round(n/100)/10).toString().replace('.',',')+'b' : ''+n;
}
const GIZLI_SEKME = ['nitelikler','basarimlar','dukkan','yukseltme','takimdepo','klan','arena','zindan','ayarlar'];
function sekmeyeGit(ad){
  document.querySelectorAll('.sekme').forEach(x=> x.classList.toggle('aktif', x.dataset.s===ad));
  panelYenile();
}
function pKhCiz(){
  const L = T(), kap = document.getElementById('pKhSec');
  kap.innerHTML = KIMLER.map(k=>
    `<span class="hoKh ${k===panelKim?'aktif':''}" data-k="${k}">${L.kahraman[k]}</span>`).join('');
  kap.querySelectorAll('.hoKh').forEach(b=> b.addEventListener('click', ()=>{
    panelKim = b.dataset.k;
    panelAdE.textContent = T().kahraman[panelKim];
    panelIkonE.src = kartIkonlar[KIMLER.indexOf(panelKim)].src;
    depoSec = null; envSec = null;
    pKhCiz(); panelYenile();
  }));
}
function genelAc(ad){
  if(!panelKim) panelKim = 'okcu';
  genelEkran = ad;
  panelE.classList.add('acik','genel');
  document.getElementById('panelArka').style.display = 'block';
  panelAdE.textContent = T().genelAd[ad];
  panelYenile();
}
/* Panelde hangi kahramanın açık olduğunu ALT KARTTA gösterir. Başlıktaki
   kahraman seçici kaldırıldı (kullanıcı kararı): geçiş kartlardan yapılır,
   bu yüzden hangisinin açık olduğu kartın kendisinde görünmeli. */
function kartVurgula(kim){
  document.querySelectorAll('#kahramanHud .kart').forEach((k,i)=>
    k.classList.toggle('panelde', KIMLER[i] === kim));
}

function panelKapatTemizle(){
  kartVurgula(null);
  if(arnOyna){ clearInterval(arnOyna.z); arnOyna = null; }
  genelEkran = null;
  panelE.classList.remove('genel');
  document.getElementById('panelArka').style.display = 'none';
}
function panelAc(kim, sekme){
  genelEkran = null;
  panelE.classList.remove('genel');
  document.getElementById('panelArka').style.display = 'block';
  panelKim = kim;
  panelAdE.textContent = T().kahraman[kim];
  depoSec = null; envSec = null;
  panelIkonE.src = kartIkonlar[KIMLER.indexOf(kim)].src;
  panelE.classList.add('acik');
  kartVurgula(kim);
  if(bildirimler[kim]) bildirimler[kim].style.display='none';
  const aktif = document.querySelector('.sekme.aktif');
  const hedef = sekme || ((aktif && !GIZLI_SEKME.includes(aktif.dataset.s)) ? aktif.dataset.s : 'envanter');
  pKhCiz();
  sekmeyeGit(hedef);
}
document.querySelectorAll('.rayBtn').forEach(b=>{
  b.addEventListener('click', ()=> genelAc(b.dataset.p));
});
document.getElementById('panelX').addEventListener('click', panelKapatTemizle);
document.getElementById('panelArka').addEventListener('click', ()=>{
  document.getElementById('panelX').click();
});
document.getElementById('dilBtn').addEventListener('click', ()=>{
  DKOD = DKOD==='tr' ? 'en' : 'tr';
  try{ localStorage.setItem('legacyDil', DKOD); }catch(e){}
  dilUygula();
  if(panelKim) panelAdE.textContent = T().kahraman[panelKim];
  panelYenile();
});
document.getElementById('panelX').addEventListener('click', ()=>{
  panelE.classList.remove('acik'); panelKim = null;
});
for(const sk2 of document.querySelectorAll('.sekme')){
  sk2.addEventListener('click', ()=>{
    document.querySelector('.sekme.aktif').classList.remove('aktif');
    sk2.classList.add('aktif');
    panelYenile();
  });
}
const bildirimler = {};
{ /* C5: yedi kısayol Ana Menü ızgarasına taşınır — savaş kenarları oyuna döner */
  const menuIz = document.getElementById('menuIzgara');
  for(const b of document.querySelectorAll('.rayBtn')) menuIz.appendChild(b);
  document.getElementById('menuBtn').addEventListener('click', (ev)=>{
    ev.stopPropagation(); menuIz.classList.toggle('acik');
  });
  menuIz.addEventListener('click', ()=> menuIz.classList.remove('acik'));
  addEventListener('pointerdown', (ev)=>{
    if(menuIz.classList.contains('acik') && !menuIz.contains(ev.target) && ev.target.id!=='menuBtn')
      menuIz.classList.remove('acik');
  }, {capture:true});
}
setTimeout(dilUygula, 0);   /* açılışta seçili dili bas */
document.querySelectorAll('.kart').forEach((kartE,i)=>{
  kartE.addEventListener('click', ()=>panelAc(KIMLER[i]));
  const nokta = document.createElement('b');
  nokta.className = 'bildirim';
  kartE.appendChild(nokta);
  bildirimler[KIMLER[i]] = nokta;
});
const DURUS_IK = {
  saldirgan: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#e86a4d" d="M5 3l10.5 10.5-2 2L3 5l2-2z"/><path fill="#8a6a2c" d="M14.5 15.5l2-2 2.5 2.5-1 1 2 2-1.5 1.5-2-2-1 1-2.5-2.5 1.5-1.5z"/></svg>',
  normal:    '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#e3c06a" d="M11 3h2v18h-2z"/><path fill="#8a6a2c" d="M4 7h16v2H4z"/><path fill="#e3c06a" d="M4 8l2.5 5a3 3 0 01-5 0L4 8zm16 0l2.5 5a3 3 0 01-5 0L20 8z"/></svg>',
  savunmaci: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#6fa8e0" d="M12 2l8 3v6c0 5-3.2 8.8-8 11-4.8-2.2-8-6-8-11V5l8-3z"/><path fill="#2c4a66" d="M12 4.2l6 2.2v4.8c0 3.9-2.4 6.9-6 8.8V4.2z"/></svg>'
};
const autoBtnE = document.getElementById('autoBtn');
const durusBtnE = document.getElementById('durusBtn');
if(autoBtnE){
  const autoCiz = ()=> autoBtnE.classList.toggle('kapali', !ENV.auto);
  autoBtnE.addEventListener('click', ()=>{
    ENV.auto = !ENV.auto;
    if(D.ultiIstek) D.ultiIstek = {okcu:false, brute:false, mage:false, priest:false};   /* denetim: eski istek patlamasın */
    envKaydet(); autoCiz();
  });
  autoCiz();
}
if(durusBtnE){
  const DURUS_RENK = {normal:'rgba(201,162,77,.55)', saldirgan:'rgba(232,106,77,.75)', savunmaci:'rgba(111,168,224,.75)'};
  const durusCiz = ()=>{
    durusBtnE.innerHTML = DURUS_IK[ENV.durus] || DURUS_IK.normal;
    durusBtnE.style.boxShadow = 'inset 0 0 0 1.5px ' + DURUS_RENK[ENV.durus] + ', 0 3px 9px rgba(0,0,0,.55)';
  };
  durusBtnE.addEventListener('click', ()=>{
    const sira = ['normal','saldirgan','savunmaci'];
    ENV.durus = sira[(sira.indexOf(ENV.durus) + 1) % 3];
    envKaydet(); durusCiz();
    duyuruE.textContent = T().durusAd[ENV.durus];       /* P6: hangi durustayım — net */
    duyuruE.style.opacity = '1';
    clearTimeout(duyuruE._t);
    duyuruE._t = setTimeout(()=>{ duyuruE.style.opacity = '0'; }, 1000);
  });
  durusCiz();
}
document.querySelectorAll('.ultiBtn').forEach(b=>{
  b.addEventListener('click', ev=>{
    ev.stopPropagation();
    const kim = b.dataset.kim;
    if(D.ulti[kim] >= 1 && !ENV.auto){
      if(!D.ultiIstek) D.ultiIstek = {};
      D.ultiIstek[kim] = !D.ultiIstek[kim];            /* ikinci dokunuş iptal eder */
      b.classList.toggle('secili', D.ultiIstek[kim]);
    }
  });
});
const ultiBtnler = document.querySelectorAll('.ultiBtn');
function hudGuncelle(){
  kahramanBarlariGuncelle();
  ultiBtnler.forEach(b=>{
    const kim = b.dataset.kim;
    const kh = ({okcu, brute, mage, priest})[kim];
    const gorunur = !ENV.auto && D.ulti[kim] >= 1 && !!kh && !kh.olu && !D.bitti;
    b.classList.toggle('gorunur', gorunur);
    if(!gorunur) b.classList.remove('secili');
  });
  okCanE.style.width = (Math.min(1, D.okcuCan/kMax('okcu'))*100)+'%';
  brCanE.style.width = (Math.min(1, D.bruteCan/bruteMax())*100)+'%';
  /* mavi bar: canlıyken şarj, ölüyken diriliş ilerlemesi */
  okSarjE.style.width = (okcu && okcu.olu ? (1 - okcu.dirilme/DIRILME_SN) : D.ulti.okcu)*100 + '%';
  okSarjE.classList.toggle('sarjDolu', !!(okcu && !okcu.olu && D.ulti.okcu>=1));
  brSarjE.classList.toggle('sarjDolu', !!(brute && !brute.olu && D.ulti.brute>=1));
  mgSarjE.classList.toggle('sarjDolu', !!(mage && !mage.olu && D.ulti.mage>=1));
  prSarjE.classList.toggle('sarjDolu', !!(priest && !priest.olu && D.ulti.priest>=1));
  okSarjE.classList.toggle('dolu', !!(okcu && !okcu.olu && D.ulti.okcu>=1));
  brSarjE.style.width = ((brute && brute.olu ? 1 - brute.dirilme/DIRILME_SN : D.ulti.brute)*100)+'%';
  brSarjE.classList.toggle('dolu', !!(brute && !brute.olu && D.ulti.brute>=1));
  mgCanE.style.width = (Math.min(1, D.mageCan/kMax('mage'))*100)+'%';
  mgSarjE.style.width = ((mage && mage.olu ? 1 - mage.dirilme/DIRILME_SN : D.ulti.mage)*100)+'%';
  mgSarjE.classList.toggle('dolu', !!(mage && !mage.olu && D.ulti.mage>=1));
  prCanE.style.width = (Math.min(1, D.priestCan/kMax('priest'))*100)+'%';
  prSarjE.style.width = ((priest && priest.olu ? 1 - priest.dirilme/DIRILME_SN : D.ulti.priest)*100)+'%';
  prSarjE.classList.toggle('dolu', !!(priest && !priest.olu && D.ulti.priest>=1));
  {
    const bb = document.getElementById('bossBar');
    const bMob = D.bossAktif ? D.moblar.find(m2=> m2.bossMu && m2.durum!=='olu') : null;
    if(bMob){
      bb.classList.add('acik');
      droneBasla();
      const L2 = T();
      document.getElementById('bossAd').textContent =
        D.zindan && D.zindan.tip==='uniq' ? '👑 ' + L2.uq.boss[(D.zindan.bolge-1)%10]
        : D.zindan && D.zindan.tip==='boss' ? '👑 ' + (5-D.zindan.bossKalan+1) + '/5'
        : '☠ ' + ((L2.bossTur && L2.bossTur[bMob.tur]) || L2.bossAd) + ' — ' + L2.bolgeAd[(D.bolge-1)%4];
      document.getElementById('bossBarIc').style.width = (Math.max(0, bMob.can/bMob.azami)*100) + '%';
    } else { bb.classList.remove('acik'); droneDur(); }
  }
  barY.okCanY.textContent = Math.max(0, Math.ceil(D.okcuCan)) + '/' + Math.round(kMax('okcu'));
  barY.brCanY.textContent = Math.max(0, Math.ceil(D.bruteCan)) + '/' + Math.round(bruteMax());
  barY.mgCanY.textContent = Math.max(0, Math.ceil(D.mageCan)) + '/' + Math.round(kMax('mage'));
  barY.prCanY.textContent = Math.max(0, Math.ceil(D.priestCan)) + '/' + Math.round(kMax('priest'));
  const sarjYaz = (el, kh, u)=>{
    el.textContent = kh && kh.olu ? '💀 ' + Math.ceil(kh.dirilme) + ' sn' : Math.round(Math.min(1,u)*100) + '/100';
  };
  sarjYaz(barY.okSarjY, okcu, D.ulti.okcu);
  sarjYaz(barY.brSarjY, brute, D.ulti.brute);
  sarjYaz(barY.mgSarjY, mage, D.ulti.mage);
  sarjYaz(barY.prSarjY, priest, D.ulti.priest);
  for(const k of skillKutular){
    const kim = k.dataset.kim, s = +k.dataset.s;
    const acik = D.skill[kim] >= s;
    k.classList.toggle('kilitli', !acik);
    let cd = 0;
    if(acik) cd = s===1 ? D.cd[kim] : s===2 ? D.cd2[kim] : (kim==='brute' ? D.cdN : D.cd3[kim]);
    const y = k.querySelector('.cdYazi');
    if(cd > 0.05){
      if(cd > (k._son||0) + 0.1) k._top = cd;            /* yeni bekleme başladı */
      k._son = cd;
      y.style.display = 'flex';
      y.textContent = Math.ceil(cd);
      y.style.setProperty('--cdp', Math.max(0, Math.min(100, cd/(k._top||cd)*100)) + '%');
    } else { y.style.display = 'none'; k._son = 0; }
  }
  [okcu, brute, mage, priest].forEach((kh, i2)=>{      /* C4: ölü karakter tüm kartıyla okunur */
    const kE = kartIkonlar[i2] && kartIkonlar[i2].closest('.kart');
    if(kE) kE.classList.toggle('olu', !!(kh && kh.olu));
  });
}
const olumP = document.getElementById('olum');

/* ═══════════ OKÇU ═══════════ */
let okcu = null;
function okcuKur(){
  const g = MODEL.okcu;
  const kok = iskeletKlon(g.scene);
  kok.scale.setScalar(1.15);
  kok.position.set(0, 0, OKCU_Z);
  sahne.add(kok);
  const mixer = new THREE.AnimationMixer(kok);
  const anim = {};
  for(const a of g.animations) anim[a.name] = a;
  const idle = mixer.clipAction(anim['01_IDLE']); idle.play();
  okcu = {kok, mixer, anim, idle, aktif: idle, bekleyen: null, kilit: null,
          yaw: Math.PI, ek: DURUS_EK, olu: false, dirilme: 0, tepkiB: 0,
          gezS: 0, gezP: null, yuruyor: false};
  kok.rotation.y = Math.PI + DURUS_EK + AYAR.okcuYawEk;
  /* Bırakış anı animasyona bağlı: 11_DRAW_ARROW oku alıp yayı gerer ve
     TAM GERİLİŞTE biter — ok o anda çıkar, 13_AIM_RECOIL (kiriş bırakma
     geri tepmesi) hemen ardından oynar. Zamanlayıcı yok, kayma yok. */
  mixer.addEventListener('finished', e=>{
    if(okcu.olu) return;
    const ad = e.action.getClip().name;
    if(ad === '11_DRAW_ARROW' || ad === '12_AIM_OVERDRAW'){
      if(okcu.yagmurP){
        if(!D.bitti) D.yagmur = {p: okcu.yagmurP.clone(), bekle: 1.0, kalan: kOz('okcu')?12:9, ara: 0};
        okcu.yagmurP = null;
      } else {
      let h = okcu.bekleyen;
      if(h && h.durum==='olu')                        /* HATA DÜZELTMESİ: yalnız çekişte ölen hedef ikame edilir */
        h = (D.focus && D.focus.durum!=='olu'
             && D.focus.kok.position.distanceTo(okcu.kok.position) <= okMenzil())
          ? D.focus : (okcu.kilit || enYakinMob());   /* davranış testi: uzak focus'ta menzildekine geri düş */
      /* bekleyen hiç yoksa bu klip atış çekişi değildi (ör. ulti animasyonu) — hayalet ok yok */
      if(h && h.durum!=='olu' && !D.bitti) okAt(h, ad==='12_AIM_OVERDRAW' ? 3 : 1);
      }
      okcu.bekleyen = null;
      const geri = okcuOynat('13_AIM_RECOIL', true);
      geri.timeScale = geri.getClip().duration / (okAralik() * GERI_PAY);
    } else if(ad === '13_AIM_RECOIL'){
      okcuOynat('01_IDLE');
    } else if(ad === '14_HIT_REACT'){
      okcuOynat('01_IDLE');
    }
  });
}
function okcuOynat(ad, tek){
  const a = okcu.mixer.clipAction(okcu.anim[ad]);
  if(tek){
    a.reset(); a.setLoop(THREE.LoopOnce);
    /* clampWhenFinished şart: kapalıyken biten animasyon pozunu ANINDA
       bırakır ve geçiş karışımı sırasında model 1-2 kare varsayılan poza
       sıçrar — atış başına iki geçiş olduğu için "iki kez sola titreme"
       görünüyordu. Açıkken son karede tutar, karışım kesintisiz akar. */
    a.clampWhenFinished = true;
  }
  if(okcu.aktif !== a){ okcu.aktif.fadeOut(0.12); a.reset().fadeIn(0.12).play(); okcu.aktif = a; }
  else a.play();
  return a;
}

/* ═══════════ MOB ═══════════ */
function mobDogur(turSec, bossMu){
  const tur = turSec || TUR_SIRA[Math.random()*TUR_SIRA.length|0];
  const T = TURLER[tur];
  const g = MODEL[tur];
  const kok = iskeletKlon(g.scene);
  kok.scale.setScalar(T.olc * (bossMu ? 1.6 : 1));
  kok.position.set(bossMu ? 0 : (Math.random()*2-1)*YOL_YARIM, 0, DOGUM_Z + Math.random()*2);
  sahne.add(kok);
  const mixer = new THREE.AnimationMixer(kok);
  const anim = {};
  for(const a of g.animations) anim[a.name] = a;
  const yuru = mixer.clipAction(anim[T.yuru]); yuru.play();
  const bar = canBariYap();
  bar.sp.position.y = 2.1*T.olc*(bossMu ? 1.6 : 1);
  kok.add(bar.sp);
  // dalga ölçeği: kesim arttıkça can artar
  const carpan = (1 + zk()*0.035) * (bossMu ? 5 : 1);
  const m = {tur, T, kok, mixer, anim, aktif:yuru, bar,
    can: T.can*carpan, azami: T.can*carpan,
    durum:'yuru', vurSayac: 0.6+Math.random()*0.4, olduSayac: 0,
    tepkiS: 0, tepkiB: 0, flash: 0, bossMu: !!bossMu};
  canBariCiz(bar, 1);
  D.moblar.push(m);
}
function mobOynat(m, ad, tek){
  const a = m.mixer.clipAction(m.anim[ad]);
  if(tek){ a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
  if(m.aktif !== a){ m.aktif.fadeOut(0.15); a.reset().fadeIn(0.15).play(); m.aktif = a; }
  return a;
}

/* ═══════════ OK ═══════════ */
const okHavuz = [];                                    /* ENC-6b: ok gövdesi geri dönüşümü */
function okGovdeAl(delici){
  if(!okAt._izGeo){
    okAt._izGeo = new THREE.BoxGeometry(0.02, 0.02, 0.62);
    okAt._izN = new THREE.MeshBasicMaterial({color: 0xf2ead2, transparent: true, opacity: 0.34});
    okAt._izD = new THREE.MeshBasicMaterial({color: 0xffe9a8, transparent: true, opacity: 0.6});
  }
  let kok = okHavuz.pop();
  if(kok){
    kok.scale.copy(okAt._taban);
  } else {
    kok = MODEL.ok.scene.clone(true);
    if(!okAt._taban) okAt._taban = kok.scale.clone();
    const iz = new THREE.Mesh(okAt._izGeo, okAt._izN);
    iz.position.z = -0.42;
    kok.add(iz);
    kok.userData.iz = iz;
  }
  kok.userData.iz.material = delici ? okAt._izD : okAt._izN;
  return kok;
}
function okBirak(kok){
  sahne.remove(kok);
  if(okHavuz.length < 40) okHavuz.push(kok);
}
function okAt(hedef, kat=1){
  SES.ok();
  const delici = D.skill.okcu && D.cd.okcu<=0;
  const kok = okGovdeAl(delici);
  if(delici){ D.cd.okcu = cdSure('okcu',10)*(imza('okcu')?0.5:1); kok.scale.z *= 1.35; }
  if(kat>1) kok.scale.multiplyScalar(1.25);
  const c = okcu.kok.localToWorld(new THREE.Vector3(KIRIS_EL.x, KIRIS_EL.y, KIRIS_EL.z));
  kok.position.copy(c);
  const h = hedef.kok.position.clone(); h.y = 0.9*hedef.T.olc;
  const yon = h.sub(c).normalize();
  kok.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), yon);
  sahne.add(kok);
  D.oklar.push({kok, yon, hedef, omur: delici ? 2.4 : 2, delici, vurulan: delici ? new Set() : null, kat});
  if(!delici && kat===1 && ozel('okcu') && Math.random()<0.10){
    const kok2 = okGovdeAl(false);                  /* ★ Çift Ok */
    kok2.position.copy(kok.position); kok2.position.x += 0.14;
    kok2.quaternion.copy(kok.quaternion);
    sahne.add(kok2);
    D.oklar.push({kok: kok2, yon: yon.clone(), hedef, omur: 2, delici: false, vurulan: null, kat: 1});
  }
}

/* ═══════════ ORTAK YARDIMCILAR ═══════════ */
function mobaVur(m, hasar, sessiz){
  hasar *= naraKat();
  hasar *= durusHasarK();                              /* V2a: duruş */
  const crabZirh = m.tur==='crab' && m.can > m.azami*0.5;   /* ENC-3: boss crab'de de kabuk — kimliği */
  if(crabZirh){                                        /* V2b: ön kabuk — kırılana dek %40 azaltım */
    hasar *= 0.6;
    if(!sessiz && Math.random()<0.4)
      parcaEfekt({x: m.kok.position.x, y: 0.45*m.T.olc, z: m.kok.position.z}, 0x9aa4ad, 2, 1.1, false);
  }
  if(D.kutsama > 0) hasar *= 1.10;                     /* ★ Kutsama */
  if(!sessiz && hasar>=1){
    const kr = kritOldu; kritOldu = false;
    if(kr){                                            /* P5+VFX-1: krit patlaması */
      const ky = 0.7*(m.T ? m.T.olc : 1);
      parcaEfekt({x: m.kok.position.x, y: ky, z: m.kok.position.z}, 0xffd75e, 4, 2.2, true);
      patEfekt(m.kok.position.x, ky, m.kok.position.z, '07_hitspark', 0xffe9a0, 0.9, 0.28);
      D.hitStop = Math.max(D.hitStop||0, 0.045);
    }
    sayiGoster(m.kok.position, Math.round(hasar), kr ? 'syK' : 'syN', 1.9*(m.T ? m.T.olc : 1)*(m.bossMu?1.6:1));
  }
  if(m.tur==='mutant' && !sessiz){                    /* ENC-2/3: ÖFKE YIĞAN (boss tavan 6) */
    m.ofke = Math.min(m.bossMu ? 6 : 8, (m.ofke||0)+1); m.ofkeS = 3;
  }
  m.can -= hasar;
  if(m.tur==='monsterx' && !m.bossMu && !m.volat && m.can>0 && m.can <= m.azami*0.35){
    m.volat = true;                                    /* ENC-2: PATLAYICI kararsızlaştı */
    parcaEfekt({x: m.kok.position.x, y: 0.6*m.T.olc, z: m.kok.position.z}, 0x8fe05a, 6, 1.8, true);
  }
  if(crabZirh && m.can <= m.azami*0.5){                /* kabuk kırıldı! */
    parcaEfekt({x: m.kok.position.x, y: 0.5*m.T.olc, z: m.kok.position.z}, 0xc8ccc4, 12, 2.6, true);
    m.tepkiS = Math.max(m.tepkiS||0, 0.6);
    SES.isabet();
  }
  canBariCiz(m.bar, Math.max(0, m.can/m.azami));
  if(m.can>0 && m.tepkiB<=0){
    m.tepkiB = 1.2;                       /* stun-lock önleme */
    if(m.anim['11_HIT_REACT']){
      const a = mobOynat(m, '11_HIT_REACT', true);
      m.tepkiS = Math.min(a.getClip().duration, 0.8);
    } else {
      m.flash = 0.22;                     /* klipsiz moblara ölçek darbesi */
    }
  }
  if(m.can<=0){
    m.durum='olu'; m.olduSayac = 1.4;
    SES.olum();
    {                                                  /* VFX-3: zeminde kan lekesi */
      const lk = new THREE.Mesh(new THREE.PlaneGeometry(0.9*m.T.olc, 0.9*m.T.olc),
        vfxMatK('12_splatter', 0x4a1210, 0.6));
      lk.rotation.x = -Math.PI/2;
      lk.rotation.z = Math.random()*Math.PI*2;
      lk.position.set(m.kok.position.x, 0.045, m.kok.position.z);
      sahne.add(lk);
      D.efektler.push({kok: lk, omur: 3.5, tip:'kavruk'});
    }
    if(m.tur==='monsterx' && !m.bossMu && m.volat){    /* ENC-2: 0.6 sn sonra alan patlaması */
      const px = m.kok.position.x, pz = m.kok.position.z;
      const ph = m.T.vurus*1.8*(1 + Math.max(0, zk()-300)*0.008);
      telegraphDaire(px, pz, 2.2, 0.6);
      D.gecikme.push({t: 0.6, fn: ()=>{
        parcaEfekt({x:px, y:0.5, z:pz}, 0x8fe05a, 14, 3.0, true);
        parcaEfekt({x:px, y:0.3, z:pz}, 0xd8f0a0, 6, 2.0, true);
        SES.boom();
        D.sarsinti = Math.max(D.sarsinti, 0.25);
        for(const [kk, kh] of [['okcu',okcu],['brute',brute],['mage',mage],['priest',priest]]){
          if(!kh || kh.olu) continue;
          if(Math.hypot(kh.kok.position.x-px, kh.kok.position.z-pz) < 2.2) kahramanaVur(kk, ph);
        }
        for(const m2 of canliListe())
          if(Math.hypot(m2.kok.position.x-px, m2.kok.position.z-pz) < 2.2) mobaVur(m2, ph*0.5, true);
      }});
    }
    if(m.tur==='monsterx' && m.bossMu){                /* ENC-3: Kararsız Dev finali — büyük patlama */
      const px = m.kok.position.x, pz = m.kok.position.z;
      const ph = m.T.vurus*2.2*(1 + Math.max(0, zk()-300)*0.008);
      telegraphDaire(px, pz, 3.0, 0.8);
      D.gecikme.push({t: 0.8, fn: ()=>{
        parcaEfekt({x:px, y:0.6, z:pz}, 0x8fe05a, 20, 4.0, true);
        parcaEfekt({x:px, y:0.4, z:pz}, 0xd8f0a0, 10, 2.8, true);
        SES.boom(); D.sarsinti = Math.max(D.sarsinti, 0.45);
        for(const [kk, kh] of [['okcu',okcu],['brute',brute],['mage',mage],['priest',priest]]){
          if(!kh || kh.olu) continue;
          if(Math.hypot(kh.kok.position.x-px, kh.kok.position.z-pz) < 3.0) kahramanaVur(kk, ph);
        }
      }});
    }
    if(D.focus===m) focusAta(null);
    if(m.bossMu){                                        /* V1f: boss finali — slow-mo + zoom-in */
      D.hitStop = Math.max(D.hitStop||0, 0.5);
      D.kamZoom = {tip:'olum', t:0};
      SES.boom();
    }
    m.bar.sp.visible = false;
    mobOynat(m, m.T.olum, true);
    D.kesim++;
    let kzn = (m.bossMu ? 25 : 1) * (3 + Math.floor(zk()/40)) * HIZ;
    if(D.zindan && D.zindan.tip==='altin') kzn *= 6;
    ENV.altin += kzn;
    if(D.zindan) D.zindan.topA += kzn;
    const kSans = D.zindan ? (D.zindan.tip==='kagit' ? 0.60 : (D.zindan.tip==='boss' ? 0.12 : 0)) : Math.min(1, 0.12*HIZ);
    if(Math.random() < kSans){
      const kAdet = (D.zindan && D.zindan.tip==='kagit' && m.bossMu) ? 3 : (zk() >= 300 ? 2 : 1);
      ENV.kagit[nadirlikSec(m.bossMu)] += kAdet;
      if(D.zindan) D.zindan.topK += kAdet;
    }
    envKaydet();
    for(const kk of ['okcu','brute','mage','priest'])       /* yüzük 3. satır: Savaş Açlığı */
      if(yn2(kk)>=2) for(const c of [D.cd, D.cd2, D.cd3])
        if(c[kk]>0) c[kk] = Math.max(0, c[kk]-0.2);
    if(m.bossMu && D.zindan && D.zindan.tip==='uniq'){       /* ✦ unique avı */
      D.bossAktif = false;
      const z = D.zindan;
      const p = ENV.uniq.pity[z.bolge]||0;
      const pityArtis = [1,2,3,5][z.zi];             /* zorluk arttıkça pity hızlı dolar */
      const dustu = Math.random() < z.sans || (p + pityArtis) >= 25;
      if(dustu){
        ENV.uniq.pity[z.bolge] = 0;
        uniqVer(z, m.kok.position);
      } else {
        ENV.uniq.pity[z.bolge] = p + pityArtis;
        itemVer(KIMLER[Math.random()*4|0], Math.random()<0.25 ? 4 : 3, m.kok.position);   /* teselli */
        z.iade = Math.round(z.bedel*0.4);
        ENV.altin += z.iade;
      }
      z.sonuc = dustu;
      zindanBitir(false);
    }
    else if(m.bossMu && D.zindan && D.zindan.tip==='boss'){       /* zindan boss zinciri */
      D.bossAktif = false;
      D.zindan.bossKalan--;
      D.zindan.topI++;
      itemVer(KIMLER[Math.random()*4|0], bossOdul(), m.kok.position);   /* garantili drop */
      if(D.zindan.bossKalan > 0){
        D.gecikme.push({t:1.3, fn: ()=>{
          if(D.zindan && D.zindan.tip==='boss'){
            D.bossAktif = true;
            mobDogur(bossTur(5 - D.zindan.bossKalan), true);   /* ENC-3: Geçit'te 5 farklı boss */
            zinBossIncelt();
          }
        }});
      } else {
        zindanBitir(false);
      }
    }
    else if(m.bossMu){                                            /* boss düştü: bölge geçişi + ödül */
      D.bossAktif = false;
      D.bolge++; D.bolum = 1; D.bolumKesim = 0;
      if(D.bolge > ENV.maxB){ ENV.maxB = D.bolge; envKaydet(); }
      stageKaydet();
      const oduLKim = ['okcu','brute','mage','priest'][Math.random()*4|0];
      itemVer(oduLKim, bossOdul(), m.kok.position);
      for(let bi=0; bi<3; bi++) ENV.kagit[nadirlikSec(true)]++;     /* boss: +3 garantili kağıt */
      bolumDuyur();
    } else if(!D.bossAktif && !D.zindan){
      D.bolumKesim++;
      if(D.bolumKesim >= 20){
        if(D.bolum < 5){ D.bolum++; D.bolumKesim = 0; bolumDuyur(); }
        else { D.bossAktif = true; D.sarsinti = 0.7; mobDogur(bossTur(0), true); bolumDuyur(true); bossSunum(); }
      }
    }
    rozetGuncelle();
    D.sevKesim += HIZ;                          /* ×10 slotunda hızlı exp */
    ENV.ist.kesim++; if(m.bossMu) ENV.ist.boss++;
    if(D.sevKesim >= sevEsik(D.seviye)){
      D.sevKesim -= sevEsik(D.seviye);
      D.seviye++; D.puan++;
      SES.seviye();
      lvlKaydet();
    }
    sevArayuz();
    dropDene(m);
  }
}
function enYakinKahraman(m){
  const adaylar = [];
  if(!okcu.olu) adaylar.push({p: okcu.kok.position, kim:'okcu'});
  if(brute && !brute.olu) adaylar.push({p: brute.kok.position, kim:'brute'});
  if(mage && !mage.olu) adaylar.push({p: mage.kok.position, kim:'mage'});
  if(priest && !priest.olu) adaylar.push({p: priest.kok.position, kim:'priest'});
  if(!adaylar.length) return {p: okcu.kok.position, kim:'okcu'};
  let e = adaylar[0], ed = m.kok.position.distanceTo(e.p);
  for(const a of adaylar){
    const d = m.kok.position.distanceTo(a.p);
    if(d < ed){ ed = d; e = a; }
  }
  return e;
}

/* ═══════════ BRUTE ═══════════ */
let brute = null;
function bruteKur(){
  const g = MODEL.brute;
  const kok = iskeletKlon(g.scene);
  kok.scale.setScalar(BRUTE_AYAR.olcek);
  kok.position.set(BRUTE_AYAR.yuvaX, 0, BRUTE_AYAR.yuvaZ);
  kok.rotation.y = Math.PI;
  sahne.add(kok);
  const mixer = new THREE.AnimationMixer(kok);
  const anim = {};
  for(const a of g.animations) anim[a.name] = a;
  const idle = mixer.clipAction(anim['01_IDLE']); idle.play();
  brute = {kok, mixer, anim, aktif: idle, durum:'bekle', tepkiS: 0, tepkiB: 0,
           kilit: null, vuruslar: null, saldiri: null, yaw: Math.PI,
           olu: false, dirilme: 0};
}
function bruteOynat(ad, tek){
  const a = brute.mixer.clipAction(brute.anim[ad]);
  if(tek){ a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
  if(brute.aktif !== a){ brute.aktif.fadeOut(0.18); a.reset().fadeIn(0.18).play(); brute.aktif = a; }
  else a.play();
  return a;
}
function bruteDon(istek, dt){
  let fark = istek - brute.yaw;
  fark = Math.atan2(Math.sin(fark), Math.cos(fark));
  brute.yaw += fark * Math.min(1, BRUTE_AYAR.donus*dt);
  brute.kok.rotation.y = brute.yaw;
}
function bruteYurut(dt, nokta, kos){
  const yon = nokta.clone().sub(brute.kok.position); yon.y = 0;
  const u = yon.length();
  if(u < 0.05) return u;
  yon.normalize();
  brute.kok.position.addScaledVector(yon, Math.min((kos?BRUTE_AYAR.kosu:BRUTE_AYAR.yuru)*(1+pHiz('brute'))*dt, u));
  if(brute.kok.position.z < HAT.bruteSinir) brute.kok.position.z = HAT.bruteSinir;   /* ileri sınır */
  brute.kok.position.x = Math.max(-YOL_YARIM+0.2, Math.min(YOL_YARIM-0.2, brute.kok.position.x));   /* duvar düzeltmesi: yan sınır */
  if(brute.kok.position.z > HAT.sinirZ+0.6) brute.kok.position.z = HAT.sinirZ+0.6;   /* duvar düzeltmesi: arka sınır */
  bruteDon(Math.atan2(yon.x, yon.z), dt);
  return u;
}
function bruteKilitle(){
  /* kilit kuralı: hedef ölmeden değişmez — burası yalnız kilit boşken çağrılır.
     sınırın erişilemez ötesindeki moblara kilitlenme: onlar zaten bize geliyor */
  let e=null, ed=1e9;
  for(const m of D.moblar){
    if(m.durum==='olu') continue;
    if(m.kok.position.z < HAT.bruteSinir - 1.2) continue;
    const d = m.kok.position.distanceTo(brute.kok.position);
    if(d<ed){ ed=d; e=m; }
  }
  brute.kilit = e;
}
function bruteSaldir(){
  if(D.skill.brute>=2 && D.cd2.brute<=0 && brute.kilit && brute.kilit.durum!=='olu'){
    D.cd2.brute = cdSure('brute',18);
    brute.saldiri = bruteOynat('15_KICK_1', true);
    const sure = brute.saldiri.getClip().duration;
    brute.vuruslar = [{t: sure*0.5, erisim: 2.2, tekme: true, oldu:false}];
    return;
  }
  if(D.skill.brute && D.cd.brute<=0){
    D.cd.brute = cdSure('brute',30)*(imza('brute')?0.5:1);
    brute.saldiri = bruteOynat('14_LEAP_ATTACK', true);
    const sure = brute.saldiri.getClip().duration;
    brute.vuruslar = [{t: sure*0.55, erisim: 2.6, alan: true, oldu:false}];
    return;
  }
  const s = BRUTE_SALDIRI[Math.random()*BRUTE_SALDIRI.length|0];
  brute.saldiri = bruteOynat(s.klip, true);
  brute.saldiri.timeScale = (brute.saldiri.timeScale || 1) * (1 + atakHiz('brute'));   /* yüzük +%3 vb. tempoya işler */
  brute.vuruslar = s.vurus.map(v=>({t:v.t, erisim:v.erisim, oldu:false}));
}
function bruteMuhafiz(){
  /* en öndeki canlı takım arkadaşının 3 m önü — grup nereye, warrior oraya */
  const L=[];
  if(okcu && !okcu.olu) L.push(okcu.kok.position);
  if(mage && !mage.olu) L.push(mage.kok.position);
  if(priest && !priest.olu) L.push(priest.kok.position);
  if(!L.length) return new THREE.Vector3(BRUTE_AYAR.yuvaX, 0, BRUTE_AYAR.yuvaZ);
  let onZ=Infinity, ox=0;
  for(const p of L){ onZ=Math.min(onZ, p.z); ox+=p.x; }
  ox = (ox/L.length)*0.5;                       // hatta yakın ama merkeze çekili
  return new THREE.Vector3(
    Math.max(-YOL_YARIM+0.3, Math.min(YOL_YARIM-0.3, ox)), 0,
    Math.max(HAT.bruteSinir, onZ - 3));
}
function bruteGuncelle(dt){
  if(!brute || brute.durum==='olu') return;
  const ev = bruteMuhafiz();
  if(brute.kilit && brute.kilit.durum==='olu') brute.kilit = null;
  if(brute.tepkiB>0) brute.tepkiB -= dt;
  if(brute.tepkiS>0){
    brute.tepkiS -= dt;
    if(brute.tepkiS<=0) bruteOynat('01_IDLE');
    return;                               /* tepki oynarken durum makinesi bekler */
  }
  /* savaş narası: 3+ mob varken, boştayken */
  if(D.skill.brute>=3 && D.cdN<=0 && brute.durum==='bekle' &&
     D.moblar.filter(m=>m.durum!=='olu').length>=3){
    D.cdN = NARA.cd; D.nara = NARA.sure;
    const a = bruteOynat(NARA.klip, true);
    brute.tepkiS = Math.min(a.getClip().duration, 2.2);
    const hlk = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.4, 30),
      new THREE.MeshBasicMaterial({color: 0xffd75e, transparent: true, opacity: 0.9, side: THREE.DoubleSide}));
    hlk.rotation.x = -Math.PI/2;
    hlk.position.set(brute.kok.position.x, 0.08, brute.kok.position.z);
    sahne.add(hlk);
    D.efektler.push({kok: hlk, omur: 0.9, tip:'heal'});
    return;
  }

  if(brute.durum==='bekle'){
    bruteDon(Math.PI, dt);
    const gecen = D.moblar.some(m=>m.durum!=='olu' && m.kok.position.distanceTo(brute.kok.position) < 11);
    if(gecen){ bruteKilitle(); if(brute.kilit) brute.durum='git'; }
    else if(brute.kok.position.distanceTo(ev) > 0.9) brute.durum='don';   /* grubu takip et */
  }
  else if(brute.durum==='git'){
    if(!brute.kilit) bruteKilitle();
    if(!brute.kilit){ brute.durum='don'; return; }
    const u = brute.kok.position.distanceTo(brute.kilit.kok.position);
    if(u <= BRUTE_AYAR.menzil){ brute.durum='vur'; bruteSaldir(); }
    else {
      const kos = u > BRUTE_AYAR.kosuEsik;
      bruteOynat(kos ? '04_RUN' : '03_WALK');
      const p0x = brute.kok.position.x, p0z = brute.kok.position.z;
      bruteYurut(dt, brute.kilit.kok.position, kos);
      const adim = Math.hypot(brute.kok.position.x-p0x, brute.kok.position.z-p0z);
      brute._tak = adim < 0.004 ? (brute._tak||0)+dt : 0;   /* duvar düzeltmesi: takılma bekçisi */
      if(brute._tak > 1.2){
        brute._tak = 0;
        const eski = brute.kilit;
        brute.kilit = null;
        let e2=null, ed2=1e9;                        /* yalnız gerçekten erişilebilir hedefler */
        for(const m2 of D.moblar){
          if(m2.durum==='olu' || m2===eski) continue;
          if(m2.kok.position.z < HAT.bruteSinir - 0.6) continue;
          const d2 = m2.kok.position.distanceTo(brute.kok.position);
          if(d2<ed2){ ed2=d2; e2=m2; }
        }
        if(e2){ brute.kilit = e2; }
        else brute.durum = 'don';                    /* kimse yoksa duvarı bırak, gruba dön */
      }
    }
  }
  else if(brute.durum==='vur'){
    if(!brute.kilit){
      /* hedef öldü: saldırı klibi bitene kadar sallamayı tamamla, sonra yenisi */
      if(!brute.saldiri || !brute.saldiri.isRunning()){
        brute.vuruslar = null;
        bruteKilitle();
        brute.durum = brute.kilit ? 'git' : 'don';
      }
      return;
    }
    const hk = brute.kilit.kok.position;
    bruteDon(Math.atan2(hk.x-brute.kok.position.x, hk.z-brute.kok.position.z), dt);
    if(brute.vuruslar){
      const t = brute.saldiri.time;
      for(const v of brute.vuruslar){
        if(!v.oldu && t >= v.t){
          v.oldu = true;
          if(v.tekme){
            const k2 = brute.kilit;
            if(k2 && k2.durum!=='olu' &&
               brute.kok.position.distanceTo(k2.kok.position) <= v.erisim*BRUTE_AYAR.olcek*1.3){
              SES.melee();
              patEfekt(k2.kok.position.x, 0.55*k2.T.olc, k2.kok.position.z, '16_slash', 0xf2e6cc, 1.15, 0.22);   /* VFX-3 */
              mobaVur(k2, krit('brute', k2, BRUTE_AYAR.hasar*0.6*itemKat('brute')*skill1Kat('brute'), true));
              if(k2.durum!=='olu'){
                /* geri savur + sersemlet */
                const yn = k2.kok.position.clone().sub(brute.kok.position); yn.y=0; yn.normalize();
                k2.kok.position.addScaledVector(yn, 2.5);
                if(k2.anim['11_HIT_REACT']) mobOynat(k2, '11_HIT_REACT', true);
                else k2.flash = 0.22;
                k2.tepkiS = Math.max(k2.tepkiS, 1.0*(knn('brute')>=2?1.25:1));
                k2.tepkiB = Math.max(k2.tepkiB, 1.3);
              }
            }
          } else if(v.alan){
            /* yere vuruş: brute çevresindeki TÜM moblara güçlü hasar */
            const hlk = new THREE.Mesh(
              new THREE.RingGeometry(1.3, 2.0, 26),
              new THREE.MeshBasicMaterial({color: 0xd8b050, transparent: true, opacity: 0.85, side: THREE.DoubleSide}));
            hlk.rotation.x = -Math.PI/2;
            hlk.position.set(brute.kok.position.x, 0.07, brute.kok.position.z);
            sahne.add(hlk);
            D.efektler.push({kok: hlk, omur: 0.7, tip:'heal'});
            for(const m2 of D.moblar){
              if(m2.durum==='olu') continue;
              if(m2.kok.position.distanceTo(brute.kok.position) <= v.erisim*BRUTE_AYAR.olcek*1.3){
                if(!v._toz){ v._toz = 1; parcaEfekt({x: brute.kok.position.x, y: 0.25, z: brute.kok.position.z}, 0x9a7c52, 12, 3, false); D.hitStop = Math.max(D.hitStop||0, 0.06); SES.boom(); }
                mobaVur(m2, krit('brute', m2, BRUTE_AYAR.hasar*1.6*itemKat('brute')*skill1Kat('brute'), true));
                if(kOz('brute') && m2.durum!=='olu'){ m2.tepkiS = Math.max(m2.tepkiS, 0.8); m2.tepkiB = Math.max(m2.tepkiB, 1.1); }
              }
            }
          } else {
            const u = brute.kok.position.distanceTo(hk);
            if(brute.kilit.durum!=='olu' && u <= v.erisim*BRUTE_AYAR.olcek*1.3){
              SES.melee();
              patEfekt(brute.kilit.kok.position.x, 0.55*brute.kilit.T.olc, brute.kilit.kok.position.z,
                       '16_slash', 0xf2e6cc, 1.2, 0.22);   /* VFX-3 */
              mobaVur(brute.kilit, krit('brute', brute.kilit, BRUTE_AYAR.hasar*itemKat('brute'), false));
              if(ozel1('brute') && brute.kilit && brute.kilit.durum!=='olu'){
                let pY=null, pU=2.4;               /* ★ Parçala: yandaki moba %50 */
                for(const m3 of D.moblar){
                  if(m3===brute.kilit || m3.durum==='olu') continue;
                  const u3 = m3.kok.position.distanceTo(brute.kilit.kok.position);
                  if(u3<pU){ pU=u3; pY=m3; }
                }
                if(pY) mobaVur(pY, BRUTE_AYAR.hasar*0.5*itemKat('brute'));
              }
            }
          }
        }
      }
      if(!brute.saldiri.isRunning()){
        brute.vuruslar = null;
        const u = brute.kok.position.distanceTo(hk);
        if(u > BRUTE_AYAR.kopus) brute.durum='git';
        else bruteSaldir();
      }
    } else bruteSaldir();
  }
  else if(brute.durum==='don'){
    const gecen = D.moblar.some(m=>m.durum!=='olu' && m.kok.position.distanceTo(brute.kok.position) < 11);
    if(gecen){ bruteKilitle(); if(brute.kilit){ brute.durum='git'; return; } }
    const u = brute.kok.position.distanceTo(ev);
    if(u < 0.12){
      brute.kok.position.copy(ev);
      brute.durum='bekle'; bruteOynat('01_IDLE');
    } else {
      const kos = u > BRUTE_AYAR.kosuEsik;
      bruteOynat(kos ? '04_RUN' : '03_WALK');
      bruteYurut(dt, ev, kos);
    }
  }
}

/* ═══════════ MAGE (Arissa) ═══════════ */
let mage = null;
function mageKur(){
  const g = MODEL.mage;
  const kok = iskeletKlon(g.scene);
  kok.position.set(MAGE_AYAR.yuvaX, 0, OKCU_Z);
  kok.rotation.y = Math.PI;
  sahne.add(kok);
  const mixer = new THREE.AnimationMixer(kok);
  const anim = {};
  for(const a of g.animations) anim[a.name] = a;
  const idle = mixer.clipAction(anim['01_IDLE']); idle.play();
  mage = {kok, mixer, anim, aktif: idle, kilit: null, buyu: null, tepki: null, tepkiB: 0,
          bekleme: 0, yaw: Math.PI, olu: false, dirilme: 0,
          gezS: 0, gezP: null, yuruyor: false};
}
function mageOynat(ad, tek){
  const a = mage.mixer.clipAction(mage.anim[ad]);
  if(tek){ a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
  if(mage.aktif !== a){ mage.aktif.fadeOut(0.15); a.reset().fadeIn(0.15).play(); mage.aktif = a; }
  else a.play();
  return a;
}
function mageOl(){
  mage.olu = true; mage.dirilme = DIRILME_SN*dirilKat('mage');
  mage.kilit = null; mage.buyu = null;
  mageOynat('12_DEATH_FRONT', true);   // kendi gerçek ölüm klibi
  for(const m of D.moblar) if(m.hedefKim==='mage') m.hedefSayac = 0;
  yenilgiKontrol();
}
function buyuAt(secim, hedef){
  SES.firlat();
  const yerel = new THREE.Vector3(secim.el[0], secim.el[1], secim.el[2]);
  const c = mage.kok.localToWorld(yerel);
  const hd = hedef.kok.position.clone(); hd.y = 0.9*hedef.T.olc;
  const yon = hd.sub(c).normalize();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62),
    vfxMatA('13_sparkle', 0xffb050, 1));               /* VFX-1c: dokulu mermi başı */
  const hale = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0),
    vfxMatA('15_muzzle', 0xff6a20, 0.7));              /* arkada alev halesi */
  hale.position.z = -0.12;
  mesh.add(hale);
  mesh.position.copy(c);
  sahne.add(mesh);
  D.buyular.push({kok: mesh, yon, omur: 2, hasar: MAGE_AYAR.hasar*itemKat('mage'), yakici: ozel1('mage'), kim:'mage'});
}
const ALAN_BUYU = {klip:'07b_CAST_2H_1', oran:0.62, yaricap:2.3, hasar:55};
const ZINCIR = {klip:'07d_CAST_2H_3', oran:0.62, hasar:34, azalt:0.7, sicra:2, menzil:3.0};
const DONMA = {klip:'07c_CAST_2H_2', oran:0.62, sure:2.5, yaricap:2.4, cd:25};
function dondur(p){
  for(const m of D.moblar){
    if(m.durum==='olu') continue;
    if(m.kok.position.distanceTo(p) <= DONMA.yaricap){
      const dsn = DONMA.sure*(knn('mage')>=2?1.25:1);
      m.tepkiS = Math.max(m.tepkiS, dsn);
      m.tepkiB = Math.max(m.tepkiB, dsn + 0.5);
      if(m.anim['11_HIT_REACT']) mobOynat(m, '11_HIT_REACT', true);
      const h2 = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.62, 20),
        new THREE.MeshBasicMaterial({color: 0x8fd8ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide}));
      h2.rotation.x = -Math.PI/2;
      h2.position.set(m.kok.position.x, 0.07, m.kok.position.z);
      sahne.add(h2);
      D.efektler.push({kok: h2, omur: 0.8, tip:'heal'});
    }
  }
}
function zincirBolt(p1, p2){                          /* V1f: hedefler arası kırık şimşek hattı */
  const nokta = [], n2 = 6;
  for(let i=0;i<=n2;i++){
    const t2 = i/n2, ara = i>0 && i<n2;
    nokta.push(new THREE.Vector3(
      p1.x + (p2.x-p1.x)*t2 + (ara ? (Math.random()-0.5)*0.5 : 0),
      0.8 + (ara ? (Math.random()-0.5)*0.4 : 0),
      p1.z + (p2.z-p1.z)*t2 + (ara ? (Math.random()-0.5)*0.5 : 0)));
  }
  const g2 = new THREE.BufferGeometry().setFromPoints(nokta);
  const cizgi = new THREE.Line(g2, new THREE.LineBasicMaterial({color: 0x9fd4ff, transparent: true, opacity: 1}));
  sahne.add(cizgi);
  D.efektler.push({kok: cizgi, omur: 0.16, tip:'bolt'});
}
function zincirEfekt(p){                               /* VFX-3: elektrik arkı çakması */
  patEfekt(p.x, 0.7, p.z, '04b_arc', 0x8fd4ff, 1.1, 0.3);
  const halka = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    vfxMatA('08_ring', 0x66ccff, 0.7));
  halka.rotation.x = -Math.PI/2;
  halka.position.set(p.x, 0.07, p.z);
  sahne.add(halka);
  D.efektler.push({kok: halka, omur: 0.55, tip:'heal'});
}
function zincirAt(){
  let hdf = mage.kilit;
  if(!hdf || hdf.durum==='olu') hdf = enYakinMob();
  if(!hdf || hdf.durum==='olu') return;
  let hasar = ZINCIR.hasar*itemKat('mage')*skill1Kat('mage'), onceki = hdf;
  const vurulan = new Set([hdf]);
  zincirEfekt(hdf.kok.position);
  zincirBolt(mage.kok.position, hdf.kok.position);
  mobaVur(hdf, krit('mage', hdf, hasar, true));
  for(let s=0; s<ZINCIR.sicra + (kOz('mage')?2:0); s++){
    let yakin=null, yu=ZINCIR.menzil;
    for(const m of D.moblar){
      if(m.durum==='olu' || vurulan.has(m)) continue;
      const u = m.kok.position.distanceTo(onceki.kok.position);
      if(u<yu){ yu=u; yakin=m; }
    }
    if(!yakin) break;
    hasar *= ZINCIR.azalt;
    vurulan.add(yakin);
    zincirEfekt(yakin.kok.position);
    zincirBolt(onceki.kok.position, yakin.kok.position);
    mobaVur(yakin, hasar);
    onceki = yakin;
  }
}
function kumeBul(){
  /* en kalabalık düşman kümesi: her mob için yarıçap içi komşu say */
  const canli = D.moblar.filter(m=>m.durum!=='olu');
  if(canli.length < 2) return null;
  let enIyi=null, enSayi=1;
  for(const m of canli){
    const uyeler = canli.filter(n=>n.kok.position.distanceTo(m.kok.position) < ALAN_BUYU.yaricap);
    if(uyeler.length > enSayi){
      enSayi = uyeler.length;
      const mrk = new THREE.Vector3();
      for(const u of uyeler) mrk.add(u.kok.position);
      mrk.divideScalar(uyeler.length); mrk.y = 0;
      enIyi = mrk;
    }
  }
  return enIyi;   // tek tek dağınıklarsa null → normal büyü
}
function alanPatlat(p){
  const halka = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.9, 26),
    new THREE.MeshBasicMaterial({color: 0xff9030, transparent: true, opacity: 0.85, side: THREE.DoubleSide})
  );
  halka.rotation.x = -Math.PI/2;
  halka.position.set(p.x, 0.07, p.z);
  sahne.add(halka);
  D.efektler.push({kok: halka, omur: 0.7, tip:'heal'});
  for(const m of D.moblar){
    if(m.durum==='olu') continue;
    if(m.kok.position.distanceTo(p) <= ALAN_BUYU.yaricap) mobaVur(m, krit('mage', m, ALAN_BUYU.hasar*itemKat('mage')*skill1Kat('mage'), true));
  }
}
function mageGuncelle(dt){
  if(!mage || mage.olu) return;
  if(mage.tepkiB>0) mage.tepkiB -= dt;
  if(mage.tepki && !mage.tepki.isRunning()){
    mage.tepki = null;
    if(!mage.buyu) mageOynat('01_IDLE');
  }
  if(mage.kilit && mage.kilit.durum==='olu') mage.kilit = null;
  {  /* süpürge: biten tek seferlik klip (skill/cast) pozda donmasın — yürüyüş ancak IDLE'dan başlayabiliyor */
    const sa = mage.aktif.getClip().name;
    if(!mage.aktif.isRunning() && sa!=='01_IDLE' && !AR_YUR_SET.has(sa) && !mage.buyu && !mage.tepki)
      mageOynat('01_IDLE');
  }
  {
    const su = mage.aktif.getClip().name;
    mage.yuruyor = menzilliYuru(mage, MAGE_AYAR.yuvaX, MAGE_AYAR.menzil, dt,
      !!(mage.buyu || mage.tepki) || tekKlipOynuyor(mage, '01_IDLE'), (dx,dz)=>{
        const ad = AR_YURUME[yonHarf(mage.yaw, dx, dz)];
        const s2 = mage.aktif.getClip().name;
        if(s2==='01_IDLE' || AR_YUR_SET.has(s2)) mageOynat(ad);
      }, true, false);   /* atak/cast sırasında kaçış dahil hareket yok — dur, vur, sonra yürü */
    if(!mage.yuruyor && AR_YUR_SET.has(mage.aktif.getClip().name)) mageOynat('01_IDLE');
  }
  if(D.focus && D.focus.durum!=='olu'){
    if(D.focus.kok.position.distanceTo(mage.kok.position) <= MAGE_AYAR.menzil) mage.kilit = D.focus;
    else if(mage.kilit === D.focus) mage.kilit = null;   /* davranış testi: uzak focus kilidi bırakılır */
  }
  if(!mage.kilit){
    let e=null, ed=MAGE_AYAR.menzil;
    for(const m of D.moblar){
      if(m.durum==='olu') continue;
      const d = m.kok.position.distanceTo(mage.kok.position);
      if(d<ed){ ed=d; e=m; }
    }
    mage.kilit = e;
  }
  let istekYaw = Math.PI;
  if(mage.kilit){
    const f = mage.kilit.kok.position.clone().sub(mage.kok.position);
    istekYaw = Math.atan2(f.x, f.z);
  }
  let fark = istekYaw - mage.yaw;
  fark = Math.atan2(Math.sin(fark), Math.cos(fark));
  mage.yaw += fark * Math.min(1, 8*dt);
  mage.kok.rotation.y = mage.yaw;

  if(mage.buyu){
    const b = mage.buyu;
    if(!b.atti && b.aksiyon.time >= b.t){
      b.atti = true;
      if(b.alanP){
        alanPatlat(b.alanP);
      } else if(b.donmaP){
        dondur(b.donmaP);
      } else if(b.zincir){
        zincirAt();
      } else {
        let hdf = mage.kilit;
        if(!hdf || hdf.durum==='olu') hdf = enYakinMob();
        if(hdf && hdf.durum!=='olu') buyuAt(b.secim, hdf);
      }
    }
    if(!b.aksiyon.isRunning()){
      mage.buyu = null; mage.bekleme = MAGE_AYAR.ara;
      mageOynat('01_IDLE');
    }
  } else {
    mage.bekleme -= dt;
    if(mage.bekleme<=0 && mage.kilit && !mage.tepki && !mage.yuruyor
       && mage.kilit.kok.position.distanceTo(mage.kok.position) <= MAGE_AYAR.menzil){   /* denetim: focus menzili delemez */
      const kume = (D.skill.mage && D.cd.mage<=0) ? kumeBul() : null;
      if(kume){
        D.cd.mage = yankiCd(cdSure('mage',20));
        const aksiyon = mageOynat(ALAN_BUYU.klip, true);
        aksiyon.timeScale = 1 + mageHiz();
        mage.buyu = {secim: null, aksiyon, t: Math.max(0.3, aksiyon.getClip().duration*ALAN_BUYU.oran),
                     atti: false, alanP: kume};
      } else if(D.skill.mage>=3 && D.cd3.mage<=0 && kumeBul()){
        D.cd3.mage = yankiCd(cdSure('mage',DONMA.cd));
        const aksiyon = mageOynat(DONMA.klip, true);
        aksiyon.timeScale = 1 + mageHiz();
        mage.buyu = {secim: null, aksiyon, t: Math.max(0.3, aksiyon.getClip().duration*DONMA.oran),
                     atti: false, donmaP: kumeBul()};
      } else if(D.skill.mage>=2 && D.cd2.mage<=0){
        D.cd2.mage = yankiCd(cdSure('mage',15)*(imza('mage')?0.5:1));
        const aksiyon = mageOynat(ZINCIR.klip, true);
        aksiyon.timeScale = 1 + mageHiz();
        mage.buyu = {secim: null, aksiyon, t: Math.max(0.3, aksiyon.getClip().duration*ZINCIR.oran),
                     atti: false, zincir: true};
      } else {
        const secim = MAGE_BUYU[Math.random()*MAGE_BUYU.length|0];
        const aksiyon = mageOynat(secim.klip, true);
        aksiyon.timeScale = 1 + mageHiz();
        mage.buyu = {secim, aksiyon, t: secim.t, atti: false};
      }
    }
  }
}

/* ═══════════ PRIEST ═══════════ */
let priest = null;
function priestKur(){
  const g = MODEL.priest;                     // gerçek priest gövdesi (Arissa iskeleti, 43 klip)
  const kok = iskeletKlon(g.scene);
  kok.position.set(PRIEST_AYAR.yuvaX, 0, OKCU_Z + PRIEST_AYAR.yuvaZek);
  kok.rotation.y = Math.PI;
  sahne.add(kok);
  const mixer = new THREE.AnimationMixer(kok);
  const anim = {};
  for(const a of g.animations) anim[a.name] = a;
  const idle = mixer.clipAction(anim[PRIEST_IDLE]); idle.play();
  priest = {kok, mixer, anim, aktif: idle, kilit: null, is: null, tepki: null, tepkiB: 0,
            bekleme: 0, yaw: Math.PI, olu: false, dirilme: 0,
          gezS: 0, gezP: null, yuruyor: false};
}
function priestOynat(ad, tek){
  const a = priest.mixer.clipAction(priest.anim[ad]);
  if(tek){ a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
  if(priest.aktif !== a){ priest.aktif.fadeOut(0.15); a.reset().fadeIn(0.15).play(); priest.aktif = a; }
  else a.play();
  return a;
}
function priestOl(){
  priest.olu = true; priest.dirilme = DIRILME_SN*dirilKat('priest');
  priest.kilit = null; priest.is = null;
  priestOynat('12_DEATH_FRONT', true);
  for(const m of D.moblar) if(m.hedefKim==='priest') m.hedefSayac = 0;
  yenilgiKontrol();
}
/* ─── V1c: parçacık + yıldırım + hit-stop altyapısı ─── */
const parcaGeo = new THREE.SphereGeometry(0.05, 6, 5);
const parcaHavuz = [];                                 /* V1f: mesh geri dönüşümü — GC yükünü keser */
function parcaAl(renk){
  const m2 = parcaHavuz.pop() ||
    new THREE.Mesh(parcaGeo, new THREE.MeshBasicMaterial({transparent: true}));
  m2.material.color.set(renk);
  m2.material.opacity = 0.95;
  m2.scale.setScalar(1);
  return m2;
}
function parcaEfekt(p, renk, adet, guc, yukari){
  adet = Math.max(1, Math.round(adet * pkCarpan()));
  for(let i=0;i<adet;i++){
    const m2 = parcaAl(renk);
    m2.position.set(p.x, (p.y||0.5), p.z);
    const a = Math.random()*Math.PI*2;
    const v = new THREE.Vector3(Math.cos(a)*guc*(0.4+Math.random()*0.6),
      (yukari ? 1.4 : 0.8)*guc*(0.5+Math.random()*0.8), Math.sin(a)*guc*(0.4+Math.random()*0.6));
    D.efektler.push({kok: m2, omur: 0.42 + Math.random()*0.2, tip:'parca', vel: v});
    sahne.add(m2);
  }
}
function izBirak(p, r){                                                   /* V1c: kavrulma izi */
  const iz2 = new THREE.Mesh(
    new THREE.PlaneGeometry(r*2.3, r*2.3),
    vfxMatK('17_scorch', 0x120d08, 0.75));            /* VFX-1: gerçek kavrulma dokusu */
  iz2.rotation.z = Math.random()*Math.PI*2;
  iz2.rotation.x = -Math.PI/2;
  iz2.position.set(p.x + (Math.random()-0.5)*0.2, 0.045, p.z + (Math.random()-0.5)*0.2);
  sahne.add(iz2);
  D.efektler.push({kok: iz2, omur: 4, tip:'kavruk'});
}
function telegraphSerit(p1, p2){                       /* V2c: zeminde tehlike şeridi */
  const uz = Math.hypot(p2.x-p1.x, p2.z-p1.z);
  const grup = new THREE.Group();
  const duzlem = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, uz),
    new THREE.MeshBasicMaterial({color: 0xff3a2a, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false}));
  duzlem.rotation.x = -Math.PI/2;
  grup.add(duzlem);
  for(const kx of [-0.62, 0.62]){                       /* P2: parlak kenar çizgileri */
    const kn = new THREE.Mesh(
      new THREE.PlaneGeometry(0.09, uz),
      new THREE.MeshBasicMaterial({color: 0xff7a5a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false}));
    kn.rotation.x = -Math.PI/2; kn.position.x = kx;
    grup.add(kn);
  }
  {                                                      /* P2: hedef ucunda ok başı */
    const ub = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 3),
      new THREE.MeshBasicMaterial({color: 0xff7a5a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false}));
    ub.rotation.x = -Math.PI/2; ub.rotation.z = Math.PI;
    ub.position.set(0, 0.01, uz/2 + 0.5);
    grup.add(ub);
  }
  const dgeo = new THREE.PlaneGeometry(0.9, uz);        /* P2: merkezden uca dolan katman */
  dgeo.translate(0, uz/2, 0);
  const dolum = new THREE.Mesh(dgeo,
    new THREE.MeshBasicMaterial({color: 0xff5a3a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false}));
  dolum.rotation.x = -Math.PI/2;
  dolum.position.set(0, 0.02, -uz/2);
  dolum.scale.y = 0.001;
  grup.add(dolum);
  grup.rotation.y = Math.atan2(p2.x-p1.x, p2.z-p1.z);
  grup.position.set((p1.x+p2.x)/2, 0.05, (p1.z+p2.z)/2);
  sahne.add(grup);
  D.efektler.push({kok: grup, omur: 0.9, tip:'tel', mat: duzlem.material, dolum, dSure: 0.9});
}
function telegraphDaire(x, z, r, sure){                 /* P2: dairesel tehlike işareti */
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(r*0.82, r, 30),
    new THREE.MeshBasicMaterial({color: 0xff3a2a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false}));
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(x, 0.05, z);
  sahne.add(mesh);
  D.efektler.push({kok: mesh, omur: sure||0.55, tip:'tel', mat: mesh.material});
}
function bossRoar(m){                                   /* faz 1 (%70): kükreme + yavru çağırma */
  m.tepkiS = Math.max(m.tepkiS||0, 1.0);
  m.tepkiB = Math.max(m.tepkiB||0, 1.2);
  D.sarsinti = Math.max(D.sarsinti, 0.5);
  SES.boss();
  sayiGoster(m.kok.position, 'ROAR!', 'syB', 2.3);
  for(let i=0;i<3;i++) mobDogur(anaTur());
}
function bossSarjBaslat(m){                             /* faz 2 (%40): en uzağa telegraph'lı şarj */
  let uzakK = null, uzU = -1;
  for(const kh of [okcu, brute, mage, priest]){
    if(!kh || kh.olu) continue;
    const u = kh.kok.position.distanceTo(m.kok.position);
    if(u > uzU){ uzU = u; uzakK = kh; }
  }
  if(!uzakK) return;
  const yon = uzakK.kok.position.clone().sub(m.kok.position).setY(0).normalize();
  const uc = m.kok.position.clone().addScaledVector(yon, 15);
  telegraphSerit(m.kok.position, uc);
  SES.buff();
  D.gecikme.push({t: 0.9, fn: ()=>{
    if(m.durum!=='olu'){ m.sarj = {yon, t:0}; SES.swing(); }
  }});
}
const buyuEkranYon = new THREE.Vector3();              /* VFX-1e: mermi hizalama geçicileri */
const buyuKamTers = new THREE.Quaternion();
const dikenHavuz = [];                                 /* ENC-6b: diken geri dönüşümü */
function dikenMeshAl(){
  if(dikenHavuz.length) return dikenHavuz.pop();
  if(!dikenMeshAl._geo){
    dikenMeshAl._geo = new THREE.ConeGeometry(0.07, 0.32, 6);
    dikenMeshAl._mat = new THREE.MeshBasicMaterial({color: 0x6a5a42});
  }
  return new THREE.Mesh(dikenMeshAl._geo, dikenMeshAl._mat);
}
function dikenBirak(mesh){
  sahne.remove(mesh);
  if(dikenHavuz.length < 40) dikenHavuz.push(mesh);
}
function dikenFirlat(m, hx, hz, hasarK){               /* ENC-3: genel diken (radyal/hedefli) */
  if(!D.dikenler) D.dikenler = [];
  const c = m.kok.position.clone(); c.y = 0.8*m.T.olc;
  const yon = new THREE.Vector3(hx - c.x, 0.7 - c.y, hz - c.z).normalize();
  const mesh = dikenMeshAl();
  mesh.position.copy(c);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), yon);
  sahne.add(mesh);
  D.dikenler.push({kok: mesh, yon, omur: 2.0,
    hasar: m.T.vurus*(hasarK||0.8)*(1 + Math.max(0, zk()-300)*0.008)});
}
function bossOzel40(m){                                 /* ENC-3: %40 fazı boss kimliğine göre */
  const tur = m.tur;
  if(tur==='rhino'){                                    /* Demir Boynuz: çift şarj */
    bossSarjBaslat(m);
    D.gecikme.push({t: 2.6, fn: ()=>{ if(m.durum!=='olu') bossSarjBaslat(m); }});
  } else if(tur==='mutant'){                            /* Kadim Öfke: klasik şarj */
    bossSarjBaslat(m);
  } else if(tur==='kecoon'){                            /* Gölge Sıçrayan: üçlü sıçrama */
    for(let i=0;i<3;i++) D.gecikme.push({t: 0.2 + i*1.0, fn: ()=>{
      if(m.durum==='olu') return;
      const canliK = [okcu, brute, mage, priest].filter(k=>k && !k.olu);
      if(!canliK.length) return;
      const kh = canliK[Math.random()*canliK.length|0];
      const yon = kh.kok.position.clone().sub(m.kok.position).setY(0).normalize();
      m.sarj = {yon, t:0, hizK:2.6, mx:0.6, vurK:1.3, itme:0, yor:0.15, cdA:'ponCd', cdS:0.4};
      SES.swing();
    }});
  } else if(tur==='goblin'){                            /* Sürü Kralı: zorunlu frenzy + hız */
    for(const g2 of D.moblar) if(g2.tur==='goblin' && g2.durum!=='olu') g2.frenzyZor = 12;
    m.hizB = 12;
    SES.buff();
    sayiGoster(m.kok.position, 'FRENZY!', 'syK', 2.3);
  } else if(tur==='crab'){                              /* Kadim Kabuk: radyal diken fırtınası */
    telegraphDaire(m.kok.position.x, m.kok.position.z, 2.4, 0.55);
    SES.buff();
    D.gecikme.push({t: 0.55, fn: ()=>{
      if(m.durum==='olu') return;
      SES.firlat();
      for(let i=0;i<8;i++){
        const a = i/8*Math.PI*2;
        dikenFirlat(m, m.kok.position.x + Math.sin(a)*8, m.kok.position.z + Math.cos(a)*8, 0.9);
      }
    }});
  } else if(tur==='spike'){                             /* Diken Ana: herkese hedefli diken */
    const hedefler = [];
    for(const kh of [okcu, brute, mage, priest])
      if(kh && !kh.olu){
        const hx = kh.kok.position.x, hz = kh.kok.position.z;
        telegraphDaire(hx, hz, 0.85, 0.55);
        hedefler.push([hx, hz]);
      }
    SES.buff();
    D.gecikme.push({t: 0.55, fn: ()=>{
      if(m.durum==='olu') return;
      SES.firlat();
      for(const [hx, hz] of hedefler) dikenFirlat(m, hx, hz, 0.85);   /* işaretlenen SABİT noktaya — kaçış ödüllenir */
    }});
  } else if(tur==='monsterx'){                          /* Kararsız Dev: patlayıcı yavrular */
    for(let i=0;i<2;i++) mobDogur('monsterx');
    sayiGoster(m.kok.position, '☣', 'syK', 2.3);
  }
}
function bossEnrage(m){                                 /* faz 3 (%20): +%30 saldırı hızı + kızıl aura */
  m.enrage = true;
  SES.boss();
  sayiGoster(m.kok.position, 'ENRAGE!', 'syK', 2.3);
  const aura = new THREE.Mesh(
    new THREE.RingGeometry(0.5*m.T.olc, 0.68*m.T.olc, 20),
    new THREE.MeshBasicMaterial({color: 0xff4030, transparent: true, opacity: 0.65, side: THREE.DoubleSide}));
  aura.rotation.x = -Math.PI/2; aura.position.y = 0.05;
  m.kok.add(aura);
}
function dikenAt(m){                                   /* V2b: spike dikeni */
  if(!D.dikenler) D.dikenler = [];
  const kh = ({okcu, brute, mage, priest})[m.hedefKim];
  if(!kh || kh.olu) return;
  const c = m.kok.position.clone(); c.y = 0.8*m.T.olc;
  const hd = kh.kok.position.clone(); hd.y = 0.7;
  const yon = hd.sub(c).normalize();
  const mesh = dikenMeshAl();
  mesh.position.copy(c);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), yon);
  sahne.add(mesh);
  D.dikenler.push({kok: mesh, yon, omur: 2.0,
    hasar: m.T.vurus*0.8*(1 + Math.max(0, zk()-300)*0.008)});
  SES.firlat();
}
function yildirimEfekt(hp){                            /* VFX-3: gökten dokulu şimşek */
  const grup = new THREE.Group();
  for(const a of [0, Math.PI/2]){
    const lv = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 7.2), vfxMatA('04a_bolt', 0xdfeeff, 1));
    lv.rotation.y = a + Math.random()*0.5;
    grup.add(lv);
  }
  grup.position.set(hp.x, 3.6, hp.z);
  sahne.add(grup);
  D.efektler.push({kok: grup, mat: grup.children[0].material, mat2: grup.children[1].material,
    tip:'boltX', omur: 0.22});
  patEfekt(hp.x, 0.35, hp.z, '04b_arc', 0xbfe0ff, 1.3, 0.3);   /* zeminde çarpma arkı */
  SES.simsek();
  parcaEfekt(hp, 0xbfe0ff, 5, 2.4, true);
}
function healEfekt(p){
  const rMat = vfxMatA('09_rune', 0xffdf9e, 0.95);     /* VFX-1: gerçek rune çemberi */
  const grup = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), rMat);
  grup.rotation.x = -Math.PI/2;
  grup.position.set(p.x, 0.06, p.z);
  sahne.add(grup);
  D.efektler.push({kok: grup, omur: 0.85, tip:'rune', mat: rMat, mat2: rMat});
  SES.heal();
  parcaEfekt({x: p.x, y: 0.4, z: p.z}, 0xffe9a8, 6, 1.3, true);            /* yükselen altın zerreler */
  parcaEfekt({x: p.x, y: 0.3, z: p.z}, 0xa8ffc0, 3, 1.0, true);
}
function priestGuncelle(dt){
  if(!priest || priest.olu) return;
  if(priest.tepkiB>0) priest.tepkiB -= dt;
  if(priest.tepki && !priest.tepki.isRunning()){
    priest.tepki = null;
    if(!priest.is) priestOynat(PRIEST_IDLE);
  }
  {  /* süpürge: biten tek seferlik klip pozda donmasın */
    const sa = priest.aktif.getClip().name;
    if(!priest.aktif.isRunning() && sa!==PRIEST_IDLE && !AR_YUR_SET.has(sa) && !priest.is && !priest.tepki)
      priestOynat(PRIEST_IDLE);
  }
  {
    const su = priest.aktif.getClip().name;
    priest.yuruyor = menzilliYuru(priest, PRIEST_AYAR.yuvaX, PRIEST_AYAR.menzil, dt,
      !!(priest.is || priest.tepki) || tekKlipOynuyor(priest, PRIEST_IDLE), (dx,dz)=>{
        const ad = AR_YURUME[yonHarf(priest.yaw, dx, dz)];
        const s2 = priest.aktif.getClip().name;
        if(s2===PRIEST_IDLE || s2==='01_IDLE' || AR_YUR_SET.has(s2)) priestOynat(ad);
      }, true, false);   /* atak/cast sırasında kaçış dahil hareket yok */
    if(!priest.yuruyor && AR_YUR_SET.has(priest.aktif.getClip().name)) priestOynat(PRIEST_IDLE);
  }
  /* hedef seçimi: önce yaralı dost, yoksa düşman */
  if(priest.kilit && priest.kilit.durum==='olu') priest.kilit = null;
  if(!priest.kilit){
    let e=null, ed=PRIEST_AYAR.menzil;
    for(const m of D.moblar){
      if(m.durum==='olu') continue;
      const d = m.kok.position.distanceTo(priest.kok.position);
      if(d<ed){ ed=d; e=m; }
    }
    priest.kilit = e;
  }
  /* yönelme: iş varsa işin hedefine, yoksa düşmana */
  let bakP = priest.kilit ? priest.kilit.kok.position : null;
  if(priest.is && priest.is.tur!=='atak' && priest.is.dostP) bakP = priest.is.dostP;
  let istekYaw = Math.PI;
  if(bakP){
    const f = bakP.clone().sub(priest.kok.position);
    istekYaw = Math.atan2(f.x, f.z);
  }
  let fark = istekYaw - priest.yaw;
  fark = Math.atan2(Math.sin(fark), Math.cos(fark));
  priest.yaw += fark * Math.min(1, 8*dt);
  priest.kok.rotation.y = priest.yaw;

  if(priest.is){
    const b = priest.is;
    if(!b.oldu && b.aksiyon.time >= b.t){
      b.oldu = true;
      if(b.tur==='healTek'){
        canEkle(b.dost, PRIEST_AYAR.healTek*healKat());
        healEfekt(b.dostP);
      } else if(b.tur==='kalkan'){
        SES.buff();
        const kmax = kMax(b.dost);
        D.kalkan = {kim: b.dost, mik: kmax*0.35*healKat()*skill1Kat('priest')};
        const h3 = new THREE.Mesh(
          new THREE.RingGeometry(0.4, 0.62, 20),
          new THREE.MeshBasicMaterial({color: 0xffe08a, transparent: true, opacity: 0.95, side: THREE.DoubleSide}));
        h3.rotation.x = -Math.PI/2;
        const kp = b.dostP || priest.kok.position;
        h3.position.set(kp.x, 0.07, kp.z);
        sahne.add(h3);
        D.efektler.push({kok: h3, omur: 0.9, tip:'heal'});
      } else if(b.tur==='diril'){
        SES.heal(); kahramanDirilt(b.dost);
      } else if(b.tur==='healGrup'){
        const canliK = kahramanListesi().filter(k=>!k.olu);
        for(let a3=0; a3<canliK.length-1; a3++){          /* V1f: takımı bağlayan altın ark */
          const g3 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(canliK[a3].p.x, 0.9, canliK[a3].p.z),
            new THREE.Vector3(canliK[a3+1].p.x, 0.9, canliK[a3+1].p.z)]);
          const ln = new THREE.Line(g3, new THREE.LineBasicMaterial({color: 0xffe08a, transparent: true, opacity: 0.9}));
          sahne.add(ln);
          D.efektler.push({kok: ln, omur: 0.45, tip:'ark'});
        }
        for(const k of canliK){ canEkle(k.kim, k.max*0.40*healKat()*skill1Kat('priest')); healEfekt(k.p); }
      } else {
        let hdf = priest.kilit;
        if(!hdf || hdf.durum==='olu') hdf = enYakinMob();
        if(hdf && hdf.durum!=='olu'){
          const yerel = new THREE.Vector3(b.el[0], b.el[1], b.el[2]);
          const c = priest.kok.localToWorld(yerel);
          const hd = hdf.kok.position.clone(); hd.y = 0.9*hdf.T.olc;
          const yon = hd.sub(c).normalize();
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.58, 0.58),
            vfxMatA('13_sparkle', 0xfff2b8, 1)
          );                                           /* VFX-1c: kutsal mermi başı */
          const hale = new THREE.Mesh(
            new THREE.PlaneGeometry(0.9, 0.9),
            vfxMatA('05_holy', 0xffe08a, 0.65));       /* arkada ışık yıldızı */
          hale.position.z = -0.1;
          mesh.add(hale); mesh.position.copy(c);
          sahne.add(mesh);
          {
    SES.firlat();
    let yh = PRIEST_AYAR.hasar*itemKat('priest'), srs = 0;
    if(ozel1('priest') && Math.random()<0.15){ yh *= 2; srs = 0.5; }   /* ★ Yargı */
    D.buyular.push({kok: mesh, yon, omur: 2, hasar: yh, sersemlet: srs, kim:'priest'});
  }
        }
      }
    }
    if(!b.aksiyon.isRunning() || (b.tur==='atak' && b.aksiyon.time >= b.t + 0.45)){
      priest.is = null; priest.bekleme = PRIEST_AYAR.ara;
      priestOynat(PRIEST_IDLE);
    }
  } else {
    priest.bekleme -= dt;
    if(priest.bekleme > 0 || priest.tepki || priest.yuruyor) return;
    /* iş seçimi: yaralılar (eşiğin altı, canlı) */
    const yarali = kahramanListesi().filter(k=>!k.olu && k.can/k.max < PRIEST_AYAR.esik);
    yarali.sort((a,b)=>a.can/a.max - b.can/b.max);   // en yaralı önce
    const oluler = kahramanListesi().filter(k=>k.olu && k.kim!=='priest');
    if(D.skill.priest>=2 && D.cd2.priest<=0 && oluler.length){
      D.cd2.priest = cdSure('priest',45);
      const a = priestOynat(HEAL_GRUP.klip, true);
      priest.is = {tur:'diril', aksiyon:a, t: HEAL_GRUP.t, oldu:false, dost: oluler[0].kim};
    } else if(D.skill.priest && D.cd.priest<=0 && yarali.length >= 2){
      D.cd.priest = cdSure('priest',15)*(imza('priest')?0.5:1);
      const a = priestOynat(HEAL_GRUP.klip, true);
      priest.is = {tur:'healGrup', aksiyon:a, t: HEAL_GRUP.t, oldu:false};
    } else if(yarali.length >= 1){
      const a = priestOynat(HEAL_TEK.klip, true);
      priest.is = {tur:'healTek', aksiyon:a, t: HEAL_TEK.t, oldu:false,
                   dost: yarali[0].kim, dostP: yarali[0].p};
    } else if(D.skill.priest>=3 && D.cd3.priest<=0 && !D.kalkan && kalkanHedefBul()){
      const kh = kalkanHedefBul();
      D.cd3.priest = cdSure('priest',25);
      const a = priestOynat(HEAL_TEK.klip, true);
      priest.is = {tur:'kalkan', aksiyon:a, t: HEAL_TEK.t, oldu:false, dost: kh.kim, dostP: kh.p};
    } else if(priest.kilit){
      const a = priestOynat(PRIEST_ATAK.klip, true);
      a.timeScale = PRIEST_ATAK.hiz * (1 + atakHiz('priest'));   // silah1 + yüzük atak temposu
      priest.is = {tur:'atak', aksiyon:a, t: PRIEST_ATAK.t, el: PRIEST_ATAK.el, oldu:false};
    }
  }
}

/* ═══════════ SON İŞLEM (post-processing) ═══════════
   Motor değiştirmeden görsel tavanı yükseltir. Bloom, eşik üstündeki
   parlak yerleri (altın kenarlar, kalkan, büyü, güneş vurgusu) taşırır;
   sahnenin geri kalanına dokunmaz — eşik 0.82.

   ÖNEMLİ: EffectComposer kullanılırken ton eşlemesi ve sRGB dönüşümü
   ARTIK OutputPass'te yapılır. renderer.toneMapping ayarı korunur,
   OutputPass onu okur; iki kez uygulanmaz.

   Düşük kalitede tamamen devre dışıdır — bloom mobilde pahalıdır ve
   'dusuk' preset'i zaten gölgeleri de kapatıyor. */
let besteci = null, bloomGecis = null;

function postAcikMi(){ return kaliteAl() !== 'dusuk'; }

function postKur(){
  besteci = new EffectComposer(renderer);
  besteci.addPass(new RenderPass(sahne, kamera));
  /* (çözünürlük, güç, yarıçap, eşik) */
  bloomGecis = new UnrealBloomPass(new THREE.Vector2(GW, GH), 0.46, 0.70, 0.82);
  besteci.addPass(bloomGecis);
  besteci.addPass(new OutputPass());
  besteci.setPixelRatio(renderer.getPixelRatio());
  besteci.setSize(GW, GH);
}

function postBoyutla(){
  if(!besteci) return;
  besteci.setPixelRatio(renderer.getPixelRatio());
  besteci.setSize(GW, GH);
}

/* Tek çizim kapısı: kalite düşükse doğrudan renderer, değilse besteci. */
function cizdir(){
  if(postAcikMi()){
    if(!besteci) postKur();
    besteci.render();
  } else {
    cizdir();
  }
}

/* ═══════════ DÖNGÜ ═══════════ */
const saat = new THREE.Clock();
function adim(){
  requestAnimationFrame(adim);
  /* let: hit-stop (asagida) dt yi olceklendiriyor — const olursa strict mode atar */
  let dt = Math.min(saat.getDelta(), 0.05);
  if(okcu) okcu.mixer.update(dt);
  if(brute) brute.mixer.update(dt);
  if(mage) mage.mixer.update(dt);
  if(priest) priest.mixer.update(dt);
  for(const m of D.moblar) m.mixer.update(dt);
  if(!D.bitti && okcu){
    D.sure += dt;
    dirilisGuncelle(dt);
    bruteGuncelle(dt);
    mageGuncelle(dt);
    priestGuncelle(dt);
    kahramanAyrik();
    for(const kk of kahramanListesi())
      if(!kk.olu && yenilen(kk.kim)>0 && kk.can < kk.max)
        canEkle(kk.kim, kk.max*yenilen(kk.kim)*dt);
    for(const k in D.cd) if(D.cd[k]>0) D.cd[k] -= dt;
    for(const k in D.cd2) if(D.cd2[k]>0) D.cd2[k] -= dt;
    if(D.cdN>0) D.cdN -= dt;
    if(D.sonDirenis>0) D.sonDirenis -= dt;
    if(D.nara>0) D.nara -= dt;
    for(const k in D.cd3) if(D.cd3[k]>0) D.cd3[k] -= dt;
    /* ok yağmuru zamanlayıcısı */
    if(D.yagmur){
      const y = D.yagmur;
      if(y.bekle>0) y.bekle -= dt;
      else {
        y.ara -= dt;
        while(y.ara<=0 && y.kalan>0){
          y.kalan--; y.ara += 0.1;
          const ac = Math.random()*Math.PI*2, rr = Math.sqrt(Math.random())*(y.r||2.2);
          const kok = okGovdeAl(false);              /* ENC-6b: yağmur okları da havuzdan */
          kok.position.set(y.p.x + Math.cos(ac)*rr, 5.5, y.p.z + Math.sin(ac)*rr);
          kok.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(0,-1,0));
          sahne.add(kok);
          D.oklar.push({kok, yon: new THREE.Vector3(0,-1,0), omur: 1.0, dusen: true, ukat: y.kat||1});
        }
        if(y.kalan<=0) D.yagmur = null;
      }
    }
    /* efektler: heal halkaları büyüyüp sönüyor */
    for(let i=D.efektler.length-1;i>=0;i--){
      const e = D.efektler[i];
      e.omur -= dt;
      if(e.tip==='boltX'){                             /* VFX-3: şimşek titremesi */
        const o2 = Math.random()<0.3 ? 0.4 : 1;
        e.mat.opacity = o2*Math.min(1, e.omur/0.1);
        e.mat2.opacity = e.mat.opacity;
      } else if(e.tip==='alev'){                              /* VFX-2: flipbook alev */
        e.kok.quaternion.copy(kamera.quaternion);
        const gecen = e.top - e.omur;
        if(e.loop){
          alevKareSet(e.mat, gecen*ALEV_FPS + e.faz);
          e.mat.opacity = e.op0*(0.8 + 0.2*Math.sin(gecen*21 + e.faz)) * Math.min(1, e.omur/0.4);
        } else {
          alevKareSet(e.mat, Math.min(15, gecen/e.top*16));
          e.kok.scale.setScalar(e.olc0*(1 + (gecen/e.top)*0.55));
          e.mat.opacity = Math.min(1, e.omur/(e.top*0.35));
        }
      } else if(e.tip==='duman'){                      /* VFX-2: yükselen duman */
        e.kok.quaternion.copy(kamera.quaternion);
        e.kok.position.y += dt*0.7;
        e.kok.scale.multiplyScalar(1 + dt*0.5);
        e.mat.opacity = 0.4*Math.min(1, e.omur/0.9);
      } else if(e.tip==='pat'){                               /* VFX-1/3: çakma — büyür, kameraya bakar, söner */
        e.kok.quaternion.copy(kamera.quaternion);
        e.kok.scale.setScalar((e.olc0||1) * (1 + ((e.top||0.28)-e.omur)/(e.top||0.28)*1.15));
        e.mat.opacity = Math.min(1, e.omur/((e.top||0.28)*0.5));
      } else if(e.tip==='rune'){                              /* P5: döner, süzülür, söner */
        e.kok.rotation.z += dt*1.6;
        e.kok.position.y += dt*0.55;
        const o2 = Math.min(1, e.omur/0.5);
        e.mat.opacity = 0.9*o2; e.mat2.opacity = 0.95*o2;
        e.kok.scale.setScalar(1 + (0.8-e.omur)*0.5);
      } else if(e.tip==='tel'){
        e.mat.opacity = 0.14 + 0.24*Math.abs(Math.sin(e.omur*14));
        if(e.dolum) e.dolum.scale.y = Math.max(0.001, Math.min(1, (e.dSure - e.omur)/e.dSure));
      } else if(e.tip==='ganimet'){
        if(e.omur > 0.45){                     /* faz 1: yerinde döner, hafif süzülür */
          e.kok.rotation.y += dt*4;
          e.kok.rotation.x = 0.5;
          e.kok.position.y = e.tabanY + Math.sin((1.7-e.omur)*5)*0.07;
        } else {                               /* faz 2: kameraya doğru uçar, küçülür */
          e.kok.position.lerp(kamera.position, Math.min(1, dt*7));
          e.kok.scale.multiplyScalar(Math.max(0.001, 1 - dt*3.2));
          e.kok.material.opacity = Math.max(0, e.omur/0.45);
        }
      } else if(e.tip==='ark'){
        e.kok.material.opacity = Math.max(0, e.omur/0.45)*0.9;
      } else if(e.tip==='kavruk'){
        e.kok.material.opacity = Math.min(0.5, e.omur/4*0.65);
      } else if(e.tip==='parca'){
        e.kok.position.addScaledVector(e.vel, dt);
        e.vel.y -= 7.5*dt;
        e.kok.material.opacity = Math.max(0, e.omur/0.5);
      } else if(e.tip==='bolt'){
        e.kok.material.opacity = Math.max(0, e.omur/0.18);
      } else if(e.tip==='sutun'){
        e.kok.rotation.y += dt*2.6;
        e.kok.scale.x = e.kok.scale.z = 1 + (1.5-e.omur)*0.3;
        e.kok.material.opacity = Math.max(0, e.omur/1.5)*0.8;
      } else if(e.tip!=='parca' && e.tip!=='bolt'){
        e.kok.scale.setScalar(1 + (0.7-e.omur)*1.6);
        e.kok.material.opacity = Math.max(0, e.omur/0.7)*0.85;
      }
      if(e.omur<=0){
        sahne.remove(e.kok);
        if(e.tex) e.tex.dispose();                     /* VFX-2: klon doku sızıntısı kapalı */
        if(e.tip==='parca' && parcaHavuz.length < 130) parcaHavuz.push(e.kok);
        else if(e.tip!=='parca') e.kok.traverse(o2=>{
          if(o2.isMesh || o2.isLine){
            if(o2.geometry) o2.geometry.dispose();
            if(o2.material && o2.material.dispose) o2.material.dispose();
          }
        });
        D.efektler.splice(i,1);
      }
    }

    /* doğum */
    D.dogumSayac -= dt;
    const canli = D.moblar.filter(m=>m.durum!=='olu').length;
    if(D.dogumSayac<=0 && canli<AZAMI_MOB && !D.bossAktif && !(D.zindan && (D.zindan.tip==='boss' || D.zindan.tip==='uniq'))){
      mobDogur(encounterSec());
      D.dogumSayac = Math.max(1.1, DOGUM_ARALIK - zk()*0.02);
    }

    /* moblar: her mob EN YAKIN kahramanı (okçu / brute) hedefler,
       hedef 0,4 sn'de bir tazelenir (titrek geçiş olmasın diye) */
    for(const m of D.moblar){
      if(m.durum==='olu'){ m.olduSayac -= dt; continue; }
      m.hedefSayac = (m.hedefSayac ?? 0) - dt;
      if(m.hedefSayac<=0 || !m.hedefP){
        const s = enYakinKahraman(m);
        m.hedefP = s.p; m.hedefKim = s.kim; m.hedefSayac = 0.4;
      }
      const fark = m.hedefP.clone().sub(m.kok.position); fark.y=0;
      const uzak = fark.length();
      if(m.tepkiB>0) m.tepkiB -= dt;
      if(m.yanma){
        m.yanma.sure -= dt;
        mobaVur(m, m.yanma.dps*dt, true);
        if(!m._alevF && m.durum!=='olu'){              /* VFX-2: gerçek alev mob üstünde */
          m._alevF = mobAlevAl(0.62*m.T.olc);
          m._alevFz = Math.random()*16;
        }
        if(m._alevF){
          m._alevF.position.set(m.kok.position.x, 0.62*m.T.olc, m.kok.position.z);
          m._alevF.quaternion.copy(kamera.quaternion);
          alevKareSet(m._alevF.material, D.sure*ALEV_FPS + m._alevFz);
          m._alevF.material.opacity = 0.75 + 0.25*Math.sin(D.sure*19 + m._alevFz);
        }
        m._alevS = (m._alevS||0) - dt;                                     /* V1c: alev zerreleri */
        if(m._alevS<=0 && m.durum!=='olu'){
          m._alevS = 0.36;
          parcaEfekt({x: m.kok.position.x + (Math.random()-0.5)*0.3, y: 0.6*m.T.olc,
                      z: m.kok.position.z + (Math.random()-0.5)*0.3},
                     Math.random()<0.5 ? 0xff8c3a : 0xffc250, 2, 0.9, true);
        }
        if(m.yanma.sure<=0 || m.durum==='olu'){
          m.yanma = null;
          if(m._alevF){ mobAlevBirak(m._alevF); m._alevF = null; }
        }
      }
      if(m.buz>0){
        m.buz -= dt;
        if(!m._buzH){                                                      /* V1c: buz halkası */
          m._buzH = new THREE.Mesh(
            new THREE.RingGeometry(0.34*m.T.olc, 0.5*m.T.olc, 18),
            new THREE.MeshBasicMaterial({color: 0x9fd8ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide}));
          m._buzH.rotation.x = -Math.PI/2; m._buzH.position.y = 0.06;
          const icH = new THREE.Mesh(
            new THREE.RingGeometry(0.15*m.T.olc, 0.24*m.T.olc, 12),
            new THREE.MeshBasicMaterial({color: 0xe4f4ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide}));
          icH.position.z = 0.012;
          m._buzH.add(icH);
          m.kok.add(m._buzH);
        }
        m._buzH.rotation.z += dt*1.2;
        if(m._buzH.children[0]) m._buzH.children[0].rotation.z -= dt*2.4;
      } else if(m._buzH){
        m.kok.remove(m._buzH);
        m._buzH.traverse(o2=>{ if(o2.isMesh){ o2.geometry.dispose(); o2.material.dispose(); } });
        m._buzH = null;
      }
      if(m.kanama){
        m.kanama.sure -= dt;
        mobaVur(m, m.kanama.dps*dt, true);
        m._kanS = (m._kanS||0) - dt;                     /* V1f: kanama damlaları */
        if(m._kanS<=0 && m.durum!=='olu'){
          m._kanS = 0.3;
          parcaEfekt({x: m.kok.position.x + (Math.random()-0.5)*0.25, y: 0.5*m.T.olc,
                      z: m.kok.position.z + (Math.random()-0.5)*0.25}, 0xc02020, 1, 0.5, false);
        }
        if(m.kanama.sure<=0 || m.durum==='olu') m.kanama = null;
      }
      if(m.durum!=='olu'){
        if(m.hizB>0) m.hizB -= dt;
        if(m.ofke>0){                                   /* ENC-2: öfke sönümü + kızıl duman */
          m.ofkeS -= dt;
          if(m.ofkeS<=0){ m.ofke--; m.ofkeS = 1.2; }
          m._ofG = (m._ofG||0) - dt;
          if(m.ofke>=3 && m._ofG<=0){
            m._ofG = 0.5;
            parcaEfekt({x: m.kok.position.x, y: 0.9*m.T.olc, z: m.kok.position.z}, 0xff4030, 1, 1.0, true);
          }
        }
        if(m.buz>0){                                    /* P5: donma damlaları */
          if(!m._karF){                                 /* VFX-3b: dönen kar tanesi */
            m._karF = new THREE.Mesh(new THREE.PlaneGeometry(1,1), vfxMatA('03a_snow', 0xcfeaff, 0.85));
            m._karF.scale.setScalar(0.5*m.T.olc);
            sahne.add(m._karF);
          }
          m._karF.position.set(m.kok.position.x, 1.05*m.T.olc, m.kok.position.z);
          m._karF.quaternion.copy(kamera.quaternion);
          m._karF.rotation.z = D.sure*1.4;
          m._bzG = (m._bzG||0) - dt;
          if(m._bzG<=0){
            m._bzG = 0.4;
            parcaEfekt({x: m.kok.position.x + (Math.random()-0.5)*0.3, y: 0.7*m.T.olc,
                        z: m.kok.position.z + (Math.random()-0.5)*0.3}, 0xaee6ff, 1, 0.6, false);
          }
        }
        if(m.buz<=0 && m._karF){ sahne.remove(m._karF); m._karF.material.dispose(); m._karF = null; }
        if(m.volat){                                    /* ENC-2: kararsız yeşil damla */
          m._voG = (m._voG||0) - dt;
          if(m._voG<=0){
            m._voG = 0.55;
            patEfekt(m.kok.position.x + (Math.random()-0.5)*0.3, 0.65*m.T.olc, m.kok.position.z,
                     '06_droplet', 0x9fe86a, 0.5, 0.5);   /* VFX-3b: gerçek damla */
          }
        }
      }
      if(m.bossMu && m.durum!=='olu'){                  /* V2c: boss fazları */
        const orn = m.can / m.azami;
        if((m.faz||0) < 1 && orn <= 0.7){ m.faz = 1; bossRoar(m); }
        else if(m.faz < 2 && orn <= 0.4){ m.faz = 2; bossOzel40(m); }
        else if(m.faz < 3 && orn <= 0.2){ m.faz = 3; bossEnrage(m); }
        if(m.enrage){
          m._enrS = (m._enrS||0) - dt;
          if(m._enrS <= 0){
            m._enrS = 0.4;
            parcaEfekt({x: m.kok.position.x + (Math.random()-0.5)*0.5, y: 0.7*m.T.olc,
                        z: m.kok.position.z + (Math.random()-0.5)*0.5}, 0xff4030, 1, 1.1, true);
          }
        }
      }
      if(m.flash>0){
        m.flash -= dt;
        const k = 1 + 0.12*Math.sin(Math.PI*Math.max(0,m.flash)/0.22);
        m.kok.scale.setScalar(m.T.olc * (m.flash>0 ? k : 1));
      }
      if(m.tepkiS>0){
        m.tepkiS -= dt;
        if(m.tepkiS<=0) mobOynat(m, m.durum==='vur' ? m.T.vur : m.T.yuru);
        continue;                         /* tepki oynarken hareket yok */
      }
      if(m.tur==='rhino' && !m.bossMu){                /* V2b: CHARGER */
        if(m.sarjCd===undefined) m.sarjCd = 2.5;
        if(!m.sarj) m.sarjCd -= dt;
        if(m.yorgun>0) m.yorgun -= dt;
        if(!m.sarj && m.sarjCd<=0 && m.durum==='yuru' && uzak>5.5 && uzak<13 && !(m.buz>0)){
          m.sarj = {yon: fark.clone().normalize(), t:0, hizK:3, mx:1.3, vurK:1.6, itme:1, yor:1.4, cdA:'sarjCd', cdS:6};
          SES.swing();
        }
      }
      if(m.tur==='kecoon' && !m.bossMu){                /* ENC-2: SIÇRAYICI */
        if(m.ponCd===undefined) m.ponCd = 1.5 + Math.random();
        if(!m.sarj) m.ponCd -= dt;
        if(m.yorgun>0) m.yorgun -= dt;
        if(!m.sarj && m.ponCd<=0 && m.durum==='yuru' && uzak>3.2 && uzak<6.5 && !(m.buz>0)){
          m.sarj = {yon: fark.clone().normalize(), t:0, hizK:2.4, mx:0.55, vurK:1.15, itme:0, yor:0.35, cdA:'ponCd', cdS:4};
          SES.swing();
        }
      }
      if(m.sarj){                                       /* şarj koşusu: düz hat, 3× hız */
        m.sarj.t += dt;
        m.kok.position.addScaledVector(m.sarj.yon, m.T.hiz*(m.sarj.hizK||3)*(m.buz>0?0.45:1)*dt);
        m.kok.rotation.y = Math.atan2(m.sarj.yon.x, m.sarj.yon.z) + AYAR.mobYawEk + AYAR.mobYaw[m.tur];
        let carpti = false;
        for(const [kk, kh] of [['okcu',okcu],['brute',brute],['mage',mage],['priest',priest]]){
          if(!kh || kh.olu) continue;
          if(kh.kok.position.distanceTo(m.kok.position) < 1.15){
            kahramanaVur(kk, m.T.vurus*(m.sarj.vurK||1.6)*(m.bossMu?2:1)*(1 + Math.max(0, zk()-300)*0.008));
            if(m.sarj.itme){
              kh.kok.position.z += 1.1;                 /* geri itme */
              kh.kok.position.x += m.sarj.yon.x*0.7;
              kh.kok.position.x = Math.max(-YOL_YARIM+0.2, Math.min(YOL_YARIM-0.2, kh.kok.position.x));   /* duvar düzeltmesi */
              if(kh.kok.position.z > HAT.sinirZ+0.5) kh.kok.position.z = HAT.sinirZ+0.5;
            }
            D.sarsinti = Math.max(D.sarsinti, 0.35);
            parcaEfekt({x: m.kok.position.x, y: 0.3, z: m.kok.position.z}, 0x9a7c52, 10, 2.6, false);
            SES.boom();
            carpti = true; break;
          }
        }
        if(carpti || m.sarj.t > (m.sarj.mx||1.3) || m.kok.position.z > MOB_SINIR_Z + 3){   /* denetim: şarj hatta girebilsin */
          const s2 = m.sarj;
          m[s2.cdA||'sarjCd'] = s2.cdS||6; m.yorgun = s2.yor||1.4;
          m.sarj = null;
        }
      } else if(m.durum==='yuru'){
        if(m.tur==='spike' && !m.bossMu && uzak <= 10.5){   /* V2b: MENZİLLİ ATICI */
          const yn3 = fark.clone().normalize();
          m.kok.rotation.y = Math.atan2(yn3.x, yn3.z) + AYAR.mobYawEk + AYAR.mobYaw[m.tur];
          m.dikS = (m.dikS===undefined ? 1.0 : m.dikS) - dt;
          if(m.dikS <= 0){ m.dikS = 2.2; dikenAt(m); }
        } else if(uzak > VUR_MESAFE){
          const yon = fark.normalize();
          m.kok.position.addScaledVector(yon, m.T.hiz*(m.buz>0?0.5:1)*(m.yorgun>0?0.5:1)*(m.frenzy?1.15:1)*(m.hizB>0?1.25:1)*dt);
          if(m.tur==='kecoon') m.kok.position.x += Math.sin(D.sure*5.5 + m.kok.position.z*1.7)*0.4*dt;   /* ENC-2: çevik zigzag */
          if(m.kok.position.z > MOB_SINIR_Z) m.kok.position.z = MOB_SINIR_Z;   /* mevzi sınırı */
          m.kok.rotation.y = Math.atan2(yon.x, yon.z) + AYAR.mobYawEk + AYAR.mobYaw[m.tur];
        } else {
          m.durum='vur'; mobOynat(m, m.T.vur);
        }
      } else if(m.durum==='vur'){
        if(uzak > VUR_MESAFE*1.5){ m.durum='yuru'; mobOynat(m, m.T.yuru); }
        else {
          m.vurSayac -= dt;
          if(m.vurSayac<=0){
            m.vurSayac = (m.enrage ? 0.8 : 1.1) * (m.tur==='mutant' && m.ofke ? Math.max(0.72, 1 - 0.04*m.ofke) : 1);
            /* geç oyun ölçeği: 300. kesime kadar vuruş sabit (skill toplama dönemi),
               sonrasında her kesim +%0,8 — final duvarı ~13. seviyeye oturur */
            kahramanaVur(m.hedefKim, m.T.vurus * (m.bossMu?2:1) * (m.frenzy?1.10:1) * (m.tur==='mutant' && m.ofke ? 1+0.03*m.ofke : 1) * (1 + Math.max(0, zk()-300)*0.008));
            if(m.hedefKim==='mage' && zOzel('mage')) m.buz = 1.5*(knn('mage')>=2?1.25:1);   /* ★ Buz Zırhı */
          }
        }
      }
    }
    /* ölüleri süpür */
    for(let i=D.moblar.length-1;i>=0;i--){
      const m = D.moblar[i];
      if(m.durum==='olu' && m.olduSayac<=0){ mobVfxTemizle(m); sahne.remove(m.kok); D.moblar.splice(i,1); }   /* p157 */
    }

    /* okçu: hedef kilidi — kilitli mob ölmeden değişmez, ölünce en yakına.
       Ölüyken nişan/atış/dönüş tamamen durur, gövde ölüm pozunda kalır. */
    if(!okcu.olu){
    if(okcu.tepkiB>0) okcu.tepkiB -= dt;
    {
      const su = okcu.aktif.getClip().name;
      const mesgulOk = !(su==='01_IDLE' || OK_YUR_SET.has(su));
      okcu.yuruyor = menzilliYuru(okcu, 0, okMenzil(), dt, mesgulOk, (dx,dz)=>{
        const ad = OK_YURUME[yonHarf(okcu.yaw, dx, dz)];
        const s2 = okcu.aktif.getClip().name;
        if(s2==='01_IDLE' || OK_YUR_SET.has(s2)) okcuOynat(ad);
      }, false, true);
      if(!okcu.yuruyor && OK_YUR_SET.has(okcu.aktif.getClip().name)) okcuOynat('01_IDLE');
    }
    if(okcu.kilit && okcu.kilit.durum==='olu') okcu.kilit = null;
    if(!okcu.kilit) okcu.kilit = enYakinMob();
    const hedef = okcu.kilit;
    let istekYaw = Math.PI;                        // hedef yoksa yol yukarısı
    if(hedef){
      const f = hedef.kok.position.clone().sub(okcu.kok.position);
      istekYaw = Math.atan2(f.x, f.z);
      D.atisSayac -= dt;
      if(D.atisSayac<=0 && (!okcu.yuruyor || okcu.mod==='kacis')
         && hedef.kok.position.distanceTo(okcu.kok.position) <= okMenzil()){   /* denetim: focus menzili delemez */
        D.atisSayac = okAralik();
        okcu.bekleyen = hedef;
        let klip = '11_DRAW_ARROW';
        const yagmurP = (D.skill.okcu>=3 && D.cd3.okcu<=0) ? kumeBul() : null;
        if(yagmurP){
          D.cd3.okcu = cdSure('okcu',25); okcu.yagmurP = yagmurP; klip = '12_AIM_OVERDRAW';
        } else if(D.skill.okcu>=2 && D.cd2.okcu<=0){
          D.cd2.okcu = cdSure('okcu',12); klip = '12_AIM_OVERDRAW';
        }
        const cek = okcuOynat(klip, true);
        cek.timeScale = cek.getClip().duration / (okAralik() * CEK_PAY);
      }
    }
    /* gövde telafisi savaş durumuna bağlı, atış animasyonuna değil:
       menzilde düşman varken okçu yan duruşta SABİT kalır (her atışta
       gidip gelmez), savaş bittikten 1,2 sn sonra yüzünü yola döner. */
    if(hedef) D.sonSavas = D.sure;
    const savasta = (D.sure - D.sonSavas) < 1.2;
    const istekEk = savasta ? NISAN_EK : DURUS_EK;
    okcu.ek += (istekEk - okcu.ek) * Math.min(1, EK_KAYMA_HIZ*dt);
    let fark = istekYaw - okcu.yaw;
    fark = Math.atan2(Math.sin(fark), Math.cos(fark));   // en kısa yönden
    okcu.yaw += fark * Math.min(1, DONUS_HIZ*dt);
    okcu.kok.rotation.y = okcu.yaw + okcu.ek + AYAR.okcuYawEk;
    }

    /* oklar */
    if(D.dikenler) for(let i=D.dikenler.length-1;i>=0;i--){   /* V2b: diken uçuşu */
      const dk = D.dikenler[i];
      dk.kok.position.addScaledVector(dk.yon, 13*dt);
      dk.omur -= dt;
      let vurdu = false;
      for(const [kk, kh] of [['okcu',okcu],['brute',brute],['mage',mage],['priest',priest]]){
        if(!kh || kh.olu) continue;
        const hp2 = kh.kok.position.clone(); hp2.y = 0.7;
        if(dk.kok.position.distanceTo(hp2) < 0.65){
          kahramanaVur(kk, dk.hasar);
          parcaEfekt({x: dk.kok.position.x, y: dk.kok.position.y, z: dk.kok.position.z}, 0x8a7a5c, 3, 1.4, false);
          vurdu = true; break;
        }
      }
      if(vurdu || dk.omur<=0 || dk.kok.position.y < 0){
        dikenBirak(dk.kok); D.dikenler.splice(i,1);
      }
    }
    for(let i=D.oklar.length-1;i>=0;i--){
      const o = D.oklar[i];
      o.kok.position.addScaledVector(o.yon, OK_HIZ*dt);
      o.omur -= dt;
      if(o.dusen && o.kok.position.y<=0.12){
        for(const m of D.moblar){
          if(m.durum==='olu') continue;
          if(m.kok.position.distanceTo(o.kok.position) < 1.0) mobaVur(m, krit('okcu', m, OK_HASAR*itemKat('okcu')*skill1Kat('okcu')*(o.ukat||1), true));
        }
        okBirak(o.kok); D.oklar.splice(i,1); continue;
      }
      let vurdu = false;
      for(const m of (o.dusen ? [] : D.moblar)){
        if(m.durum==='olu') continue;
        if(o.delici && o.vurulan.has(m)) continue;
        const d = m.kok.position.clone(); d.y += 0.8*m.T.olc;
        if(o.kok.position.distanceTo(d) < 0.9*m.T.olc){
          mobaVur(m, krit('okcu', m, OK_HASAR*(o.kat||1)*itemKat('okcu')*((o.delici||o.kat>1)?skill1Kat('okcu'):1), (o.delici||o.kat>1)));
          if(!o.delici && o.kat===1 && ozel1('okcu') && Math.random()<0.15){
            let sY=null, sU=4;                     /* ★ Sekme: en yakın ikinci hedefe %60 */
            for(const m3 of D.moblar){
              if(m3===m || m3.durum==='olu') continue;
              const u3 = m3.kok.position.distanceTo(m.kok.position);
              if(u3<sU){ sU=u3; sY=m3; }
            }
            if(sY) mobaVur(sY, OK_HASAR*0.6*itemKat('okcu'));
          }
          parcaEfekt({x: o.kok.position.x, y: o.kok.position.y, z: o.kok.position.z}, 0xd8c9a0, 3, 1.9, false);   /* V1c: isabet */
          patEfekt(o.kok.position.x, o.kok.position.y, o.kok.position.z, '10_spark', 0xffe9b0, 0.65, 0.22);       /* VFX-3b: kıvılcım çizgileri */
          SES.isabet();
          if(o.delici){ o.vurulan.add(m); }     // delip geçer
          else { vurdu = true; break; }
        }
      }
      if(vurdu || o.omur<=0){ okBirak(o.kok); D.oklar.splice(i,1); }
    }

    /* büyü mermileri */
    for(let i=D.buyular.length-1;i>=0;i--){
      const o = D.buyular[i];
      o.kok.position.addScaledVector(o.yon, BUYU_HIZ*dt);
      o.kok.quaternion.copy(kamera.quaternion);        /* VFX-1c: mermi billboard */
      buyuEkranYon.copy(o.yon).applyQuaternion(buyuKamTers.copy(kamera.quaternion).invert());
      o.kok.rotation.z = Math.atan2(buyuEkranYon.y, buyuEkranYon.x) + Math.PI/2;   /* VFX-1e: alev kuyruk gibi arkada */
      o.kok.scale.setScalar(1 + 0.1*Math.sin(o.omur*22));                          /* dönüş yerine nabız */
      o.omur -= dt;
      let vurdu = false;
      for(const m of D.moblar){
        if(m.durum==='olu') continue;
        const d = m.kok.position.clone(); d.y += 0.8*m.T.olc;
        if(o.kok.position.distanceTo(d) < 0.95*m.T.olc){
          mobaVur(m, krit(o.kim||'mage', m, o.hasar ?? MAGE_AYAR.hasar, false));
          if(o.yakici && m.durum!=='olu') m.yanma = {sure: 3, dps: MAGE_AYAR.hasar*0.15*itemKat('mage')};   /* ★ Tutuşturma */
          if(o.sersemlet && m.durum!=='olu'){ m.tepkiS = Math.max(m.tepkiS, o.sersemlet); m.tepkiB = Math.max(m.tepkiB, 0.9); }
          vurdu = true; break;
        }
      }
      if(vurdu || o.omur<=0){ sahne.remove(o.kok); D.buyular.splice(i,1); }
    }
  }
  hudGuncelle();
  let _sx = 0, _sy = 0;
  if(D.sarsinti > 0){
    D.sarsinti -= dt;
    _sx = (Math.random()-0.5)*0.24*D.sarsinti;
    _sy = (Math.random()-0.5)*0.16*D.sarsinti;
    kamera.position.x += _sx; kamera.position.y += _sy;
  }
  dinKare++; dinSure += dt;                            /* V1f: dinamik çözünürlük ölçümü (ham dt) */
  if(dinSure >= 2.5){
    const fps = dinKare / dinSure;
    dinKare = 0; dinSure = 0;
    const tavan = kaliteAl()==='dusuk' ? 1 : kaliteAl()==='orta' ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 2);
    if(dinPR === null) dinPR = tavan;
    if(fps < 42 && dinPR > 0.75){
      dinPR = Math.max(0.75, dinPR - 0.25);
      renderer.setPixelRatio(dinPR); renderer.setSize(GW, GH); postBoyutla();
    } else if(fps > 55 && dinPR < tavan){
      dinPR = Math.min(tavan, dinPR + 0.25);
      renderer.setPixelRatio(dinPR); renderer.setSize(GW, GH); postBoyutla();
    }
  }
  if(D.hitStop > 0){ D.hitStop -= dt; dt *= 0.15; }   /* V1c: darbe anı kısa ağırlaşma */
  kalkanSur();
  hasarIziSur(dt);
  frenzySur(dt);
  if(D.focus){
    if(D.focus.durum==='olu') focusAta(null);
    else {
      focusH.userData.dis.rotation.z += dt*2.4;
      focusH.userData.ic.rotation.z -= dt*3.6;
      focusH.scale.setScalar((focusH.userData.olc||1) * (1 + 0.06*Math.sin(D.sure*7)));
    }
  }
  if(D.kamZoom){                                       /* V1d: sinematik fov sürücüsü */
    D.kamZoom.t += dt;
    const z = D.kamZoom,
      sure = z.tip==='boss' ? 1.4 : z.tip==='olum' ? 1.1 : 0.5,
      gen  = z.tip==='boss' ? 6   : z.tip==='olum' ? -3.2 : -2.6;
    if(z.t >= sure){ kamera.fov = 46; D.kamZoom = null; }
    else kamera.fov = 46 + gen * Math.sin(Math.PI * z.t / sure);
    kamera.updateProjectionMatrix();
  } else {
    const hedefF = D.moblar.filter(m2=>m2.durum!=='olu').length >= 5 ? 47.6 : 46;   /* kalabalıkta hafif geri */
    if(Math.abs(kamera.fov - hedefF) > 0.02){
      kamera.fov += (hedefF - kamera.fov) * Math.min(1, dt*2.2);
      kamera.updateProjectionMatrix();
    }
  }
  temaSur();
  zindanSur(dt);
  yeniSkillSur(dt);
  sayiGuncelle(dt);
  renderer.render(sahne, kamera);
  if(_sx || _sy){ kamera.position.x -= _sx; kamera.position.y -= _sy; }
}
function enYakinMob(){
  let e=null, ed=okMenzil();
  for(const m of D.moblar){
    if(m.durum==='olu') continue;
    const d = m.kok.position.distanceTo(okcu.kok.position);
    if(d<ed){ ed=d; e=m; }
  }
  return e;
}
function oyunBitti(){
  if(D.zindan){ zindanBitir(true); return; }   /* zindanda ölüm: koşu sayılmaz, kazançlar kalır */
  D.bitti = true;
  lvlKaydet();
  document.getElementById('olumOz').textContent =
    `${T().kesim}: ${D.kesim} · ${T().sure}: ${Math.floor(D.sure)} ${T().sn}`;
  olumP.style.display = 'flex';
  ENV.ist.kosu++; envKaydet();
}
document.getElementById('tekrar').addEventListener('click', ()=>{
  combatStateReset();                                  /* p157: havuz iadeli, eksiksiz temizlik */
  D.okcuCan = kMax('okcu'); D.bruteCan = kMax('brute'); D.mageCan = kMax('mage'); D.priestCan = kMax('priest');
  D.kesim=0; D.sure=0; D.dogumSayac=1.2; D.atisSayac=0.6; D.sonSavas=-9;
  /* seviye, puan ve skiller KALICI — ölüm silmez */
  D.cd={okcu:0,brute:0,mage:0,priest:0};
  D.cd2={okcu:0,brute:0,mage:0,priest:0};
  D.nara=0; D.cdN=0; D.dropKuru=0; D.sonDirenis=0;
  D.cd3={okcu:0,mage:0,priest:0};
  sevArayuz();
  okcu.olu = false; okcu.dirilme = 0; okcuOynat('01_IDLE');
  okcu.kok.position.set(0, 0, OKCU_Z); okcu.gezP = null; okcu.gezS = 0; okcu.yuruyor = false;
  if(brute){
    brute.olu = false; brute.dirilme = 0;
  }
  if(mage){
    mage.olu = false; mage.dirilme = 0;
    mage.kok.position.set(MAGE_AYAR.yuvaX, 0, OKCU_Z);
    mage.yaw = Math.PI; mage.kok.rotation.y = Math.PI;
    mageOynat('01_IDLE');
  }
  if(priest){
    priest.olu = false; priest.dirilme = 0;
    priest.kok.position.set(PRIEST_AYAR.yuvaX, 0, OKCU_Z + PRIEST_AYAR.yuvaZek);
    priest.yaw = Math.PI; priest.kok.rotation.y = Math.PI;
    priestOynat(PRIEST_IDLE);
    brute.durum = 'bekle';
    brute.kok.position.set(BRUTE_AYAR.yuvaX, 0, BRUTE_AYAR.yuvaZ);
    brute.yaw = Math.PI; brute.kok.rotation.y = Math.PI;
    bruteOynat('01_IDLE');
  }
  D.bitti = false;
  D.bolum = 1; D.bolumKesim = 0; D.bossAktif = false;   /* checkpoint: bölge başı (son boss) */
  hudGuncelle(); rozetGuncelle();
  olumP.style.display='none';
});

/* ═══════════ BAŞLAT ═══════════ */
function slotOzet(n){
  try{
    const st = JSON.parse(localStorage.getItem('legacy_s'+n+'_stage')||'null');
    const lv = JSON.parse(localStorage.getItem('legacy_s'+n+'_lvl')||'null');
    if(!st && !lv) return null;
    return {bolge: st?st.bolge:1, bolum: st?st.bolum:1, sv: lv?(lv.seviye||1):1};
  }catch(e){ return null; }
}
function slotEkraniGoster(basla){
  const L = T(), ekran = document.getElementById('slotEkran'), kap = document.getElementById('slotListe');
  ekran.style.display = 'flex';
  let s = '';
  for(let n=1;n<=6;n++){
    const oz = slotOzet(n), test = n===6;
    s += `<div class="slotKart ${test?'testSlot':''}" data-n="${n}">
      <b>${test ? '×10 TEST' : L.slotE.slot+' '+n}</b>
      <span>${oz ? `${L.bolum} ${oz.bolge}-${oz.bolum} · ${L.seviye} ${oz.sv}` : (test ? L.slotE.test : L.slotE.yeni)}</span>
      ${oz ? `<button class="slotSil" data-n="${n}">🗑</button>` : ''}
    </div>`;
  }
  kap.innerHTML = s;
  kap.querySelectorAll('.slotSil').forEach(b=> b.addEventListener('click', ev=>{
    ev.stopPropagation();
    const n = +b.dataset.n;
    for(const ad of ['env','stage','lvl']) localStorage.removeItem('legacy_s'+n+'_'+ad);
    if(n === SLOT){                                    /* aktif slot: RAM'deki hayaleti at, temiz aç */
      SLOT_SILINDI = true;
      location.reload();
      return;
    }
    slotEkraniGoster(basla);
  }));
  kap.querySelectorAll('.slotKart').forEach(k=> k.addEventListener('click', ()=>{
    const n = +k.dataset.n;
    if(n === SLOT){ ekran.remove(); basla(); }
    else {
      try{
        localStorage.setItem('legacyAktifSlot', String(n));
        sessionStorage.setItem('legacyOtoBasla', '1');
      }catch(e){}
      location.reload();
    }
  }));
}
/* ═══════════ TEST KANCASI ═══════════
   Yalnız ?dbg=1 ile açılır. Oyun akışına hiç dokunmaz: sadece zaten var
   olan durum ve fonksiyonları window'a bağlar. Sebep: main.js tek ES
   modül olduğu için dışarıdan hiçbir iç durum gözlenemiyordu; 30 başlıklı
   test paketi ancak böyle çalışma zamanında doğrulanabiliyor. */
if(new URLSearchParams(location.search).has('dbg')){
  window.__PARTY = {
    /* canlı durum */
    get D(){ return D; }, get ENV(){ return ENV; }, get SLOT(){ return SLOT; },
    get okcu(){ return okcu; }, get brute(){ return brute; },
    get mage(){ return mage; }, get priest(){ return priest; },
    get sahne(){ return sahne; }, get kamera(){ return kamera; },
    get renderer(){ return renderer; }, get besteci(){ return besteci; },
    get MODEL(){ return MODEL; }, get DOKU(){ return DOKU; }, get AC(){ return AC; },
    /* sabitler */
    sabit: { OK_HASAR, OK_ARALIK, OK_HIZ, OK_MENZIL, OKCU_CAN, BRUTE_CAN,
      get MAGE_CAN(){ return MAGE_CAN; }, get PRIEST_CAN(){ return PRIEST_CAN; },
      DIRILME_SN, DOGUM_ARALIK, AZAMI_MOB, VUR_MESAFE, HIZ,
      TURLER, TUR_SIRA, ENC_SABLON, BASMA, BASMA_MAX, OCAK_TABLO, OCAK_MAX,
      ITEM_FIYAT, ULTI_ESIK, SILAH2, TABAN_ITEM, KIMLER, SKILL9, DEPO_KAP },
    /* saf fonksiyonlar */
    fn: { zk, zkBolumBasi, sevEsik, encounterSec, anaTur, ikiTur, bossTur,
      takimGucu, onerilenGuc, bireyselGuc, esyaGucu, nadirlikSec, bossOdul,
      ocakMaliyet, sk, kritSans, kritCarp, ultiSarj, okMenzil, okAralik,
      canKat, kMax, atakHiz, healKat, blokSans, drOran, tahminiDps },
    /* deterministik adimlama: saat.getDelta ezilip adim() elle cagrilir */
    get adim(){ return adim; }, get saat(){ return saat; },
    get cizdir(){ return cizdir; }, get postKur(){ return postKur; },
    get kaliteUygula(){ return kaliteUygula; }, get yenidenBoyutla(){ return yenidenBoyutla; },
    /* etki eden fonksiyonlar (test tetikleyicileri) */
    et: { mobDogur, mobaVur, kahramanaVur, dropDene, itemVer, basmaDene,
      canEkle, kahramanDirilt, enYakinMob, enYakinKahraman, hudGuncelle,
      panelAc, envKaydet, lvlKaydet, stageKaydet, rozetGuncelle, panelYenile,
      okAt, buyuAt, zindanBaslat, oyunBitti, depoEkle, SES, sayiGoster,
      focusAta, bolumDuyur, dilUygula, sevArayuz, envanterCiz, orsCiz }
  };
}

hepsiniYukle().then(()=>{
  okcuKur();
  bruteKur();
  mageKur();
  priestKur();
  kahramanBarlariKur();
  D.mageCan = MAGE_CAN; D.priestCan = PRIEST_CAN;
  document.getElementById('perde').remove();
  let oto = false;
  try{ oto = sessionStorage.getItem('legacyOtoBasla')==='1'; sessionStorage.removeItem('legacyOtoBasla'); }catch(e){}
  if(oto) adim();
  else slotEkraniGoster(()=> adim());
}).catch(e=>{
  yukYazi.textContent = 'Yükleme hatası: ' + e.message;
});

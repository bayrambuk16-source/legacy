import { CanvasGame } from './engine/canvas.js';
import { BootScene } from './game/scenes/BootScene.js';
import { HubScene } from './game/scenes/HubScene.js';
import { CombatScene } from './game/scenes/CombatScene.js';
import { InventoryScene } from './game/scenes/InventoryScene.js';
import { MerchantScene } from './game/scenes/MerchantScene.js';
import { SkillsScene } from './game/scenes/SkillsScene.js';

const mount = document.getElementById('game');
if (!mount) throw new Error('#game elementi yok');

const game = new CanvasGame(mount);
game.register(new BootScene(game));
game.register(new HubScene(game));
game.register(new CombatScene(game));
game.register(new InventoryScene(game));
game.register(new MerchantScene(game));
game.register(new SkillsScene(game));
game.start('boot');

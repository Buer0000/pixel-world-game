// ============================================================
//  SPRITES.js — 像素艺术精灵定义（8×8 格子）
//  null = 透明，其余为颜色字符串
// ============================================================

// 每个精煲8×8像素
const RAW_SPRITES = {
  // ── 人类 (棕色小人，圆头) ─────────────────────────────
  human: [
    [null,null,'#e8b87a','#e8b87a','#e8b87a',null,null,null],
    [null,'#e8b87a','#d4963a','#e8b87a','#d4963a','#e8b87a',null,null],
    [null,null,'#e8b87a','#e8b87a','#e8b87a',null,null,null],
    [null,'#c06020','#c06020','#c06020','#c06020','#c06020',null,null],
    ['#c06020','#c06020','#c06020','#c06020','#c06020','#c06020','#c06020',null],
    [null,'#c06020',null,null,null,'#c06020',null,null],
    [null,'#c06020',null,null,null,'#c06020',null,null],
    [null,'#885030',null,null,null,'#885030',null,null],
  ],
  // 士兵版（深色）
  human_soldier: [
    [null,null,'#e8b87a','#e8b87a','#e8b87a',null,null,null],
    [null,'#e8b87a','#604020','#e8b87a','#604020','#e8b87a',null,null],
    [null,'#604020','#e8b87a','#e8b87a','#e8b87a','#604020',null,null],
    [null,'#604020','#604020','#604020','#604020','#604020',null,null],
    ['#303030','#604020','#604020','#604020','#604020','#604020','#303030',null],
    ['#303030','#604020',null,'#f0f0f0',null,'#604020','#303030',null],
    [null,'#604020',null,null,null,'#604020',null,null],
    [null,'#884020',null,null,null,'#884020',null,null],
  ],

  // ── 精灵 (绿色，尖耳) ───────────────────────────────────
  elf: [
    [null,null,'#90e870','#90e870','#90e870',null,null,null],
    [null,'#70c850','#60b030','#90e870','#60b030','#70c850',null,null],
    ['#70c850',null,'#90e870','#90e870','#90e870',null,'#70c850',null],
    [null,'#3a8020','#3a8020','#3a8020','#3a8020','#3a8020',null,null],
    [null,'#3a8020','#3a8020','#3a8020','#3a8020','#3a8020',null,null],
    [null,'#3a8020',null,null,null,'#3a8020',null,null],
    [null,'#3a8020',null,null,null,'#3a8020',null,null],
    [null,'#2a6010',null,null,null,'#2a6010',null,null],
  ],

  // ── 石人 (灰色方形，粗壮) ──────────────────────────────
  stone: [
    [null,'#c0c0d0','#c0c0d0','#c0c0d0','#c0c0d0','#c0c0d0',null,null],
    ['#c0c0d0','#808090','#c0c0d0','#c0c0d0','#c0c0d0','#808090','#c0c0d0',null],
    ['#c0c0d0','#c0c0d0','#c0c0d0','#c0c0d0','#c0c0d0','#c0c0d0','#c0c0d0',null],
    ['#808090','#808090','#808090','#808090','#808090','#808090','#808090',null],
    ['#808090','#808090','#808090','#808090','#808090','#808090','#808090',null],
    ['#808090','#808090','#c0c0d0','#808090','#c0c0d0','#808090','#808090',null],
    [null,'#808090','#808090','#808090','#808090','#808090',null,null],
    [null,'#606070',null,null,null,'#606070',null,null],
  ],

  // ── 鬼人 (紫色半透明，细长) ─────────────────────────
  ghost: [
    [null,null,'#d080ff','#d080ff','#d080ff',null,null,null],
    [null,'#d080ff','#ff80ff','#d080ff','#ff80ff','#d080ff',null,null],
    [null,null,'#d080ff','#d080ff','#d080ff',null,null,null],
    [null,'#9040c0','#9040c0','#9040c0','#9040c0','#9040c0',null,null],
    [null,null,'#9040c0','#9040c0','#9040c0',null,null,null],
    [null,null,'#9040c0',null,'#9040c0',null,null,null],
    [null,'#9040c0',null,null,null,'#9040c0',null,null],
    [null,'#6020a0',null,null,null,'#6020a0',null,null],
  ],

  // ── 动物 ──────────────────────────────────────────────────
  cow: [
    [null,'#e0c070','#e0c070','#e0c070','#e0c070','#e0c070',null,null],
    ['#e0c070','#e0c070','#e0c070','#e0c070','#e0c070','#e0c070','#e0c070',null],
    ['#e0c070','#e0c070','#f0f0f0','#e0c070','#f0f0f0','#e0c070','#e0c070',null],
    [null,'#e0c070','#e0c070','#e0c070','#e0c070','#e0c070',null,null],
    ['#c0a040','#c0a040',null,'#c0a040','#c0a040',null,'#c0a040',null],
    ['#c0a040','#c0a040',null,'#c0a040','#c0a040',null,'#c0a040',null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  sheep: [
    [null,'#f0f0f0','#f0f0f0','#f0f0f0','#f0f0f0',null,null,null],
    ['#f0f0f0','#f0f0f0','#e0e0e0','#f0f0f0','#e0e0e0','#f0f0f0',null,null],
    ['#f0f0f0','#f0f0f0','#f0f0f0','#f0f0f0','#f0f0f0','#f0f0f0',null,null],
    [null,'#e0d0b0','#e0d0b0','#e0d0b0','#e0d0b0','#e0d0b0',null,null],
    ['#c0a080','#c0a080',null,'#c0a080','#c0a080',null,null,null],
    ['#c0a080','#c0a080',null,'#c0a080','#c0a080',null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  bear: [
    [null,'#7a4f28','#7a4f28','#7a4f28','#7a4f28',null,null,null],
    ['#7a4f28','#5a3010','#7a4f28','#7a4f28','#5a3010','#7a4f28',null,null],
    ['#7a4f28','#7a4f28','#7a4f28','#7a4f28','#7a4f28','#7a4f28',null,null],
    [null,'#5a3010','#5a3010','#5a3010','#5a3010','#5a3010',null,null],
    ['#5a3010','#5a3010','#5a3010','#5a3010','#5a3010','#5a3010',null,null],
    ['#5a3010','#5a3010',null,'#5a3010',null,'#5a3010',null,null],
    ['#5a3010','#5a3010',null,'#5a3010',null,'#5a3010',null,null],
    [null,null,null,null,null,null,null,null],
  ],
  tiger: [
    [null,'#e88030','#e88030','#e88030','#e88030',null,null,null],
    ['#e88030','#e88030','#202020','#e88030','#202020','#e88030',null,null],
    ['#e88030','#202020','#e88030','#e88030','#e88030','#202020',null,null],
    [null,'#c06010','#c06010','#c06010','#c06010','#c06010',null,null],
    ['#c06010','#202020','#c06010','#c06010','#202020','#c06010',null,null],
    ['#c06010','#c06010',null,'#c06010',null,'#c06010',null,null],
    ['#c06010','#c06010',null,'#c06010',null,'#c06010',null,null],
    [null,null,null,null,null,null,null,null],
  ],
  butterfly: [
    ['#f060c0',null,null,'#f0f040',null,null,'#f060c0',null],
    ['#f060c0','#f060c0',null,'#202020',null,'#f060c0','#f060c0',null],
    [null,'#f060c0','#c030a0','#202020','#c030a0','#f060c0',null,null],
    [null,null,'#c030a0','#202020','#c030a0',null,null,null],
    [null,null,null,'#202020',null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  bee: [
    [null,null,null,'#f0d020',null,null,null,null],
    [null,null,'#f0d020','#202020','#f0d020',null,null,null],
    [null,'#f0f0f0','#f0d020','#202020','#f0d020','#f0f0f0',null,null],
    [null,null,'#f0d020','#202020','#f0d020',null,null,null],
    [null,null,null,'#f0d020',null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  shark: [
    [null,null,'#5088a0','#5088a0','#5088a0',null,null,null],
    [null,'#5088a0','#5088a0','#5088a0','#5088a0','#5088a0',null,null],
    ['#5088a0','#5088a0','#5088a0','#f0f0f0','#5088a0','#5088a0','#5088a0',null],
    [null,'#5088a0','#5088a0','#5088a0','#5088a0','#5088a0','#5088a0',null],
    [null,null,'#5088a0','#5088a0','#5088a0',null,null,null],
    [null,'#5088a0',null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],

  // ── 植物 ─────────────────────────────────────────────────
  // 圆形树冠+细树干(1格宽)，tree_rf=热带雨林
  tree_rf: [
    [null,null,'#0a4a0a','#1a7020','#0a4a0a',null,null,null],
    [null,'#0a4a0a','#1a7020','#28a030','#1a7020','#0a4a0a',null,null],
    ['#0a4a0a','#1a7020','#28a030','#38c040','#28a030','#1a7020',null,null],
    [null,'#0a4a0a','#1a7020','#28a030','#1a7020','#0a4a0a',null,null],
    [null,null,'#0a4a0a','#1a7020','#0a4a0a',null,null,null],
    [null,null,null,'#8b4513',null,null,null,null],
    [null,null,null,'#8b4513',null,null,null,null],
    [null,null,null,'#8b4513',null,null,null,null],
  ],
  // tree_sv=草原，黄绿
  tree_sv: [
    [null,null,'#4a6a10','#7a9a28','#4a6a10',null,null,null],
    [null,'#4a6a10','#7a9a28','#a0c040','#7a9a28','#4a6a10',null,null],
    ['#4a6a10','#7a9a28','#a0c040','#b0d050','#a0c040','#7a9a28',null,null],
    [null,'#4a6a10','#7a9a28','#a0c040','#7a9a28','#4a6a10',null,null],
    [null,null,'#4a6a10','#7a9a28','#4a6a10',null,null,null],
    [null,null,null,'#7a5020',null,null,null,null],
    [null,null,null,'#7a5020',null,null,null,null],
    [null,null,null,'#7a5020',null,null,null,null],
  ],
  // tree_tp=温带，鲜绿
  tree_tp: [
    [null,null,'#1a4a1a','#3a8a3a','#1a4a1a',null,null,null],
    [null,'#1a4a1a','#3a8a3a','#5dab5d','#3a8a3a','#1a4a1a',null,null],
    ['#1a4a1a','#3a8a3a','#5dab5d','#6dcb6d','#5dab5d','#3a8a3a',null,null],
    [null,'#1a4a1a','#3a8a3a','#5dab5d','#3a8a3a','#1a4a1a',null,null],
    [null,null,'#1a4a1a','#3a8a3a','#1a4a1a',null,null,null],
    [null,null,null,'#8b6040',null,null,null,null],
    [null,null,null,'#8b6040',null,null,null,null],
    [null,null,null,'#8b6040',null,null,null,null],
  ],
  // tree_mt=山地，深青绿
  tree_mt: [
    [null,null,'#2a4a2a','#4a7a4a','#2a4a2a',null,null,null],
    [null,'#2a4a2a','#4a7a4a','#5a8a5a','#4a7a4a','#2a4a2a',null,null],
    ['#2a4a2a','#4a7a4a','#5a8a5a','#6a9a6a','#5a8a5a','#4a7a4a',null,null],
    [null,'#2a4a2a','#4a7a4a','#5a8a5a','#4a7a4a','#2a4a2a',null,null],
    [null,null,'#2a4a2a','#4a7a4a','#2a4a2a',null,null,null],
    [null,null,null,'#604030',null,null,null,null],
    [null,null,null,'#604030',null,null,null,null],
    [null,null,null,'#604030',null,null,null,null],
  ],
  flower: [
    [null,null,null,'#e060c0',null,null,null,null],
    [null,null,'#e060c0','#fff0a0','#e060c0',null,null,null],
    [null,null,null,'#e060c0',null,null,null,null],
    [null,null,null,'#40a020',null,null,null,null],
    [null,null,null,'#40a020',null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  beehive: [
    [null,'#e0b820','#e0b820','#e0b820',null,null,null,null],
    ['#e0b820','#c09010','#e0b820','#c09010','#e0b820',null,null,null],
    ['#e0b820','#e0b820','#c09010','#e0b820','#e0b820',null,null,null],
    ['#e0b820','#c09010','#e0b820','#c09010','#e0b820',null,null,null],
    [null,'#e0b820','#e0b820','#e0b820',null,null,null,null],
    [null,null,'#8b6040',null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  fruit_bush: [
    [null,'#c04820','#3a8020','#c04820',null,null,null,null],
    ['#3a8020','#3a8020','#c04820','#3a8020','#c04820',null,null,null],
    [null,'#3a8020','#3a8020','#3a8020',null,null,null,null],
    [null,null,'#5a6020',null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  crop: [
    ['#c8c040','#c8c040','#c8c040','#c8c040','#c8c040',null,null,null],
    ['#a0a020','#c8c040','#a0a020','#c8c040','#a0a020',null,null,null],
    ['#c8c040','#a0a020','#c8c040','#a0a020','#c8c040',null,null,null],
    ['#808010','#808010','#808010','#808010','#808010',null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  ore: [
    [null,'#888888','#888888','#888888',null,null,null,null],
    ['#888888','#aaaaaa','#888888','#aaaaaa','#888888',null,null,null],
    ['#888888','#888888','#cccccc','#888888','#888888',null,null,null],
    [null,'#888888','#888888','#888888',null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],

  // ── 建筑 ─────────────────────────────────────────────────
  building_1: [
    [null,null,'#c8a050',null,null,null,null,null],
    [null,'#c8a050','#c8a050','#c8a050',null,null,null,null],
    ['#c8a050','#c8a050','#d0b060','#c8a050','#c8a050',null,null,null],
    ['#c8a050','#d0b060','#d0b060','#d0b060','#c8a050',null,null,null],
    ['#c8a050','#d0b060','#905020','#d0b060','#c8a050',null,null,null],
    ['#c8a050','#c8a050','#905020','#c8a050','#c8a050',null,null,null],
    [null,'#805020','#805020','#805020',null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  building_2: [
    [null,'#c8a050','#c8a050','#c8a050',null,null,null,null],
    ['#c8a050','#d0b060','#d0b060','#d0b060','#c8a050',null,null,null],
    ['#c8a050','#d0b060','#d0b060','#d0b060','#c8a050',null,null,null],
    ['#c8a050','#d0b060','#905020','#d0b060','#c8a050',null,null,null],
    ['#c8a050','#d0b060','#905020','#d0b060','#c8a050',null,null,null],
    ['#c8a050','#c8a050','#905020','#c8a050','#c8a050',null,null,null],
    [null,'#805020','#805020','#805020',null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  building_3: [
    [null,'#d0a040','#808080','#d0a040',null,null,null,null],
    ['#d0a040','#808080','#808080','#808080','#d0a040',null,null,null],
    ['#808080','#808080','#a0a0a0','#808080','#808080',null,null,null],
    ['#808080','#a0a0a0','#a0a0a0','#a0a0a0','#808080',null,null,null],
    ['#808080','#a0a0a0','#604020','#a0a0a0','#808080',null,null,null],
    ['#808080','#808080','#604020','#808080','#808080',null,null,null],
    [null,'#606060','#606060','#606060',null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
  building_4: [
    ['#808080','#808080','#808080','#808080','#808080','#808080',null,null],
    ['#808080','#a0a0a0','#a0a0a0','#a0a0a0','#a0a0a0','#808080',null,null],
    ['#808080','#a0a0a0','#808080','#808080','#a0a0a0','#808080',null,null],
    ['#808080','#a0a0a0','#a0a0a0','#a0a0a0','#a0a0a0','#808080',null,null],
    ['#808080','#a0a0a0','#604020','#604020','#a0a0a0','#808080',null,null],
    ['#808080','#808080','#604020','#604020','#808080','#808080',null,null],
    ['#606060','#606060','#808080','#808080','#606060','#606060',null,null],
    [null,null,null,null,null,null,null,null],
  ],
  building_5: [
    ['#606070','#808090','#808090','#808090','#808090','#606070',null,null],
    ['#808090','#a0a0b0','#606070','#606070','#a0a0b0','#808090',null,null],
    ['#808090','#a0a0b0','#a0a0b0','#a0a0b0','#a0a0b0','#808090',null,null],
    ['#606070','#808090','#a0a0b0','#a0a0b0','#808090','#606070',null,null],
    ['#606070','#a0a0b0','#a0a0b0','#a0a0b0','#a0a0b0','#606070',null,null],
    ['#606070','#a0a0b0','#504030','#504030','#a0a0b0','#606070',null,null],
    ['#606070','#606070','#504030','#504030','#606070','#606070',null,null],
    ['#404050','#404050','#606070','#606070','#404050','#404050',null,null],
  ],
  building_6: [
    ['#404050','#606070','#404050','#606070','#404050','#606070','#404050',null],
    ['#606070','#808090','#808090','#808090','#808090','#808090','#606070',null],
    ['#404050','#808090','#c0c0d0','#a0a0b0','#c0c0d0','#808090','#404050',null],
    ['#606070','#808090','#a0a0b0','#a0a0b0','#a0a0b0','#808090','#606070',null],
    ['#606070','#c0c0d0','#a0a0b0','#a0a0b0','#a0a0b0','#c0c0d0','#606070',null],
    ['#606070','#808090','#504030','#504030','#504030','#808090','#606070',null],
    ['#606070','#606070','#504030','#806040','#504030','#606070','#606070',null],
    ['#404050','#404050','#606070','#606070','#606070','#404050','#404050',null],
  ],

  // ── 港口 ─────────────────────────────────────────────────
  port: [
    ['#6080c0','#6080c0','#8090d0','#8090d0','#8090d0','#6080c0',null,null],
    ['#6080c0','#805030','#805030','#805030','#805030','#6080c0',null,null],
    ['#6080c0','#805030','#a06040','#a06040','#805030','#6080c0',null,null],
    ['#6080c0','#805030','#a06040','#a06040','#805030','#6080c0',null,null],
    ['#6080c0','#805030','#805030','#805030','#805030','#6080c0',null,null],
    ['#6080c0','#6080c0','#6080c0','#6080c0','#6080c0','#6080c0',null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
  ],
};

// 预渲染到离屏 Canvas
const SPRITES = {};
function initSprites() {
  for (const [name, data] of Object.entries(RAW_SPRITES)) {
    const oc = document.createElement('canvas');
    oc.width = 8; oc.height = 8;
    const ctx = oc.getContext('2d');
    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const c = data[row][col];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(col, row, 1, 1);
      }
    }
    SPRITES[name] = oc;
  }
}

// 获取实体对应的精灵名
function getSpriteKey(entity) {
  if (entity instanceof RaceEntity && entity.isSoldier) {
    return entity.type + '_soldier';
  }
  if (entity instanceof PlantEntity) {
    const bMap = { 1:'building_1',2:'building_2',3:'building_3',4:'building_4',5:'building_5',6:'building_6' };
    // (建筑在Renderer里单独处理)
    return entity.type;
  }
  return entity.type;
}

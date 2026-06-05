// ============================================================
//  CONFIG.js — 全局常量配置，所有模块共享
// ============================================================
const CONFIG = {
  // 世界尺寸（单位：格子）
  WORLD_W: 192,
  WORLD_H: 192,
  TILE_PX: 8,          // zoom=1时每格像素数

  // 摄像机缩放
  ZOOM_MIN: 0.25,
  ZOOM_MAX: 4.0,
  ZOOM_SPRITE: 1.5,    // 超过此缩放才显示精灵，否则显示色点

  // 速度 (ms/tick)：新的 1x 约等于旧版 5x，2x/10x 在此基础上继续加速
  SPEEDS: { 1: 200, 2: 100, 10: 20 },

  // 地形 ID
  T: { OCEAN:0, BEACH:1, RAINFOREST:2, SAVANNA:3, TEMPERATE:4, MOUNTAIN:5 },

  // 地形颜色
  TERRAIN_COLOR: ['#1565c0','#f5e97a','#1b5e20','#c8a820','#2e7d32','#757575'],
  TERRAIN_DEEP:  ['#0d47a1','#f5e97a','#1b5e20','#c8a820','#2e7d32','#616161'],
  TERRAIN_NAME:  ['海洋','海滩','热带雨林','热带草原','温带森林','山地'],

  // 地形资源倍率 {food, wood, ore}
  TERRAIN_RES: [
    {food:0,   wood:0,   ore:0  }, // ocean
    {food:0.3, wood:0,   ore:0  }, // beach
    {food:1.2, wood:1.5, ore:0.2}, // rainforest
    {food:0.8, wood:0.5, ore:0.3}, // savanna
    {food:0.7, wood:1.0, ore:0.4}, // temperate
    {food:0.2, wood:0.3, ore:1.5}, // mountain
  ],

  // 种族 ID
  RACE: { HUMAN:'human', ELF:'elf', STONE:'stone', GHOST:'ghost' },

  // 种族基础色（仅用于UI标记，王国颜色由 _generateKingdomColor 动态分配）
  RACE_COLOR: { human:'#e8b87a', elf:'#5dbf55', stone:'#9090b0', ghost:'#b06cbf' },

  // 每个种族有多个候选颜色，王国按顺序取用，保证同种族不同王国颜色各异
  KINGDOM_COLOR_POOL: {
    human: ['#e8443a','#e89a2a','#e8c84a','#c86020','#e84a80','#a03060'],
    elf:   ['#30b050','#20c890','#50d040','#90c020','#20a878','#60e840'],
    stone: ['#7878b8','#9898c8','#585888','#4868a8','#a8a8d8','#686898'],
    ghost: ['#a040c0','#c040a0','#7840d0','#d060c0','#8060d0','#b850e0'],
    orc:   ['#c04020','#a05010','#e05030','#804010','#d07030','#b03010'],
  },
  _kingdomColorIdx: {},  // 内部用：记录每种族已用颜色数量
  RACE_NAME:  { human:'人类', elf:'精灵', stone:'石人', ghost:'鬼人' },

  // 种族基础属性
  RACE_STATS: {
    human: { hp:30, atk:10, def:8,  spd:3, lifespan:600, reproInterval:30,
             gather:{wood:1.5,ore:0.5,food:0.8}, color:'#e8b87a' },
    elf:   { hp:22, atk:7,  def:6,  spd:4, lifespan:900, reproInterval:50,
             gather:{wood:0.8,ore:0.5,food:1.5}, color:'#5dbf55' },
    stone: { hp:50, atk:14, def:15, spd:2, lifespan:500, reproInterval:70,
             gather:{wood:0.6,ore:2.0,food:0.7}, color:'#9090b0' },
    ghost: { hp:25, atk:12, def:7,  spd:3, lifespan:700, reproInterval:40,
             gather:{wood:0.7,ore:0.6,food:0.7}, color:'#b06cbf' },
  },

  // 动物 ID
  ANIMAL: { COW:'cow',SHEEP:'sheep',BEAR:'bear',TIGER:'tiger',
            BUTTERFLY:'butterfly',BEE:'bee',SHARK:'shark' },

  // 动物颜色
  ANIMAL_COLOR: { cow:'#d4a044',sheep:'#efefef',bear:'#7a4f28',tiger:'#e88030',
                  butterfly:'#f06090',bee:'#f0d020',shark:'#5088a0' },
  ANIMAL_NAME:  { cow:'牛',sheep:'羊',bear:'熊',tiger:'老虎',
                  butterfly:'蝴蝶',bee:'蜜蜂',shark:'鲨鱼' },

  // 动物战力（每tick与人类对抗的伤害）
  ANIMAL_STRENGTH: { bear:8, tiger:10, shark:12, cow:2, sheep:1, butterfly:0, bee:0 },
  // 人类能对抗的倍数 (1人 vs N只)
  ANIMAL_FIGHT_RATIO: { bear:0.67, tiger:0.5 }, // bear 1.5:1 ≈ 0.67, tiger 2:1 = 0.5

  // 植物 ID
  PLANT: { TREE_RF:'tree_rf', TREE_SV:'tree_sv', TREE_TP:'tree_tp', TREE_MT:'tree_mt',
           FLOWER:'flower', BEEHIVE:'beehive', FRUIT_BUSH:'fruit_bush',
           CROP:'crop', ORE:'ore' },

  // 植物颜色
  PLANT_COLOR: { tree_rf:'#0d4f0d',tree_sv:'#6b8c21',tree_tp:'#2d6b2d',tree_mt:'#4a6a4a',
                 flower:'#e060c0',beehive:'#e0b820',fruit_bush:'#c04820',
                 crop:'#c8c040',ore:'#888888' },
  PLANT_NAME: { tree_rf:'雨林树',tree_sv:'草原树',tree_tp:'温带树',tree_mt:'山地树',
                flower:'花朵',beehive:'蜂巢',fruit_bush:'果丛',crop:'农田',ore:'矿石' },

  // 植物提供木材/食物
  PLANT_YIELD: { tree_rf:{wood:8}, tree_sv:{wood:5}, tree_tp:{wood:7}, tree_mt:{wood:4},
                 flower:{food:1}, beehive:{food:5}, fruit_bush:{food:4},
                 crop:{food:10}, ore:{ore:15} },

  // 地形天然植物
  TERRAIN_PLANTS: {
    1: ['flower'],
    2: ['tree_rf','flower','fruit_bush'],
    3: ['tree_sv','flower','fruit_bush'],
    4: ['tree_tp','beehive','flower'],
    5: ['tree_mt','ore'],
  },

  // 地形天然动物
  TERRAIN_ANIMALS: {
    2: ['cow','sheep','bear','tiger','butterfly','bee'],
    3: ['cow','sheep','tiger','butterfly'],
    4: ['cow','sheep','bear','butterfly','bee'],
    5: ['bear','sheep'],
    0: ['shark'],
  },

  // 建筑定义 [level]: {name, wood, ore, capacity}
  BUILDING_DEF: [
    null,
    { name:'茅屋',   wood:5,  ore:0,  capacity:4  },
    { name:'木屋',   wood:12, ore:0,  capacity:8  },
    { name:'大屋',   wood:25, ore:0,  capacity:15 },
    { name:'石屋',   wood:30, ore:10, capacity:25 },
    { name:'要塞',   wood:50, ore:25, capacity:40 },
    { name:'城堡',   wood:80, ore:50, capacity:60 },
  ],

  PORT_REQ: { buildings:5, minLevel:3 },  // 解锁港口条件
  SHIP_CAPACITY: 20,
  PORT_REPRO_MULT: 0.9,                    // 有港口和船后，繁衍略微加速
  NAVAL_COLONIZE_MIN_POP: 40,              // 40人后船只可殖民无人大陆/岛屿
  NAVAL_WAR_MIN_POP: 50,                   // 50人后船只可远征外大陆/岛屿
  NAVAL_COLONY_SEED: 5,                    // 海外殖民初始迁移人数
  NAVAL_INVASION_SIZE: 8,                  // 海外远征上岸人数上限
  MINE_PER_KINGDOM: 1,                     // 每个王国最多1个矿场
  MINE_OUTPUT: 2,                          // 矿场每tick产出矿石

  // 部落/王国阈值
  TRIBE_FORM_MIN: 5,
  TRIBE_FORM_RADIUS: 12,
  KINGDOM_MIN_POP: 30,
  MILITIA_MIN_POP: 18,          // 18人起可组建少量民兵
  BORDER_TENSION_MIN_POP: 20,   // 20人起会感知边境压力
  BORDER_WAR_MIN_POP: 25,       // 25人起，长期拥挤可发动边境战争
  REGULAR_ARMY_MIN_POP: 35,     // 35人进入正规军阶段
  LARGE_ARMY_MIN_POP: 45,       // 45人进入大规模军队阶段
  ARMY_MIN_POP: 35,             // 兼容旧逻辑：正规军门槛
  SOLDIER_MULT: 2.0,

  // 食物消耗
  FOOD_PER_TICK: 0.05,      // 每实体每tick消耗
  REPRO_FOOD_MIN: 10,       // 繁衍所需最低食物储量

  // 动态发展节奏：前期加速，人口/住房压力上来后自动收敛
  GROWTH: {
    EARLY_POP: 20,              // 5~20 人是快速成长期，之后逐步回到正常节奏
    BUFFER_POP: 30,             // 20~30 人是建国准备期，快速加成逐步衰减
    SETTLEMENT_EARLY_POP: 20,   // 每个聚落自己的快速成长期
    SETTLEMENT_BUFFER_POP: 30,  // 聚落自己的成熟缓冲期
    VILLAGE_FAST_CAPITAL_RATIO: 0.6,// 新村快速成长不能超过首都人口的60%
    CAPITAL_BIRTH_BIAS: 0.72,   // 首都未成熟时，出生更偏向首都
    SETTLED_POP: 50,            // 接近王国门槛时逐步回到正常节奏
    EARLY_REPRO_MULT: 0.1,      // 5~20 人繁衍间隔倍率，越小越快
    BUFFER_REPRO_MULT: 0.42,    // 20~30 人衰减到该倍率，再进入中期
    MID_REPRO_MULT: 0.68,       // 20~50 人中期繁衍间隔倍率
    EARLY_REPRO_BANK_BONUS: 1.0,// 快速成长期额外保底进度，避免随机停滞
    BUFFER_REPRO_BANK_BONUS: 0.55,// 20~30 人保留一点繁衍保底
    FOOD_RICH_PER_CAPITA: 14,   // 人均食物高于该值时加速繁衍
    FOOD_LOW_PER_CAPITA: 4,     // 人均食物低于该值时显著放慢
    BUILD_CHECK_FAST: 8,        // 前期/缺房时建房检查频率
    BUILD_CHECK_NORMAL: 20,     // 正常建房检查频率
    BUILD_HOUSING_TRIGGER: 0.58,// 住房使用率超过该值时提前补房
    PREKINGDOM_WOOD_SURPLUS: 120,// 20人后木材富余时，不等建国也会继续补房
    PREKINGDOM_EXTRA_BUILDINGS: 4,// 建国前最多积极补到第4栋基础建筑
    CAPITAL_RADIUS_CAP: 38,     // 首都圈随人口/建筑成长的上限
    VILLAGE_RADIUS_CAP: 28,     // 村庄圈成长上限
    EARLY_VILLAGE_POP: 14,      // 部落阶段达到该人口后可尝试建立外圈村
    EARLY_VILLAGE_BUILDINGS: 2, // 首都至少有几栋房才开始外圈发展
    FARMERS_PER_FIELD: 3,       // 单块农田的舒适耕作人数，超出后改去采集/建造
    VILLAGE_SETTLE_TICKS: 260,  // 新村安置期，期间优先分配出生
    VILLAGE_SETTLE_REPRO_MULT: 0.78,// 有年轻村庄时略微提高整体繁衍
  },

  // 矿石/树再生 (ticks)
  TREE_REGEN: 200,
  ORE_REGEN: 600,

  // 寿命 (ticks)
  LIFESPAN: {
    human:600,elf:900,stone:500,ghost:700,
    cow:400,sheep:350,bear:500,tiger:450,butterfly:100,bee:80,shark:600,
    tree_rf:1000,tree_sv:800,tree_tp:900,tree_mt:1200,
    flower:200,beehive:500,fruit_bush:400,crop:50,ore:2000,
  },

  // 玩家放置配额 (每15分钟现实时间重置)
  QUOTA_RESET_MS: 15 * 60 * 1000,
  PLACEMENT_QUOTA: {
    human:50, elf:50, stone:50, ghost:50,
    cow:100, sheep:100, bear:20, tiger:20, butterfly:200, bee:200,
    tree_rf:200, tree_sv:200, tree_tp:200, tree_mt:200,
    flower:200, beehive:50, fruit_bush:100, ore:30,
    weather_rain:5, weather_storm:3, weather_lightning:2,
    weather_tornado:1, volcano:1,
  },

  // 天气
  WEATHER: { CLEAR:'clear', RAIN:'rain', STORM:'storm', LIGHTNING:'lightning', TORNADO:'tornado' },
  WEATHER_DURATION: { clear:60, rain:30, storm:20, lightning:5, tornado:10 },
  WEATHER_EXTREME_CHANCE: 0.002, // 每tick极端天气概率

  // 地形塑造
  TERRAIN_SCULPT: {
    RAISE_RATE:  0.025,   // 每tick抬升量
    LOWER_RATE:  0.025,   // 每tick降低量
    RADIUS:      3,       // 影响半径（格）
    FALLOFF:     0.6,     // 边缘衰减系数
  },
  // 高度阈值（与 mapGen 保持一致）
  HEIGHT_OCEAN:  0.33,
  HEIGHT_BEACH:  0.40,
  HEIGHT_MOUNTAIN: 0.75,

  // 性能限制
  MAX_ENTITIES: 4000,
  MAX_TRIBES: 60,

  // 蝴蝶/蜜蜂增加植物繁殖概率
  POLLINATOR_BOOST: 0.3,

  // 战争触发：领土相邻且有军队且资源紧张
  WAR_TRIGGER_POP_RATIO: 0.9,  // 人口达容量90%时考虑扩张

  // 外交状态
  DIPLO: { NEUTRAL:'neutral', ALLY:'ally', WAR:'war' },
};

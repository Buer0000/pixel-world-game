// ============================================================
//  UTILS.js — 工具函数：随机数生成、噪声、坐标、事件总线
// ============================================================

// 带种子的伪随机数生成器 (Park-Miller LCG)
class SeededRNG {
  constructor(seed) {
    this.s = ((seed || Date.now()) % 2147483647);
    if (this.s <= 0) this.s += 2147483646;
  }
  next() {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  float(min = 0, max = 1) { return min + this.next() * (max - min); }
  int(min, max) { return Math.floor(this.float(min, max)); }
  bool(p = 0.5) { return this.next() < p; }
  pick(arr) { return arr[this.int(0, arr.length)]; }
}

// 全局随机生成器（普通用途，非地图生成）
const RNG = new SeededRNG(Date.now());

// ── 值噪声 ──────────────────────────────────────────────────
function _noiseHash(x, y, table) {
  return table[((x * 1619 + y * 31337) & 0x7FFFFFFF) % table.length];
}

function valueNoise(x, y, table, scale) {
  const xi = Math.floor(x / scale);
  const yi = Math.floor(y / scale);
  const xf = x / scale - xi;
  const yf = y / scale - yi;
  const a = _noiseHash(xi,   yi,   table);
  const b = _noiseHash(xi+1, yi,   table);
  const c = _noiseHash(xi,   yi+1, table);
  const d = _noiseHash(xi+1, yi+1, table);
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  return a + (b-a)*sx + (c-a)*sy + (a-b-c+d)*sx*sy;
}

function makeNoiseTable(rng, size = 4096) {
  const t = new Float32Array(size);
  for (let i = 0; i < size; i++) t[i] = rng.next();
  return t;
}

// ── 空间工具 ─────────────────────────────────────────────────
function dist2(x1, y1, x2, y2) {
  const dx = x1 - x2, dy = y1 - y2;
  return dx*dx + dy*dy;
}
function dist(x1, y1, x2, y2) { return Math.sqrt(dist2(x1,y1,x2,y2)); }

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function lerp(a, b, t) { return a + (b - a) * t; }

// 把世界格坐标转为 tile key 字符串
function tileKey(x, y) { return (x & 0xFFFF) | (y << 16); }
function tileKeyXY(k) { return { x: k & 0xFFFF, y: (k >> 16) & 0xFFFF }; }

// ============================================================
//  领土主权系统 — 统一的格子使用权限接口
//  所有 AI 行为（建房/采集/农田/寻路）统一走此接口
// ============================================================

/** 行为类型常量 */
const TILE_ACTION = {
  BUILD:    'build',    // 建造建筑
  FARM:     'farm',     // 建立农田
  GATHER:   'gather',   // 采集资源
  MOVE:     'move',     // 单位经过（寻路/游荡）
};

/** 主权威胁值权重（敌对行为被发现时累加） */
const SOVEREIGNTY_THREAT = {
  MILITARY_ENTER:  50,   // 敌军进入我领土
  GATHER:          10,   // 敌方在我领土采集
  BUILD:          100,   // 敌方在我领土建房
  FARM:            30,   // 敌方在我领土建农田
  DECAY_PER_TICK:   2,   // 每 tick 自然衰减
  EXPEL_THRESHOLD: 100,  // 触发驱逐
  WAR_THRESHOLD:   350,  // 触发宣战（持续侵犯）
};

/**
 * 统一的格子使用权限检查
 *
 * @param {object|null} tile      - 目标格 (world.getTile 返回值)
 * @param {number}      tribeId   - 请求方部落ID
 * @param {string}      action    - TILE_ACTION 中的行为类型
 * @param {Set}         atWar     - 请求方当前交战部落ID集合
 * @returns {boolean}  true = 允许，false = 禁止
 */
function canUseTile(tile, tribeId, action, atWar) {
  if (!tile) return false;

  // 无主地块：任何行为都允许
  const owner = tile.ownerTribeId;
  if (!owner || owner === tribeId) return true;

  // 战争中：允许所有行为（进攻逻辑）
  if (atWar?.has(owner)) return true;

  // 和平时期：敌国领土一律禁止（建造/采集/农田/路过）
  return false;
}

// 全局唯一 ID 生成
let _uidCounter = 0;
function uid() { return ++_uidCounter; }

// ── 事件总线（模块解耦） ────────────────────────────────────
class EventBus {
  constructor() { this._m = {}; }
  on(ev, fn) {
    if (!this._m[ev]) this._m[ev] = [];
    this._m[ev].push(fn);
    return () => this.off(ev, fn);
  }
  off(ev, fn) { if (this._m[ev]) this._m[ev] = this._m[ev].filter(f => f !== fn); }
  emit(ev, data) { (this._m[ev] || []).forEach(fn => fn(data)); }
}
const Events = new EventBus();

// ── 颜色工具 ──────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

function blendColor(hex, factor) {
  // 使颜色变暗/变亮
  const [r,g,b] = hexToRgb(hex);
  const f = clamp(factor, 0, 2);
  const nr = clamp(Math.round(r*f),0,255);
  const ng = clamp(Math.round(g*f),0,255);
  const nb = clamp(Math.round(b*f),0,255);
  return `#${nr.toString(16).padStart(2,'0')}${ng.toString(16).padStart(2,'0')}${nb.toString(16).padStart(2,'0')}`;
}

// ── 简单优先队列（用于寻路等） ────────────────────────────────
class MinHeap {
  constructor() { this._d = []; }
  push(item, pri) { this._d.push([pri, item]); this._d.sort((a,b)=>a[0]-b[0]); }
  pop() { return this._d.shift()?.[1]; }
  get size() { return this._d.length; }
}

// ── 空间网格（用于快速近邻查找） ─────────────────────────────
class SpatialGrid {
  constructor(cellSize) {
    this.cs = cellSize;
    this._cells = new Map();
  }
  // 用整数 key 替代字符串拼接（快约 3-5 倍）
  _key(x, y) {
    return (Math.floor(x / this.cs) & 0xFFFF) | ((Math.floor(y / this.cs) & 0xFFFF) << 16);
  }
  insert(id, x, y) {
    const k = this._key(x, y);
    if (!this._cells.has(k)) this._cells.set(k, new Set());
    this._cells.get(k).add(id);
  }
  remove(id, x, y) {
    this._cells.get(this._key(x, y))?.delete(id);
  }
  query(x, y, radius, idMap) {
    const cs = this.cs;
    const r  = Math.ceil(radius / cs);
    const cx = Math.floor(x / cs);
    const cy = Math.floor(y / cs);
    const r2 = radius * radius;
    const results = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const k = ((cx + dx) & 0xFFFF) | (((cy + dy) & 0xFFFF) << 16);
        const cell = this._cells.get(k);
        if (!cell) continue;
        for (const id of cell) {
          const e = idMap.get(id);
          if (!e) continue;
          const ddx = e.x - x, ddy = e.y - y;
          if (ddx * ddx + ddy * ddy <= r2) results.push(e);
        }
      }
    }
    return results;
  }
  clear() { this._cells.clear(); }
}

// ── 计时器工具 ────────────────────────────────────────────────
function formatTime(ticks, speed = 1) {
  // 1 tick = 1 游戏秒, 60 ticks = 1游戏分钟
  const sec = ticks * speed;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// ============================================================
//  MAPGEN.js — 地图生成（域扭曲 + 有机海岸线）
// ============================================================
class MapGenerator {
  constructor(seed) {
    this.rng = new SeededRNG(seed);
    this.W   = CONFIG.WORLD_W;
    this.H   = CONFIG.WORLD_H;
  }

  generate() {
    const { W, H, rng } = this;

    const tiles = [];
    for (let y = 0; y < H; y++) {
      tiles.push([]);
      for (let x = 0; x < W; x++)
        tiles[y].push({ terrain: CONFIG.T.OCEAN, wood: 0, ore: 0, food: 0, h: 0 });
    }

    // 噪声表
    const nA = makeNoiseTable(rng, 8192); // 高度主噪声
    const nB = makeNoiseTable(rng, 8192); // 生物群系
    const nC = makeNoiseTable(rng, 8192); // 域扭曲 X
    const nD = makeNoiseTable(rng, 8192); // 域扭曲 Y
    const nE = makeNoiseTable(rng, 4096); // 边缘细节

    // ── 1. 放置陆块种子 ───────────────────────────────────
    const landmasses = [];

    // 1-2 个大陆：随机放置，互相保持距离
    const numCont = rng.int(1, 3);
    for (let i = 0; i < numCont; i++) {
      let cx, cy, tries = 0;
      do {
        cx = rng.float(0.20, 0.80) * W;
        cy = rng.float(0.20, 0.80) * H;
        tries++;
      } while (tries < 30 && landmasses.some(lm =>
        Math.sqrt((cx-lm.cx)**2+(cy-lm.cy)**2) < 90
      ));
      landmasses.push({
        cx, cy,
        r:    rng.float(48, 72),    // 基础半径
        tall: rng.float(0.65, 1.0), // 纵横比
        rot:  rng.float(0, Math.PI),
        str:  1.0,
        warp: rng.float(18, 30),    // 边缘扭曲量
      });
    }

    // 3-4 个小岛
    const numIsle = rng.int(3, 5);
    for (let i = 0; i < numIsle; i++) {
      let cx, cy, tries = 0;
      do {
        cx = rng.float(0.08, 0.92) * W;
        cy = rng.float(0.08, 0.92) * H;
        tries++;
      } while (tries < 40 && landmasses.some(lm => {
        const d = Math.sqrt((cx-lm.cx)**2+(cy-lm.cy)**2);
        return d < lm.r + 20;
      }));
      landmasses.push({
        cx, cy,
        r:    rng.float(10, 24),
        tall: rng.float(0.55, 1.0),
        rot:  rng.float(0, Math.PI),
        str:  rng.float(0.6, 0.85),
        warp: rng.float(6, 16),
      });
    }

    // ── 2. 计算高度图（域扭曲椭圆叠加） ────────────────────
    const hmap = new Float32Array(W * H);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        // 域扭曲：先用低频噪声偏移采样坐标，使形状有机化
        const warpScale = 0.025;
        const wx1 = valueNoise(x * warpScale,       y * warpScale,       nC, 1);
        const wy1 = valueNoise(x * warpScale + 5.2, y * warpScale + 1.3, nD, 1);
        const wx2 = valueNoise(x * warpScale * 2,   y * warpScale * 2 + 3.7, nC, 1);
        const wy2 = valueNoise(x * warpScale * 2 + 8.1, y * warpScale * 2, nD, 1);

        let h = 0;
        for (const lm of landmasses) {
          // 每个陆块有自己的扭曲量
          const wAmt = lm.warp;
          const sx = x + (wx1 - 0.5) * wAmt * 2 + (wx2 - 0.5) * wAmt * 0.6;
          const sy = y + (wy1 - 0.5) * wAmt * 2 + (wy2 - 0.5) * wAmt * 0.6;

          // 旋转后的椭圆距离
          const dx = sx - lm.cx, dy = sy - lm.cy;
          const cosR = Math.cos(lm.rot), sinR = Math.sin(lm.rot);
          const lx = (dx * cosR + dy * sinR) / lm.r;
          const ly = (-dx * sinR + dy * cosR) / (lm.r * lm.tall);
          let d  = Math.sqrt(lx*lx + ly*ly);

          // 二次域扭曲：用角度加入边缘噪声，让边界不规则
          const ang   = Math.atan2(ly, lx);
          const eFreq = lm.r > 30 ? 6 : 4;
          const e1 = valueNoise(ang * eFreq + lm.cx * 0.05,
                                d  * 4     + lm.cy * 0.05, nE, 1);
          const e2 = valueNoise(ang * eFreq * 1.7 + 3.1,
                                d  * 2.5   + 1.9,          nE, 1) * 0.5;
          d = d * (1.0 + (e1 + e2 - 0.75) * 0.28);

          // 平滑衰减（smoothstep）
          const t = clamp(1 - d, 0, 1);
          const smooth = t * t * (3 - 2 * t);
          h = Math.max(h, smooth * lm.str);
        }

        // 叠加多尺度高度噪声（地形起侏感）
        const nFbm = valueNoise(x, y, nA, 50) * 0.50
                   + valueNoise(x, y, nA, 25) * 0.28
                   + valueNoise(x, y, nA, 12) * 0.14
                   + valueNoise(x, y, nA,  6) * 0.08;

        // 海洋区域几乎不受噪声影响，陆地区域适量叠加
        const blend = clamp(h * 3, 0, 1);
        hmap[y * W + x] = h * (1 - blend * 0.22) + nFbm * blend * 0.22
                        + (h > 0.1 ? 0 : nFbm * 0.04);
      }
    }

    // ── 3. 高度 → 地形类型 ────────────────────────────────
    const biomeNoise = nB;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const h    = hmap[y * W + x];
        const tile = tiles[y][x];
        tile.h = h;

        if (h < 0.30) {
          tile.terrain = CONFIG.T.OCEAN;
        } else if (h < 0.38) {
          tile.terrain = CONFIG.T.BEACH;
        } else if (h >= 0.78) {
          tile.terrain = CONFIG.T.MOUNTAIN;
        } else {
          // 生物群系：综合纬度 + 噪声
          const bn  = valueNoise(x, y, biomeNoise, 55) * 0.6
                    + valueNoise(x, y, biomeNoise, 22) * 0.4;
          const eq  = Math.abs(y / H - 0.5) * 2; // 0=赤道 1=极地
          const val = eq * 0.55 + bn * 0.45;
          if      (val < 0.35) tile.terrain = CONFIG.T.RAINFOREST;
          else if (val < 0.58) tile.terrain = CONFIG.T.SAVANNA;
          else                 tile.terrain = CONFIG.T.TEMPERATE;
        }

        // 初始化地块资源
        const res = CONFIG.TERRAIN_RES[tile.terrain];
        tile.wood = Math.floor(res.wood * 80 * (0.6 + rng.float() * 0.8));
        tile.ore  = Math.floor(res.ore  * 60 * (0.6 + rng.float() * 0.8));
        tile.food = Math.floor(res.food * 60 * (0.6 + rng.float() * 0.8));
      }
    }

    this._addBeaches(tiles);
    return tiles;
  }

  _addBeaches(tiles) {
    const { W, H } = this;
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    const mark = [];
    for (let y = 1; y < H-1; y++) {
      for (let x = 1; x < W-1; x++) {
        const t = tiles[y][x].terrain;
        if (t === CONFIG.T.OCEAN || t === CONFIG.T.BEACH) continue;
        for (const [dy, dx] of dirs) {
          if (tiles[y+dy]?.[x+dx]?.terrain === CONFIG.T.OCEAN) {
            mark.push([x, y]); break;
          }
        }
      }
    }
    for (const [x, y] of mark) {
      tiles[y][x].terrain = CONFIG.T.BEACH;
      tiles[y][x].h    = 0.34;
      tiles[y][x].wood = 0;
      tiles[y][x].ore  = 0;
      tiles[y][x].food = 15;
    }
  }

  getLandTiles(tiles) {
    const land = [];
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < this.W; x++)
        if (tiles[y][x].terrain !== CONFIG.T.OCEAN)
          land.push({ x, y, terrain: tiles[y][x].terrain });
    return land;
  }
}

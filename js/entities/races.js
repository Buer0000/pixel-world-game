// ============================================================
//  RACES.js — 种族实体定义与 AI 行为
//  行为局部化：每个单位归属一个 Settlement，活动受其半径约束
// ============================================================
class RaceEntity extends Entity {
  constructor(raceType, x, y) {
    super(raceType, x, y);
    const stats    = CONFIG.RACE_STATS[raceType];
    this.hp        = stats.hp;
    this.maxHp     = stats.hp;
    this.attack    = stats.atk;
    this.defense   = stats.def;
    this.speed     = stats.spd;
    this.lifespan  = stats.lifespan + Math.floor((Math.random()-0.5) * 60);
    this.reproCD   = 0;
    this.isSoldier = false;
    this.gatherTarget = null;
    this.buildTarget  = null;
    this.farmTile     = null;
    this.shipId       = null;
    this.state        = 'idle';
    this._wanderTick  = 0;
    this._wanderTarget = null;
    this._workKey      = null;
    this._workOffset   = { x: 0, y: 0 };

    // 聚落归属
    this.settlementId = null;

    // 游泳体力
    this.stamina    = 100;
    this.maxStamina = 100;

    // Action气泡（渲染用，不序列化）
    this._actionBubble = null;  // { emoji, ticks }
    this._lastState    = '';

    // 敌方领土缓存（每50tick重建，避免每次采集都重建 Set）
    this._enemyTilesCache  = null;
    this._enemyTilesTick   = -999;
  }

  get race() { return this.type; }

  get combatPower() {
    const base = this.attack + this.defense * 0.5;
    return this.isSoldier ? base * CONFIG.SOLDIER_MULT : base;
  }

  tick(world, tribe) {
    this.age++;
    this.tickAge++;
    if (this.reproCD > 0) this.reproCD--;

    if (this.age >= this.lifespan) {
      this._actionBubble = { emoji: '\u{1F480}', ticks: 30 };
      this.dead = true;
      return;
    }

    // ── 游泳体力 ────────────────────────────────────────────
    const tile = world.getTile(Math.round(this.x), Math.round(this.y));
    if (tile?.terrain === CONFIG.T.OCEAN) {
      this.stamina = Math.max(0, this.stamina - 3);
      if (this.stamina === 0) this.damage(2);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 1);
    }

    // ── Action 气泡更新 ───────────────────────────────────
    if (this.state !== this._lastState) {
      const bubbleMap = {
        gather_food: '\u{1F33E}', gather_wood: '\u{1F332}', gather_ore: '⛏',
        farm: '\u{1F33E}', fight: '⚔', build: '\u{1F528}',
      };
      const emoji = bubbleMap[this.state];
      if (emoji) this._actionBubble = { emoji, ticks: 20 };
      this._lastState = this.state;
    }
    if (this._actionBubble) {
      this._actionBubble.ticks--;
      if (this._actionBubble.ticks <= 0) this._actionBubble = null;
    }

    if (!tribe) {
      this._wanderBehavior(world, null);
      return;
    }

    // 获取所属聚落
    const settlement = tribe.getSettlementFor(this.id);

    switch (this.state) {
      case 'gather_wood': this._doGather(world, tribe, settlement, 'wood'); break;
      case 'gather_ore':  this._doGather(world, tribe, settlement, 'ore');  break;
      case 'gather_food': this._doGather(world, tribe, settlement, 'food'); break;
      case 'build':       this._doBuild(world, tribe, settlement); break;
      case 'fight':       this._doFight(world, tribe); break;
      case 'farm':        this._doFarm(world, tribe, settlement); break;
      case 'wander':
      default:            this._wanderBehavior(world, settlement); break;
    }
  }

  // ── 游荡（限制在聚落半径内，不进入敌国领土） ─────────────
  _wanderBehavior(world, settlement) {
    this._wanderTick++;
    // 聚落中心 + 半径；无聚落则在当前位置小范围游荡
    const cx  = settlement?.x ?? Math.round(this.x);
    const cy  = settlement?.y ?? Math.round(this.y);
    const rad = settlement ? settlement.radius * 0.7 : 8;

    if (!this._wanderTarget || this._wanderTick > 40) {
      this._wanderTick = 0;
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * rad;
      const tx = clamp(cx + Math.cos(angle) * r, 0, CONFIG.WORLD_W - 1);
      const ty = clamp(cy + Math.sin(angle) * r, 0, CONFIG.WORLD_H - 1);
      // ★ 主权检查：和平时期不进入他国领土
      if (this._canUseTile(world, Math.round(tx), Math.round(ty), TILE_ACTION.MOVE)) {
        this._wanderTarget = { x: tx, y: ty };
      }
    }
    if (this._wanderTarget) {
      const t = world.getTile(
        Math.round(this._wanderTarget.x),
        Math.round(this._wanderTarget.y)
      );
      if (t && t.terrain !== CONFIG.T.OCEAN) {
        this.moveToward(this._wanderTarget.x, this._wanderTarget.y, this.speed * 0.1);
      } else {
        this._wanderTarget = null;
      }
    }
  }

  // ── 辅助：通过统一主权接口检查格子是否可通行 ────────────
  _canUseTile(world, tx, ty, action) {
    const tile    = world.getTile(tx, ty);
    const myTribe = this.tribeId ? world.tribes.get(this.tribeId) : null;
    return canUseTile(tile, this.tribeId, action ?? TILE_ACTION.MOVE, myTribe?.atWar);
  }

  /** @deprecated 使用 _canUseTile() */
  _isEnemyTile(world, tx, ty) {
    return !this._canUseTile(world, tx, ty, TILE_ACTION.MOVE);
  }

  /**
   * 获取敌方领土Set（每50tick缓存一次，避免每次采集都重建）
   * 这是性能关键路径：100个采集者×每tick调用 = 必须缓存
   */
  _getEnemyTiles(world) {
    if (this._enemyTilesCache && this.tickAge - this._enemyTilesTick < 50) {
      return this._enemyTilesCache;
    }
    const myTribe = this.tribeId ? world.tribes.get(this.tribeId) : null;
    if (!myTribe) { this._enemyTilesCache = null; return null; }

    const cache = new Set();
    for (const [, t] of world.tribes) {
      if (t.id === this.tribeId) continue;
      if (myTribe.atWar.has(t.id)) continue;  // 战争中不惩罚（允许进入）
      for (const k of t.territory) cache.add(k);
    }
    this._enemyTilesCache = cache;
    this._enemyTilesTick  = this.tickAge;
    return cache;
  }

  // ── 采集（从聚落中心搜索，不采集敌国领土内的资源）─────────
  _doGather(world, tribe, settlement, res) {
    if (!this.gatherTarget) {
      // 以聚落中心为搜索原点，在半径内寻找资源
      const sx = settlement?.x ?? this.x;
      const sy = settlement?.y ?? this.y;
      const sr = settlement ? Math.min(settlement.radius, 28) : 20;
      // 传入缓存的敌方领土（性能关键：避免每次重建 Set）
      const best = world.findBestResource(sx, sy, res, sr, this._getEnemyTiles(world));
      if (best) {
        this.gatherTarget = best;
      } else {
        this.state = 'idle';
        return;
      }
    }
    const { x, y } = this.gatherTarget;
    const wp = this._getWorkPoint(world, `gather_${res}`, this.gatherTarget, 1.05);
    const arrived = this.moveToward(wp.x, wp.y, this.speed * 0.08);
    if (arrived || dist(this.x, this.y, x, y) < 1.45) {
      // ★ 到达时再做一次实时主权检查（领土归属可能在途中发生变化）
      if (!this._canUseTile(world, Math.round(x), Math.round(y), TILE_ACTION.GATHER)) {
        this.gatherTarget = null;
        this._clearWorkPoint();
        this.state = 'idle';
        return;
      }
      const t = world.getTile(Math.round(x), Math.round(y));
      if (t && t[res] > 0) {
        const rate = CONFIG.RACE_STATS[this.type].gather[res];
        const amt  = Math.min(rate, t[res]);
        t[res] = Math.max(0, t[res] - amt);
        tribe.resources[res] = (tribe.resources[res] || 0) + amt;
      } else {
        this.gatherTarget = null; // 资源耗尽，重找
        this._clearWorkPoint();
      }
    }
  }

  // ── 建造（使用所属聚落的建造任务） ──────────────────
  _doBuild(world, tribe, settlement) {
    if (!this.buildTarget) {
      // 优先本聚落，其次首都
      const src = settlement?.pendingBuild
                ? settlement
                : tribe.settlements.find(s => s.pendingBuild);
      if (src?.pendingBuild) {
        this.buildTarget = { ...src.pendingBuild, _sid: src.id };
      } else {
        this.state = 'idle';
        return;
      }
    }

    const wp = this._getWorkPoint(world, 'build', this.buildTarget, 1.35);
    const arrived = this.moveToward(wp.x, wp.y, this.speed * 0.08);
    if (arrived || dist(this.x, this.y, this.buildTarget.x, this.buildTarget.y) < 1.8) {
      // 找到对应聚落
      const targetS = tribe.settlements.find(s => s.id === this.buildTarget._sid)
                      ?? settlement;
      if (!targetS?.pendingBuild) {
        this.buildTarget = null; this._clearWorkPoint(); this.state = 'idle'; return;
      }
      targetS.buildProgress = (targetS.buildProgress || 0) + 1;
      const needProgress = typeof tribe.getBuildProgressNeeded === 'function'
        ? tribe.getBuildProgressNeeded(targetS)
        : 5;
      if (targetS.buildProgress >= needProgress) {
        tribe.completeBuilding(targetS, this.buildTarget, world);
        this.buildTarget = null;
        this._clearWorkPoint();
        this.state = 'idle';
      }
    }
  }

  // ── 耕种（使用所属聚落的农田） ─────────────────────
  _doFarm(world, tribe, settlement) {
    if (!this.farmTile) {
      const ft = settlement?.findFarmTile() ?? tribe.capital.findFarmTile();
      if (ft) { this.farmTile = ft; }
      else    { this.state = 'idle'; return; }
    }
    if (!this._canUseTile(world, Math.round(this.farmTile.x), Math.round(this.farmTile.y), TILE_ACTION.FARM)) {
      this.farmTile = null;
      this._clearWorkPoint();
      this.state = 'idle';
      return;
    }
    const wp = this._getWorkPoint(world, 'farm', this.farmTile, 1.45);
    const arrived = this.moveToward(wp.x, wp.y, this.speed * 0.08);
    if ((arrived || dist(this.x, this.y, this.farmTile.x, this.farmTile.y) < 1.9) && this.tickAge % 5 === 0) {
      tribe.resources.food = (tribe.resources.food || 0) + 2;
    }
  }

  _getWorkPoint(world, kind, target, radius) {
    if (!target) return { x: this.x, y: this.y };
    const tx = Math.round(target.x);
    const ty = Math.round(target.y);
    const key = `${kind}:${tx}:${ty}`;

    if (this._workKey !== key) {
      const seed = this._workSeed(key);
      const angle = (seed % 6283) / 1000;
      const ring  = 0.55 + ((seed >> 3) % 100) / 100;
      this._workOffset = {
        x: Math.cos(angle) * radius * ring,
        y: Math.sin(angle) * radius * ring,
      };
      this._workKey = key;
    }

    const px = clamp(target.x + this._workOffset.x, 0, CONFIG.WORLD_W - 1);
    const py = clamp(target.y + this._workOffset.y, 0, CONFIG.WORLD_H - 1);
    const tile = world.getTile(Math.round(px), Math.round(py));
    if (tile && tile.terrain !== CONFIG.T.OCEAN && this._canUseTile(world, Math.round(px), Math.round(py), TILE_ACTION.MOVE)) {
      return { x: px, y: py };
    }
    return { x: target.x, y: target.y };
  }

  _workSeed(key) {
    const str = `${this.id}:${key}`;
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  _clearWorkPoint() {
    this._workKey = null;
    this._workOffset = { x: 0, y: 0 };
  }

  // ── 战斗 ─────────────────────────────────────────────────
  _doFight(world, tribe) {
    if (!this.target) { this.state = 'idle'; return; }
    const enemy = world.entities.get(this.target);
    if (!enemy || enemy.dead) { this.target = null; this.state = 'idle'; return; }

    const arrived = this.moveToward(enemy.x, enemy.y, this.speed * 0.1);
    if (arrived || dist(this.x, this.y, enemy.x, enemy.y) < 1.5) {
      const dmg = Math.max(1, this.attack - (enemy.defense || 0) * 0.5);
      enemy.damage(dmg * 0.3);
      if (enemy.attack) {
        const retDmg = Math.max(1, enemy.attack - this.defense * 0.5);
        this.damage(retDmg * 0.3);
      }
    }
  }

  serialize() {
    return { ...super.serialize(), isSoldier: this.isSoldier, reproCD: this.reproCD,
             settlementId: this.settlementId, stamina: this.stamina };
  }
}

// ── 工厂函数 ────────────────────────────────────────────────
function createRaceEntity(race, x, y) {
  return new RaceEntity(race, x, y);
}

// 精灵使附近野生动物不主动攻击
function isElfFriendlyToAnimal(elf, animal) {
  return elf.type === CONFIG.RACE.ELF &&
         dist(elf.x, elf.y, animal.x, animal.y) < 8;
}

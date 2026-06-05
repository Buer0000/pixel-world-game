// ============================================================
//  TRIBE.js — 王国 / 聚落 / 部落 管理
//  架构：Kingdom → Settlement[] (capital + villages)
//        + 国家战略AI：DEVELOP → EXPAND → COLONIZE → WAR
// ============================================================
let _tribeIdCounter    = 0;
let _settlementIdCounter = 0;

// ── 战略目标常量 ───────────────────────────────────────────────
const GOAL = {
  DEVELOP:  'DEVELOP',
  EXPAND:   'EXPAND',
  COLONIZE: 'COLONIZE',
  WAR:      'WAR',
};

const STRATEGY_WEIGHTS = {
  [GOAL.DEVELOP]: {
    gatherFood: 100, gatherWood: 90, gatherOre: 40,
    build: 100, farm: 90,
    military: 5, fight: 0, explore: 10,
  },
  [GOAL.EXPAND]: {
    gatherFood: 90, gatherWood: 80, gatherOre: 40,
    build: 70, farm: 80,
    military: 20, fight: 0, explore: 40,
  },
  [GOAL.COLONIZE]: {
    gatherFood: 80, gatherWood: 70, gatherOre: 50,
    build: 60, farm: 70,
    military: 40, fight: 20, explore: 80,
  },
  [GOAL.WAR]: {
    gatherFood: 70, gatherWood: 60, gatherOre: 50,
    build: 40, farm: 60,
    military: 100, fight: 100, explore: 20,
  },
};

class Settlement {
  constructor(kingdomId, type, x, y) {
    this.id        = ++_settlementIdCounter;
    this.kingdomId = kingdomId;
    this.type      = type;
    this.x         = Math.round(x);
    this.y         = Math.round(y);
    this.radius    = type === 'capital' ? 22 : 16;
    this.name      = null;
    this._named    = false;
    this.buildings = [];
    this.pendingBuild   = null;
    this.buildProgress  = 0;
    this.farmTiles      = [];
    this._mineBuilt     = false;
    this.members        = new Set();
    this.foundedTick    = 0;
  }

  get population()    { return this.members.size; }
  get maxPopulation() {
    return this.buildings.reduce((s, b) => s + CONFIG.BUILDING_DEF[b.level].capacity, 15);
  }

  addMember(id)    { this.members.add(id); }
  removeMember(id) { this.members.delete(id); }

  findFarmTile() {
    if (this.farmTiles.length === 0) return null;
    return this.farmTiles[Math.floor(Math.random() * this.farmTiles.length)];
  }
}

class Tribe {
  constructor(race, cx, cy) {
    this.id         = ++_tribeIdCounter;
    this.race       = race;
    this.name       = this._generateName();
    this.color      = this._generateKingdomColor(race);
    this.members    = new Set();
    this.territory  = new Set();
    this.settlements = [];
    this.resources  = { food:80, wood:20, ore:0 };
    this.level      = 'tribe';
    this.kingId     = null;
    this.military   = new Set();
    this.ports      = [];
    this.ships      = [];
    this.relations  = new Map();
    this.atWar      = new Set();
    this._totalTicks       = 0;
    this._ticksSinceExpand = 0;
    this.homeContinentId   = -1;

    this.currentGoal      = GOAL.DEVELOP;
    this._stagnationTicks = 0;
    this._lastPopulation  = 0;
    this._reproBank       = 0;
    this._pressures       = {
      food: 0, population: 0, freeLand: 100, wood: 0, ore: 0,
    };

    this.sovereigntyThreat = 0;

    const cap = new Settlement(this.id, 'capital', cx, cy);
    this.settlements.push(cap);
  }

  get capital()   { return this.settlements.find(s => s.type === 'capital') ?? this.settlements[0]; }
  get cx()        { return this.capital?.x ?? 0; }
  get cy()        { return this.capital?.y ?? 0; }
  get buildings() { return this.settlements.flatMap(s => s.buildings); }
  get farmCount() { return this.settlements.reduce((sum, s) => sum + s.farmTiles.length, 0); }
  get allPendingBuilds() { return this.settlements.map(s => s.pendingBuild).filter(Boolean); }

  get population()    { return this.members.size; }
  get maxPopulation() { return this.settlements.reduce((s, st) => s + st.maxPopulation, 0); }
  get isKingdom()     { return this.level === 'kingdom'; }
  get hasMilitary()   { return this.military.size > 0; }
  get buildingCount() { return this.buildings.length; }

  get _weights()      { return STRATEGY_WEIGHTS[this.currentGoal]; }

  addMember(entityId) {
    this.members.add(entityId);
    const best = this._bestSettlement();
    best.addMember(entityId);
    return best.id;
  }

  removeMember(entityId) {
    this.members.delete(entityId);
    this.military.delete(entityId);
    for (const s of this.settlements) s.removeMember(entityId);
  }

  _bestSettlement() {
    let best = this.capital, bestRatio = Infinity;
    for (const s of this.settlements) {
      const ratio = s.population / Math.max(1, s.maxPopulation + 1);
      if (ratio < bestRatio) { bestRatio = ratio; best = s; }
    }
    return best;
  }

  getSettlementFor(entityId) {
    for (const s of this.settlements) {
      if (s.members.has(entityId)) return s;
    }
    return this.capital;
  }

  tick(world) {
    this._totalTicks++;
    if (this.members.size === 0) return;

    const foodCost = this.members.size * CONFIG.FOOD_PER_TICK;
    this.resources.food = Math.max(0, this.resources.food - foodCost);

    if (this._totalTicks % 5 === 0) {
      for (const s of this.settlements) {
        if (s._mineBuilt) this.resources.ore += CONFIG.MINE_OUTPUT;
      }
    }

    if ((this.isKingdom || this.population >= CONFIG.BORDER_TENSION_MIN_POP) &&
        this._totalTicks % 100 === 0) {
      this._updateKingdomStrategy(world);
    }

    if (this._totalTicks % 8 === 0) this._assignTasks(world);

    this._checkLevelUp();

    if (this._totalTicks % 8 === 0) this._tryReproduce(world);
    const buildInterval = this._getBuildCheckInterval();
    if (this._totalTicks % buildInterval === 0) this._tryBuild(world);
    if (this._totalTicks % 20 === 0) this._updateSettlementRadii();
    if (this._totalTicks % 60 === 0) this._cleanupDisconnectedSettlements(world);

    this._ticksSinceExpand++;
    if (this._ticksSinceExpand > 30) {
      this._ticksSinceExpand = 0;
      this._expandTerritory(world);
    }

    if (!this.isKingdom && this._totalTicks % 180 === 0 && this._shouldSeedEarlyVillage()) {
      this._tryFoundVillage(world, true);
    }

    if ((this.isKingdom || this.population >= CONFIG.MILITIA_MIN_POP) &&
        this._totalTicks % 30 === 0) {
      this._tryFormMilitary(world);
    }

    if (this._totalTicks % 80 === 0 && this.currentGoal === GOAL.WAR) {
      this._tryDeclareWar(world);
    }

    if (this.isKingdom) {
      if (this._totalTicks % 50  === 0) this._tryBuildPort(world);
      if (this._totalTicks % 300 === 0 &&
          (this.currentGoal === GOAL.EXPAND || this.currentGoal === GOAL.COLONIZE) &&
          this.capital.buildings.length >= 3) {
        this._tryFoundVillage(world);
      }
    }

    if (this._totalTicks % 15 === 0) this._checkSovereignty(world);
  }

  _updateKingdomStrategy(world) {
    const p = this._computePressures(world);
    this._pressures = p;

    const pop      = this.population;
    const maxPop   = Math.max(1, this.maxPopulation);
    const popRatio = pop / maxPop;
    const bldCount = this.buildingCount;

    const popGrowth = pop - this._lastPopulation;
    if (popRatio > 0.85 && popGrowth <= 1) {
      this._stagnationTicks += 100;
    } else {
      this._stagnationTicks = Math.max(0, this._stagnationTicks - 50);
    }
    this._lastPopulation = pop;

    const prevGoal = this.currentGoal;

    let goal = GOAL.DEVELOP;

    if (popRatio > 0.6 && p.freeLand > 30 && bldCount >= 3) {
      goal = GOAL.EXPAND;
    }

    if (this.isKingdom && popRatio > 0.75 && p.freeLand < 20 && this.ports.length > 0) {
      goal = GOAL.COLONIZE;
    }

    const hasNeighbor = this._hasNeighborPolity(world);
    const borderBlocked = p.border > 8 && p.freeLand < 30;
    const boxedIn = p.freeLand < 15 || borderBlocked;
    const strained = p.food > 70 || p.wood > 70 || popRatio > 0.82;
    if (pop >= CONFIG.BORDER_WAR_MIN_POP &&
        this._stagnationTicks >= 200 &&
        boxedIn &&
        strained &&
        hasNeighbor) {
      goal = GOAL.WAR;
    }

    if (this.atWar.size > 0) {
      goal = GOAL.WAR;
    }

    if (p.food > 120 && this.atWar.size === 0) {
      goal = GOAL.DEVELOP;
      this._stagnationTicks = Math.max(0, this._stagnationTicks - 100);
    }

    if (goal !== prevGoal) {
      this.currentGoal = goal;
      Events.emit('tribe:strategy', {
        tribeId: this.id, name: this.name,
        from: prevGoal, to: goal,
        pressures: p,
      });
    } else {
      this.currentGoal = goal;
    }
  }

  _computePressures(world) {
    const pop      = this.population;
    const maxPop   = Math.max(1, this.maxPopulation);
    const food     = Math.max(1, this.resources.food);
    const wood     = Math.max(1, this.resources.wood);

    return {
      food: (pop * 100) / food,
      population: pop / maxPop,
      freeLand: this._freeLandScore(world),
      border: this._borderPressureScore(world),
      wood: (pop * 60) / wood,
      ore: this.resources.ore < 10 ? 80 : 20,
    };
  }

  _freeLandScore(world) {
    const R  = 30;
    const cx = this.cx, cy = this.cy;
    let free = 0;
    for (let dy = -R; dy <= R; dy += 2) {
      for (let dx = -R; dx <= R; dx += 2) {
        const tx = cx + dx, ty = cy + dy;
        if (dx*dx + dy*dy > R*R) continue;
        const tile = world.getTile(tx, ty);
        if (!tile || tile.terrain === CONFIG.T.OCEAN || tile.terrain === CONFIG.T.BEACH) continue;
        const k = tileKey(tx, ty);
        let claimed = false;
        for (const t of world.tribes.values()) {
          if (t.territory.has(k)) { claimed = true; break; }
        }
        if (!claimed) free++;
      }
    }
    return free;
  }

  _borderPressureScore(world) {
    if (this.territory.size === 0) return 0;
    let pressure = 0;
    const offsets = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (dx * dx + dy * dy > 5) continue;
        offsets.push([dx, dy]);
      }
    }

    for (const key of this.territory) {
      const { x, y } = tileKeyXY(key);
      let local = 0;
      for (const [dx, dy] of offsets) {
        const tile = world.getTile(x + dx, y + dy);
        if (!tile) continue;
        if (tile.ownerTribeId && tile.ownerTribeId !== this.id && !this.atWar.has(tile.ownerTribeId)) {
          local += 1;
        }
      }
      if (local > 0) pressure += Math.min(3, local);
      if (pressure >= 100) return 100;
    }
    return pressure;
  }

  _territoriesNear(other, radius = 2) {
    if (!other?.territory || this.territory.size === 0 || other.territory.size === 0) return false;
    const r = Math.ceil(radius);
    for (const key of this.territory) {
      const { x, y } = tileKeyXY(key);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          if (other.territory.has(tileKey(x + dx, y + dy))) return true;
        }
      }
    }
    return false;
  }

  _hasNeighborPolity(world) {
    for (const [, t] of world.tribes) {
      if (t.id === this.id) continue;
      if (!t.isKingdom && t.population < CONFIG.MILITIA_MIN_POP) continue;
      if (dist(this.cx, this.cy, t.cx, t.cy) < 80 || this._territoriesNear(t, 3)) return true;
    }
    return false;
  }

  _assignTasks(world) {
    const total = this.members.size;
    if (total === 0) return;

    const w = this._weights;
    const growth = this._getGrowthProfile();
    const foodOk = this.resources.food > total * 5;
    const woodOk = this.resources.wood > 30;
    const oreOk  = this.resources.ore  > 20;
    const hasOreBuilding = this.buildings.some(b => b.level >= 3);
    const hasPendingBuild = this.allPendingBuilds.length > 0;

    const foodW  = foodOk ? w.gatherFood * 0.3 : w.gatherFood;
    const woodW  = woodOk ? w.gatherWood * 0.3 : w.gatherWood;
    const oreW   = (oreOk || !hasOreBuilding) ? 0 : w.gatherOre;
    const buildW = hasPendingBuild
      ? w.build * (growth.housingRatio > CONFIG.GROWTH.BUILD_HOUSING_TRIGGER ? 1.8 : 1.25)
      : w.build;
    const farmW  = w.farm;
    const totalW = foodW + woodW + oreW + buildW + farmW;

    const foodFrac  = foodW  / totalW;
    const woodFrac  = woodW  / totalW;
    const oreFrac   = oreW   / totalW;
    const buildFrac = buildW / totalW;

    for (const settlement of this.settlements) {
      const sMembers = [...settlement.members]
        .map(id => world.entities.get(id))
        .filter(e => e && !e.dead);
      const st = sMembers.length;
      if (st === 0) continue;

      let i = 0;
      let farmAssigned = 0;
      const farmSlots = Math.max(0, settlement.farmTiles.length * (CONFIG.GROWTH.FARMERS_PER_FIELD || 3));
      const pickFoodWork = () => {
        if (farmAssigned < farmSlots) {
          farmAssigned++;
          return 'farm';
        }
        return 'gather_food';
      };
      const pickFallbackWork = () => {
        if (settlement.pendingBuild && !woodOk) return 'gather_wood';
        if (settlement.pendingBuild) return 'build';
        return pickFoodWork();
      };

      for (const e of sMembers) {
        if (e.isSoldier && this.atWar.size > 0) {
          this._setWorkerState(e, 'fight'); continue;
        }
        if (this._pressures.food > 100 && i < Math.ceil(st * 0.6)) {
          this._setWorkerState(e, pickFoodWork());
        } else {
          const frac = i / st;
          if (frac < foodFrac) {
            this._setWorkerState(e, pickFoodWork());
          } else if (frac < foodFrac + woodFrac) {
            this._setWorkerState(e, 'gather_wood');
          } else if (frac < foodFrac + woodFrac + oreFrac) {
            this._setWorkerState(e, 'gather_ore');
          } else if (frac < foodFrac + woodFrac + oreFrac + buildFrac && settlement.pendingBuild) {
            this._setWorkerState(e, 'build');
          } else {
            this._setWorkerState(e, pickFallbackWork());
          }
        }
        i++;
      }
    }
  }

  _setWorkerState(e, state) {
    if (e.state === state) return;
    e.state = state;
    e.gatherTarget = null;
    e.buildTarget  = null;
    e.farmTile     = null;
    if (typeof e._clearWorkPoint === 'function') e._clearWorkPoint();
  }

  _checkLevelUp() {
    if (this.level === 'tribe' && this.population >= CONFIG.KINGDOM_MIN_POP) {
      this.level = 'kingdom';
      this._upgradeNameToKingdom();
      if (!this.capital._named) {
        this.capital.name = this._generateSettlementName('capital');
        this.capital._named = true;
      }
      Events.emit('tribe:levelup', { id: this.id, name: this.name, level: 'kingdom' });
    }
  }

  _tryReproduce(world) {
    if (this.resources.food < CONFIG.REPRO_FOOD_MIN) return;

    const target  = this._chooseBirthSettlement();
    const pop     = this.population;
    const growth  = this._getGrowthProfile(target);
    const housingRatio = growth.housingRatio;

    const baseInterval = CONFIG.RACE_STATS[this.race]?.reproInterval ?? 30;

    let intervalMult = 1;
    if (housingRatio > 1.0)     intervalMult = 6;
    else if (housingRatio > 0.8) intervalMult = 2.5;
    else if (housingRatio > 0.6) intervalMult = 1.5;

    if (growth.pop < growth.fastLimit) {
      intervalMult *= CONFIG.GROWTH.EARLY_REPRO_MULT;
    } else if (growth.pop < growth.bufferLimit) {
      intervalMult *= lerp(
        CONFIG.GROWTH.EARLY_REPRO_MULT,
        CONFIG.GROWTH.BUFFER_REPRO_MULT,
        growth.bufferProgress
      );
    } else if (growth.pop < CONFIG.GROWTH.SETTLED_POP) {
      intervalMult *= CONFIG.GROWTH.MID_REPRO_MULT;
    }

    if (this._hasActiveSettlingVillage()) {
      intervalMult *= CONFIG.GROWTH.VILLAGE_SETTLE_REPRO_MULT;
    }
    if (this.ports.length > 0 && this.ships.length > 0) {
      intervalMult *= CONFIG.PORT_REPRO_MULT;
    }

    if (growth.foodPerCapita > CONFIG.GROWTH.FOOD_RICH_PER_CAPITA) intervalMult *= 0.72;
    if (growth.foodPerCapita < CONFIG.GROWTH.FOOD_LOW_PER_CAPITA)  intervalMult *= 2.2;

    if (housingRatio > 1.0) intervalMult = Math.max(intervalMult, 4.0);

    const minInterval = growth.pop < growth.fastLimit ? 1.8 : 4;
    const effectiveInterval = Math.max(minInterval, baseInterval * clamp(intervalMult, 0.1, 8));
    this._reproBank = Math.min(2, (this._reproBank || 0) + 1 / effectiveInterval);
    if (housingRatio <= 0.95 && growth.foodPerCapita >= CONFIG.GROWTH.FOOD_LOW_PER_CAPITA) {
      if (growth.pop < growth.fastLimit) {
        this._reproBank = Math.min(2, this._reproBank + CONFIG.GROWTH.EARLY_REPRO_BANK_BONUS / effectiveInterval);
      } else if (growth.pop < growth.bufferLimit) {
        this._reproBank = Math.min(2, this._reproBank + CONFIG.GROWTH.BUFFER_REPRO_BANK_BONUS / effectiveInterval);
      }
    }
    if (this._reproBank < 1) return;
    this._reproBank -= 1;

    if (housingRatio > CONFIG.GROWTH.BUILD_HOUSING_TRIGGER) {
      for (const s of this.settlements) {
        if (!s.pendingBuild && s.population / Math.max(1, s.maxPopulation) > CONFIG.GROWTH.BUILD_HOUSING_TRIGGER) {
          this._tryBuildForSettlement(world, s);
          break;
        }
      }
    }

    const spawnPos = this._chooseBirthPos(target);
    Events.emit('entity:spawn', {
      type: this.race, x: spawnPos.x, y: spawnPos.y,
      tribeId: this.id, settlementId: target.id,
    });
    this.resources.food -= 5;
  }

  _chooseBirthSettlement() {
    const cap = this.capital;
    if (cap && cap.population < this._getSettlementFastLimit(cap) &&
        Math.random() < CONFIG.GROWTH.CAPITAL_BIRTH_BIAS) {
      return cap;
    }

    const settling = this._activeSettlingVillages()
      .filter(s =>
        s.population < this._getSettlementFastLimit(s) &&
        s.population < s.maxPopulation * 0.85
      );
    if (settling.length > 0 && Math.random() < 0.65) {
      return settling.sort((a, b) => a.population - b.population)[0];
    }

    let best = this.capital, bestRatio = Infinity;
    for (const s of this.settlements) {
      const ratio = s.population / Math.max(1, s.maxPopulation);
      if (ratio < bestRatio) { bestRatio = ratio; best = s; }
    }
    return best;
  }

  _activeSettlingVillages() {
    const settleTicks = CONFIG.GROWTH.VILLAGE_SETTLE_TICKS || 0;
    if (settleTicks <= 0) return [];
    return this.settlements.filter(s =>
      s.type !== 'capital' &&
      this._totalTicks - (s.foundedTick || 0) <= settleTicks &&
      s.population < this._getSettlementFastLimit(s)
    );
  }

  _hasActiveSettlingVillage() {
    return this._activeSettlingVillages().length > 0;
  }

  _chooseBirthPos(settlement) {
    const bs = settlement.buildings;
    if (bs.length > 0) {
      const b = bs[Math.floor(Math.random() * bs.length)];
      return {
        x: clamp(b.x + (Math.random()-0.5)*4, 0, CONFIG.WORLD_W-1),
        y: clamp(b.y + (Math.random()-0.5)*4, 0, CONFIG.WORLD_H-1),
      };
    }
    return {
      x: clamp(settlement.x + (Math.random()-0.5)*6, 0, CONFIG.WORLD_W-1),
      y: clamp(settlement.y + (Math.random()-0.5)*6, 0, CONFIG.WORLD_H-1),
    };
  }

  _tryBuildForSettlement(world, settlement) {
    if (settlement.pendingBuild) return;
    if (!this._shouldPlanBuilding(settlement)) return;
    const maxLevel = this.resources.ore > 0 ? 6 : 3;
    const lv = this._chooseBuildingLevel(maxLevel);
    if (lv <= 0) return;

    const def = CONFIG.BUILDING_DEF[lv];
    const pos = this._findBuildPos(world, settlement);
    if (pos) {
      settlement.pendingBuild = { ...pos, level: lv };
      this.resources.wood -= def.wood;
      this.resources.ore  -= def.ore;
    }
  }

  _shouldPlanBuilding(settlement) {
    if (settlement.buildings.length < 2) return true;

    const ratio = settlement.population / Math.max(1, settlement.maxPopulation);
    if (ratio > CONFIG.GROWTH.BUILD_HOUSING_TRIGGER) return true;

    if (this.population >= CONFIG.GROWTH.EARLY_POP &&
        settlement.buildings.length < CONFIG.GROWTH.PREKINGDOM_EXTRA_BUILDINGS &&
        this.resources.wood > CONFIG.GROWTH.PREKINGDOM_WOOD_SURPLUS &&
        ratio > 0.35) return true;

    if (this.isKingdom && this.resources.wood > 160 && ratio > 0.45) return true;

    return false;
  }

  _chooseBuildingLevel(maxLevel) {
    const growth = this._getGrowthProfile();
    let targetMax = maxLevel;
    if (growth.pop < 18) targetMax = Math.min(targetMax, 2);
    else if (growth.pop < CONFIG.GROWTH.SETTLED_POP) targetMax = Math.min(targetMax, 3);

    for (let lv = targetMax; lv >= 1; lv--) {
      const def = CONFIG.BUILDING_DEF[lv];
      if (this.resources.wood >= def.wood && this.resources.ore >= def.ore) return lv;
    }
    return 0;
  }

  _getGrowthProfile(settlement = null) {
    const scope = settlement || null;
    const pop = scope ? scope.population : this.population;
    const maxPop = Math.max(1, scope ? scope.maxPopulation : this.maxPopulation);
    const earlyStart = CONFIG.TRIBE_FORM_MIN;
    const earlyEnd = scope ? this._getSettlementFastLimit(scope) : CONFIG.GROWTH.EARLY_POP;
    const bufferEnd = scope ? this._getSettlementBufferLimit(scope) : CONFIG.GROWTH.BUFFER_POP;
    return {
      pop,
      maxPop,
      fastLimit: earlyEnd,
      bufferLimit: bufferEnd,
      housingRatio: pop / maxPop,
      foodPerCapita: this.resources.food / Math.max(1, this.population),
      earlyProgress: clamp((pop - earlyStart) / Math.max(1, earlyEnd - earlyStart), 0, 1),
      bufferProgress: clamp((pop - earlyEnd) / Math.max(1, bufferEnd - earlyEnd), 0, 1),
    };
  }

  _getSettlementFastLimit(settlement) {
    const base = CONFIG.GROWTH.SETTLEMENT_EARLY_POP || CONFIG.GROWTH.EARLY_POP;
    if (!settlement || settlement.type === 'capital') return base;
    const capPop = this.capital?.population ?? 0;
    const capLimit = Math.floor(capPop * (CONFIG.GROWTH.VILLAGE_FAST_CAPITAL_RATIO || 0.6));
    return Math.max(CONFIG.TRIBE_FORM_MIN, Math.min(base, capLimit));
  }

  _getSettlementBufferLimit(settlement) {
    const base = CONFIG.GROWTH.SETTLEMENT_BUFFER_POP || CONFIG.GROWTH.BUFFER_POP;
    if (!settlement || settlement.type === 'capital') return base;
    const capPop = this.capital?.population ?? 0;
    const capLimit = Math.floor(capPop * (CONFIG.GROWTH.VILLAGE_FAST_CAPITAL_RATIO || 0.6));
    return Math.max(this._getSettlementFastLimit(settlement), Math.min(base, capLimit));
  }

  _getBuildCheckInterval() {
    const growth = this._getGrowthProfile();
    if (growth.pop < CONFIG.GROWTH.EARLY_POP) return CONFIG.GROWTH.BUILD_CHECK_FAST;
    if (growth.housingRatio > CONFIG.GROWTH.BUILD_HOUSING_TRIGGER) return CONFIG.GROWTH.BUILD_CHECK_FAST;
    return CONFIG.GROWTH.BUILD_CHECK_NORMAL;
  }

  _updateSettlementRadii() {
    for (const s of this.settlements) {
      const base = s.type === 'capital' ? 22 : 16;
      const cap  = s.type === 'capital'
        ? CONFIG.GROWTH.CAPITAL_RADIUS_CAP
        : CONFIG.GROWTH.VILLAGE_RADIUS_CAP;
      const buildingBonus = Math.floor(s.buildings.length / 2) * 2;
      const popBonus      = Math.floor(s.population / 10) * 2;
      s.radius = clamp(base + buildingBonus + popBonus, base, cap);
    }
  }

  _shouldSeedEarlyVillage() {
    if (this.settlements.length >= 3) return false;
    if (this.population < CONFIG.GROWTH.EARLY_VILLAGE_POP) return false;
    if (this.capital.buildings.length < CONFIG.GROWTH.EARLY_VILLAGE_BUILDINGS) return false;
    if (this.resources.food < this.population * 6) return false;
    return true;
  }

  getBuildProgressNeeded(settlement) {
    const growth = this._getGrowthProfile();
    if (this.buildingCount < 2 || growth.pop < 14) return 3;
    if (settlement.population / Math.max(1, settlement.maxPopulation) > CONFIG.GROWTH.BUILD_HOUSING_TRIGGER) return 4;
    return 5;
  }

  _tryBuild(world) {
    for (const settlement of this.settlements) {
      if (settlement.pendingBuild) continue;
      this._tryBuildForSettlement(world, settlement);
    }
  }

  /** @deprecated */
  _tileOwnedByEnemy(world, x, y) {
    const tile = world.getTile(x, y);
    return !canUseTile(tile, this.id, TILE_ACTION.MOVE, this.atWar);
  }

  _findBuildPos(world, settlement) {
    const allBuildings = this.buildings;
    const sBuildings   = settlement.buildings;
    const sCount       = sBuildings.length;
    const R            = settlement.radius;

    const INNER_R  = sCount === 0 ? 1.5 : R * 0.28;
    const MID_R    = sCount === 0 ? R * 0.42 : R * 0.72;
    const OUTER_R  = sCount === 0 ? Math.min(5, R * 0.45) : R * 0.88;
    const NEAR_DIST = 3.5;

    const housingArea   = Math.PI * (MID_R * MID_R - INNER_R * INNER_R);
    const density       = sCount / Math.max(1, housingArea * 0.1);
    const expansionBias = clamp(density - 0.4, 0, 1) * 30;

    const SAMPLES = 80;
    let bestScore = -Infinity, bestPos = null;

    for (let i = 0; i < SAMPLES; i++) {
      const angle = (i / SAMPLES) * Math.PI * 2 + Math.random() * 0.4;
      const rMin  = INNER_R + 0.5;
      const rMax  = OUTER_R;
      const r     = rMin + Math.random() * (rMax - rMin);

      const x = clamp(Math.round(settlement.x + Math.cos(angle) * r), 1, CONFIG.WORLD_W - 2);
      const y = clamp(Math.round(settlement.y + Math.sin(angle) * r), 1, CONFIG.WORLD_H - 2);
      const dCenter = dist(settlement.x, settlement.y, x, y);

      if (dCenter < INNER_R)           continue;
      if (dCenter > OUTER_R)           continue;
      if (!this.territory.has(tileKey(x, y)))          continue;
      const tile = world.getTile(x, y);
      if (!tile || tile.terrain === CONFIG.T.OCEAN || tile.terrain === CONFIG.T.BEACH) continue;
      if (!canUseTile(tile, this.id, TILE_ACTION.BUILD, this.atWar)) continue;
      if (allBuildings.some(b => dist(b.x, b.y, x, y) < 2.5)) continue;

      let score = 100;
      const nearby = allBuildings.filter(b => dist(b.x, b.y, x, y) <= NEAR_DIST).length;
      score -= nearby * 18;

      if (dCenter >= INNER_R && dCenter <= MID_R) {
        score += 25;
        const midLine = (INNER_R + MID_R) / 2;
        score += (1 - Math.abs(dCenter - midLine) / (MID_R - INNER_R)) * 15;
      }

      if (dCenter > MID_R) {
        score += expansionBias;
      }

      if (tile.terrain === CONFIG.T.MOUNTAIN) score -= 20;
      score += (Math.random() - 0.5) * 10;

      if (score > bestScore) {
        bestScore = score;
        bestPos   = { x, y };
      }
    }

    return bestScore > 0 ? bestPos : null;
  }

  completeBuilding(settlement, pos, world) {
    settlement.buildings.push({ id: uid(), level: pos.level, x: pos.x, y: pos.y });
    settlement.pendingBuild  = null;
    settlement.buildProgress = 0;

    if (settlement.buildings.length >= 2 && settlement.farmTiles.length === 0) {
      this._buildFarm(settlement, world);
    }
    if (!settlement._mineBuilt && settlement.buildings.some(b => b.level >= 3)) {
      settlement._mineBuilt = true;
      Events.emit('tribe:mine_built', { tribeId: this.id, x: pos.x, y: pos.y });
    }
    Events.emit('tribe:built', { tribeId: this.id, building: pos });
  }

  _buildFarm(settlement, world) {
    const R = settlement.radius * 0.7;
    let bestX = settlement.x, bestY = settlement.y, bestScore = -Infinity;

    for (let tries = 0; tries < 40; tries++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = 3 + Math.random() * R;
      const fx = clamp(Math.round(settlement.x + Math.cos(angle) * r), 1, CONFIG.WORLD_W - 2);
      const fy = clamp(Math.round(settlement.y + Math.sin(angle) * r), 1, CONFIG.WORLD_H - 2);

      const tile = world?.getTile(fx, fy);
      if (!tile) continue;
      if (tile.terrain === CONFIG.T.OCEAN || tile.terrain === CONFIG.T.BEACH) continue;

      let score = 50;
      if (tile.terrain === CONFIG.T.SAVANNA || tile.terrain === CONFIG.T.TEMPERATE) score += 30;
      if (tile.terrain === CONFIG.T.MOUNTAIN) score -= 40;
      score -= dist(settlement.x, settlement.y, fx, fy) * 0.5;
      if (this.territory.has(tileKey(fx, fy))) score += 20;
      if (!canUseTile(tile, this.id, TILE_ACTION.FARM, this.atWar)) score -= 60;
      if (settlement.farmTiles.some(f => dist(f.x, f.y, fx, fy) < 4)) score -= 30;

      if (score > bestScore) { bestScore = score; bestX = fx; bestY = fy; }
    }

    settlement.farmTiles.push({ x: bestX, y: bestY });
    Events.emit('entity:spawn', { type: CONFIG.PLANT.CROP, x: bestX, y: bestY, tribeId: this.id });
  }

  _expandTerritory(world) {
    const claimTile = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= CONFIG.WORLD_W || ty >= CONFIG.WORLD_H) return;
      const k = tileKey(tx, ty);
      if (this.territory.has(k)) return;
      const tile = world.getTile(tx, ty);
      if (!tile || tile.terrain === CONFIG.T.OCEAN) return;
      if (tile.ownerTribeId && tile.ownerTribeId !== this.id && !this.atWar.has(tile.ownerTribeId)) return;
      this.territory.add(k);
      tile.ownerTribeId = this.id;
    };

    for (const settlement of this.settlements) {
      const maxRadius = settlement.radius;

      for (const b of settlement.buildings) {
        const r = Math.min(4 + b.level * 2, maxRadius);
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dist(settlement.x, settlement.y, b.x + dx, b.y + dy) > maxRadius) continue;
            claimTile(b.x + dx, b.y + dy);
          }
        }
      }
      if (settlement.buildings.length === 0) {
        for (let dy = -5; dy <= 5; dy++) {
          for (let dx = -5; dx <= 5; dx++) {
            if (dx*dx + dy*dy > 25) continue;
            claimTile(settlement.x + dx, settlement.y + dy);
          }
        }
      }
    }
  }

  _rebuildTerritory(world) {
    for (const k of this.territory) {
      const { x, y } = tileKeyXY(k);
      const tile = world.getTile(x, y);
      if (tile && tile.ownerTribeId === this.id) tile.ownerTribeId = undefined;
    }
    this.territory.clear();
    this._expandTerritory(world);
  }

  _tryFoundVillage(world, early = false) {
    if (this.settlements.length >= 5) return;

    const cap = this.capital;
    if (!early && cap.population < Math.max(6, cap.maxPopulation * 0.75)) return;
    if (early && !this._shouldSeedEarlyVillage()) return;

    const MIN_DIST = early ? 16 : Math.max(20, Math.round(CONFIG.WORLD_W * 0.08));
    const RESOURCE_RADIUS = 18;
    const expansionSites = this._collectCapitalExpansionSites(world, cap, MIN_DIST, early);

    for (let tries = 0; tries < 80; tries++) {
      let tx, ty;
      if (tries < expansionSites.length) {
        tx = expansionSites[tries].x;
        ty = expansionSites[tries].y;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const r     = MIN_DIST + Math.random() * (early ? 20 : 35);
        tx = clamp(Math.round(cap.x + Math.cos(angle) * r), 2, CONFIG.WORLD_W-3);
        ty = clamp(Math.round(cap.y + Math.sin(angle) * r), 2, CONFIG.WORLD_H-3);
      }

      const tile = world.getTile(tx, ty);
      if (!tile || tile.terrain === CONFIG.T.OCEAN || tile.terrain === CONFIG.T.BEACH) continue;
      if (!canUseTile(tile, this.id, TILE_ACTION.BUILD, this.atWar)) continue;
      if (!this._touchesOwnTerritoryInRadius(world, tx, ty, early ? 5 : 7)) continue;

      if (this.settlements.some(s => dist(s.x, s.y, tx, ty) < MIN_DIST)) continue;
      if (this._hasEnemyTerritoryInRadius(world, tx, ty, early ? 8 : 12)) continue;
      if (!this._hasClearSettlementPath(world, cap, { x: tx, y: ty })) continue;

      if (tile.continentId !== undefined && this.homeContinentId >= 0 &&
          tile.continentId !== this.homeContinentId &&
          this.currentGoal !== GOAL.COLONIZE && this.ports.length === 0) continue;

      let richness = 0;
      for (let dy = -RESOURCE_RADIUS; dy <= RESOURCE_RADIUS; dy++) {
        for (let dx = -RESOURCE_RADIUS; dx <= RESOURCE_RADIUS; dx++) {
          if (dx*dx + dy*dy > RESOURCE_RADIUS*RESOURCE_RADIUS) continue;
          const rt = world.getTile(tx+dx, ty+dy);
          if (rt && rt.terrain !== CONFIG.T.OCEAN) {
            richness += (rt.food || 0) + (rt.wood || 0) * 0.5;
          }
        }
      }
      if (richness < 40) continue;

      let tooMuchOverlap = false;
      for (const s of this.settlements) {
        const overlap = this._resourceOverlapRate(tx, ty, s.x, s.y, RESOURCE_RADIUS);
        if (overlap > 0.5) { tooMuchOverlap = true; break; }
      }
      if (tooMuchOverlap) continue;

      const isColony = tile.continentId !== undefined && this.homeContinentId >= 0 &&
                       tile.continentId !== this.homeContinentId;
      const village = new Settlement(this.id, isColony ? 'colony' : 'village', tx, ty);
      village.name = this._generateSettlementName(village.type);
      village._named = true;
      village.foundedTick = this._totalTicks;
      this.settlements.push(village);
      if (early) this._seedVillageMembers(world, village, 3);
      Events.emit('tribe:village_founded', { tribeId: this.id, name: this.name, x: tx, y: ty, villageName: village.name });
      return;
    }
  }

  _collectCapitalExpansionSites(world, cap, minDist, early) {
    const boundary = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const capReach = cap.radius + (early ? 10 : 16);

    for (const key of this.territory) {
      const { x, y } = tileKeyXY(key);
      const dCap = dist(cap.x, cap.y, x, y);
      if (dCap > capReach) continue;

      let edge = false;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        const nt = world.getTile(nx, ny);
        if (!nt || nt.terrain === CONFIG.T.OCEAN || nt.terrain === CONFIG.T.BEACH) continue;
        if (!this.territory.has(tileKey(nx, ny)) && canUseTile(nt, this.id, TILE_ACTION.BUILD, this.atWar)) {
          edge = true;
          break;
        }
      }
      if (edge) boundary.push({ x, y, dCap });
    }

    if (boundary.length === 0) return [];
    boundary.sort(() => Math.random() - 0.5);

    const sites = [];
    const maxBoundary = Math.min(boundary.length, 180);
    for (let i = 0; i < maxBoundary; i++) {
      const b = boundary[i];
      const vx = b.x - cap.x;
      const vy = b.y - cap.y;
      const len = Math.hypot(vx, vy);
      if (len < 1) continue;
      const ux = vx / len;
      const uy = vy / len;

      for (let j = 0; j < 2; j++) {
        const push = 3 + Math.random() * (early ? 10 : 16);
        const side = (Math.random() - 0.5) * (early ? 5 : 8);
        const tx = clamp(Math.round(b.x + ux * push - uy * side), 2, CONFIG.WORLD_W - 3);
        const ty = clamp(Math.round(b.y + uy * push + ux * side), 2, CONFIG.WORLD_H - 3);
        if (dist(cap.x, cap.y, tx, ty) < minDist) continue;

        const tile = world.getTile(tx, ty);
        if (!tile || tile.terrain === CONFIG.T.OCEAN || tile.terrain === CONFIG.T.BEACH) continue;
        if (!canUseTile(tile, this.id, TILE_ACTION.BUILD, this.atWar)) continue;
        if (!this._touchesOwnTerritoryInRadius(world, tx, ty, early ? 5 : 7)) continue;

        const edgeScore = b.dCap + Math.random() * 8;
        sites.push({ x: tx, y: ty, score: edgeScore });
      }
    }

    const seen = new Set();
    return sites
      .sort((a, b) => b.score - a.score)
      .filter(site => {
        const key = tileKey(site.x, site.y);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  _seedVillageMembers(world, village, count) {
    const cap = this.capital;
    const candidates = [...cap.members]
      .map(id => world.entities.get(id))
      .filter(e => e && !e.dead && !e.isSoldier)
      .slice(0, count);

    for (let i = 0; i < candidates.length; i++) {
      const e = candidates[i];
      cap.removeMember(e.id);
      village.addMember(e.id);
      e.settlementId = village.id;
      e.state = 'idle';
      e.target = null;
      e.gatherTarget = null;
      e.buildTarget = null;
      const angle = (i / Math.max(1, candidates.length)) * Math.PI * 2;
      e.x = clamp(village.x + Math.cos(angle) * 2, 0, CONFIG.WORLD_W - 1);
      e.y = clamp(village.y + Math.sin(angle) * 2, 0, CONFIG.WORLD_H - 1);
    }
    if (candidates.length > 0) world.rebuildGrid();
  }

  foundOverseasColony(world, pos) {
    if (!pos || this.population < CONFIG.NAVAL_COLONIZE_MIN_POP) return false;
    if (this.settlements.length >= 7) return false;

    const tile = world.getTile(pos.x, pos.y);
    if (!tile || tile.terrain === CONFIG.T.OCEAN || tile.terrain === CONFIG.T.BEACH) return false;
    if (tile.ownerTribeId && tile.ownerTribeId !== this.id) return false;
    if (this._hasEnemyTerritoryInRadius(world, pos.x, pos.y, 10)) return false;
    if (this.settlements.some(s => dist(s.x, s.y, pos.x, pos.y) < 16)) return false;

    const colony = new Settlement(this.id, 'colony', pos.x, pos.y);
    colony.name = this._generateSettlementName('colony');
    colony._named = true;
    colony.foundedTick = this._totalTicks;
    this.settlements.push(colony);
    this._seedVillageMembers(world, colony, CONFIG.NAVAL_COLONY_SEED || 5);
    this._rebuildTerritory(world);
    Events.emit('tribe:village_founded', {
      tribeId: this.id, name: this.name,
      x: colony.x, y: colony.y, villageName: colony.name,
    });
    return true;
  }

  launchNavalInvasion(world, defender, pos) {
    if (!defender || defender.id === this.id) return false;
    if (this.population < CONFIG.NAVAL_WAR_MIN_POP) return false;

    if (!this.atWar.has(defender.id)) {
      this.declareWar(defender.id);
      defender.setRelation(this.id, CONFIG.DIPLO.WAR);
      defender.atWar.add(this.id);
      defender.currentGoal = GOAL.WAR;
    }
    this.currentGoal = GOAL.WAR;

    const landing = this._findLandingSpot(world, pos.x, pos.y) || pos;
    const candidates = [...this.military, ...this.members]
      .map(id => world.entities.get(id))
      .filter(e => e && !e.dead)
      .filter((e, idx, arr) => arr.findIndex(o => o.id === e.id) === idx)
      .slice(0, CONFIG.NAVAL_INVASION_SIZE || 8);

    for (let i = 0; i < candidates.length; i++) {
      const e = candidates[i];
      e.isSoldier = true;
      this.military.add(e.id);
      e.state = 'fight';
      e.target = null;
      const angle = (i / Math.max(1, candidates.length)) * Math.PI * 2;
      e.x = clamp(landing.x + Math.cos(angle) * 2, 0, CONFIG.WORLD_W - 1);
      e.y = clamp(landing.y + Math.sin(angle) * 2, 0, CONFIG.WORLD_H - 1);
    }
    if (candidates.length > 0) world.rebuildGrid();
    return candidates.length > 0;
  }

  _findLandingSpot(world, cx, cy) {
    for (let r = 0; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const x = clamp(cx + dx, 1, CONFIG.WORLD_W - 2);
          const y = clamp(cy + dy, 1, CONFIG.WORLD_H - 2);
          const tile = world.getTile(x, y);
          if (tile && tile.terrain !== CONFIG.T.OCEAN && tile.terrain !== CONFIG.T.BEACH) {
            return { x, y };
          }
        }
      }
    }
    return null;
  }

  _touchesOwnTerritoryInRadius(world, cx, cy, radius) {
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const tx = cx + dx;
        const ty = cy + dy;
        const tile = world.getTile(tx, ty);
        if (!tile || tile.terrain === CONFIG.T.OCEAN || tile.terrain === CONFIG.T.BEACH) continue;
        if (tile.ownerTribeId === this.id || this.territory.has(tileKey(tx, ty))) return true;
      }
    }
    return false;
  }

  _hasEnemyTerritoryInRadius(world, cx, cy, radius) {
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const tile = world.getTile(cx + dx, cy + dy);
        if (!tile) continue;
        if (tile.ownerTribeId && tile.ownerTribeId !== this.id && !this.atWar.has(tile.ownerTribeId)) {
          return true;
        }
      }
    }
    return false;
  }

  _hasClearSettlementPath(world, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy)));
    let touchedOwnLand = false;

    for (let i = 0; i <= steps; i++) {
      const tx = Math.round(from.x + dx * i / steps);
      const ty = Math.round(from.y + dy * i / steps);
      const tile = world.getTile(tx, ty);
      if (!tile || tile.terrain === CONFIG.T.OCEAN || tile.terrain === CONFIG.T.BEACH) return false;
      if (tile.ownerTribeId && tile.ownerTribeId !== this.id && !this.atWar.has(tile.ownerTribeId)) return false;
      if (tile.ownerTribeId === this.id || this.territory.has(tileKey(tx, ty))) touchedOwnLand = true;
    }

    return touchedOwnLand;
  }

  _cleanupDisconnectedSettlements(world) {
    if (this.settlements.length <= 1) return;
    const cap = this.capital;
    const keep = [];
    let changed = false;

    for (const s of this.settlements) {
      if (s.type === 'capital') {
        keep.push(s);
        continue;
      }

      const centerTile = world.getTile(s.x, s.y);
      const isOverseasColony = s.type === 'colony' &&
        this.homeContinentId >= 0 &&
        centerTile &&
        centerTile.continentId !== this.homeContinentId;
      const blocked = !centerTile ||
        (centerTile.ownerTribeId && centerTile.ownerTribeId !== this.id && !this.atWar.has(centerTile.ownerTribeId)) ||
        this._hasEnemyTerritoryInRadius(world, s.x, s.y, 4) ||
        (!isOverseasColony && !this._hasClearSettlementPath(world, cap, s));

      if (!blocked) {
        keep.push(s);
        continue;
      }

      changed = true;
      this._moveSettlementMembers(world, s, cap);
    }

    if (changed) {
      this.settlements = keep;
      this._rebuildTerritory(world);
      world.rebuildGrid();
    }
  }

  _moveSettlementMembers(world, from, to) {
    const members = [...from.members]
      .map(id => world.entities.get(id))
      .filter(e => e && !e.dead);

    for (let i = 0; i < members.length; i++) {
      const e = members[i];
      from.removeMember(e.id);
      to.addMember(e.id);
      e.settlementId = to.id;
      e.state = 'idle';
      e.target = null;
      e.gatherTarget = null;
      e.buildTarget = null;
      const angle = (i / Math.max(1, members.length)) * Math.PI * 2;
      e.x = clamp(to.x + Math.cos(angle) * 3, 0, CONFIG.WORLD_W - 1);
      e.y = clamp(to.y + Math.sin(angle) * 3, 0, CONFIG.WORLD_H - 1);
    }
  }

  _resourceOverlapRate(x1, y1, x2, y2, r) {
    const d = dist(x1, y1, x2, y2);
    if (d >= r * 2) return 0;
    if (d <= 0) return 1;
    const a = 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d);
    const singleArea = Math.PI * r * r;
    return a / singleArea;
  }

  _tryDeclareWar(world) {
    if (this.atWar.size > 0) return;
    if (!this.hasMilitary) return;
    if (this.population < CONFIG.BORDER_WAR_MIN_POP) return;

    let target = null, bestScore = -Infinity;
    for (const [, t] of world.tribes) {
      if (t.id === this.id) continue;
      if (!t.isKingdom && t.population < CONFIG.MILITIA_MIN_POP) continue;
      if (this.getRelation(t.id) === CONFIG.DIPLO.WAR) continue;
      const d = dist(this.cx, this.cy, t.cx, t.cy);
      if (d > 100) continue;
      const borderBonus = this._territoriesNear(t, 3) ? 70 : 0;
      const score = borderBonus + 1000 / (d + 1) + (this.military.size - t.military.size) * 2;
      if (score > bestScore) { bestScore = score; target = t; }
    }
    if (!target) return;

    this.declareWar(target.id);
    target.setRelation(this.id, CONFIG.DIPLO.WAR);
    target.atWar.add(this.id);
    target.currentGoal = GOAL.WAR;
  }

  _tryBuildPort(world) {
    if (this.ports.length > 0) return;
    const req = CONFIG.PORT_REQ;
    if (this.buildingCount < req.buildings) return;
    if (!this.buildings.some(b => b.level >= req.minLevel)) return;
    if (this.resources.wood < 60 || this.resources.ore < 10) return;

    const coast = this._findCoastTile(world);
    if (coast) {
      this.ports.push(coast);
      this.resources.wood -= 60;
      this.resources.ore  -= 10;
      Events.emit('tribe:port_built', { tribeId: this.id, pos: coast });
    }
  }

  _findCoastTile(world) {
    for (let tries = 0; tries < 50; tries++) {
      const r = 15 + Math.floor(Math.random()*10);
      const x = clamp(Math.round(this.cx + (Math.random()-0.5)*r*2), 1, CONFIG.WORLD_W-2);
      const y = clamp(Math.round(this.cy + (Math.random()-0.5)*r*2), 1, CONFIG.WORLD_H-2);
      if (world.getTile(x, y)?.terrain === CONFIG.T.BEACH) return { x, y };
    }
    return null;
  }

  _tryFormMilitary(world) {
    if (this.population < CONFIG.MILITIA_MIN_POP) return;

    const p = this._pressures || this._computePressures(world);
    const borderTense = p.border > 0 || this._stagnationTicks >= 100 || this.currentGoal === GOAL.WAR;

    let ratio = 0;
    if (this.population >= CONFIG.LARGE_ARMY_MIN_POP) {
      ratio = this.currentGoal === GOAL.WAR ? 0.42 : 0.28;
    } else if (this.population >= CONFIG.REGULAR_ARMY_MIN_POP) {
      ratio = this.currentGoal === GOAL.WAR ? 0.34 : 0.2;
    } else if (borderTense) {
      ratio = this.currentGoal === GOAL.WAR ? 0.22 : 0.12;
    }
    if (ratio <= 0) return;

    const targetSoldiers = Math.floor(this.population * ratio);
    if (this.military.size >= targetSoldiers) return;

    const members = [...this.members].map(id => world.entities.get(id))
      .filter(e => e && !e.dead && !e.isSoldier);
    for (const e of members.slice(0, targetSoldiers - this.military.size)) {
      e.isSoldier = true;
      this.military.add(e.id);
    }
  }

  _checkSovereignty(world) {
    const T = SOVEREIGNTY_THREAT;

    this.sovereigntyThreat = Math.max(0, this.sovereigntyThreat - T.DECAY_PER_TICK);

    const intruders  = [];
    let   newThreat  = 0;

    const cap = this.capital;
    const queryR = cap ? cap.radius + 5 : 30;
    const nearby = world._grid.query(cap?.x ?? this.cx, cap?.y ?? this.cy, queryR, world.entities);

    for (const e of nearby) {
      if (!(e instanceof RaceEntity)) continue;
      if (e.tribeId === this.id || e.dead) continue;
      const k = tileKey(Math.round(e.x), Math.round(e.y));
      if (!this.territory.has(k)) continue;

      const enemyTribe = e.tribeId ? world.tribes.get(e.tribeId) : null;
      if (enemyTribe && this.atWar.has(enemyTribe.id)) continue;

      intruders.push(e);

      switch (e.state) {
        case 'build':      newThreat += T.BUILD; break;
        case 'farm':       newThreat += T.FARM; break;
        case 'gather_wood':
        case 'gather_ore':
        case 'gather_food': newThreat += T.GATHER; break;
        default:           newThreat += T.MILITARY_ENTER; break;
      }
    }

    if (newThreat > 0) {
      this.sovereigntyThreat += newThreat;
      Events.emit('tribe:sovereignty_violated', {
        tribeId: this.id, name: this.name,
        threat: this.sovereigntyThreat, count: intruders.length,
      });
    }

    if (this.sovereigntyThreat >= T.EXPEL_THRESHOLD && intruders.length > 0) {
      const responders = [...this.members]
        .map(id => world.entities.get(id))
        .filter(e => e && !e.dead && e.state !== 'fight')
        .sort((a, b) => (b.isSoldier ? 1 : 0) - (a.isSoldier ? 1 : 0))
        .slice(0, Math.min(intruders.length * 3, 10));

      for (let i = 0; i < responders.length; i++) {
        responders[i].target = intruders[i % intruders.length].id;
        responders[i].state  = 'fight';
      }
      Events.emit('tribe:intruder', { tribeId: this.id, name: this.name, count: intruders.length });
    }

    if (this.sovereigntyThreat >= T.WAR_THRESHOLD &&
        (this.isKingdom || this.population >= CONFIG.BORDER_WAR_MIN_POP) &&
        this.hasMilitary && this.atWar.size === 0) {
      const offenderCount = new Map();
      for (const e of intruders) {
        if (e.tribeId) offenderCount.set(e.tribeId, (offenderCount.get(e.tribeId) || 0) + 1);
      }
      if (offenderCount.size > 0) {
        const [offenderId] = [...offenderCount.entries()].sort((a, b) => b[1] - a[1])[0];
        const offender = world.tribes.get(offenderId);
        if (offender && (offender.isKingdom || offender.population >= CONFIG.MILITIA_MIN_POP)) {
          this.declareWar(offenderId);
          offender.setRelation(this.id, CONFIG.DIPLO.WAR);
          offender.atWar.add(this.id);
          offender.currentGoal = GOAL.WAR;
          this.sovereigntyThreat = 0;
          Events.emit('tribe:war', {
            attacker: this.id, defender: offenderId,
            reason: 'sovereignty',
          });
        }
      }
    }
  }

  getRelation(otherId) { return this.relations.get(otherId) || CONFIG.DIPLO.NEUTRAL; }
  setRelation(otherId, status) { this.relations.set(otherId, status); }

  declareWar(otherId) {
    this.setRelation(otherId, CONFIG.DIPLO.WAR);
    this.atWar.add(otherId);
    Events.emit('tribe:war', { attacker: this.id, defender: otherId });
  }

  endWar(otherId) {
    this.setRelation(otherId, CONFIG.DIPLO.NEUTRAL);
    this.atWar.delete(otherId);
  }

  _generateName() {
    const prefixes = {
      human: ['鐵石','烈火','金风','碧云','霜月','銀川','龙骨','炎龙','重磐','赤旗'],
      elf:   ['翠叶','碧波','晨露','幽林','星辉','月华','绿瞳','花冠','銀枝','碧溪'],
      stone: ['岩壁','鐵锤','巨石','钔鐵','磐础','鐵盾','花岗','熔炉','黑曜','玄鐵'],
      ghost: ['暗影','幽灵','夜幕','虚空','冥魂','鬼火','暮色','冷雾','幽冥','霜骨'],
      orc:   ['血爪','碎骨','鐵牙','黑皮','烈血','怒吼','战斧','蛮力','赤拳','鐵蹄'],
    };
    const suffixes = ['部落','氏族','营地','联盟'];
    const p = prefixes[this.race] || prefixes.human;
    this._namePrefix = p[Math.floor(Math.random() * p.length)];
    return this._namePrefix + suffixes[Math.floor(Math.random() * suffixes.length)];
  }

  _upgradeNameToKingdom() {
    if (this._namePrefix) {
      this.name = this._namePrefix + '王国';
    }
  }

  _generateSettlementName(type) {
    const midParts = {
      human: ['白河','青山','金川','鐵岭','龙泉','碧湖','朝阳','望月'],
      elf:   ['绿叶','銀枝','晨光','翠谷','幽泉','花溪','星浧','月湾'],
      stone: ['鐵矿','磐石','岩峰','黑崖','熔岩','灰谷','铜壁','铸锤'],
      ghost: ['幽域','冥渊','暗泽','霜谷','骨岭','虚渊','鬼窟','暮湖'],
      orc:   ['血原','骨谷','鐵荒','赤坡','怒滩','蛮野','战场','碎岩'],
    };
    const pool = midParts[this.race] || midParts.human;
    const mid = pool[Math.floor(Math.random() * pool.length)];
    if (type === 'capital') return mid + '城';
    if (type === 'colony')  return mid + '港';
    return mid + '村';
  }

  _generateKingdomColor(race) {
    const allColors = Object.values(CONFIG.KINGDOM_COLOR_POOL).flat();

    const usedRGB = [];
    if (typeof _tribeIdCounter !== 'undefined') {
      for (const hex of (CONFIG._usedKingdomColors || [])) {
        const n = parseInt(hex.slice(1), 16);
        usedRGB.push([(n>>16)&0xff, (n>>8)&0xff, n&0xff]);
      }
    }

    const racePool = CONFIG.KINGDOM_COLOR_POOL[race] || CONFIG.KINGDOM_COLOR_POOL.human;
    let best = racePool[0], bestDist = -1;
    for (const hex of racePool) {
      const n = parseInt(hex.slice(1), 16);
      const r = (n>>16)&0xff, g = (n>>8)&0xff, b = n&0xff;
      let minDist = Infinity;
      for (const [ur,ug,ub] of usedRGB) {
        const d = Math.sqrt((r-ur)**2 + (g-ug)**2 + (b-ub)**2);
        if (d < minDist) minDist = d;
      }
      if (usedRGB.length === 0) minDist = 999;
      if (minDist > bestDist) { bestDist = minDist; best = hex; }
    }

    if (!CONFIG._usedKingdomColors) CONFIG._usedKingdomColors = [];
    CONFIG._usedKingdomColors.push(best);
    return best;
  }

  removeBuildings(predicate) {
    for (const s of this.settlements) {
      s.buildings = s.buildings.filter(b => !predicate(b));
    }
  }

  getDashboardInfo() {
    const p = this._pressures;
    return {
      id:         this.id,
      name:       this.name,
      race:       CONFIG.RACE_NAME[this.race] || this.race,
      level:      this.level === 'kingdom' ? '王国' : '部落',
      color:      this.color,
      population: this.population,
      maxPop:     this.maxPopulation,
      military:   this.military.size,
      buildings:  this.buildings.length,
      farms:      this.farmCount,
      settlements:this.settlements.length,
      territory:  this.territory.size,
      resources:  { ...this.resources },
      ports:      this.ports.length,
      atWar:      [...this.atWar],
      relations:  Object.fromEntries(this.relations),
      goal:              this.currentGoal,
      stagnation:        this._stagnationTicks,
      pressures:         { ...p },
      sovereigntyThreat: this.sovereigntyThreat,
    };
  }

  serialize() {
    return {
      id: this.id, race: this.race, name: this.name, color: this.color,
      _namePrefix: this._namePrefix || null,
      sovereigntyThreat: this.sovereigntyThreat,
      cx: this.cx, cy: this.cy,
      level: this.level, resources: this.resources,
      kingId: this.kingId, ports: this.ports,
      members: [...this.members], military: [...this.military],
      territory: [...this.territory],
      relations: [...this.relations], atWar: [...this.atWar],
      ships: this.ships.map(s => ({
        id: s.id, tribeId: s.tribeId, x: s.x, y: s.y,
        crew: [...s.crew], state: s.state, dest: s.dest, mission: s.mission || 'explore', dead: s.dead,
      })),
      homeContinentId:  this.homeContinentId,
      currentGoal:      this.currentGoal,
      _stagnationTicks: this._stagnationTicks,
      _reproBank:       this._reproBank || 0,
      settlements: this.settlements.map(s => ({
        id: s.id, type: s.type, x: s.x, y: s.y, radius: s.radius,
        name: s.name, _named: s._named,
        foundedTick: s.foundedTick || 0,
        buildings: s.buildings, farmTiles: s.farmTiles,
        pendingBuild: s.pendingBuild, buildProgress: s.buildProgress,
        _mineBuilt: s._mineBuilt, members: [...s.members],
      })),
    };
  }
}

class Ship {
  constructor(tribeId, x, y) {
    this.id      = uid();
    this.tribeId = tribeId;
    this.x       = x;
    this.y       = y;
    this.crew    = new Set();
    this.state   = 'docked';
    this.dest    = null;
    this.mission = 'explore';
    this.dead    = false;
  }

  tick(world) {
    if (this.state === 'sailing' && this.dest) {
      if (this._move(world)) {
        this.state = 'exploring';
        Events.emit('ship:arrived', { shipId: this.id, tribeId: this.tribeId, pos: this.dest });
      }
    }
  }

  _move(world) {
    const targetX = this.dest.sailX ?? this.dest.x;
    const targetY = this.dest.sailY ?? this.dest.y;
    const dx = targetX - this.x, dy = targetY - this.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < 1) return true;
    const s = Math.min(0.3, d);
    this.x += (dx/d)*s; this.y += (dy/d)*s;
    return false;
  }
}

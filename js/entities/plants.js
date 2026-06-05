// ============================================================
//  PLANTS.js — 植物实体（树、花、蜂巢、果丛、农田、矿石）
// ============================================================
class PlantEntity extends Entity {
  constructor(type, x, y) {
    super(type, x, y);
    this.lifespan  = CONFIG.LIFESPAN[type] + Math.floor((Math.random()-0.5) * 100);
    this.hp        = 20;
    this.maxHp     = 20;
    this.yield     = CONFIG.PLANT_YIELD[type] || {};
    this.harvestCD = 0;  // 采集冷却（再生）
    this.woodLeft  = this.yield.wood ? this.yield.wood * 3 : 0;  // 树木有有限木材
    this.oreLeft   = this.yield.ore  ? this.yield.ore  * 3 : 0;
    this._spreadCD = Math.floor(Math.random() * 100); // 传播冷却
  }

  tick(world) {
    this.age++;
    if (this.age >= this.lifespan) { this.dead = true; return; }
    if (this.harvestCD > 0) this.harvestCD--;
    if (this._spreadCD > 0) this._spreadCD--;

    // 植物自然传播（低概率）
    if (this._spreadCD === 0 && !this.dead) {
      const spreadProb = this._getSpreadProb(world);
      if (Math.random() < spreadProb) {
        this._trySpread(world);
        this._spreadCD = 80 + Math.floor(Math.random() * 80);
      }
    }

    // 再生资源
    if (this.harvestCD === 0) {
      if (this.yield.wood && this.woodLeft < this.yield.wood * 3) {
        this.woodLeft = Math.min(this.woodLeft + 0.05, this.yield.wood * 3);
      }
      if (this.yield.ore && this.oreLeft < this.yield.ore * 3) {
        this.oreLeft = Math.min(this.oreLeft + 0.01, this.yield.ore * 3);
      }
    }
  }

  _getSpreadProb(world) {
    let base = 0.002;
    // 蝴蝶/蜜蜂在附近时提高传播概率
    const pollinators = world.findNearestEntity(this.x, this.y, 5, e => {
      return e.type === CONFIG.ANIMAL.BUTTERFLY || e.type === CONFIG.ANIMAL.BEE;
    });
    if (pollinators) base += CONFIG.POLLINATOR_BOOST * 0.01;
    return base;
  }

  _trySpread(world) {
    const angle = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * 5;
    const nx = clamp(Math.round(this.x + Math.cos(angle) * r), 0, CONFIG.WORLD_W-1);
    const ny = clamp(Math.round(this.y + Math.sin(angle) * r), 0, CONFIG.WORLD_H-1);
    const tile = world.getTile(nx, ny);
    if (!tile) return;
    if (tile.terrain === CONFIG.T.OCEAN) return;
    // 不能在已有植物的地方生长（太密集）
    const nearby = world.findNearestEntity(nx, ny, 1.5, e => e instanceof PlantEntity);
    if (nearby) return;
    Events.emit('entity:spawn', { type: this.type, x: nx, y: ny });
  }

  // 采集资源（外部调用）
  harvest(res, amount) {
    if (res === 'wood') {
      const got = Math.min(amount, this.woodLeft);
      this.woodLeft -= got;
      if (this.woodLeft <= 0) this.dead = true; // 树被砍倒
      return got;
    }
    if (res === 'ore') {
      const got = Math.min(amount, this.oreLeft);
      this.oreLeft -= got;
      if (this.oreLeft <= 0) {
        this.harvestCD = CONFIG.ORE_REGEN;
        this.oreLeft = this.yield.ore * 3; // 再生
      }
      return got;
    }
    if (res === 'food') {
      return this.yield.food || 0;
    }
    return 0;
  }

  serialize() {
    return { ...super.serialize(), woodLeft: this.woodLeft, oreLeft: this.oreLeft };
  }
}

function createPlantEntity(type, x, y) {
  return new PlantEntity(type, x, y);
}

// 根据地形随机选择植物类型
function getPlantForTerrain(terrain) {
  const plants = CONFIG.TERRAIN_PLANTS[terrain];
  if (!plants || plants.length === 0) return null;
  return plants[Math.floor(Math.random() * plants.length)];
}

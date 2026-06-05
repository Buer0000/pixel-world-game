// ============================================================
//  ANIMALS.js — 动物实体
// ============================================================
class AnimalEntity extends Entity {
  constructor(type, x, y) {
    super(type, x, y);
    this.lifespan = CONFIG.LIFESPAN[type] + Math.floor((Math.random()-0.5) * 40);
    this.speed    = this._initSpeed();
    this.hp       = this._initHp();
    this.maxHp    = this.hp;
    this.attack   = CONFIG.ANIMAL_STRENGTH[type] || 0;
    this.defense  = Math.floor(this.attack * 0.4);
    this.reproCD  = 0;
    this._wanderTick = 0;
    this._wanderTarget = null;
    this._aggro   = null; // 攻击目标ID
  }

  _initSpeed() {
    const sp = { cow:2, sheep:2, bear:2.5, tiger:4, butterfly:3, bee:3, shark:3 };
    return sp[this.type] || 2;
  }

  _initHp() {
    const hp = { cow:20, sheep:12, bear:40, tiger:35, butterfly:3, bee:3, shark:50 };
    return hp[this.type] || 10;
  }

  tick(world) {
    this.age++;
    if (this.age >= this.lifespan) { this.dead = true; return; }
    if (this.reproCD > 0) this.reproCD--;

    switch (this.type) {
      case CONFIG.ANIMAL.BUTTERFLY:
      case CONFIG.ANIMAL.BEE:
        this._pollinatorBehavior(world);
        break;
      case CONFIG.ANIMAL.SHARK:
        this._sharkBehavior(world);
        break;
      case CONFIG.ANIMAL.BEAR:
      case CONFIG.ANIMAL.TIGER:
        this._predatorBehavior(world);
        break;
      default:
        this._herbivoreWander(world);
    }

    // 自然繁衍（草食动物）
    if ([CONFIG.ANIMAL.COW, CONFIG.ANIMAL.SHEEP].includes(this.type)) {
      if (this.reproCD === 0 && Math.random() < 0.003) {
        this.reproCD = 150;
        const nx = clamp(this.x + (Math.random()-0.5)*4, 0, CONFIG.WORLD_W-1);
        const ny = clamp(this.y + (Math.random()-0.5)*4, 0, CONFIG.WORLD_H-1);
        Events.emit('entity:spawn', { type: this.type, x: nx, y: ny });
      }
    }
  }

  _herbivoreWander(world) {
    this._wanderTick++;
    if (!this._wanderTarget || this._wanderTick > 30) {
      this._wanderTick = 0;
      this._wanderTarget = {
        x: clamp(this.x + (Math.random()-0.5)*8, 0, CONFIG.WORLD_W-1),
        y: clamp(this.y + (Math.random()-0.5)*8, 0, CONFIG.WORLD_H-1),
      };
    }
    if (this._wanderTarget) {
      const tile = world.getTile(Math.round(this._wanderTarget.x), Math.round(this._wanderTarget.y));
      if (tile && tile.terrain !== CONFIG.T.OCEAN) {
        this.moveToward(this._wanderTarget.x, this._wanderTarget.y, this.speed * 0.05);
      } else {
        this._wanderTarget = null;
      }
    }
  }

  _pollinatorBehavior(world) {
    // 围绕植物飞行，增加植物繁殖概率（由Simulation处理）
    this._wanderTick++;
    if (!this._wanderTarget || this._wanderTick > 20) {
      this._wanderTick = 0;
      // 寻找附近花朵
      const flower = world.findNearestEntity(this.x, this.y, 15, e => {
        return ['flower','fruit_bush','beehive','crop'].includes(e.type);
      });
      if (flower) {
        this._wanderTarget = { x: flower.x + (Math.random()-0.5)*3, y: flower.y + (Math.random()-0.5)*3 };
      } else {
        this._wanderTarget = {
          x: clamp(this.x + (Math.random()-0.5)*10, 0, CONFIG.WORLD_W-1),
          y: clamp(this.y + (Math.random()-0.5)*10, 0, CONFIG.WORLD_H-1),
        };
      }
    }
    if (this._wanderTarget) {
      this.moveToward(this._wanderTarget.x, this._wanderTarget.y, this.speed * 0.08);
    }
  }

  _sharkBehavior(world) {
    // 待在海洋，攻击游泳中的人
    const tile = world.getTile(Math.round(this.x), Math.round(this.y));
    if (!tile || tile.terrain !== CONFIG.T.OCEAN) {
      // 移回海洋
      const ocean = world.findNearestTerrain(this.x, this.y, CONFIG.T.OCEAN);
      if (ocean) this.moveToward(ocean.x, ocean.y, this.speed * 0.1);
      return;
    }
    // 随机游动
    this._wanderTick++;
    if (!this._wanderTarget || this._wanderTick > 25) {
      this._wanderTick = 0;
      this._wanderTarget = {
        x: clamp(this.x + (Math.random()-0.5)*12, 0, CONFIG.WORLD_W-1),
        y: clamp(this.y + (Math.random()-0.5)*12, 0, CONFIG.WORLD_H-1),
      };
    }
    if (this._wanderTarget) {
      this.moveToward(this._wanderTarget.x, this._wanderTarget.y, this.speed * 0.07);
    }
    // 攻击附近游泳人员（小概率）
    if (Math.random() < 0.05) {
      const prey = world.findNearestEntity(this.x, this.y, 3, e => {
        return e instanceof RaceEntity && e.shipId === null;
      });
      if (prey && world.getTile(Math.round(prey.x), Math.round(prey.y))?.terrain === CONFIG.T.OCEAN) {
        prey.damage(this.attack);
        Events.emit('entity:attacked', { attacker: this.id, target: prey.id });
      }
    }
  }

  _predatorBehavior(world) {
    // 有aggro目标则追击
    if (this._aggro) {
      const target = world.entities.get(this._aggro);
      if (!target || target.dead) {
        this._aggro = null;
      } else {
        const arrived = this.moveToward(target.x, target.y, this.speed * 0.1);
        if (arrived || dist(this.x, this.y, target.x, target.y) < 1.5) {
          const dmg = Math.max(1, this.attack - (target.defense || 0) * 0.3);
          target.damage(dmg * 0.3);
        }
        return;
      }
    }
    // 随机游走，小概率攻击附近人类
    this._herbivoreWander(world);
    if (Math.random() < 0.02) {
      const prey = world.findNearestEntity(this.x, this.y, 5, e => {
        if (!(e instanceof RaceEntity)) return false;
        // 精灵在附近且有精灵特性，不主动攻击
        if (typeof isElfFriendlyToAnimal === 'function' && isElfFriendlyToAnimal(e, this)) return false;
        return true;
      });
      if (prey) this._aggro = prey.id;
    }
  }

  serialize() {
    return { ...super.serialize(), lifespan: this.lifespan, speed: this.speed };
  }
}

function createAnimalEntity(type, x, y) {
  return new AnimalEntity(type, x, y);
}

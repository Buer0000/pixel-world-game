// ============================================================
//  ENTITY.js — 实体基类
// ============================================================
class Entity {
  constructor(type, x, y) {
    this.id      = uid();
    this.type    = type;
    this.x       = x;        // 世界格子坐标（浮点）
    this.y       = y;
    this.age     = 0;
    this.hp      = 10;
    this.maxHp   = 10;
    this.tribeId = null;     // 所属部落ID（null=野生）
    this.state   = 'idle';
    this.target  = null;     // 目标实体ID 或 {x,y}
    this.dead    = false;
    this.tickAge = 0;        // 距上次行为的tick数（用于冷却）
  }

  // 移动向目标方向（每tick调用）
  moveToward(tx, ty, spd) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < 0.5) return true; // 到达
    const s = Math.min(spd, d);
    this.x += (dx / d) * s;
    this.y += (dy / d) * s;
    return d <= spd;
  }

  // 受到伤害
  damage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) this.dead = true;
  }

  // 检查是否到达目标
  isAt(tx, ty, tol = 1.0) {
    return dist(this.x, this.y, tx, ty) < tol;
  }

  // 序列化（存档用）
  serialize() {
    return {
      id: this.id, type: this.type, x: this.x, y: this.y,
      age: this.age, hp: this.hp, maxHp: this.maxHp,
      tribeId: this.tribeId, state: this.state,
    };
  }

  static deserialize(data) {
    const e = new Entity(data.type, data.x, data.y);
    Object.assign(e, data);
    return e;
  }
}

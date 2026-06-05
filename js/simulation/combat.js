// ============================================================
//  COMBAT.js — 战斗系统（实体间 & 部落间）
// ============================================================
class CombatSystem {
  constructor(world) {
    this.world = world;
    this._battles = new Map(); // battleId → Battle
  }

  tick() {
    // 处理进行中的战争
    for (const tribe of this.world.tribes.values()) {
      if (tribe.atWar.size === 0) continue;
      for (const enemyId of tribe.atWar) {
        const enemy = this.world.tribes.get(enemyId);
        if (!enemy) { tribe.endWar(enemyId); continue; }
        this._engageTroops(tribe, enemy);
      }
    }

    // AI 自动战争触发
    if (Math.random() < 0.002) {
      this._checkWarTrigger();
    }
  }

  // 驱使双方士兵朝对方领土移动和交战
  _engageTroops(attTribe, defTribe) {
    const attackers = [...attTribe.military]
      .map(id => this.world.entities.get(id))
      .filter(e => e && !e.dead);
    if (attackers.length === 0) return;

    // 找最近的敌军或敌建筑
    const defCenter = { x: defTribe.cx, y: defTribe.cy };
    for (const soldier of attackers) {
      // 找最近敌军
      const enemySoldier = this.world.findNearestEntity(soldier.x, soldier.y, 30, e => {
        return e instanceof RaceEntity && e.tribeId === defTribe.id;
      });
      if (enemySoldier) {
        soldier.target = enemySoldier.id;
        soldier.state  = 'fight';
      } else {
        // 向敌方中心移动
        soldier.moveToward(defCenter.x, defCenter.y, soldier.speed * 0.08);
      }
    }

    // 检查是否消灭对方
    if (defTribe.members.size === 0) {
      this._annexTribe(attTribe, defTribe);
    }
  }

  _checkWarTrigger() {
    // 战争由 Tribe._tryDeclareWar() 在 WAR 战略阶段触发
    // combat.js 不再直接触发战争，避免绕过国家战略AI
  }

  _territoriesAdjacent(a, b) {
    const dist2Val = dist2(a.cx, a.cy, b.cx, b.cy);
    return dist2Val < (a.territory.size + b.territory.size) * 0.5;
  }

  _annexTribe(winner, loser) {
    Events.emit('tribe:defeated', {
      winner: winner.id, loser: loser.id,
      winnerName: winner.name, loserName: loser.name,
    });
    winner.endWar(loser.id);
    // 胜利者吸收领土，同步 tile.ownerTribeId
    for (const key of loser.territory) {
      winner.territory.add(key);
      const { x, y } = tileKeyXY(key);
      const tile = this.world.getTile(x, y);
      if (tile) tile.ownerTribeId = winner.id;
    }
    // 胜利者获得部分资源
    winner.resources.wood += Math.floor(loser.resources.wood * 0.5);
    winner.resources.ore  += Math.floor(loser.resources.ore  * 0.5);
    winner.resources.food += Math.floor(loser.resources.food * 0.5);
    // 删除败方部落
    this.world.tribes.delete(loser.id);
    // 败方成员死仫（一半逃走）
    let i = 0;
    for (const mid of loser.members) {
      const e = this.world.entities.get(mid);
      if (e) {
        if (i % 2 === 0) e.dead = true;
        else { e.tribeId = null; e.state = 'idle'; }
      }
      i++;
    }
  }

  // 玩家宣战
  playerDeclareWar(attackerTribeId, defenderTribeId) {
    const att = this.world.tribes.get(attackerTribeId);
    const def = this.world.tribes.get(defenderTribeId);
    if (!att || !def) return false;
    if (!att.hasMilitary) return false;
    att.declareWar(defenderTribeId);
    def.setRelation(attackerTribeId, CONFIG.DIPLO.WAR);
    def.atWar.add(attackerTribeId);
    return true;
  }
}

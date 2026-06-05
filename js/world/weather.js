// ============================================================
//  WEATHER.js — 天气系统
// ============================================================
class WeatherSystem {
  constructor(world) {
    this.world = world;
    this.current = CONFIG.WEATHER.CLEAR;
    this.duration = 0;        // 剩余持续 ticks
    this.position = null;     // 极端天气位置 {x,y}
    this.radius = 0;
    this._normalTimer = 0;
    this._effects = [];       // 当前 tick 效果列表（供渲染读取）
  }

  tick() {
    this._effects = [];

    // 普通天气进程
    if (this.duration > 0) {
      this.duration--;
      this._applyWeatherEffect();
      if (this.duration === 0) {
        this._endWeather();
      }
    } else {
      // 随机触发新天气
      this._normalTimer++;
      if (this._normalTimer > 30) {
        this._normalTimer = 0;
        this._randomWeather();
      }
      // 极小概率极端天气
      if (Math.random() < CONFIG.WEATHER_EXTREME_CHANCE) {
        this._triggerExtreme();
      }
    }
  }

  _randomWeather() {
    const r = Math.random();
    if (r < 0.5) {
      this.current = CONFIG.WEATHER.CLEAR;
      this.duration = CONFIG.WEATHER_DURATION.clear;
    } else if (r < 0.85) {
      this.current = CONFIG.WEATHER.RAIN;
      this.duration = CONFIG.WEATHER_DURATION.rain;
    } else {
      this.current = CONFIG.WEATHER.STORM;
      this.duration = CONFIG.WEATHER_DURATION.storm;
    }
    Events.emit('weather:change', { type: this.current });
  }

  _triggerExtreme() {
    const extremes = [CONFIG.WEATHER.LIGHTNING, CONFIG.WEATHER.TORNADO];
    this.current = extremes[Math.floor(Math.random() * extremes.length)];
    this.duration = CONFIG.WEATHER_DURATION[this.current];
    this.position = {
      x: Math.floor(Math.random() * CONFIG.WORLD_W),
      y: Math.floor(Math.random() * CONFIG.WORLD_H),
    };
    this.radius = this.current === CONFIG.WEATHER.TORNADO ? 8 : 3;
    Events.emit('weather:extreme', { type: this.current, pos: this.position });
  }

  // 玩家手动放置天气事件
  placeWeather(type, x, y) {
    this.current = type;
    this.duration = CONFIG.WEATHER_DURATION[type] || 10;
    this.position = { x, y };
    this.radius = type === CONFIG.WEATHER.TORNADO ? 10 : 5;
    Events.emit('weather:extreme', { type, pos: this.position });
  }

  // 玩家放置火山
  placeVolcano(x, y) {
    this.position = { x, y };
    this.radius = 12;
    this._eruption(x, y, 12);
    Events.emit('weather:extreme', { type: 'volcano', pos: { x, y } });
  }

  _applyWeatherEffect() {
    if (!this.position) return;
    const { x, y } = this.position;
    const { LIGHTNING, TORNADO } = CONFIG.WEATHER;

    if (this.current === LIGHTNING) {
      // 每tick随机击中周围格子
      if (Math.random() < 0.3) {
        const tx = x + Math.floor((Math.random()-0.5) * this.radius * 2);
        const ty = y + Math.floor((Math.random()-0.5) * this.radius * 2);
        this._lightningStrike(tx, ty);
      }
    } else if (this.current === TORNADO) {
      // 龙卷风缓慢移动，摧毁路径上的实体
      this.position.x += Math.floor((Math.random()-0.5) * 3);
      this.position.y += Math.floor((Math.random()-0.5) * 3);
      this._tornadoDamage(this.position.x, this.position.y);
    }
  }

  _lightningStrike(x, y) {
    this._effects.push({ type: 'lightning', x, y });
    Events.emit('weather:damage', { type: 'lightning', x, y, radius: 1 });
  }

  _tornadoDamage(x, y) {
    this._effects.push({ type: 'tornado', x, y, radius: this.radius });
    Events.emit('weather:damage', { type: 'tornado', x, y, radius: this.radius });
  }

  _eruption(x, y, radius) {
    for (let r = 0; r < 3; r++) {
      setTimeout(() => {
        this._effects.push({ type: 'volcano', x, y, radius: radius + r * 3 });
        Events.emit('weather:damage', { type: 'volcano', x, y, radius: radius + r * 3 });
      }, r * 500);
    }
  }

  _endWeather() {
    this.position = null;
    this.current = CONFIG.WEATHER.CLEAR;
    this.duration = CONFIG.WEATHER_DURATION.clear;
  }

  getStatus() {
    const names = {
      clear:'晴朗', rain:'降雨', storm:'风暴',
      lightning:'雷击', tornado:'龙卷风',
    };
    return {
      name: names[this.current] || this.current,
      duration: this.duration,
      isExtreme: [CONFIG.WEATHER.LIGHTNING, CONFIG.WEATHER.TORNADO].includes(this.current),
    };
  }
}

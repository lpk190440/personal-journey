/**
 * 个人智能操作系统 — 统一数据存储
 * 
 * 按模块命名空间隔离数据，支持无限扩展。
 * 所有现有数据通过此层读写，保持零破坏。
 */

const OS = window.OS || {};

OS.store = {
  /** 主存储 key */
  MAIN_KEY: 'personal_journey_os',

  /** 内存缓存 */
  _cache: {},

  /** 已注册的 dataKey 集合 */
  _registeredKeys: new Set(),

  /**
   * 初始化：加载已保存的数据
   */
  init() {
    try {
      const raw = localStorage.getItem(this.MAIN_KEY);
      this._cache = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('[OS] 数据加载失败，使用空数据', e);
      this._cache = {};
    }
    // 确保所有已注册模块的 dataKey 存在
    OS.registry.getActive().forEach(mod => {
      mod.dataKeys.forEach(key => {
        this._registeredKeys.add(key);
        if (!(key in this._cache)) this._cache[key] = this._defaultValue(mod, key);
      });
    });
    return this;
  },

  /** 模块数据默认值 */
  _defaultValue(mod, key) {
    // 特殊处理已知数据类型
    if (key === 'pomodoros') return [];
    if (key === 'plantedTrees') return [];
    if (key === 'tasks') return [];
    if (key === 'goals') return [];
    if (key === 'checkins') return [];
    if (key === 'habits') return [];
    if (key === 'journals') return [];
    if (key === 'contacts') return [];
    if (key === 'memoryItems') return [];
    if (key === 'visions') return [];
    if (key === 'objectives') return [];
    if (key === 'reviews') return [];
    if (key === 'modelCards') return [];
    if (key === 'modelCases') return [];
    return mod.meta?.defaultValue ?? {};
  },

  /**
   * 读取模块数据
   */
  getModuleData(modId) {
    const mod = OS.registry.get(modId);
    if (!mod) return null;
    const result = {};
    mod.dataKeys.forEach(key => {
      result[key] = this._cache[key] ?? this._defaultValue(mod, key);
    });
    return result;
  },

  /**
   * 读取单个 dataKey 的数据
   */
  get(key) {
    return this._cache[key] ?? null;
  },

  /**
   * 写入数据
   */
  set(key, value) {
    this._cache[key] = value;
    this._save();
  },

  /**
   * 保存到 localStorage（防抖）
   */
  _saveTimer: null,
  _save() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(this.MAIN_KEY, JSON.stringify(this._cache));
      } catch (e) {
        console.error('[OS] 数据保存失败', e);
      }
    }, 200);
  },

  /** 立即保存 */
  saveNow() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    try {
      localStorage.setItem(this.MAIN_KEY, JSON.stringify(this._cache));
    } catch (e) {
      console.error('[OS] 数据保存失败', e);
    }
  },

  /**
   * 清空所有数据
   */
  clearAll() {
    this._cache = {};
    localStorage.removeItem(this.MAIN_KEY);
  },

  /**
   * 导出数据（JSON）
   */
  export() {
    return JSON.stringify(this._cache, null, 2);
  },

  /**
   * 导入数据（JSON）
   */
  import(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      this._cache = data;
      this.saveNow();
      return true;
    } catch (e) {
      console.error('[OS] 数据导入失败', e);
      return false;
    }
  },
};

window.OS = OS;
console.log('[OS] 数据存储已就绪');

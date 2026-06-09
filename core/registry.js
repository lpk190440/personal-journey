/**
 * 个人智能操作系统 — 模块注册中心
 * 
 * 所有模块通过此注册中心接入系统。
 * 新增模块只需调用 OS.register({...})，无需修改任何框架代码。
 */

const OS = window.OS || {};

// ===== 模块注册表 =====
OS.registry = {
  modules: new Map(),   // id → module 定义
  layerOrder: [],       // 自定义分组排序

  /**
   * 注册新模块
   * @param {Object} mod - 模块定义
   * @param {string} mod.id - 唯一标识
   * @param {string} mod.name - 显示名称
   * @param {string} mod.icon - emoji 图标
   * @param {string} mod.layer - 所属分组（可自定义，如 'action', 'growth', 'dev'）
   * @param {string} mod.layerName - 分组显示名
   * @param {number} mod.order - 排序权重
   * @param {string} mod.route - 路由路径
   * @param {string[]} mod.dataKeys - localStorage 数据 key 列表
   * @param {string[]} mod.dependencies - 依赖模块 ID 列表
   * @param {string} mod.status - 'active' | 'inactive' | 'coming-soon'
   * @param {Object} mod.meta - 自定义扩展字段
   */
  register(mod) {
    if (!mod.id) { console.error('[OS] 模块注册失败：缺少 id'); return; }
    this.modules.set(mod.id, {
      id: mod.id,
      name: mod.name || mod.id,
      icon: mod.icon || '📦',
      layer: mod.layer || 'other',
      layerName: mod.layerName || '其他',
      order: mod.order || 99,
      route: mod.route || '/' + mod.id,
      dataKeys: mod.dataKeys || [mod.id],
      dependencies: mod.dependencies || [],
      status: mod.status || 'active',
      meta: mod.meta || {},
      registeredAt: new Date().toISOString(),
    });
    console.log(`[OS] 模块已注册: ${mod.icon} ${mod.name} (${mod.id})`);
    return this;
  },

  /**
   * 获取模块定义
   */
  get(id) {
    return this.modules.get(id);
  },

  /**
   * 获取所有活跃模块
   */
  getActive() {
    return [...this.modules.values()].filter(m => m.status === 'active');
  },

  /**
   * 按 layer 分组获取模块（用于主界面渲染）
   * @returns {Object} { layerName: [modules] }
   */
  getGroupedByLayer() {
    const groups = {};
    const activeModules = this.getActive();
    // 按 layer 分组
    for (const mod of activeModules) {
      const key = mod.layer;
      if (!groups[key]) groups[key] = { name: mod.layerName || key, modules: [] };
      groups[key].modules.push(mod);
    }
    // 每组内按 order 排序
    for (const key in groups) {
      groups[key].modules.sort((a, b) => a.order - b.order);
    }
    return groups;
  },

  /**
   * 检查模块是否可用（依赖已安装且活跃）
   */
  isAvailable(id) {
    const mod = this.get(id);
    if (!mod || mod.status !== 'active') return false;
    return mod.dependencies.every(depId => this.isAvailable(depId));
  },

  /**
   * 获取模块的依赖链
   */
  getDependencyChain(id) {
    const chain = [];
    const visited = new Set();
    const dfs = (mid) => {
      if (visited.has(mid)) return;
      visited.add(mid);
      const m = this.get(mid);
      if (m) {
        chain.push(mid);
        m.dependencies.forEach(dfs);
      }
    };
    dfs(id);
    return chain;
  },

  /**
   * 列出所有 layer 分组（用于导航）
   */
  listLayers() {
    const layers = new Set();
    this.getActive().forEach(m => layers.add(m.layer));
    return [...layers];
  },
};

window.OS = OS;
console.log('[OS] 注册中心已就绪');

/**
 * 个人智能操作系统 — 知识图谱引擎（双向链接）
 * 
 * 独立于模块数据，提供节点注册和关系查询能力。
 * 所有链接数据存储在 graph 命名空间下。
 */

const OS = window.OS || {};

OS.graph = {
  DATA_KEY: 'os_graph',

  /** 图谱数据 */
  _data: { nodes: {}, edges: [] },

  /**
   * 初始化
   */
  init() {
    const saved = OS.store?.get?.(this.DATA_KEY);
    if (saved) {
      this._data = saved;
    } else {
      this._data = { nodes: {}, edges: [] };
      this._save();
    }
    return this;
  },

  /**
   * 注册节点
   * @param {string} id - 节点ID（如 't1', 'g1', 'v1'）
   * @param {string} type - 节点类型（如 'task', 'goal', 'vision', 'habit', 'journal', 'model'）
   * @param {string} label - 显示标签
   * @param {string} moduleId - 所属模块ID
   */
  registerNode(id, type, label, moduleId) {
    this._data.nodes[id] = {
      id, type, label, moduleId,
      createdAt: this._data.nodes[id]?.createdAt || new Date().toISOString(),
    };
    this._save();
    return this;
  },

  /**
   * 创建双向链接
   */
  link(sourceId, targetId, type = 'related') {
    // 确保节点存在
    if (!this._data.nodes[sourceId]) this.registerNode(sourceId, 'unknown', sourceId, 'system');
    if (!this._data.nodes[targetId]) this.registerNode(targetId, 'unknown', targetId, 'system');

    const edgeKey = `${sourceId}→${targetId}`;
    const existing = this._data.edges.find(e => e.key === edgeKey);
    if (existing) {
      existing.strength = (existing.strength || 1) + 1;
    } else {
      this._data.edges.push({ key: edgeKey, from: sourceId, to: targetId, type, strength: 1 });
    }
    this._save();
    return this;
  },

  /**
   * 解除链接
   */
  unlink(sourceId, targetId) {
    const edgeKey = `${sourceId}→${targetId}`;
    this._data.edges = this._data.edges.filter(e => e.key !== edgeKey);
    // 也删除反向
    const revKey = `${targetId}→${sourceId}`;
    this._data.edges = this._data.edges.filter(e => e.key !== revKey);
    this._save();
    return this;
  },

  /**
   * 查询某节点的所有关联节点
   */
  getLinked(nodeId) {
    const linked = new Set();
    this._data.edges.forEach(e => {
      if (e.from === nodeId) linked.add(e.to);
      if (e.to === nodeId) linked.add(e.from);
    });
    return [...linked].map(id => this._data.nodes[id]).filter(Boolean);
  },

  /**
   * 向上追溯（从叶子节点找根节点）
   */
  traceUp(nodeId, maxDepth = 5) {
    const path = [];
    const visited = new Set();
    let current = nodeId;
    while (current && path.length < maxDepth && !visited.has(current)) {
      visited.add(current);
      const node = this._data.nodes[current];
      if (node) path.push(node);
      // 找指向当前节点的边
      const parentEdge = this._data.edges.find(e => e.to === current);
      current = parentEdge ? parentEdge.from : null;
    }
    return path;
  },

  /**
   * 向下展开（从根节点找所有叶子）
   */
  traceDown(nodeId, maxDepth = 5) {
    const result = [];
    const visited = new Set();
    const queue = [{ id: nodeId, depth: 0 }];
    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);
      const node = this._data.nodes[id];
      if (node && id !== nodeId) result.push(node);
      // 找从当前节点出发的边
      this._data.edges.filter(e => e.from === id).forEach(e => {
        queue.push({ id: e.to, depth: depth + 1 });
      });
    }
    return result;
  },

  /**
   * 获取图谱摘要（节点数、边数）
   */
  summary() {
    return {
      nodeCount: Object.keys(this._data.nodes).length,
      edgeCount: this._data.edges.length,
    };
  },

  /**
   * 导出图谱数据（用于可视化）
   */
  exportForViz() {
    return {
      nodes: Object.values(this._data.nodes),
      edges: this._data.edges.map(e => ({ from: e.from, to: e.to, type: e.type })),
    };
  },

  _save() {
    if (OS.store) {
      OS.store.set(this.DATA_KEY, this._data);
    }
  },
};

window.OS = OS;
console.log('[OS] 知识图谱引擎已就绪');

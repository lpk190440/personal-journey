/**
 * 人生规划模块 — 愿景/OKR/复盘/看板
 * 集成 Obsidian 风格的双向链接 + PDF 五层架构的规划理念
 */

const Lifeplan = {
  // 模块数据
  visions: [],      // [{id, title, description, yearTarget, status, color, linkedGoals[]}]
  objectives: [],   // [{id, title, parentVision, quarter, keyResults[], status, linkedGoals[], linkedHabits[], deadline}]
  reviews: [],      // [{id, type, period, date, sections[], mood, linkedObjectives[]}]

  // UI 状态
  currentTab: 'kanban',   // 'vision' | 'objectives' | 'review' | 'kanban' | 'graph'
  showForm: false,
  editingId: null,
  formData: {},

  /**
   * 初始化：从 store 加载数据
   */
  init() {
    const data = OS.store.getModuleData('lifeplan');
    this.visions = data.visions || [];
    this.objectives = data.objectives || [];
    this.reviews = data.reviews || [];

    // 注册到图谱
    this.visions.forEach(v => OS.graph.registerNode(v.id, 'vision', v.title, 'lifeplan'));
    this.objectives.forEach(o => OS.graph.registerNode(o.id, 'objective', o.title, 'lifeplan'));
    this.reviews.forEach(r => OS.graph.registerNode(r.id, 'review', r.type, 'lifeplan'));

    return this;
  },

  /** 保存 */
  save() {
    OS.store.set('visions', this.visions);
    OS.store.set('objectives', this.objectives);
    OS.store.set('reviews', this.reviews);
  },

  // ===== 愿景管理 =====
  addVision(data) {
    const v = {
      id: 'v' + Date.now().toString(36),
      title: data.title || '',
      description: data.description || '',
      yearTarget: data.yearTarget || new Date().getFullYear() + 5,
      status: 'active',
      color: data.color || '#5B8C9B',
      linkedGoals: data.linkedGoals || [],
      createdAt: new Date().toISOString(),
    };
    this.visions.push(v);
    OS.graph.registerNode(v.id, 'vision', v.title, 'lifeplan');
    // 建立与goals的链接
    v.linkedGoals.forEach(gid => OS.graph.link(v.id, gid, 'vision→goal'));
    this.save();
    return v;
  },

  updateVision(id, data) {
    const v = this.visions.find(v => v.id === id);
    if (!v) return;
    Object.assign(v, data);
    OS.graph.registerNode(v.id, 'vision', v.title, 'lifeplan');
    this.save();
  },

  deleteVision(id) {
    this.visions = this.visions.filter(v => v.id !== id);
    this.objectives = this.objectives.filter(o => o.parentVision !== id);
    this.save();
  },

  // ===== OKR 目标管理 =====
  addObjective(data) {
    const o = {
      id: 'o' + Date.now().toString(36),
      title: data.title || '',
      parentVision: data.parentVision || '',
      quarter: data.quarter || this._currentQuarter(),
      keyResults: data.keyResults || [],
      status: 'in-progress',
      linkedGoals: data.linkedGoals || [],
      linkedHabits: data.linkedHabits || [],
      deadline: data.deadline || '',
      createdAt: new Date().toISOString(),
    };
    this.objectives.push(o);
    OS.graph.registerNode(o.id, 'objective', o.title, 'lifeplan');
    if (o.parentVision) OS.graph.link(o.id, o.parentVision, 'objective→vision');
    o.linkedGoals.forEach(gid => OS.graph.link(o.id, gid, 'objective→goal'));
    o.linkedHabits.forEach(hid => OS.graph.link(o.id, hid, 'objective→habit'));
    this.save();
    return o;
  },

  updateObjective(id, data) {
    const o = this.objectives.find(o => o.id === id);
    if (!o) return;
    Object.assign(o, data);
    OS.graph.registerNode(o.id, 'objective', o.title, 'lifeplan');
    this.save();
  },

  deleteObjective(id) {
    this.objectives = this.objectives.filter(o => o.id !== id);
    this.save();
  },

  /** OKR 进度计算 */
  getObjectiveProgress(obj) {
    if (!obj.keyResults || obj.keyResults.length === 0) return 0;
    const total = obj.keyResults.reduce((s, kr) => s + (kr.progress || 0), 0);
    return Math.round(total / obj.keyResults.length * 100);
  },

  /** 关联 goals 的自动进度聚合 */
  getAutoProgress(obj) {
    const allGoals = OS.store.get('goals') || [];
    const linkedGoals = allGoals.filter(g => obj.linkedGoals.includes(g.id));
    if (linkedGoals.length === 0) return null;
    // 简单平均（可扩展为加权）
    const tasks = OS.store.get('tasks') || [];
    let totalTasks = 0, doneTasks = 0;
    linkedGoals.forEach(g => {
      const linkedTasks = tasks.filter(t => t.goalId === g.id);
      totalTasks += linkedTasks.length;
      doneTasks += linkedTasks.filter(t => t.completed).length;
    });
    return totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;
  },

  // ===== 复盘管理 =====
  addReview(data) {
    const r = {
      id: 'r' + Date.now().toString(36),
      type: data.type || 'weekly',
      period: data.period || this._currentWeek(),
      date: new Date().toISOString().slice(0, 10),
      sections: data.sections || [
        { title: '本周成就', content: '' },
        { title: '不足与改进', content: '' },
        { title: '下周重点', content: '' },
      ],
      mood: data.mood || 3,
      linkedObjectives: data.linkedObjectives || [],
      createdAt: new Date().toISOString(),
    };
    this.reviews.push(r);
    OS.graph.registerNode(r.id, 'review', r.type, 'lifeplan');
    r.linkedObjectives.forEach(oid => OS.graph.link(r.id, oid, 'review→objective'));
    this.save();
    return r;
  },

  deleteReview(id) {
    this.reviews = this.reviews.filter(r => r.id !== id);
    this.save();
  },

  // ===== 看板数据聚合 =====
  getKanbanData() {
    const activeVisions = this.visions.filter(v => v.status === 'active');
    const currentQuarter = this._currentQuarter();
    const quarterObjectives = this.objectives.filter(o => o.quarter === currentQuarter);

    return {
      totalVisions: activeVisions.length,
      totalObjectives: quarterObjectives.length,
      overallProgress: quarterObjectives.length > 0
        ? Math.round(quarterObjectives.reduce((s, o) => s + this.getObjectiveProgress(o), 0) / quarterObjectives.length)
        : 0,
      visions: activeVisions.map(v => ({
        ...v,
        objectives: this.objectives.filter(o => o.parentVision === v.id),
        progress: this._calcVisionProgress(v.id),
      })),
      thisWeekReviews: this.reviews.filter(r => r.type === 'weekly').slice(-2),
    };
  },

  _calcVisionProgress(visionId) {
    const objs = this.objectives.filter(o => o.parentVision === visionId);
    if (objs.length === 0) return 0;
    return Math.round(objs.reduce((s, o) => s + this.getObjectiveProgress(o), 0) / objs.length);
  },

  _currentQuarter() {
    const d = new Date();
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `${d.getFullYear()}-Q${q}`;
  },

  _currentWeek() {
    const d = new Date();
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay() + 1);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  },
};

// 注册到全局
window.Lifeplan = Lifeplan;
console.log('[OS] 人生规划模块已加载');

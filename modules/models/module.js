/**
 * 思维模型模块 — 6套世界解释器
 * 每套模型包含：核心概念卡片 + 应用案例库 + 决策检查清单
 */

const Models = {
  // 6套预置模型
  modelDefinitions: [
    {
      id: 'intelligence', name: '智能模型', icon: '🤖', color: '#5B8C9B',
      description: 'AGI时代的人类定位与能力进化',
      keyConcepts: ['人机协作', '认知外包', '元学习', 'T型能力'],
      checklists: ['这个任务AI能比我做得更好吗？', '我的独特价值是什么？', '这个技能5年后还会存在吗？'],
    },
    {
      id: 'evolution', name: '进化模型', icon: '🧬', color: '#4A7C59',
      description: '自然选择思维在个人成长中的应用',
      keyConcepts: ['变异→选择→保留', '小批量试错', '反脆弱', '生态位'],
      checklists: ['我在做足够多的"变异"尝试吗？', '最近一次"失败"教会了我什么？', '我的"生态位"是什么？'],
    },
    {
      id: 'market', name: '市场模型', icon: '📈', color: '#3B7DD8',
      description: '供需、护城河与价值创造',
      keyConcepts: ['供给需求', '护城河', '网络效应', '边际成本'],
      checklists: ['我的"护城河"在加深吗？', '我在创造稀缺价值吗？', '规模效应对我有利吗？'],
    },
    {
      id: 'social', name: '社会模型', icon: '👥', color: '#7B6FB5',
      description: '社会阶层、关系网络与影响力',
      keyConcepts: ['社会资本', '弱连接', '邓巴数', '声望经济'],
      checklists: ['我在扩展弱连接吗？', '我的社会资本在增长吗？', '谁是我最重要的5个人？'],
    },
    {
      id: 'risk', name: '风险模型', icon: '⚠️', color: '#D4786E',
      description: '黑天鹅、灰犀牛与反脆弱',
      keyConcepts: ['黑天鹅', '灰犀牛', '冗余设计', '杠铃策略'],
      checklists: ['最坏情况是什么？我能承受吗？', '我有Plan B吗？', '我的系统是脆弱的还是反脆弱的？'],
    },
    {
      id: 'time', name: '时间模型', icon: '⏰', color: '#c9a84c',
      description: '复利效应、帕金森定律与时间杠杆',
      keyConcepts: ['复利', '帕金森定律', '80/20法则', '时间杠杆'],
      checklists: ['这个投入有复利效应吗？', '我在用时间换钱，还是用系统换时间？', '20%的努力产生了80%的结果吗？'],
    },
  ],

  // 用户数据
  cards: [],      // 用户自定义的概念卡片
  cases: [],      // 用户的应用案例

  currentModel: null,

  init() {
    const data = OS.store.getModuleData('models');
    this.cards = data.modelCards || [];
    this.cases = data.modelCases || [];

    // 注册模型节点到图谱
    this.modelDefinitions.forEach(m => {
      OS.graph.registerNode('model:' + m.id, 'model', m.name, 'models');
    });
    return this;
  },

  save() {
    OS.store.set('modelCards', this.cards);
    OS.store.set('modelCases', this.cases);
  },

  /** 获取模型定义 */
  getModel(id) {
    return this.modelDefinitions.find(m => m.id === id);
  },

  /** 获取某模型下的用户卡片 */
  getCards(modelId) {
    return this.cards.filter(c => c.modelId === modelId);
  },

  /** 获取某模型下的案例 */
  getCases(modelId) {
    return this.cases.filter(c => c.modelId === modelId);
  },

  /** 添加概念卡片 */
  addCard(modelId, title, content) {
    const card = {
      id: 'mc' + Date.now().toString(36),
      modelId,
      title,
      content,
      createdAt: new Date().toISOString(),
    };
    this.cards.push(card);
    OS.graph.registerNode(card.id, 'modelCard', title, 'models');
    OS.graph.link(card.id, 'model:' + modelId, 'card→model');
    this.save();
    return card;
  },

  /** 添加应用案例 */
  addCase(modelId, title, situation, action, result) {
    const c = {
      id: 'mcase' + Date.now().toString(36),
      modelId,
      title,
      situation,
      action,
      result,
      createdAt: new Date().toISOString(),
    };
    this.cases.push(c);
    OS.graph.registerNode(c.id, 'modelCase', title, 'models');
    OS.graph.link(c.id, 'model:' + modelId, 'case→model');
    this.save();
    return c;
  },

  /** 删除卡片或案例 */
  deleteItem(id) {
    this.cards = this.cards.filter(c => c.id !== id);
    this.cases = this.cases.filter(c => c.id !== id);
    this.save();
  },
};

window.Models = Models;
console.log('[OS] 思维模型模块已加载');

/**
 * 模块注册清单 — 所有现有功能 + 新增功能在此注册
 * 
 * 每个模块一行，按 layer 分组。新增模块只需添加新行。
 */

// ===== 第1层：日常执行 =====
OS.registry.register({ id: 'home',     name: '首页',     icon: '🏠', layer: 'action', layerName: '日常执行', order: 1,  route: '/home',     dataKeys: ['goals','tasks','checkins','weeklyHighlights'], status: 'active' });
OS.registry.register({ id: 'tasks',    name: '任务管理', icon: '📋', layer: 'action', layerName: '日常执行', order: 2,  route: '/tasks',    dataKeys: ['tasks'],          status: 'active', meta: { description: 'NLP智能输入 + 时间轴管理' } });
OS.registry.register({ id: 'goals',    name: '目标管理', icon: '🎯', layer: 'action', layerName: '日常执行', order: 3,  route: '/goals',    dataKeys: ['goals'],          status: 'active', meta: { description: '年/季/月/周四级目标' } });
OS.registry.register({ id: 'pomodoro', name: '专注种树', icon: '🌳', layer: 'action', layerName: '日常执行', order: 4,  route: '/pomodoro', dataKeys: ['pomodoros','plantedTrees'], status: 'active', meta: { description: '番茄钟 + 种树游戏' } });
OS.registry.register({ id: 'checkin',  name: '每日打卡', icon: '✓',  layer: 'action', layerName: '日常执行', order: 5,  route: '/checkin',  dataKeys: ['checkins'],       status: 'active', meta: { description: 'A/B/C三档打卡 + 热力图' } });
OS.registry.register({ id: 'habits',   name: '习惯追踪', icon: '⭐', layer: 'action', layerName: '日常执行', order: 6,  route: '/habits',   dataKeys: ['habits'],         status: 'active' });
OS.registry.register({ id: 'journal',  name: '日记随笔', icon: '📝', layer: 'action', layerName: '日常执行', order: 7,  route: '/journal',  dataKeys: ['journals'],       status: 'active', meta: { description: '日记 + 随笔 + 情绪记录' } });
OS.registry.register({ id: 'contacts', name: '人脉网络', icon: '👥', layer: 'action', layerName: '日常执行', order: 8,  route: '/contacts', dataKeys: ['contacts'],       status: 'active' });
OS.registry.register({ id: 'memory',   name: '物品记忆', icon: '🧩', layer: 'action', layerName: '日常执行', order: 9,  route: '/memory',   dataKeys: ['memoryItems'],    status: 'active' });

// ===== 第2层：战略规划 =====
OS.registry.register({ id: 'lifeplan', name: '人生规划', icon: '🧭', layer: 'strategy', layerName: '战略规划', order: 1, route: '/lifeplan', dataKeys: ['visions','objectives','reviews'], status: 'active', meta: { description: '愿景/OKR/复盘/看板' } });
OS.registry.register({ id: 'models',   name: '思维模型', icon: '🧠', layer: 'strategy', layerName: '战略规划', order: 2, route: '/models',   dataKeys: ['modelCards','modelCases'], status: 'active', meta: { description: '6套世界解释器' } });

// ===== 第3层：个人成长（预留） =====
OS.registry.register({ id: 'reading',  name: '阅读清单', icon: '📚', layer: 'growth', layerName: '个人成长', order: 1, route: '/reading',  dataKeys: ['reading'],  status: 'coming-soon', meta: { description: '书架 + 笔记 + 阅读统计' } });
OS.registry.register({ id: 'contest',  name: '竞赛日历', icon: '🏆', layer: 'growth', layerName: '个人成长', order: 2, route: '/contest',  dataKeys: ['contest'],  status: 'coming-soon', meta: { description: '赛事管理 + 成绩追踪' } });
OS.registry.register({ id: 'study',    name: '学习笔记', icon: '💡', layer: 'growth', layerName: '个人成长', order: 3, route: '/study',    dataKeys: ['study'],    status: 'coming-soon', meta: { description: '知识库 + 技能树' } });

// ===== 第4层：开发创造（预留） =====
OS.registry.register({ id: 'dev',      name: '开发面板', icon: '💻', layer: 'dev', layerName: '开发创造', order: 1, route: '/dev',      dataKeys: ['dev'],      status: 'coming-soon', meta: { description: '项目管理 + 代码片段' } });
OS.registry.register({ id: 'creative', name: '创意工坊', icon: '🎨', layer: 'dev', layerName: '开发创造', order: 2, route: '/creative', dataKeys: ['creative'], status: 'coming-soon', meta: { description: '设计 + 写作 + 创作' } });

// ===== 系统管理 =====
OS.registry.register({ id: 'settings', name: '系统设置', icon: '⚙️', layer: 'system', layerName: '系统管理', order: 1, route: '/settings', dataKeys: ['settings','config'], status: 'active' });
OS.registry.register({ id: 'profile',  name: '个人中心', icon: '👤', layer: 'system', layerName: '系统管理', order: 2, route: '/profile',  dataKeys: ['profile'],  status: 'active' });

// ===== 注册默认分组排序 =====
OS.registry.layerOrder = ['action', 'strategy', 'growth', 'dev', 'system'];

console.log(`[OS] 共注册 ${OS.registry.modules.size} 个模块`);

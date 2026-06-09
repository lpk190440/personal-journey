const CURRENT_SCHEMA_VERSION = 3;

// ===== 全局错误边界 =====
window.onerror = function(msg, source, lineno, colno, error) {
  console.error('[个人之旅] 全局错误:', msg, source, lineno, colno, error);
  try {
    const errLog = JSON.parse(localStorage.getItem('pj_error_log') || '[]');
    errLog.push({ time: new Date().toISOString(), msg: String(msg), source, lineno, colno });
    if (errLog.length > 50) errLog.splice(0, errLog.length - 50);
    localStorage.setItem('pj_error_log', JSON.stringify(errLog));
  } catch(e) {}
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('[个人之旅] 未处理Promise异常:', event.reason);
  event.preventDefault();
});

function app() {
  // 初始化 OS 框架
  try {
    if (window.OS) {
      OS.store.init();
      OS.graph.init();
      if (window.Lifeplan) Lifeplan.init();
      if (window.Models) Models.init();
    }
  } catch(e) { console.warn('[OS] 框架初始化失败:', e); }

  return {
    // ===== 路由 =====
    page: 'launcher',  // 默认显示启动器
    moreMenuOpen: false,
    timelineCollapsed: true,
    lifeplanTab: 'kanban',  // 人生规划子Tab

    // 统一返回机制
    _currentModuleId: null,
    _currentModulePage: null,
    _showLeaveConfirmDialog: false,
    _leaveConfirmCallback: null,

    // ===== 首页功能模块滑动栏 =====
    homeModules: [
      { id: 'add', name: '添加', icon: '+', action: 'toggleQuickPanel', bg: 'rgba(120,180,230,0.18)', color: '#4A90D9' },
      { id: 'pomodoro', name: '番茄钟', page: 'pomodoro', svg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', bg: 'rgba(184,212,227,0.25)', color: '#6B9AB8' },
      { id: 'goal', name: '目标', page: 'goal', svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', bg: 'rgba(201,216,182,0.25)', color: '#7BA05B' },
      { id: 'memory', name: '记忆', page: 'memory', svg: '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>', bg: 'rgba(167,196,188,0.25)', color: '#5D8C80' },
      { id: 'contacts', name: '人脉', page: 'contacts', svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/>', bg: 'rgba(230,195,195,0.25)', color: '#B07A7A' },
      { id: 'checkin', name: '打卡', page: 'checkin', svg: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', bg: 'rgba(212,197,181,0.25)', color: '#A08560' },
      { id: 'review', name: '回顾', page: 'review', svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', bg: 'rgba(212,197,181,0.20)', color: '#9E8860' },
      { id: 'habits', name: '习惯', page: 'habits', svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', bg: 'rgba(220,200,140,0.2)', color: '#B8A050' },
      { id: 'journal', name: '日记', page: 'journal', svg: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>', bg: 'rgba(190,210,200,0.2)', color: '#6B9080' },
      { id: 'insight', name: '洞察', page: 'insight', svg: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>', bg: 'rgba(170,190,215,0.2)', color: '#6888AA' },
      { id: 'lifeplan', name: '规划', page: 'lifeplan', icon: '\uD83D\uDDFA', bg: 'rgba(200,175,155,0.2)', color: '#997755' },
      { id: 'models', name: '思维', page: 'models', icon: '\uD83E\uDDE0', bg: 'rgba(210,180,210,0.2)', color: '#8877AA' },
      { id: 'settings', name: '设置', page: 'settings', icon: '\u2699\uFE0F', bg: 'rgba(180,180,190,0.15)', color: '#777788' },
    ],
    homeModuleDotIndex: 0,
    get homeModuleDots() {
      const el = this.$refs?.moduleScroller;
      if (!el) return 0;
      const itemWidth = 82; // item width + gap
      const visibleCount = Math.floor(el.clientWidth / itemWidth);
      return Math.ceil(this.homeModules.length / Math.max(visibleCount || 4, 2));
    },


    // ===== 设置 =====
    darkMode: false,
    // 主题系统
    themePreset: 'gentle',     // 当前预设名称
    customTheme: null,         // 自定义主题 {accent, bgPrimary, bgSecondary, cardBg, textPrimary, textSecondary}
    themePickerOpen: false,    // 颜色选择器面板
    aiTone: 'companion',
    whiteSpaceEnabled: true,
    whiteSpaceRatio: 20,

    // ===== 数据存储 =====
    goals: [],
    tasks: [],
    pomodoros: [],
    contacts: [],
    checkins: [],
    habits: [],
    personalizedAdvice: [],
    settings: {},
    weeklyHighlights: [],

    // ===== 番茄钟状态 =====
    pomodoroMode: 'standard',
    pomodoroRunning: false,
    pomodoroRemaining: 25 * 60,
    pomodoroTotal: 25 * 60,
    pomodoroTimer: null,
    customMinutes: 25,

    // ===== 种树游戏 =====
    plantedTrees: [],      // 已种树木列表 [{id, date, duration, mode, time, dead?}]
    treeTotalCount: 0,     // 种树总数
    forestView: 'today',   // 树林视图: 'today' | 'month' | 'year' | 'all'
    forestPeriod: 'day',   // 3D 森林视图周期: 'day' | 'week' | 'month' | 'year'
    forestDateOffset: 0,   // 日期偏移量（用于前后翻页）
    treeTooltip: { show: false, x: 0, y: 0, date: '', duration: 0, time: '', dead: false },

    // ===== 表单 =====
    showGoalModal: false,
    editingGoal: null,
    goalForm: { type: '年', title: '', krText: '', parentId: '', antiGoalsText: '' },

    openQuickAdd: false,
    quickTaskForm: { title: '', tag: 'work' },

    // ===== NLP 智能输入 =====
    nlpInput: '',
    nlpResult: { title: '', time: '', timeLabel: '', duration: 30, durationSource: '', priority: 'normal', priorityLabel: '普通', tags: [], type: '固定', recurring: false, locked: false, suggestedGoal: '', suggestedGoalTitle: '', warning: '' },
    nlpTemplates: [],
    nlpSuggestions: [],
    nlpMemoryHints: [],
    nlpHistory: [],

    // ===== 打卡 =====
    heatmapOffset: 0,
    tempCheckinGrade: 'B',
    tempCheckinNote: '',
    todayCheckinEdit: false,
    checkinExpanded: false,

    // 打卡详情弹窗
    showDayDetail: false,
    dayDetailData: null,

    contactFilter: null,
    aiTip: null,
    _dragData: null,

    // 任务编辑
    showEditModal: false,
    editingTask: null,
    editForm: { title: '', time: '', duration: 30, tags: ['work'], priority: 'normal', type: '固定', recurring: false, locked: false, goalId: '' },
    deleteConfirmId: null,
    _deleteTimer: null,

    // 首页FAB
    showQuickPanel: false,
    quickPanelInput: '',
    quickPanelResult: null,
    _quickPanelTimer: null,

    // 首页打卡
    homeCheckinGrade: null,
    homeCheckinNote: '',

    // 情绪
    tempEmotion: 3,

    // 番茄钟自定义
    pomodoroDurations: { standard: 25, sprint: 10, deep: 50 },
    pomodoroBreakRatio: 5,
    timelineStartHour: 6,
    timelineEndHour: 23,
    defaultTag: 'work',
    notifEnabled: false,

    // AI 设置
    aiEnabled: true,
    aiApiKey: '',
    aiModel: 'deepseek-chat',
    aiBaseUrl: 'https://api.deepseek.com/chat/completions',

    // AI NLP
    nlpAiLoading: false,
    nlpAiError: '',

    // AI 洞察
    aiInsightLoading: false,
    aiInsightText: '',

    // AI 复盘
    aiReviewLoading: false,
    aiReviewText: '',
    lastReviewDate: '',
    dailyReminderHour: 21,

    // 反馈
    feedbackVisible: false,

    // 长按
    _longPressTimer: null,

    // 每日高光
    tempCheckinHighlight: '',

    // 番茄钟关联任务ID
    _pomodoroTaskId: null,

    // V1.2 筛选
    timelineFilterTag: null,
    timelineFilterType: null,

    // V1.2 人脉表单
    showContactForm: false,
    contactForm: { name: '', level: 'L3', notes: '', birthday: '', preferences: '', taboos: '', milestones: '' },
    editingContactId: null,

    // V1.2 弹性预览
    showResiliencePreview: false,
    resiliencePreviewPlan: '',
    resiliencePreviewChanges: [],

    // V1.2 专注模式
    focusMode: false,

    // V1.2 复盘
    reviewReminder: false,

    // ===== V1.5 导航增强 =====
    settingsTab: 'look',
    swipeHintVisible: false,
    swipeHintText: '',
    _swipeHintTimer: null,
    pageHistory: ['home'],

    // ===== 用户认证系统 =====
    authState: 'unauth', // 'unauth' | 'active'
    authMode: 'login',   // 'login' | 'register'
    authLocked: false,
    authUser: null,
    authLockPassword: '',
    authLockError: '',
    authError: '',
    authShowReset: false,
    authForm: { username: '', password: '', remember: true },
    authRegForm: { username: '', usernameErr: '', password: '', passwordErr: '', confirmPassword: '', confirmErr: '', securityQuestion: '', remember: true },
    authResetForm: { username: '', securityAnswer: '', newPassword: '' },
    passwordStrength: 0, // 0-3
    passwordStrengthClass: '',
    passwordStrengthLabel: '',

    // ===== 数据导入导出 =====
    ioTab: 'export',
    ioExportFormat: 'json',
    ioExportTables: [],
    ioExportResult: null,
    ioDragover: false,
    ioImportPreview: null,
    ioConflicts: [],
    ioImporting: false,
    ioImportProgress: 0,
    ioImportStatusText: '',
    ioImportResult: null,
    ioImportParsedData: null,
    ioLogs: [],

    // ===== 版本迁移 =====
    dataVersion: 1,
    lastMigrationDate: '',
    migrationHistory: [],
    migrationLog: [],
    migrationResult: null,
    isMigrating: false,
    integrityChecks: [],
    backups: [],

    // ===== 个人中心 =====
    profileEditing: false,
    profileForm: { nickname: '', bio: '', email: '', phone: '' },
    authCreatedAt: '',
    authLastLogin: '',

    // ===== 数据清理 =====
    cleanupScanned: false,
    cleanupIssues: { emptyTitles: [], duplicates: [], expired: [], nlpCache: [], localStorageFragments: [] },

    // ===== 智能记忆 =====
    memoryItems: [],
    memoryShowForm: false,
    memoryEditingId: null,
    memoryForm: { name: '', location: '', category: 'daily', storedDate: '', note: '' },
    memorySearch: '',
    memoryFilter: 'all',
    memorySelectedIds: [],
    memoryCategories: [
      { value: 'daily', label: '日常' },
      { value: 'docs', label: '证件' },
      { value: 'clothes', label: '衣物' },
      { value: 'digital', label: '数码' },
      { value: 'tools', label: '工具' },
      { value: 'other', label: '其他' },
    ],

    // ===== 全局搜索 =====
    searchQuery: '',
    searchResults: { tasks: [], goals: [], contacts: [], memories: [], total: 0 },
    searchHistory: [],

    // ===== 日记/随笔 =====
    journals: [],
    journalEditing: false,
    journalShowEditor: false,
    journalShowSearch: false,
    journalTab: 'all',
    journalSearch: '',
    journalDraft: null,
    journalForm: { type: 'diary', title: '', content: '', mood: '', tags: [], tagsInput: '', date: '', editingId: null },

    openJournalEditor(type = 'diary') {
      this.journalEditing = true;
      this.journalShowEditor = true;
      this.journalForm = {
        type, title: '', content: '', mood: '', tags: [], tagsInput: '',
        date: new Date().toISOString().slice(0, 10), editingId: null
      };
    },

    cancelJournalEdit() {
      this.journalEditing = false;
      this.journalShowEditor = false;
      this.journalForm = { type: 'diary', title: '', content: '', mood: '', tags: [], tagsInput: '', date: '', editingId: null };
    },

    journalParseTags() {
      this.journalForm.tags = (this.journalForm.tagsInput || '')
        .split(/[,，]/).map(t => t.trim()).filter(Boolean).slice(0, 5);
    },

    journalAutoSaveDraft() {
      if (!this.journalForm.content) return;
      this.journalDraft = { ...this.journalForm, savedAt: new Date().toISOString() };
      try { localStorage.setItem('pj_journal_draft', JSON.stringify(this.journalDraft)); } catch(e) {}
    },

    restoreJournalDraft() {
      if (this.journalDraft) {
        this.journalEditing = true;
        this.journalShowEditor = true;
        this.journalForm = { ...this.journalDraft, tagsInput: (this.journalDraft.tags || []).join(', ') };
      }
    },

    saveJournal() {
      const { title, content, mood, tags, date, type, editingId } = this.journalForm;
      if (!content.trim() && !title.trim()) { this.showToast('请至少填写标题或内容', 'warning'); return; }
      const now = new Date().toISOString();
      if (editingId) {
        const j = this.journals.find(j => j.id === editingId);
        if (j) {
          j.title = title.trim(); j.content = content.trim(); j.mood = mood;
          j.tags = tags; j.date = date; j.updatedAt = now;
        }
      } else {
        this.journals.unshift({
          id: 'j_' + Date.now(),
          type, title: title.trim(), content: content.trim(),
          mood, tags, date: date || now.slice(0, 10),
          createdAt: now, updatedAt: now,
        });
      }
      this.cancelJournalEdit();
      this.journalDraft = null;
      try { localStorage.removeItem('pj_journal_draft'); } catch(e) {}
      this.saveData();
      this.showToast(editingId ? '已更新' : '已保存', 'success');
    },

    viewJournal(entry) {
      this.journalEditing = false;
      this.journalShowEditor = false;
      this.journalForm = {
        type: entry.type, title: entry.title, content: entry.content,
        mood: entry.mood, tags: entry.tags || [], tagsInput: (entry.tags || []).join(', '),
        date: entry.date, editingId: entry.id
      };
      this.journalShowEditor = true;
    },

    deleteJournal(id) {
      if (!confirm('确定删除此条目？')) return;
      this.journals = this.journals.filter(j => j.id !== id);
      this.cancelJournalEdit();
      this.saveData();
      this.showToast('已删除', 'success');
    },

    filteredJournals() {
      let items = [...this.journals];
      if (this.journalTab === 'diary') items = items.filter(j => j.type === 'diary');
      if (this.journalTab === 'essay') items = items.filter(j => j.type === 'essay');
      if (this.journalSearch.trim()) {
        const q = this.journalSearch.trim().toLowerCase();
        items = items.filter(j =>
          (j.title || '').toLowerCase().includes(q) ||
          (j.content || '').toLowerCase().includes(q) ||
          (j.tags || []).some(t => t.toLowerCase().includes(q))
        );
      }
      return items;
    },

    moodEmoji(mood) {
      return mood === 'happy' ? '😊' : mood === 'neutral' ? '😐' : mood === 'sad' ? '😔' : '';
    },

    openJournalForDate(dateStr) {
      this.journalEditing = true;
      this.journalShowEditor = true;
      this.journalForm = {
        type: 'diary', title: '', content: '', mood: '', tags: [], tagsInput: '',
        date: dateStr, editingId: null
      };
    },

    // ===== 情绪趋势 =====
    moodCalendar() {
      const now = new Date();
      const year = now.getFullYear(), month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const result = [];
      for (let i = 0; i < firstDay; i++) result.push({ date: '', day: '', key: 'e' + i });
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const journal = this.journals.find(j => j.date === ds && j.mood);
        result.push({ date: ds, day: d, mood: journal ? this.moodEmoji(journal.mood) : '', key: ds });
      }
      return result;
    },

    moodCellBg(cell) {
      if (!cell.mood) return 'var(--bg-secondary)';
      if (cell.mood === '😊') return 'rgba(201,216,182,0.3)';
      if (cell.mood === '😐') return 'rgba(184,212,227,0.3)';
      return 'rgba(230,195,195,0.3)';
    },

    moodMonthLabel() {
      const now = new Date();
      return `${now.getFullYear()}年${now.getMonth()+1}月`;
    },

    moodStats() {
      const now = new Date();
      const ym = now.toISOString().slice(0, 7);
      const monthJournals = this.journals.filter(j => j.date && j.date.startsWith(ym) && j.mood);
      const happy = monthJournals.filter(j => j.mood === 'happy').length;
      const neutral = monthJournals.filter(j => j.mood === 'neutral').length;
      const sad = monthJournals.filter(j => j.mood === 'sad').length;
      const total = happy + neutral + sad;
      const max = Math.max(happy, neutral, sad);
      let dominantMood = 'neutral';
      if (max === happy) dominantMood = 'happy';
      if (max === sad) dominantMood = 'sad';
      return {
        happy, neutral, sad, total,
        happyPct: total ? Math.round(happy/total*100) : 0,
        neutralPct: total ? Math.round(neutral/total*100) : 0,
        sadPct: total ? Math.round(sad/total*100) : 0,
        dominantMood,
      };
    },

    moodInsight() {
      const s = this.moodStats();
      if (s.total < 3) return '记录更多日记，我将为你生成情绪洞察。';
      if (s.happyPct >= 60) return '本月情绪状态良好！多数时间感到开心，继续保持当前的生活节奏。';
      if (s.sadPct >= 40) return '本月低落情绪占比较高。建议适当增加运动、保证充足睡眠，必要时与朋友聊聊。';
      if (s.neutralPct >= 50) return '本月情绪以平稳为主。可以尝试增加一些新鲜体验来提升生活丰富度。';
      return '情绪分布较为均衡。留意是什么带来了开心的时刻，尝试复制那些积极因素。';
    },

    // ===== 日历视图 =====
    calendarView: 'month',
    calendarMonth: 0,
    calendarWeekOffset: 0,
    calendarSelectedDay: null,

    calendarMonthLabel() {
      const d = new Date();
      d.setMonth(d.getMonth() + this.calendarMonth);
      return `${d.getFullYear()}年${d.getMonth()+1}月`;
    },

    calendarMonthGrid() {
      const d = new Date();
      d.setMonth(d.getMonth() + this.calendarMonth);
      const year = d.getFullYear(), month = d.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const today = new Date().toISOString().slice(0, 10);
      const result = [];
      for (let i = 0; i < firstDay; i++) result.push({ date: '', day: '', key: 'e' + i, isToday: false, isCurrentMonth: false });
      for (let dd = 1; dd <= daysInMonth; dd++) {
        const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
        result.push({
          date: ds, day: dd, key: ds, isToday: ds === today, isCurrentMonth: true,
          hasTask: this.tasks.some(t => t.date === ds),
          hasCheckin: this.checkins.some(c => c.date === ds),
          hasHabit: this.habits.some(h => h.logs && h.logs[ds]),
          hasJournal: this.journals.some(j => j.date === ds),
        });
      }
      return result;
    },

    calendarWeekGrid() {
      const now = new Date();
      now.setDate(now.getDate() + this.calendarWeekOffset * 7);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const today = new Date().toISOString().slice(0, 10);
      const result = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        const items = [];
        this.tasks.filter(t => t.date === ds).forEach(t => items.push({ type: 'task', title: t.title, key: t.id }));
        this.checkins.filter(c => c.date === ds).forEach(c => items.push({ type: 'checkin', title: '打卡 ' + c.grade + '档', key: 'c' + c.date }));
        this.habits.filter(h => h.logs && h.logs[ds]).forEach(h => items.push({ type: 'habit', title: h.icon + ' ' + h.name, key: h.id + ds }));
        result.push({
          date: ds, key: ds, isToday: ds === today,
          label: ['日','一','二','三','四','五','六'][d.getDay()] + ' ' + d.getDate(),
          items,
        });
      }
      return result;
    },

    calendarWeekLabel() {
      const now = new Date();
      now.setDate(now.getDate() + this.calendarWeekOffset * 7);
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const fmt = d => `${d.getMonth()+1}/${d.getDate()}`;
      return `${fmt(start)} - ${fmt(end)}`;
    },

    selectCalendarDay(cell) {
      if (!cell.date) return;
      this.calendarSelectedDay = { date: cell.date };
    },

    calendarDayData() {
      if (!this.calendarSelectedDay) return [];
      const ds = this.calendarSelectedDay.date;
      const sections = [
        { label: '任务', items: this.tasks.filter(t => t.date === ds).map(t => ({ icon: '☐', title: t.title, sub: t.completed ? '已完成' : t.time || '', key: t.id })) },
        { label: '打卡', items: this.checkins.filter(c => c.date === ds).map(c => ({ icon: '✅', title: c.grade + '档打卡', sub: c.note || '', key: 'c' + c.date })) },
        { label: '习惯', items: this.habits.filter(h => h.logs && h.logs[ds]).map(h => ({ icon: h.icon, title: h.name, sub: '已完成', key: h.id + ds })) },
        { label: '日记', items: this.journals.filter(j => j.date === ds).map(j => ({ icon: this.moodEmoji(j.mood), title: j.title || '(无标题)', sub: '', key: j.id })) },
      ];
      return sections;
    },

    // ===== 通知系统 =====
    notifPermission: 'default', // 'default' | 'granted' | 'denied'
    notifChecked: false,

    // ===== 计算属性 =====
    get todayStr() {
      const d = new Date();
      return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + ['日','一','二','三','四','五','六'][d.getDay()];
    },
    get pomodoroProgress() {
      return this.pomodoroTotal > 0 ? this.pomodoroRemaining / this.pomodoroTotal : 1;
    },

    // ===== 初始化 =====
    init() {
      this._safeInit();
    },

    _safeInit() {
      try {
        this.loadAuth();
        if (this.authState === 'active') {
          this._safeLoadAll();
        }
      } catch(e) {
        console.error('[个人之旅] 初始化失败:', e);
        this.showToast('系统启动异常，已使用安全模式', 'warning');
      }
    },

    _safeLoadAll() {
      try { this.loadData(); } catch(e) { console.error('loadData失败:', e); }
      try { this.runMigrationIfNeeded(); } catch(e) { console.error('迁移失败:', e); }
      try { this.cloneRecurringTasks(); } catch(e) { console.error('克隆任务失败:', e); }
      try { this.checkDarkMode(); } catch(e) {}
      try { this.generateAiTip(); } catch(e) {}
      try { this.registerSW(); } catch(e) {}
      try { this.showPWAInstallPrompt(); } catch(e) {}
      try { this.reviewReminder = !this.todayCheckedIn(); } catch(e) {}
      try { this.initIOExportTables(); } catch(e) {}
      try { this.loadIOLogs(); } catch(e) {}
      try { this.loadBackups(); } catch(e) {}
      try { this.initAutoLock(); } catch(e) {}
      try { this.initSwipeNavigation(); } catch(e) {}
      try { this.initGlobalBack(); } catch(e) {}
      try { this.loadProfileInfo(); } catch(e) {}
      try { this.loadSearchHistory(); } catch(e) {}
      try { this.checkNotifPermission(); } catch(e) {}
      try { this.startTaskReminderTimer(); } catch(e) {}
      try { this.loadJournalDraft(); } catch(e) {}
      try { this.generatePersonalizedAdvice(); } catch(e) {}
    },


    // ===== 导航增强方法 =====
    navigateTo(targetPage) {
      const prevPage = this.page;
      if (prevPage !== targetPage) {
        this.pageHistory.push(targetPage);
        if (this.pageHistory.length > 20) this.pageHistory.shift();
      }
      this.page = targetPage;

      // 3D 森林生命周期管理
      if (targetPage === 'pomodoro' && !this.pomodoroRunning) {
        this.$nextTick(() => {
          setTimeout(() => this.initForest3D(), 100);
        });
      } else if (prevPage === 'pomodoro') {
        this.destroyForest3D();
      }
    },

    // ===== 启动器方法 =====
    /**
     * 获取指定 layer 的模块列表
     */
    getLayerModules(layer) {
      if (!window.OS || !OS.registry) return [];
      return OS.registry.getActive().filter(m => m.layer === layer).sort((a, b) => a.order - b.order);
    },

    /**
     * 获取 layer 的显示名称
     */
    getLayerName(layer) {
      const names = {
        'action': '📋 日常执行',
        'strategy': '🎯 战略规划',
        'growth': '🌱 个人成长',
        'dev': '💻 开发创造',
        'system': '⚙️ 系统管理',
      };
      return names[layer] || layer;
    },

    /**
     * 进入模块（启动器→模块映射）
     */
    enterModule(moduleId) {
      const routeMap = {
        'home': 'home', 'tasks': 'nlp', 'pomodoro': 'pomodoro',
        'checkin': 'checkin', 'goals': 'goal', 'habits': 'habits',
        'journal': 'journal', 'contacts': 'contacts', 'memory': 'memory',
        'settings': 'settings', 'profile': 'profile',
        'lifeplan': 'lifeplan', 'models': 'models',
      };
      const targetPage = routeMap[moduleId] || moduleId;

      // 保存当前模块状态
      this._beforeLeaveModule(this.page);

      // 记录进入的模块
      this._currentModuleId = moduleId;
      this._currentModulePage = targetPage;

      this.navigateTo(targetPage);
    },

    /** 返回启动器 — 统一返回机制 */
    goToLauncher() {
      // 1. 拦截检查：有未保存数据或进行中操作
      if (this._hasUnsavedChanges()) {
        this._showLeaveConfirm(() => this._doGoToLauncher());
        return;
      }

      this._doGoToLauncher();
    },

    /** 实际执行返回启动器 */
    _doGoToLauncher() {
      // 2. 清理当前模块状态
      this._cleanupCurrentModule();

      // 3. 重置模块追踪
      this._currentModuleId = null;
      this._currentModulePage = null;

      // 4. 保存数据
      if (this.saveData) this.saveData();

      // 5. 导航到启动器
      this.navigateTo('launcher');
    },

    /** 检查是否有未保存的修改 */
    _hasUnsavedChanges() {
      // 番茄钟运行中
      if (this.pomodoroRunning) return true;
      // NLP输入框有内容
      if (this.nlpInput && this.nlpInput.trim().length > 10) return true;
      // 日记草稿
      if (this.journalDraft && this.journalDraft.trim().length > 0) return true;
      // 编辑中的表单
      if (this.showGoalModal || this.showContactForm || this.showEditModal) return true;
      // 打卡编辑中
      if (this.todayCheckinEdit) return true;
      // 设置页切换不算未保存（设置自动保存）
      if (this.page === 'settings') return false;
      // 其他子页面直接返回，不拦截
      return false;
    },

    /** 拦截确认弹窗 */
    _showLeaveConfirm(onConfirm) {
      this._leaveConfirmCallback = onConfirm;
      this._showLeaveConfirmDialog = true;
    },

    confirmLeave() {
      this._showLeaveConfirmDialog = false;
      if (this._leaveConfirmCallback) {
        this._leaveConfirmCallback();
        this._leaveConfirmCallback = null;
      }
    },

    cancelLeave() {
      this._showLeaveConfirmDialog = false;
      this._leaveConfirmCallback = null;
    },

    /** 清理当前模块状态 */
    _cleanupCurrentModule() {
      // 停止番茄钟
      if (this.pomodoroRunning && this.pomodoroTimer) {
        clearInterval(this.pomodoroTimer);
        this.pomodoroTimer = null;
        // 不调用 stopPomodoro 避免种枯萎树
      }
      // 关闭所有弹窗/模态框
      this.showGoalModal = false;
      this.showContactForm = false;
      this.showEditModal = false;
      this.showQuickPanel = false;
      this.moreMenuOpen = false;
      this.showDayDetail = false;
      this._showLeaveConfirmDialog = false;
      // 重置编辑状态
      this.todayCheckinEdit = false;
      this.checkinExpanded = false;
      // 清理焦点
      if (document.activeElement) document.activeElement.blur();
    },

    /** 离开模块前保存状态 */
    _beforeLeaveModule(fromPage) {
      // 保存数据
      if (this.saveData) this.saveData();
      // 保存日记草稿
      if (this.journalAutoSaveDraft) this.journalAutoSaveDraft();
    },

    /** 键盘 Esc 返回 */
    _handleEscKey(e) {
      if (e.key === 'Escape' && this.page !== 'launcher' && this.page !== 'home') {
        // 优先关闭弹窗
        if (this._showLeaveConfirmDialog) {
          this.cancelLeave();
          return;
        }
        if (this.showDayDetail) { this.closeDayDetail(); return; }
        if (this.moreMenuOpen) { this.moreMenuOpen = false; return; }
        if (this.showQuickPanel) { this.showQuickPanel = false; return; }
        // 返回主菜单
        this.goToLauncher();
      }
    },

    /** 初始化全局返回机制 */
    initGlobalBack() {
      // 键盘 Esc 监听
      document.addEventListener('keydown', this._escHandler = (e) => this._handleEscKey(e));
      // 浏览器后退按钮（PopState）
      window.addEventListener('popstate', this._popHandler = (e) => {
        if (this.page !== 'launcher') {
          e.preventDefault();
          history.pushState(null, '', window.location.href);
          this.goToLauncher();
        }
      });
      // 推送初始状态
      if (!history.state) history.pushState({ page: 'launcher' }, '', window.location.href);
      // 手势：向右滑动返回（移动端）
      this._initSwipeBack();
    },

    /** 手势返回：屏幕左边缘向右滑动 */
    _initSwipeBack() {
      let touchStartX = 0;
      let touchStartY = 0;
      document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });
      document.addEventListener('touchend', (e) => {
        if (this.page === 'launcher') return;
        const dx = (e.changedTouches[0]?.clientX || 0) - touchStartX;
        const dy = Math.abs((e.changedTouches[0]?.clientY || 0) - touchStartY);
        // 右滑超过80px且角度小于30度
        if (dx > 80 && dy < dx * 0.5 && touchStartX < 40) {
          this.goToLauncher();
        }
      }, { passive: true });
    },

    navigateBack() {
      if (this.pageHistory.length > 1) {
        this.pageHistory.pop();
        this.page = this.pageHistory[this.pageHistory.length - 1] || 'home';
      } else {
        this.page = 'home';
        this.pageHistory = ['home'];
      }
    },

    startPomodoroQuick() {
      this.pomodoroMode = 'standard';
      this.pomodoroRemaining = this.getPomodoroDuration('standard');
      this.pomodoroTotal = this.pomodoroRemaining;
      this.pomodoroRunning = true;
      this.page = 'pomodoro';
      this._pomodoroTaskId = null;
    },

    /** 首页功能模块滑动指示器更新 */
    updateModuleDot() {
      const el = this.$refs?.moduleScroller;
      if (!el) return;
      const itemWidth = 82; // item width + gap
      const visibleCount = Math.floor(el.clientWidth / itemWidth);
      const dotIndex = Math.round(el.scrollLeft / (itemWidth * Math.max(visibleCount || 4, 2)));
      this.homeModuleDotIndex = Math.max(0, dotIndex);
    },

    initSwipeNavigation() {
      let startX = 0, startY = 0, startTime = 0;
      const pageOrder = ['home', 'nlp', 'checkin', 'insight'];

      document.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }, { passive: true });

      document.addEventListener('touchend', e => {
        const deltaX = e.changedTouches[0].clientX - startX;
        const deltaY = e.changedTouches[0].clientY - startY;
        const elapsed = Date.now() - startTime;
        const absDx = Math.abs(deltaX);
        const absDy = Math.abs(deltaY);

        // 基本条件：水平滑动为主、滑动距离>60px、快速手势
        if (absDx < 60 || absDx < absDy * 1.2 || elapsed > 500) return;

        const currentIdx = pageOrder.indexOf(this.page);

        // ── 首页特殊处理：防止左右滑动误触 ──
        if (this.page === 'home') {
          // 向左滑动：只有从屏幕右侧 1/3 区域开始，才允许切换到任务
          if (deltaX < 0) {
            const startRatio = startX / window.innerWidth;
            if (startRatio < 0.7) return; // 必须从右侧30%区域开始
            this.navigateTo('nlp');
            this.showSwipeHint('nlp');
          }
          // 首页禁止向右滑动
          return;
        }

        // ── 其他页面正常滑动 ──
        if (deltaX < 0 && currentIdx < pageOrder.length - 1) {
          this.navigateTo(pageOrder[currentIdx + 1]);
          this.showSwipeHint(pageOrder[currentIdx + 1]);
        } else if (deltaX > 0 && currentIdx > 0) {
          this.navigateTo(pageOrder[currentIdx - 1]);
          this.showSwipeHint(pageOrder[currentIdx - 1]);
        }
      }, { passive: true });
    },

    showSwipeHint(targetPage) {
      const names = { home: '首页', nlp: '任务', checkin: '打卡', insight: '洞察' };
      this.swipeHintText = names[targetPage] || targetPage;
      this.swipeHintVisible = true;
      if (this._swipeHintTimer) clearTimeout(this._swipeHintTimer);
      this._swipeHintTimer = setTimeout(() => { this.swipeHintVisible = false; }, 1200);
    },

    // ===== 自动锁定 =====
    initAutoLock() {
      let timer;
      const resetTimer = () => {
        if (timer) clearTimeout(timer);
        if (this.authState === 'active' && this.authUser && this.authUser.remember !== true) {
          timer = setTimeout(() => this.authLockApp(), 600000);
        }
      };
      document.addEventListener('click', resetTimer);
      document.addEventListener('keydown', resetTimer);
      document.addEventListener('touchstart', resetTimer);
      resetTimer();
    },

    registerSW() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    },

    _pwaInstallEvent: null,
    _pwaDismissedAt: null,
    showPWAInstallPrompt() {
      window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        this._pwaInstallEvent = e;
        // 仅在第5次访问或7天后提示
        const lastDismiss = localStorage.getItem('pwa_dismissed');
        const visitCount = parseInt(localStorage.getItem('visit_count') || '0') + 1;
        localStorage.setItem('visit_count', visitCount);
        if (lastDismiss && (Date.now() - parseInt(lastDismiss) < 7 * 86400000)) return;
        if (visitCount < 5 && !lastDismiss) return;
        // 延迟3秒显示，不打断用户
        setTimeout(() => {
          this.pwaInstallVisible = true;
        }, 3000);
      });
    },
    pwaInstallVisible: false,
    installPWA() {
      if (this._pwaInstallEvent) {
        this._pwaInstallEvent.prompt();
        this._pwaInstallVisible = false;
      }
    },
    dismissPWA() {
      this.pwaInstallVisible = false;
      localStorage.setItem('pwa_dismissed', Date.now().toString());
    },

    loadData() {
      try {
        const d = JSON.parse(localStorage.getItem('personal_journey') || '{}');
        this.goals = d.goals || [];
        this.tasks = d.tasks || [];
        this.pomodoros = d.pomodoros || [];
        this.contacts = d.contacts || [];
        this.checkins = d.checkins || [];
        this.settings = d.settings || {};
        this.weeklyHighlights = d.weeklyHighlights || [];
        this.nlpTemplates = d.nlpTemplates || ['每日阅读 #成长', '下午开会讨论 #工作', '运动健身 #生活'];
        this.nlpHistory = d.nlpHistory || [];
        this.memoryItems = d.memoryItems || [];
        this.habits = d.habits || [];
        this.journals = d.journals || [];
        this.profileForm = d.profile || { nickname: '', bio: '', email: '', phone: '' };
        this.plantedTrees = d.plantedTrees || [];
        this.treeTotalCount = this.plantedTrees.length;
        this.darkMode = this.settings.darkMode || false;
        this.themePreset = this.settings.themePreset || 'gentle';
        this.customTheme = this.settings.customTheme || null;
        // 版本控制
        this.dataVersion = d._version || 1;
        // 加载迁移历史
        try {
          this.migrationHistory = JSON.parse(localStorage.getItem('pj_migration_history') || '[]');
        } catch(e) { this.migrationHistory = []; }
        this.lastMigrationDate = this.migrationHistory.length > 0
          ? this.migrationHistory[this.migrationHistory.length - 1].time
          : '';
        this.aiTone = this.settings.aiTone || 'companion';
        this.whiteSpaceEnabled = this.settings.whiteSpaceEnabled !== false;
        this.whiteSpaceRatio = this.settings.whiteSpaceRatio || 20;
        this.pomodoroDurations = this.settings.pomodoroDurations || { standard: 25, sprint: 10, deep: 50 };
        this.pomodoroBreakRatio = this.settings.pomodoroBreakRatio || 5;
        this.timelineStartHour = this.settings.timelineStartHour || 6;
        this.timelineEndHour = this.settings.timelineEndHour || 23;
        this.defaultTag = this.settings.defaultTag || 'work';
        this.notifEnabled = this.settings.notifEnabled || false;
        this.dailyReminderHour = this.settings.dailyReminderHour || 21;
        this.aiApiKey = this.settings.aiApiKey || '';
        this.aiModel = this.settings.aiModel || 'deepseek-chat';
        this.aiBaseUrl = this.settings.aiBaseUrl || 'https://api.deepseek.com/chat/completions';
        this.applyDarkMode();
        this.loadTheme();
      } catch(e) {
        this.seedDemoData();
      }
    },

    saveData() {
      try {
        this.settings.darkMode = this.darkMode;
      this.settings.themePreset = this.themePreset;
      this.settings.customTheme = this.customTheme;
      this.settings.aiTone = this.aiTone;
      this.settings.whiteSpaceEnabled = this.whiteSpaceEnabled;
      this.settings.whiteSpaceRatio = this.whiteSpaceRatio;
      this.settings.pomodoroDurations = this.pomodoroDurations;
      this.settings.pomodoroBreakRatio = this.pomodoroBreakRatio;
      this.settings.timelineStartHour = this.timelineStartHour;
      this.settings.timelineEndHour = this.timelineEndHour;
      this.settings.defaultTag = this.defaultTag;
      this.settings.notifEnabled = this.notifEnabled;
      this.settings.dailyReminderHour = this.dailyReminderHour;
      this.settings.aiApiKey = this.aiApiKey;
      this.settings.aiModel = this.aiModel;
      this.settings.aiBaseUrl = this.aiBaseUrl;
      localStorage.setItem('personal_journey', JSON.stringify({
        goals: this.goals,
        tasks: this.tasks,
        pomodoros: this.pomodoros,
        contacts: this.contacts,
        checkins: this.checkins,
        settings: this.settings,
        weeklyHighlights: this.weeklyHighlights,
        nlpTemplates: this.nlpTemplates,
        nlpHistory: this.nlpHistory,
        memoryItems: this.memoryItems,
        habits: this.habits,
        journals: this.journals,
        profile: this.profileForm,
        plantedTrees: this.plantedTrees,
        _version: this.dataVersion,
      }));
      } catch(e) {
        console.error('[个人之旅] 保存失败:', e);
        this.showToast('数据保存失败，请检查存储空间', 'error');
      }
    },

    // ===== 深色模式 =====
    checkDarkMode() {
      if (this.settings.darkMode === undefined && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.darkMode = true;
      }
      this.applyDarkMode();
    },
    toggleDarkMode(e) {
      // 使用事件中的 checkbox 状态（避免与 x-model 冲突）
      this.darkMode = e?.target?.checked ?? !this.darkMode;
      this.applyDarkMode();
      this.saveData();
    },
    applyDarkMode() {
      const root = document.documentElement;
      root.classList.toggle('dark-mode', this.darkMode);
      root.classList.toggle('light-mode', !this.darkMode);
      // Ocean 设计系统暗色模式
      if (this.themePreset === 'ocean-design') {
        if (this.darkMode) {
          root.setAttribute('data-theme', 'ocean-dark');
          root.classList.add('theme-ocean-dark');
          root.classList.remove('theme-ocean');
        } else {
          root.setAttribute('data-theme', 'ocean');
          root.classList.add('theme-ocean');
          root.classList.remove('theme-ocean-dark');
        }
      }
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = this.darkMode ? '#1E1E2E' : '#F8F6F3';
    },

    // ===== 主题系统 =====
    themePresets: {
      gentle: {
        name: '温和', icon: '🌿',
        accent: '#5B8C9B', accentHover: '#4A7A89',
        bgPrimary: '#F8F6F3', bgSecondary: '#F0EDE8', cardBg: '#FFFFFF',
        textPrimary: '#3A3A3A', textSecondary: '#7A7A7A', textWeak: '#B0B0B0',
        border: '#E5E5E5', borderLight: '#F0EDE8',
      },
      forest: {
        name: '森林', icon: '🌲',
        accent: '#4A7C59', accentHover: '#3D6B4A',
        bgPrimary: '#F4F7F2', bgSecondary: '#E8EFE3', cardBg: '#FFFFFF',
        textPrimary: '#2E3D28', textSecondary: '#6B7D65', textWeak: '#9AAB94',
        border: '#D8E3D0', borderLight: '#E8EFE3',
      },
      // Ocean Design System — 深海蓝 × 珊瑚 × 青绿 (完整设计规范)
      // 使用 --oc- 前缀变量，通过 CSS ocean-theme.css 注入 + _injectThemeCSS 映射
      'ocean-design': {
        name: '海洋设计', icon: '🌊',
        accent: '#2471b8', accentHover: '#1a5a96',
        bgPrimary: '#f4f6f9', bgSecondary: '#e8f2fc', cardBg: '#ffffff',
        textPrimary: '#051c3a', textSecondary: '#3d5a7c', textWeak: '#7a94b0',
        border: 'rgba(36,113,184,0.18)', borderLight: 'rgba(36,113,184,0.12)',
        // Ocean 专属扩展变量（--oc- 前缀，通过 ocean-theme.css 注入）
        // 标记为 ocean-design 触发特殊映射逻辑
        _designSystem: 'ocean',
        accentDark: '#141c28',        // 深海卡片背景
        accentDeep: '#0a0f18',        // 最深卡片
        accentMuted: '#cfe2f7',       // 浅蓝功能卡片背景
        accentPale: '#e8f2fc',        // 最浅填充
        successGreen: '#1a988e',      // 成功青绿
        streakFire: '#e8a838',        // 连续/警告色
        coralColor: '#e8604c',        // 珊瑚强调色
        tagBg: 'rgba(36,113,184,0.12)',
        // 圆角系统（与 flat-green 一致）
        radiusXs: '6px',
        radiusSm: '10px',
        radiusMd: '14px',
        radiusLg: '20px',
        radiusXl: '26px',
        radius2xl: '32px',
        radiusPill: '9999px',
        // 阴影层级（冷蓝色调）
        shadowXs: '0 1px 3px rgba(5,28,58,0.04)',
        shadowSm: '0 2px 8px rgba(5,28,58,0.05)',
        shadowMd: '0 4px 12px rgba(5,28,58,0.06)',
        shadowLg: '0 8px 24px rgba(5,28,58,0.08)',
        shadowXl: '0 16px 48px rgba(5,28,58,0.12)',
        shadowFocus: '0 0 0 3px rgba(36,113,184,0.25)',
        // 暗色模式
        darkBgPrimary: '#0a0f18',
        darkBgSecondary: '#141c28',
        darkCardBg: '#141c28',
        darkTextPrimary: '#e8f2fc',
        darkTextSecondary: '#a7cbf0',
        darkTextWeak: '#5a80a8',
        darkBorder: 'rgba(74,143,212,0.15)',
        darkBorderLight: 'rgba(74,143,212,0.10)',
      },
      sunset: {
        name: '日落', icon: '🌅',
        accent: '#D4786E', accentHover: '#C0665B',
        bgPrimary: '#FBF6F3', bgSecondary: '#F5EDE8', cardBg: '#FFFFFF',
        textPrimary: '#4A2E2A', textSecondary: '#8B6E68', textWeak: '#B8A29C',
        border: '#E8D8D0', borderLight: '#F5EDE8',
      },
      lavender: {
        name: '薰衣草', icon: '💜',
        accent: '#7B6FB5', accentHover: '#6A5FA0',
        bgPrimary: '#F7F5FB', bgSecondary: '#EEEAFA', cardBg: '#FFFFFF',
        textPrimary: '#2E2A3D', textSecondary: '#6E6885', textWeak: '#A09AB8',
        border: '#DCD5EE', borderLight: '#EEEAFA',
      },
      monochrome: {
        name: '黑白', icon: '🖤',
        accent: '#4A4A4A', accentHover: '#333333',
        bgPrimary: '#FAFAFA', bgSecondary: '#F0F0F0', cardBg: '#FFFFFF',
        textPrimary: '#1A1A1A', textSecondary: '#666666', textWeak: '#999999',
        border: '#DDDDDD', borderLight: '#F0F0F0',
      },
      matcha: {
        name: '抹茶', icon: '🍵',
        accent: '#7B9E6D', accentHover: '#6A8D5C',
        bgPrimary: '#F9FAF6', bgSecondary: '#F0F3EC', cardBg: '#FFFFFF',
        textPrimary: '#3A402E', textSecondary: '#7A806A', textWeak: '#A8AEA0',
        border: '#DDE4D2', borderLight: '#F0F3EC',
      },
      rose: {
        name: '玫瑰', icon: '🌹',
        accent: '#C7707A', accentHover: '#B35D68',
        bgPrimary: '#FDF7F8', bgSecondary: '#FAEEF0', cardBg: '#FFFFFF',
        textPrimary: '#4A2A30', textSecondary: '#8B6068', textWeak: '#B89AA0',
        border: '#ECD8DC', borderLight: '#FAEEF0',
      },
      // Flat-Green 设计风格 — 牛油果绿扁平风 (基于设计规范)
      'flat-green': {
        name: 'Flat Green', icon: '🥑',
        accent: '#7aa33a', accentHover: '#62852d',
        bgPrimary: '#F5F7EF', bgSecondary: '#EEF2E6', cardBg: '#FFFFFF',
        textPrimary: '#1A260A', textSecondary: '#5A6B44', textWeak: '#8A9A70',
        border: '#D8E0CC', borderLight: '#EEF2E6',
        // Flat-Green 专属扩展变量 (--fg- 前缀语义化)
        accentDark: '#1F1F1F',        // 深色卡片背景 (Dark 200)
        accentDeep: '#121212',        // 最深色卡片 (Dark 400)
        accentMuted: '#DCF0C5',       // 浅绿功能卡片背景 (Primary 100)
        accentPale: '#F0F7E8',        // 最浅填充 (Primary 50)
        successGreen: '#7AA33A',      // 打卡成功绿 (同主色)
        streakFire: '#E8A838',        // 连续打卡/警告色
        tagBg: 'rgba(122,163,58,0.12)', // 标签背景
        // 圆角系统 (核心值: 卡片20px / 按钮9999px)
        radiusXs: '6px',
        radiusSm: '10px',
        radiusMd: '14px',
        radiusLg: '20px',
        radiusXl: '26px',
        radius2xl: '32px',
        radiusPill: '9999px',
        // 阴影层级系统 (扁平风=极简阴影)
        shadowXs: '0 1px 3px rgba(26,38,10,0.04)',
        shadowSm: '0 2px 8px rgba(26,38,10,0.05)',
        shadowMd: '0 4px 12px rgba(26,38,10,0.06)',
        shadowLg: '0 8px 24px rgba(26,38,10,0.08)',
        shadowXl: '0 16px 48px rgba(26,38,10,0.12)',
        shadowFocus: '0 0 0 3px rgba(122,163,58,0.25)',
        // 暗色模式专用变量
        darkBgPrimary: '#121212',
        darkBgSecondary: '#1A1A1A',
        darkCardBg: '#1F1F1F',
        darkTextPrimary: '#F0F7E8',
        darkTextSecondary: '#C4DF9B',
        darkTextWeak: '#8A9A70',
        darkBorder: '#2A2A2A',
        darkBorderLight: '#1F1F1F',
      },
    },

    applyThemePreset(name) {
      const preset = this.themePresets[name];
      if (!preset) return;
      this.themePreset = name;
      this.customTheme = null;
      this._injectThemeCSS(preset);
      this.saveData();
    },

    /** 重命名主题预设（双击/长按触发） */
    renameThemePreset(key) {
      const preset = this.themePresets[key];
      if (!preset) return;
      const newName = prompt('为主题「' + preset.name + '」输入新名称：', preset.name);
      if (newName !== null && newName.trim() !== '') {
        preset.name = newName.trim();
        // 重新注入以刷新UI
        this._injectThemeCSS(preset);
        this.saveData();
      }
    },

    applyCustomTheme() {
      if (!this.customTheme) return;
      this.themePreset = 'custom';
      this._injectThemeCSS({
        accent: this.customTheme.accent,
        accentHover: this.customTheme.accentHover,
        bgPrimary: this.customTheme.bgPrimary,
        bgSecondary: this.customTheme.bgSecondary,
        cardBg: this.customTheme.cardBg,
        textPrimary: this.customTheme.textPrimary,
        textSecondary: this.customTheme.textSecondary,
        textWeak: this.customTheme.textWeak,
        border: this.customTheme.border,
        borderLight: this.customTheme.borderLight,
      });
      this.saveData();
    },

    _injectThemeCSS(theme) {
      const root = document.documentElement;
      const isOcean = theme._designSystem === 'ocean';
      const isFlatGreen = this.themePreset === 'flat-green';

      // 清除旧的主题属性
      root.removeAttribute('data-theme');
      // 移除旧的 ocean 标记 class
      root.classList.remove('theme-ocean', 'theme-ocean-dark');

      // ── Ocean Design System: 激活 ocean-theme.css ──
      if (isOcean) {
        root.setAttribute('data-theme', 'ocean');
        root.classList.add('theme-ocean');
        // 使用 ocean-theme.css 中定义的 --oc-* 变量
        // 同时映射到 app 使用的通用变量
        root.style.setProperty('--accent', 'var(--oc-primary-500)');
        root.style.setProperty('--accent-hover', 'var(--oc-primary-600)');
        root.style.setProperty('--bg-primary', 'var(--oc-surface-base)');
        root.style.setProperty('--bg-secondary', 'var(--oc-primary-50)');
        root.style.setProperty('--card-bg', 'var(--oc-surface-card)');
        root.style.setProperty('--text-primary', 'var(--oc-text-primary)');
        root.style.setProperty('--text-secondary', 'var(--oc-text-secondary)');
        root.style.setProperty('--text-weak', 'var(--oc-text-tertiary)');
        root.style.setProperty('--border', 'var(--oc-border-default)');
        root.style.setProperty('--border-light', 'var(--oc-border-light)');
        // 注入 Ocean 专属扩展变量
        root.style.setProperty('--accent-dark', theme.accentDark);
        root.style.setProperty('--accent-deep', theme.accentDeep);
        root.style.setProperty('--accent-muted', theme.accentMuted);
        root.style.setProperty('--accent-pale', theme.accentPale);
        root.style.setProperty('--success-color', theme.successGreen);
        root.style.setProperty('--success-bg', 'rgba(26,152,142,0.12)');
        root.style.setProperty('--error-color', '#e05252');
        root.style.setProperty('--error-bg', 'rgba(224,82,82,0.12)');
        root.style.setProperty('--warning-color', '#e8a838');
        root.style.setProperty('--warning-bg', 'rgba(232,168,56,0.12)');
        root.style.setProperty('--gold-color', '#e8a838');
        root.style.setProperty('--fire-color', theme.coralColor);
        root.style.setProperty('--tree-color', theme.successGreen);
        root.style.setProperty('--tree-color-light', '#36b0a8');
        root.style.setProperty('--tree-color-dark', '#147a72');
        root.style.setProperty('--tree-bg', 'rgba(26,152,142,0.10)');
        root.style.setProperty('--tag-work', 'rgba(36,113,184,0.14)');
        root.style.setProperty('--tag-life', 'rgba(232,96,76,0.14)');
        root.style.setProperty('--tag-grow', 'rgba(26,152,142,0.14)');
        root.style.setProperty('--tag-important', 'rgba(36,113,184,0.18)');
        root.style.setProperty('--shadow', 'var(--shadow-sm)');
        root.style.setProperty('--shadow-lg', 'var(--shadow-lg)');

        // 圆角映射
        root.style.setProperty('--radius-lg', theme.radiusLg);
        root.style.setProperty('--radius-md', theme.radiusMd);
        root.style.setProperty('--radius-sm', theme.radiusSm);
        root.style.setProperty('--radius-pill', theme.radiusPill);

        // 检查系统暗色偏好 → Ocean Dark
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark && this.darkMode) {
          root.setAttribute('data-theme', 'ocean-dark');
          root.classList.add('theme-ocean-dark');
        }
      } else {
        // ── 非 Ocean: 直接注入变量 ──
        root.style.setProperty('--accent', theme.accent);
        root.style.setProperty('--accent-hover', theme.accentHover);
        root.style.setProperty('--bg-primary', theme.bgPrimary);
        root.style.setProperty('--bg-secondary', theme.bgSecondary);
        root.style.setProperty('--card-bg', theme.cardBg);
        root.style.setProperty('--text-primary', theme.textPrimary);
        root.style.setProperty('--text-secondary', theme.textSecondary);
        root.style.setProperty('--text-weak', theme.textWeak);
        root.style.setProperty('--border', theme.border);
        root.style.setProperty('--border-light', theme.borderLight);
      }

      // ── 通用扩展变量注入（flat-green / ocean-design 共享）──
      if (isOcean || isFlatGreen) {
        const extVars = [
          'accentDark','accentDeep','accentMuted','accentPale','successGreen','streakFire','tagBg',
          'radiusXs','radiusSm','radiusMd','radiusLg','radiusXl','radius2xl','radiusPill',
          'shadowXs','shadowSm','shadowMd','shadowLg','shadowXl','shadowFocus',
          'darkBgPrimary','darkBgSecondary','darkCardBg','darkTextPrimary','darkTextSecondary','darkTextWeak','darkBorder','darkBorderLight'
        ];
        extVars.forEach(k => {
          if (theme[k] !== undefined) {
            root.style.setProperty('--' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), theme[k]);
          }
        });
      }

      // 标记当前主题类型
      if (!isOcean) {
        root.setAttribute('data-theme', this.themePreset || '');
      }

      // Flat-Green 暗色模式
      if (isFlatGreen) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.setAttribute('data-theme', 'flat-green-dark');
          const darkVars = {
            '--bg-primary': theme.darkBgPrimary || '#141A0C',
            '--bg-secondary': theme.darkBgSecondary || '#1E2A12',
            '--card-bg': theme.darkCardBg || '#26331A',
            '--text-primary': theme.darkTextPrimary || '#F0F7E8',
            '--text-secondary': theme.darkTextSecondary || '#A8C86F',
            '--text-weak': theme.darkTextWeak || '#6B8045',
            '--border': theme.darkBorder || '#2A3A1A',
            '--border-light': theme.darkBorderLight || '#1E2A12',
            '--accent': '#8FB54A',
            '--accent-hover': '#A8C86F',
            '--shadow': 'none',
            '--shadow-lg': '0 8px 24px rgba(0,0,0,0.35)',
          };
          Object.entries(darkVars).forEach(([k, v]) => root.style.setProperty(k, v));
        }
      }

      // 同步更新meta theme-color
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = theme.bgPrimary;
    },

    initCustomTheme() {
      // 初始化自定义主题默认值（基于当前颜色）
      const style = getComputedStyle(document.documentElement);
      this.customTheme = {
        accent: style.getPropertyValue('--accent').trim(),
        accentHover: style.getPropertyValue('--accent-hover').trim(),
        bgPrimary: style.getPropertyValue('--bg-primary').trim(),
        bgSecondary: style.getPropertyValue('--bg-secondary').trim(),
        cardBg: style.getPropertyValue('--card-bg').trim(),
        textPrimary: style.getPropertyValue('--text-primary').trim(),
        textSecondary: style.getPropertyValue('--text-secondary').trim(),
        textWeak: style.getPropertyValue('--text-weak').trim(),
        border: style.getPropertyValue('--border').trim(),
        borderLight: style.getPropertyValue('--border-light').trim(),
      };
    },

    loadTheme() {
      // 加载已保存的主题设置
      const preset = this.settings.themePreset;
      const custom = this.settings.customTheme;
      if (custom) {
        this.customTheme = custom;
        this.themePreset = 'custom';
        this._injectThemeCSS(custom);
      } else if (preset && this.themePresets[preset]) {
        this.themePreset = preset;
        this._injectThemeCSS(this.themePresets[preset]);
      } else {
        // 默认使用 gentle
        this.themePreset = 'gentle';
      }
    },

    // ========== 用户认证系统 ==========

    async hashPassword(password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + 'pj_salt_2026');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    loadAuth() {
      try {
        const authData = JSON.parse(localStorage.getItem('pj_auth') || '{}');
        const sessionToken = localStorage.getItem('pj_session');

        // 优先尝试恢复会话（sessionToken 存在即视为已登录，无需重新输入密码）
        if (authData.currentUser && sessionToken) {
          const user = authData.users?.[authData.currentUser];
          if (user) {
            // 验证会话是否过期（7天）
            const sessionData = JSON.parse(sessionToken);
            const now = Date.now();
            const sessionAge = now - (sessionData.createdAt || 0);
            const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7天

            if (sessionAge < SESSION_MAX_AGE && sessionData.username === user.username) {
              this.authUser = { username: user.username, remember: true };
              this.authState = 'active';
              this.authForm.username = user.username;
              // 刷新会话时间
              localStorage.setItem('pj_session', JSON.stringify({
                username: user.username,
                createdAt: now
              }));
              return;
            } else {
              // 会话过期，清除
              localStorage.removeItem('pj_session');
            }
          }
        }

        // 降级：仅 currentUser 标记（旧逻辑兼容）
        if (authData.currentUser) {
          const user = authData.users?.[authData.currentUser];
          if (user) {
            this.authUser = { username: user.username, remember: user.remember };
            this.authState = 'active';
            if (user.remember) {
              this.authForm.username = user.username;
            }
            // 为新会话创建 token
            localStorage.setItem('pj_session', JSON.stringify({
              username: user.username,
              createdAt: Date.now()
            }));
            return;
          }
        }

        // 如果没有用户数据但已有个人数据，允许免登录访问（向后兼容）
        const existingData = localStorage.getItem('personal_journey');
        if (existingData && existingData.length > 10) {
          this.authState = 'active';
          this.authUser = null; // 未注册但可使用
          return;
        }
      } catch(e) {}
      // ===== 开发者后门：无用户数据时自动以开发者身份登录 =====
      this.authState = 'active';
      this.authUser = { username: '开发者', remember: true };
      console.log('[个人之旅] 开发者模式已激活，免登录进入');
    },

    authCheckPasswordStrength() {
      const pw = this.authRegForm.password;
      let score = 0;
      if (pw.length >= 6) score++;
      if (pw.length >= 10 && /[a-zA-Z]/.test(pw) && /\d/.test(pw)) score++;
      if (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score++;
      this.passwordStrength = score;
      const classes = ['', 'strength-weak', 'strength-medium', 'strength-strong'];
      const labels = ['', '弱', '中等', '强'];
      this.passwordStrengthClass = classes[score] || '';
      this.passwordStrengthLabel = labels[score] ? '密码强度: ' + labels[score] : '';
    },

    async authRegister() {
      this.authError = '';
      this.authRegForm.usernameErr = '';
      this.authRegForm.passwordErr = '';
      this.authRegForm.confirmErr = '';

      const { username, password, confirmPassword, securityQuestion } = this.authRegForm;
      if (!username || username.length < 3 || username.length > 20) {
        this.authRegForm.usernameErr = '用户名需3-20个字符';
        return;
      }
      if (/[^a-zA-Z0-9_\u4e00-\u9fa5]/.test(username)) {
        this.authRegForm.usernameErr = '仅支持中文、英文、数字和下划线';
        return;
      }
      if (!password || password.length < 6) {
        this.authRegForm.passwordErr = '密码至少6位';
        return;
      }
      if (password !== confirmPassword) {
        this.authRegForm.confirmErr = '两次密码不一致';
        return;
      }
      if (!securityQuestion) {
        this.authError = '请填写安全问题（用于密码重置）';
        return;
      }

      try {
        const authData = JSON.parse(localStorage.getItem('pj_auth') || '{"users":{}}');
        if (authData.users && authData.users[username]) {
          this.authError = '用户名已存在';
          return;
        }
        if (!authData.users) authData.users = {};

        const hashedPw = await this.hashPassword(password);
        const hashedSecurity = await this.hashPassword(securityQuestion);

        authData.users[username] = {
          username,
          passwordHash: hashedPw,
          securityHash: hashedSecurity,
          remember: this.authRegForm.remember,
          createdAt: new Date().toISOString(),
        };
        authData.currentUser = username;
        localStorage.setItem('pj_auth', JSON.stringify(authData));

        this.authUser = { username, remember: this.authRegForm.remember };
        this.authState = 'active';
        this.authRegForm = { username: '', usernameErr: '', password: '', passwordErr: '', confirmPassword: '', confirmErr: '', securityQuestion: '', remember: true };
        this.showToast('注册成功，欢迎使用个人之旅', 'success');
        // 初始化新用户数据
        this.seedDemoData();
        this.cloneRecurringTasks();
        this.checkDarkMode();
        this.generateAiTip();
        this.registerSW();
        this.showPWAInstallPrompt();
        this.reviewReminder = !this.todayCheckedIn();
        this.initIOExportTables();
        this.loadIOLogs();
        this.loadBackups();
        this.initAutoLock();
      } catch(e) {
        this.authError = '注册失败：' + e.message;
      }
    },

    async authLogin() {
      this.authError = '';
      const { username, password, remember } = this.authForm;
      if (!username || !password) {
        this.authError = '请输入用户名和密码';
        return;
      }
      try {
        const authData = JSON.parse(localStorage.getItem('pj_auth') || '{"users":{}}');
        const user = authData.users?.[username];
        if (!user) {
          this.authError = '用户不存在';
          return;
        }
        const hashedPw = await this.hashPassword(password);
        if (user.passwordHash !== hashedPw) {
          this.authError = '密码错误';
          return;
        }
        // 更新记住密码
        user.remember = remember;
        authData.currentUser = username;
        localStorage.setItem('pj_auth', JSON.stringify(authData));

        // 创建会话 token（支持免密自动登录）
        localStorage.setItem('pj_session', JSON.stringify({
          username: username,
          createdAt: Date.now()
        }));

        this.authUser = { username, remember };
        this.authState = 'active';
        this.authForm.password = '';
        localStorage.setItem('pj_last_login', Date.now().toString());
        this.loadData();
        this.runMigrationIfNeeded();
        this.cloneRecurringTasks();
        this.checkDarkMode();
        this.generateAiTip();
        this.registerSW();
        this.showPWAInstallPrompt();
        this.reviewReminder = !this.todayCheckedIn();
        this.initIOExportTables();
        this.loadIOLogs();
        this.loadBackups();
        this.initAutoLock();
        this.showToast('登录成功', 'success');
      } catch(e) {
        this.authError = '登录失败：' + e.message;
      }
    },

    async authUnlock() {
      this.authLockError = '';
      if (!this.authLockPassword) {
        this.authLockError = '请输入密码';
        return;
      }
      try {
        const authData = JSON.parse(localStorage.getItem('pj_auth') || '{"users":{}}');
        const user = authData.users?.[this.authUser.username];
        if (!user) {
          this.authLockError = '用户数据异常';
          return;
        }
        const hashedPw = await this.hashPassword(this.authLockPassword);
        if (user.passwordHash !== hashedPw) {
          this.authLockError = '密码错误';
          return;
        }
        this.authLocked = false;
        this.authLockPassword = '';
        this.showToast('解锁成功', 'success');
      } catch(e) {
        this.authLockError = '解锁失败';
      }
    },

    authLockApp() {
      this.authLocked = true;
      this.authLockPassword = '';
      this.authLockError = '';
    },

    authLogout() {
      this.authState = 'unauth';
      this.authUser = null;
      this.authLocked = false;
      this.authLockPassword = '';
      this.authLockError = '';
      this.authError = '';
      // 清除当前用户标记但保留数据
      const authData = JSON.parse(localStorage.getItem('pj_auth') || '{}');
      delete authData.currentUser;
      localStorage.setItem('pj_auth', JSON.stringify(authData));
      // 清除会话 token
      localStorage.removeItem('pj_session');
    },

    async authResetPassword() {
      this.authError = '';
      const { username, securityAnswer, newPassword } = this.authResetForm;
      if (!username || !securityAnswer || !newPassword) {
        this.authError = '请填写所有字段';
        return;
      }
      if (newPassword.length < 6) {
        this.authError = '新密码至少6位';
        return;
      }
      try {
        const authData = JSON.parse(localStorage.getItem('pj_auth') || '{"users":{}}');
        const user = authData.users?.[username];
        if (!user) {
          this.authError = '用户不存在';
          return;
        }
        const hashedAnswer = await this.hashPassword(securityAnswer);
        if (user.securityHash !== hashedAnswer) {
          this.authError = '安全问题答案错误';
          return;
        }
        user.passwordHash = await this.hashPassword(newPassword);
        localStorage.setItem('pj_auth', JSON.stringify(authData));
        this.authShowReset = false;
        this.authResetForm = { username: '', securityAnswer: '', newPassword: '' };
        this.showToast('密码重置成功，请使用新密码登录', 'success');
      } catch(e) {
        this.authError = '重置失败：' + e.message;
      }
    },

    // ========== 数据导入导出 ==========

    initIOExportTables() {
      this.ioExportTables = [
        { key: 'goals', name: '目标', count: this.goals.length, checked: true },
        { key: 'tasks', name: '任务', count: this.tasks.length, checked: true },
        { key: 'pomodoros', name: '番茄钟', count: this.pomodoros.length, checked: true },
        { key: 'contacts', name: '人脉', count: this.contacts.length, checked: true },
        { key: 'checkins', name: '打卡', count: this.checkins.length, checked: true },
        { key: 'weeklyHighlights', name: '高光时刻', count: this.weeklyHighlights.length, checked: true },
        { key: 'memoryItems', name: '智能记忆', count: this.memoryItems.length, checked: true },
        { key: 'nlpTemplates', name: 'NLP模板', count: this.nlpTemplates.length, checked: true },
        { key: 'nlpHistory', name: 'NLP历史', count: this.nlpHistory.length, checked: false },
        { key: 'settings', name: '设置', count: Object.keys(this.settings).length, checked: false },
      ];
    },

    loadIOLogs() {
      try {
        this.ioLogs = JSON.parse(localStorage.getItem('pj_io_logs') || '[]');
      } catch(e) { this.ioLogs = []; }
    },

    saveIOLogs() {
      // 仅保留最近200条
      if (this.ioLogs.length > 200) this.ioLogs = this.ioLogs.slice(-200);
      localStorage.setItem('pj_io_logs', JSON.stringify(this.ioLogs));
    },

    addIOLog(msg, type = 'info') {
      const now = new Date();
      const time = now.toLocaleTimeString('zh-CN', { hour12: false });
      this.ioLogs.push({ id: Date.now() + Math.random(), time, msg, type });
      this.saveIOLogs();
    },

    ioReset() {
      this.ioExportResult = null;
      this.ioImportPreview = null;
      this.ioConflicts = [];
      this.ioImporting = false;
      this.ioImportProgress = 0;
      this.ioImportStatusText = '';
      this.ioImportResult = null;
      this.ioImportParsedData = null;
      this.ioDragover = false;
    },

    async ioExport() {
      const selected = this.ioExportTables.filter(t => t.checked);
      if (selected.length === 0) {
        this.ioExportResult = { type: 'warning', msg: '请至少选择一个数据表' };
        return;
      }

      try {
        const exportData = {};
        const tableMap = {
          goals: () => this.goals,
          tasks: () => this.tasks,
          pomodoros: () => this.pomodoros,
          contacts: () => this.contacts,
          checkins: () => this.checkins,
          weeklyHighlights: () => this.weeklyHighlights,
          memoryItems: () => this.memoryItems,
          nlpTemplates: () => this.nlpTemplates,
          nlpHistory: () => this.nlpHistory,
          settings: () => this.settings,
        };

        selected.forEach(t => { exportData[t.key] = tableMap[t.key](); });

        // 添加元数据
        exportData._meta = {
          version: this.dataVersion,
          exportTime: new Date().toISOString(),
          app: 'personal-journey',
          tables: selected.map(t => t.key),
        };

        const format = this.ioExportFormat;
        let blob, fileName;

        if (format === 'json') {
          blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          fileName = '个人之旅_完整备份_' + new Date().toISOString().slice(0, 10) + '.json';
        } else if (format === 'csv') {
          // 每个表一个CSV文件，打包为单个CSV
          let csvContent = '';
          selected.forEach(t => {
            const data = tableMap[t.key]();
            if (!Array.isArray(data) || data.length === 0) return;
            csvContent += '\n=== ' + t.name + ' (' + t.key + ') ===\n';
            const headers = Object.keys(data[0]).filter(k => !k.startsWith('_'));
            csvContent += headers.join(',') + '\n';
            data.forEach(row => {
              csvContent += headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                const str = String(val);
                return str.includes(',') || str.includes('"') || str.includes('\n')
                  ? '"' + str.replace(/"/g, '""') + '"'
                  : str;
              }).join(',') + '\n';
            });
          });
          blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
          fileName = '个人之旅_导出_' + new Date().toISOString().slice(0, 10) + '.csv';
        } else if (format === 'excel' && typeof XLSX !== 'undefined') {
          const wb = XLSX.utils.book_new();
          selected.forEach(t => {
            const data = tableMap[t.key]();
            if (!Array.isArray(data)) return;
            if (data.length > 0) {
              const ws = XLSX.utils.json_to_sheet(data);
              // 截断sheet名
              const sheetName = t.name.substring(0, 31);
              XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
          });
          const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          blob = new Blob([wbout], { type: 'application/octet-stream' });
          fileName = '个人之旅_导出_' + new Date().toISOString().slice(0, 10) + '.xlsx';
        } else {
          this.ioExportResult = { type: 'error', msg: 'Excel库未加载，请使用JSON或CSV格式' };
          return;
        }

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);

        this.ioExportResult = { type: 'success', msg: '导出成功！' + selected.length + ' 个数据表，格式: ' + format.toUpperCase() };
        this.addIOLog('导出 ' + selected.length + ' 个表 (' + format.toUpperCase() + ')', 'success');
      } catch(e) {
        this.ioExportResult = { type: 'error', msg: '导出失败: ' + e.message };
        this.addIOLog('导出失败: ' + e.message, 'error');
      }
    },

    ioSelectFile(event) {
      const file = event.target.files[0];
      if (file) this.ioProcessFile(file);
      event.target.value = '';
    },

    ioHandleDrop(event) {
      this.ioDragover = false;
      const file = event.dataTransfer.files[0];
      if (file) this.ioProcessFile(file);
    },

    async ioProcessFile(file) {
      this.addIOLog('开始处理文件: ' + file.name, 'info');
      this.ioImportPreview = null;
      this.ioConflicts = [];
      this.ioImportResult = null;

      const ext = file.name.split('.').pop().toLowerCase();
      let format = ext;
      if (['xls', 'xlsx'].includes(ext)) format = 'excel';

      const sizeKB = (file.size / 1024).toFixed(1);
      const tables = [];

      try {
        if (format === 'json') {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data._meta) data._meta = { version: 0, app: 'unknown' };

          const tableNames = {
            goals: '目标', tasks: '任务', pomodoros: '番茄钟',
            contacts: '人脉', checkins: '打卡', weeklyHighlights: '高光时刻',
            memoryItems: '智能记忆',
            nlpTemplates: 'NLP模板', nlpHistory: 'NLP历史', settings: '设置',
          };

          Object.keys(data).forEach(key => {
            if (key.startsWith('_')) return;
            const items = Array.isArray(data[key]) ? data[key] : [data[key]];
            if (tableNames[key]) {
              tables.push({ key, name: tableNames[key], count: items.length, selected: true, hasConflict: false });
            } else {
              tables.push({ key, name: key, count: items.length, selected: false, hasConflict: false });
            }
          });

          this.ioImportParsedData = data;
          this.addIOLog('解析JSON成功: ' + tables.length + ' 个数据表', 'success');
        } else if (format === 'csv') {
          const text = await file.text();
          // 解析CSV（支持分段格式和标准格式）
          const parsed = this.parseCSV(text);
          Object.keys(parsed).forEach(key => {
            tables.push({ key, name: key, count: parsed[key].length, selected: true, hasConflict: false });
          });
          this.ioImportParsedData = parsed;
          this.addIOLog('解析CSV成功: ' + tables.length + ' 个数据表', 'success');
        } else if (format === 'excel' && typeof XLSX !== 'undefined') {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          wb.SheetNames.forEach(sheetName => {
            const sheet = wb.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet);
            tables.push({ key: sheetName, name: sheetName, count: data.length, selected: true, hasConflict: false });
            if (!this.ioImportParsedData) this.ioImportParsedData = {};
            this.ioImportParsedData[sheetName] = data;
          });
          this.addIOLog('解析Excel成功: ' + tables.length + ' 个工作表', 'success');
        } else {
          this.ioImportResult = { type: 'error', msg: '不支持的文件格式或库未加载' };
          return;
        }

        // 检测冲突
        this.ioDetectConflicts(tables);

        this.ioImportPreview = {
          fileName: file.name,
          format,
          size: sizeKB,
          tables,
        };
      } catch(e) {
        this.ioImportResult = { type: 'error', msg: '文件解析失败: ' + e.message };
        this.addIOLog('文件解析失败: ' + e.message, 'error');
      }
    },

    parseCSV(text) {
      // 尝试解析带===分隔的多表CSV，否则作为单表
      const result = {};
      const sections = text.split(/^=== .+ ===$/m);
      if (sections.length > 1) {
        // 多表格式
        const names = text.match(/^=== (.+?) \((\w+)\) ===$/gm) || [];
        names.forEach((match, idx) => {
          const keyMatch = match.match(/\((\w+)\)/);
          const nameMatch = match.match(/=== (.+?) \(/);
          const key = keyMatch ? keyMatch[1] : 'table_' + idx;
          const content = sections[idx + 1]?.trim();
          if (content) result[key] = this.parseCSVSection(content);
        });
      } else {
        // 单表
        result['imported'] = this.parseCSVSection(text.trim());
      }
      return result;
    },

    parseCSVSection(csvText) {
      const lines = csvText.split('\n').filter(l => l.trim());
      if (lines.length < 2) return [];
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      return lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        values.push(current.trim());
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
        return obj;
      });
    },

    ioDetectConflicts(tables) {
      this.ioConflicts = [];
      if (!this.ioImportParsedData) return;

      tables.forEach(table => {
        if (!table.selected) return;
        const importData = this.ioImportParsedData[table.key];
        if (!Array.isArray(importData)) return;

        const existingData = this[table.key];
        if (!Array.isArray(existingData)) return;

        // 通过ID或title检测冲突
        importData.forEach(item => {
          const matchById = existingData.find(e => e.id === item.id);
          const matchByTitle = item.title ? existingData.find(e => e.title === item.title) : null;
          if (matchById || matchByTitle) {
            this.ioConflicts.push({
              id: item.id || Date.now() + Math.random(),
              type: table.name,
              title: item.title || item.id || '未知',
              existing: matchById ? matchById.title || matchById.id : (matchByTitle ? matchByTitle.title : '未知'),
              incoming: item.title || item.id || '未知',
              action: 'overwrite',
              importKey: table.key,
              importItem: item,
            });
            table.hasConflict = true;
          }
        });
      });
    },

    ioUpdateConflict(c) {
      // 更新冲突处理方式
      const idx = this.ioConflicts.findIndex(x => x.id === c.id);
      if (idx >= 0) this.ioConflicts[idx].action = c.action;
    },

    async ioImportExecute() {
      if (!this.ioImportParsedData || !this.ioImportPreview) return;

      const selectedTables = this.ioImportPreview.tables.filter(t => t.selected);
      if (selectedTables.length === 0) {
        this.ioImportResult = { type: 'warning', msg: '请至少选择一个数据表' };
        return;
      }

      this.ioImporting = true;
      this.ioImportProgress = 0;
      this.ioImportStatusText = '准备导入...';
      this.addIOLog('开始导入 ' + selectedTables.length + ' 个数据表', 'info');

      let totalImported = 0;
      let totalSkipped = 0;
      let totalOverwritten = 0;

      try {
        for (let i = 0; i < selectedTables.length; i++) {
          const table = selectedTables[i];
          this.ioImportProgress = Math.round(((i + 0.5) / selectedTables.length) * 100);
          this.ioImportStatusText = '正在导入: ' + table.name;

          const importData = this.ioImportParsedData[table.key];
          if (!importData) continue;

          // 获取该表的冲突项
          const tableConflicts = this.ioConflicts.filter(c => c.importKey === table.key);

          if (Array.isArray(importData)) {
            if (Array.isArray(this[table.key])) {
              // 合并到现有数组
              const existing = [...this[table.key]];
              importData.forEach(item => {
                const conflict = tableConflicts.find(c => c.importItem === item || c.id === item.id);
                if (conflict) {
                  if (conflict.action === 'overwrite' || conflict.action === 'merge') {
                    const idx = existing.findIndex(e => e.id === item.id || (item.title && e.title === item.title));
                    if (idx >= 0) {
                      if (conflict.action === 'merge') {
                        existing[idx] = { ...existing[idx], ...item, id: existing[idx].id };
                      } else {
                        existing[idx] = item;
                      }
                      totalOverwritten++;
                    } else {
                      existing.push(item);
                      totalImported++;
                    }
                  } else if (conflict.action === 'rename') {
                    item.title = item.title + ' (导入)';
                    existing.push(item);
                    totalImported++;
                  } else {
                    totalSkipped++;
                  }
                } else {
                  // 新数据，直接追加
                  if (!item.id) item.id = 'imp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                  existing.push(item);
                  totalImported++;
                }
              });
              this[table.key] = existing;
            } else {
              // 非数组字段（如settings），合并
              this[table.key] = { ...this[table.key], ...importData };
              totalImported++;
            }
          }

          // 每处理一个表后保存
          this.saveData();
          this.addIOLog('导入 ' + table.name + ' 完成', 'success');
        }

        this.ioImportProgress = 100;
        this.ioImportStatusText = '导入完成';

        // 刷新导出表计数
        this.initIOExportTables();

        const summary = '导入完成: 新增 ' + totalImported + ' 条, 覆盖 ' + totalOverwritten + ' 条, 跳过 ' + totalSkipped + ' 条';
        this.ioImportResult = { type: 'success', msg: summary };
        this.addIOLog(summary, 'success');
      } catch(e) {
        this.ioImportResult = { type: 'error', msg: '导入失败: ' + e.message };
        this.addIOLog('导入失败: ' + e.message, 'error');
      } finally {
        this.ioImporting = false;
      }
    },

    // ========== 版本迁移与数据保护 ==========

    loadBackups() {
      try {
        this.backups = JSON.parse(localStorage.getItem('pj_backups') || '[]');
      } catch(e) { this.backups = []; }
    },

    saveBackups() {
      localStorage.setItem('pj_backups', JSON.stringify(this.backups));
    },

    createBackup() {
      try {
        const data = localStorage.getItem('personal_journey') || '{}';
        const label = new Date().toLocaleString('zh-CN');
        const size = (new Blob([data]).size / 1024).toFixed(1) + ' KB';
        this.backups.push({ label, size, data, createdAt: Date.now() });
        // 最多保留5个备份
        if (this.backups.length > 5) this.backups = this.backups.slice(-5);
        this.saveBackups();
        this.showToast('备份创建成功', 'success');
        this.addIOLog('创建备份: ' + label, 'success');
      } catch(e) {
        this.showToast('备份失败: ' + e.message, 'error');
        this.addIOLog('备份失败: ' + e.message, 'error');
      }
    },

    downloadBackup(bk) {
      const blob = new Blob([bk.data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '个人之旅_备份_' + bk.label.replace(/[\/\\:\s]/g, '_') + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      this.addIOLog('下载备份: ' + bk.label, 'info');
    },

    deleteBackup(idx) {
      if (!confirm('确定删除此备份？')) return;
      this.backups.splice(idx, 1);
      this.saveBackups();
      this.showToast('备份已删除', 'info');
    },

    restoreBackup(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data._meta && !data.goals && !data.tasks) {
            this.showToast('无效的备份文件', 'error');
            return;
          }
          // 先创建当前数据备份
          this.createBackup();
          // 然后恢复
          if (data.goals) this.goals = data.goals;
          if (data.tasks) this.tasks = data.tasks;
          if (data.pomodoros) this.pomodoros = data.pomodoros;
          if (data.contacts) this.contacts = data.contacts;
          if (data.checkins) this.checkins = data.checkins;
          if (data.settings) this.settings = { ...this.settings, ...data.settings };
          if (data.weeklyHighlights) this.weeklyHighlights = data.weeklyHighlights;
          if (data.nlpTemplates) this.nlpTemplates = data.nlpTemplates;
          if (data.nlpHistory) this.nlpHistory = data.nlpHistory;
          if (data._meta && data._meta.version) this.dataVersion = data._meta.version;
          this.saveData();
          this.initIOExportTables();
          this.showToast('备份恢复成功', 'success');
          this.addIOLog('恢复备份: ' + file.name, 'success');
        } catch(err) {
          this.showToast('恢复失败: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    },

    runMigrationIfNeeded() {
      // 从数据中读取版本
      try {
        const d = JSON.parse(localStorage.getItem('personal_journey') || '{}');
        const savedVersion = d._version || 1;
        this.dataVersion = savedVersion;
      } catch(e) {
        this.dataVersion = 1;
      }

      if (this.dataVersion < CURRENT_SCHEMA_VERSION) {
        this.runMigration();
      }
    },

    async runMigration() {
      this.isMigrating = true;
      this.migrationLog = [];
      this.migrationResult = null;

      try {
        let d = JSON.parse(localStorage.getItem('personal_journey') || '{}');
        const fromVersion = d._version || 1;
        let toVersion = fromVersion;

        // 版本迁移注册表
        const migrations = [
          {
            from: 1, to: 2,
            description: 'V1→V2: 添加索引和校验字段',
            async migrate(data) {
              // 为缺失id的数据添加id
              const addIds = (arr, prefix) => {
                arr.forEach((item, idx) => {
                  if (!item.id) item.id = prefix + '_' + Date.now() + '_' + idx;
                });
              };
              if (data.goals) addIds(data.goals, 'g');
              if (data.tasks) addIds(data.tasks, 't');
              if (data.contacts) addIds(data.contacts, 'c');
              if (data.checkins) addIds(data.checkins, 'ch');
              return data;
            }
          },
          {
            from: 2, to: 3,
            description: 'V2→V3: 标准化时间格式，修复古旧数据',
            async migrate(data) {
              // 确保所有任务有date字段
              if (data.tasks) {
                data.tasks.forEach(t => {
                  if (!t.date) {
                    const today = new Date().toISOString().slice(0, 10);
                    t.date = today;
                  }
                  if (!t.createdAt) t.createdAt = new Date().toISOString();
                });
              }
              // 确保checkins有正确格式
              if (data.checkins) {
                data.checkins.forEach(c => {
                  if (!c.id) c.id = 'ch_' + c.date;
                });
              }
              return data;
            }
          },
        ];

        for (const migration of migrations) {
          if (toVersion < migration.to) {
            this.migrationLog.push({
              time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
              type: 'info',
              msg: '执行: ' + migration.description,
            });

            try {
              d = await migration.migrate(d);
              toVersion = migration.to;
              this.migrationLog.push({
                time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                type: 'success',
                msg: '完成: ' + migration.description,
              });
            } catch(err) {
              this.migrationLog.push({
                time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                type: 'error',
                msg: '失败: ' + migration.description + ' - ' + err.message,
              });
              throw err;
            }
          }
        }

        d._version = toVersion;
        localStorage.setItem('personal_journey', JSON.stringify(d));
        this.dataVersion = toVersion;

        // 加载更新后的数据
        this.loadData();
        this.initIOExportTables();

        // 记录迁移历史
        const migrationRecord = {
          from: fromVersion,
          to: toVersion,
          status: '成功',
          time: new Date().toLocaleString('zh-CN'),
        };
        this.migrationHistory.push(migrationRecord);
        localStorage.setItem('pj_migration_history', JSON.stringify(this.migrationHistory));
        this.lastMigrationDate = migrationRecord.time;

        this.migrationResult = { type: 'success', msg: '迁移完成: V' + fromVersion + ' → V' + toVersion };
        this.addIOLog('版本迁移: V' + fromVersion + ' → V' + toVersion, 'success');
      } catch(e) {
        this.migrationResult = { type: 'error', msg: '迁移失败: ' + e.message + '（数据已回滚，请重试）' };
        this.addIOLog('迁移失败: ' + e.message, 'error');
      } finally {
        this.isMigrating = false;
      }
    },

    async runIntegrityCheck() {
      this.integrityChecks = [
        { name: '目标数据完整性', status: 'pending', detail: '' },
        { name: '任务数据完整性', status: 'pending', detail: '' },
        { name: '打卡数据完整性', status: 'pending', detail: '' },
        { name: '人脉数据完整性', status: 'pending', detail: '' },
        { name: '设置数据完整性', status: 'pending', detail: '' },
        { name: '数据版本一致性', status: 'pending', detail: '' },
        { name: '存储空间检查', status: 'pending', detail: '' },
      ];

      await new Promise(r => setTimeout(r, 100));

      // 目标检查
      const goalsWithMissingKr = this.goals.filter(g => !g.kr || !Array.isArray(g.kr)).length;
      this.integrityChecks[0] = {
        name: '目标数据完整性',
        status: goalsWithMissingKr === 0 ? 'pass' : 'fail',
        detail: goalsWithMissingKr === 0 ? this.goals.length + ' 条正常' : goalsWithMissingKr + ' 条缺少KR字段',
      };

      // 任务检查
      const tasksWithoutDate = this.tasks.filter(t => !t.date).length;
      const tasksWithoutId = this.tasks.filter(t => !t.id).length;
      const taskIssues = tasksWithoutDate + tasksWithoutId;
      this.integrityChecks[1] = {
        name: '任务数据完整性',
        status: taskIssues === 0 ? 'pass' : 'fail',
        detail: taskIssues === 0 ? this.tasks.length + ' 条正常' : '缺少date:' + tasksWithoutDate + ', 缺少id:' + tasksWithoutId,
      };

      // 打卡检查
      const checkinsWithBadDate = this.checkins.filter(c => !c.date || !c.grade).length;
      this.integrityChecks[2] = {
        name: '打卡数据完整性',
        status: checkinsWithBadDate === 0 ? 'pass' : 'fail',
        detail: checkinsWithBadDate === 0 ? this.checkins.length + ' 条正常' : checkinsWithBadDate + ' 条异常',
      };

      // 人脉检查
      const contactsWithoutName = this.contacts.filter(c => !c.name).length;
      this.integrityChecks[3] = {
        name: '人脉数据完整性',
        status: contactsWithoutName === 0 ? 'pass' : 'fail',
        detail: contactsWithoutName === 0 ? this.contacts.length + ' 条正常' : contactsWithoutName + ' 条缺少名称',
      };

      // 设置检查
      const settingKeys = Object.keys(this.settings).length;
      this.integrityChecks[4] = {
        name: '设置数据完整性',
        status: settingKeys >= 0 ? 'pass' : 'fail',
        detail: settingKeys + ' 项设置',
      };

      // 版本检查
      this.integrityChecks[5] = {
        name: '数据版本一致性',
        status: this.dataVersion >= CURRENT_SCHEMA_VERSION ? 'pass' : 'fail',
        detail: '当前 V' + this.dataVersion + (this.dataVersion >= CURRENT_SCHEMA_VERSION ? ' (最新)' : ' (需迁移)'),
      };

      // 存储空间检查
      const storageSize = new Blob([localStorage.getItem('personal_journey') || '']).size;
      const sizeStr = storageSize > 1048576 ? (storageSize / 1048576).toFixed(1) + ' MB' : (storageSize / 1024).toFixed(1) + ' KB';
      const storagePercent = (storageSize / (5 * 1024 * 1024) * 100).toFixed(1);
      this.integrityChecks[6] = {
        name: '存储空间检查',
        status: storageSize < 4 * 1024 * 1024 ? 'pass' : 'fail',
        detail: sizeStr + ' (' + storagePercent + '% / 5MB)',
      };

      const passCount = this.integrityChecks.filter(c => c.status === 'pass').length;
      this.addIOLog('完整性检查: ' + passCount + '/' + this.integrityChecks.length + ' 通过', passCount === this.integrityChecks.length ? 'success' : 'warning');
    },

    // ========== Toast通知 ==========

    showToast(msg, type = 'info') {
      const container = document.querySelector('.toast-container');
      if (!container) return;
      const toastData = container.__x?.$data;
      if (toastData) {
        toastData.toasts.push({ id: Date.now() + Math.random(), msg, type, visible: true });
        setTimeout(() => {
          const t = toastData.toasts[0];
          if (t) { t.visible = false; setTimeout(() => toastData.toasts.shift(), 300); }
        }, 3000);
      }
    },

    // ========== 导航增强 ==========

    get migrationStatusText() {
      if (this.dataVersion >= CURRENT_SCHEMA_VERSION) return '数据版本最新，无需迁移';
      return '发现 V' + this.dataVersion + ' 数据，需迁移到 V' + CURRENT_SCHEMA_VERSION;
    },

    get dataStorageSize() {
      const data = localStorage.getItem('personal_journey') || '{}';
      const size = new Blob([data]).size;
      return size > 1048576 ? (size / 1048576).toFixed(1) + ' MB' : (size / 1024).toFixed(1) + ' KB';
    },

    // ===== AI建议 =====
    generateAiTip() {
      const now = new Date();
      const hour = now.getHours();
      let tip;
      if (hour < 10) {
        tip = { title: '早安，新的一天', desc: '早晨精力充沛，适合安排今天的核心任务。' };
      } else if (hour < 14) {
        const done = this.todayCompletedCount();
        const total = this.todayTasks().length;
        if (total > 0 && done === 0) {
          tip = { title: '该开始了', desc: '上午效率最高，先挑一项重要任务开始吧。' };
        } else if (done > 0 && done < total) {
          tip = { title: '节奏不错', desc: '已完成 ' + done + ' 项，继续保持。下午可以安排弹性任务。' };
        } else {
          tip = { title: '上午适合专注', desc: '你的精力曲线显示9-11点为峰值，建议优先处理核心任务。' };
        }
      } else if (hour < 18) {
        tip = { title: '午后提醒', desc: '下午精力可能下降，适合处理沟通和弹性任务。' };
      } else {
        const todayChecked = this.todayCheckedIn();
        tip = todayChecked
          ? { title: '今天辛苦了', desc: '已经打卡完成，剩下的时间留给自己吧。' }
          : { title: '别忘了打卡', desc: '睡前回顾一下今天，完成打卡记录。' };
      }
      this.aiTip = tip;
    },

    // ===== 精力状态 =====
    energyColor() {
      const done = this.todayCompletedCount();
      const total = this.todayTasks().length;
      if (total === 0) return 'var(--text-weak)';
      const ratio = done / total;
      if (ratio >= 0.7) return 'var(--accent)';
      if (ratio >= 0.3) return 'var(--task-color)';
      return 'var(--timeline-color)';
    },
    energyLabel() {
      const done = this.todayCompletedCount();
      const total = this.todayTasks().length;
      if (total === 0) return '今天还没有任务';
      const ratio = done / total;
      if (ratio >= 0.7) return '精力良好，节奏不错';
      if (ratio >= 0.3) return '进行中，保持节奏';
      return '刚起步，慢慢来';
    },

    // ===== 时间轴引擎 =====
    timelineBlocks() {
      const today = this.getTodayStr();
      let tasks = this.tasks
        .filter(t => t.date === today)
        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

      // V1.2 筛选
      if (this.timelineFilterTag) {
        tasks = tasks.filter(t => t.tags && t.tags.includes(this.timelineFilterTag));
      }
      if (this.timelineFilterType) {
        const typeMap = { fixed: '固定', flexible: '弹性' };
        tasks = tasks.filter(t => t.type === typeMap[this.timelineFilterType]);
      }

      if (tasks.length === 0) return [];

      const blocks = [];
      const moduleColors = {
        work: 'var(--task-color)',
        life: 'var(--contact-color)',
        grow: 'var(--goal-color)',
        important: 'var(--pomodoro-color)',
      };

      // 预设生活锚点
      const anchors = [
        { timeLabel: '07:00', timeRange: '07:00-08:00', title: '晨间 routine' },
        { timeLabel: '12:00', timeRange: '12:00-13:00', title: '午餐 & 休息' },
        { timeLabel: '18:00', timeRange: '18:00-19:00', title: '晚餐 & 放松' },
      ];

      // 插入锚点
      let anchorIdx = 0;
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const taskTime = t.time || '99:99';

        // 在任务前插入合适的生活锚点
        while (anchorIdx < anchors.length && anchors[anchorIdx].timeLabel <= taskTime.slice(0, 5)) {
          blocks.push({
            id: 'anchor-' + anchorIdx,
            type: 'anchor',
            timeLabel: anchors[anchorIdx].timeLabel,
            title: anchors[anchorIdx].title,
            timeRange: anchors[anchorIdx].timeRange,
          });
          anchorIdx++;
        }

        // 插入任务
        const taskType = t.type === '弹性' ? 'flexible' : 'fixed';
        blocks.push({
          id: t.id,
          type: taskType,
          timeLabel: t.time || '全天',
          title: t.title,
          duration: t.duration,
          tags: t.tags,
          completed: t.completed,
          locked: t.locked,
          recurring: t.recurring,
          color: moduleColors[t.tags[0]] || 'var(--accent)',
        });

        // 任务之间插入缓冲间隙
        if (i < tasks.length - 1) {
          const nextTime = tasks[i + 1].time || '99:99';
          if (taskTime !== nextTime) {
            const gapHeight = this.whiteSpaceEnabled ? Math.max(16, this.whiteSpaceRatio / 2) : 12;
            blocks.push({
              id: 'gap-' + i,
              type: 'gap',
              height: gapHeight,
              label: this.whiteSpaceEnabled ? '弹性缓冲 · ' + this.whiteSpaceRatio + '%留白' : '',
            });
          }
        }
      }

      // 插入剩余锚点
      while (anchorIdx < anchors.length) {
        blocks.push({
          id: 'anchor-' + anchorIdx,
          type: 'anchor',
          timeLabel: anchors[anchorIdx].timeLabel,
          title: anchors[anchorIdx].title,
          timeRange: anchors[anchorIdx].timeRange,
        });
        anchorIdx++;
      }

      return blocks;
    },

    toggleTaskById(taskId) {
      const t = this.tasks.find(t => t.id === taskId);
      if (t) { t.completed = !t.completed; t.completedAt = t.completed ? new Date().toISOString() : null; this.saveData(); }
    },
    toggleTaskType(block) {
      const t = this.tasks.find(t => t.id === block.id);
      if (t) { t.type = t.type === '固定' ? '弹性' : '固定'; this.saveData(); }
    },
    dragTask(block, e) {
      this._dragData = block;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', block.id);
    },
    dropTask(target, e) {
      if (!this._dragData || this._dragData.id === target.id) return;
      const src = this.tasks.find(t => t.id === this._dragData.id);
      const dst = this.tasks.find(t => t.id === target.id);
      if (!src || !dst) return;
      // 交换时间
      const tmpTime = src.time;
      src.time = dst.time;
      dst.time = tmpTime;
      this._dragData = null;
      this.saveData();
    },

    // ===== 目标管理 =====
    goalsByType(type) {
      return this.goals.filter(g => g.type === type && !g.parentId);
    },
    getSubGoals(parentId) {
      return this.goals.filter(g => g.parentId === parentId);
    },
    typeColor(type) {
      return { '年': 'var(--goal-color)', '季': 'var(--pomodoro-color)', '月': 'var(--task-color)', '周': 'var(--timeline-color)', '日': 'var(--accent)' }[type] || 'var(--accent)';
    },
    openGoalModal(goal = null) {
      this.editingGoal = goal;
      if (goal) {
        this.goalForm = {
          type: goal.type,
          title: goal.title,
          krText: goal.kr.join('\n'),
          parentId: goal.parentId || '',
          antiGoalsText: (goal.antiGoals || []).join('\n'),
        };
      } else {
        this.goalForm = { type: '年', title: '', krText: '', parentId: '', antiGoalsText: '' };
      }
      this.showGoalModal = true;
    },
    editGoal(goal) { this.openGoalModal(goal); },
    saveGoal() {
      const data = {
        id: this.editingGoal ? this.editingGoal.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type: this.goalForm.type,
        title: this.goalForm.title.trim(),
        kr: this.goalForm.krText.split('\n').filter(Boolean),
        parentId: this.goalForm.parentId || null,
        antiGoals: this.goalForm.antiGoalsText.split('\n').filter(Boolean),
        ifThen: [],
        createdAt: new Date().toISOString(),
      };
      if (!data.title) return;
      if (this.editingGoal) {
        const idx = this.goals.findIndex(g => g.id === this.editingGoal.id);
        if (idx >= 0) this.goals[idx] = { ...this.goals[idx], ...data };
      } else {
        this.goals.push(data);
      }
      this.showGoalModal = false;
      this.editingGoal = null;
      this.saveData();
    },
    deleteGoal(goal) {
      if (!confirm('确定删除"' + goal.title + '"及其所有子目标吗？')) return;
      const collect = (id) => {
        const ids = [id];
        this.goals.filter(g => g.parentId === id).forEach(g => ids.push(...collect(g.id)));
        return ids;
      };
      const ids = collect(goal.id);
      this.goals = this.goals.filter(g => !ids.includes(g.id));
      this.showGoalModal = false;
      this.editingGoal = null;
      this.saveData();
    },

    // ===== 任务管理 =====
    todayTasks() {
      const today = new Date().toISOString().slice(0, 10);
      return this.tasks.filter(t => t.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    },
    toggleTask(task) {
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      this.saveData();
    },
    toggleLock(task) {
      task.locked = !task.locked;
      this.saveData();
    },
    tagLabel(tag) {
      return { work: '工作', life: '生活', grow: '成长', important: '重要' }[tag] || tag;
    },
    quickAddTask() {
      if (!this.quickTaskForm.title.trim()) return;
      const today = new Date().toISOString().slice(0, 10);
      this.tasks.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: this.quickTaskForm.title.trim(),
        time: '今天',
        duration: 30,
        tags: [this.quickTaskForm.tag],
        priority: 'normal',
        type: '固定',
        locked: false,
        recurring: false,
        completed: false,
        date: today,
        createdAt: new Date().toISOString(),
      });
      this.quickTaskForm = { title: '', tag: 'work' };
      this.openQuickAdd = false;
      this.saveData();
    },

    // ===== NLP 智能输入引擎 =====
    _nlpTimer: null,
    nlpDebounce() {
      clearTimeout(this._nlpTimer);
      this._nlpTimer = setTimeout(() => this.parseNLP(), 300);
    },

    // ===== DeepSeek AI 核心 =====
    async callDeepSeek(messages, options = {}) {
      if (!this.aiEnabled || !this.aiApiKey) return null;
      try {
        const res = await fetch(this.aiBaseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.aiApiKey },
          body: JSON.stringify({
            model: this.aiModel,
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 800,
          })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.choices?.[0]?.message?.content || null;
      } catch (e) {
        console.warn('AI API call failed:', e);
        return null;
      }
    },

    // ===== AI 增强解析 =====
    async parseNLPWithAI() {
      const raw = this.nlpInput.trim();
      if (!raw || raw.length < 3) {
        this.nlpAiLoading = false;
        return;
      }
      this.nlpAiLoading = true;
      this.nlpAiError = '';

      const goals = this.goals.map(g => g.title).join('、') || '无';
      const recentTasks = this.todayTasks().slice(0, 5).map(t => t.title).join('、') || '无';

      const messages = [
        {
          role: 'system',
          content: `你是「个人之旅」App的智能任务解析助手。用户会用自然语言描述想做的事情，你需要提取结构化信息。

当前用户目标：${goals}
今日已有任务：${recentTasks}

请严格返回JSON格式（不要加markdown代码块）：
{
  "title": "任务标题（简洁，10字以内）",
  "time": "HH:MM（时间，如无法确定则为空字符串）",
  "duration": 数字（预计分钟数，5-480）,
  "priority": "normal或high或low",
  "tags": ["work"或"life"或"grow"]（数组，1-3个）,
  "type": "固定或弹性",
  "recurring": false,
  "goal_suggestion": "关联的目标标题（如果匹配某个目标，否则空字符串）",
  "suggested_goal_title": "关联目标显示名（如有关联）",
  "warning": "冲突或提醒（如有的话，否则空字符串）"
}`
        },
        { role: 'user', content: raw }
      ];

      const result = await this.callDeepSeek(messages, { temperature: 0.3, max_tokens: 300 });
      this.nlpAiLoading = false;

      if (result) {
        try {
          let jsonStr = result;
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) jsonStr = jsonMatch[0];
          const parsed = JSON.parse(jsonStr);

          this.nlpResult.title = parsed.title || this.nlpResult.title;
          if (parsed.time) this.nlpResult.time = parsed.time;
          if (parsed.duration) this.nlpResult.duration = Math.min(Math.max(parsed.duration, 5), 480);
          if (parsed.priority) {
            this.nlpResult.priority = parsed.priority;
            this.nlpResult.priorityLabel = parsed.priority === 'high' ? '高' : parsed.priority === 'low' ? '低' : '普通';
          }
          if (parsed.tags?.length) this.nlpResult.tags = parsed.tags;
          if (parsed.type) this.nlpResult.type = parsed.type;
          if (parsed.recurring) this.nlpResult.recurring = true;
          if (parsed.goal_suggestion) {
            this.nlpResult.suggestedGoal = parsed.goal_suggestion;
            this.nlpResult.suggestedGoalTitle = parsed.suggested_goal_title || parsed.goal_suggestion;
          }
          if (parsed.warning) this.nlpResult.warning = parsed.warning;
          return;
        } catch (e) {
          console.warn('AI NLP parse failed, falling back to regex');
        }
      }

      this.nlpAiError = 'AI 暂时无法解析，已使用本地解析';
      this.parseNLPRegex();
    },

    parseNLP() {
      const raw = this.nlpInput.trim();
      if (!raw) {
        this.nlpResult = { title: '', time: '', timeLabel: '', duration: 30, durationSource: '', priority: 'normal', priorityLabel: '普通', tags: [], type: '固定', recurring: false, locked: false, suggestedGoal: '', suggestedGoalTitle: '', warning: '' };
        this.nlpSuggestions = [];
        this.nlpMemoryHints = [];
        return;
      }
      // 先用正则做即时预览，然后异步调用 AI 增强
      this.parseNLPRegex();
      // 异步 AI 增强覆盖
      this.parseNLPWithAI();
    },
    parseNLPRegex() {
      const raw = this.nlpInput.trim();
      if (!raw) {
        this.nlpResult = { title: '', time: '', timeLabel: '', duration: 30, durationSource: '', priority: 'normal', priorityLabel: '普通', tags: [], type: '固定', recurring: false, locked: false, suggestedGoal: '', suggestedGoalTitle: '', warning: '' };
        this.nlpSuggestions = [];
        this.nlpMemoryHints = [];
        return;
      }

      let remaining = raw;
      const result = {
        title: '',
        time: '',
        timeLabel: '今天',
        duration: 30,
        durationSource: '',
        priority: 'normal',
        priorityLabel: '普通',
        tags: [],
        type: '固定',
        recurring: false,
        locked: false,
        suggestedGoal: '',
        suggestedGoalTitle: '',
        warning: '',
      };

      // 1. 提取标签 #tag
      const tagMap = { '工作': 'work', '生活': 'life', '成长': 'grow' };
      const tagRegex = /#(工作|生活|成长|work|life|grow)/g;
      let m;
      while ((m = tagRegex.exec(raw)) !== null) {
        const tag = tagMap[m[1]] || m[1];
        if (!result.tags.includes(tag)) result.tags.push(tag);
        remaining = remaining.replace(m[0], '');
      }
      if (result.tags.length === 0) result.tags.push('work');

      // 2. 提取优先级关键词
      const hiPrio = /重要|紧急|高优|优先|关键/g;
      const loPrio = /不急|低优|有空|随便/g;
      if (hiPrio.test(remaining)) {
        result.priority = 'high';
        result.priorityLabel = '高';
        remaining = remaining.replace(hiPrio, '');
      }
      if (loPrio.test(remaining)) {
        result.priority = 'low';
        result.priorityLabel = '低';
        remaining = remaining.replace(loPrio, '');
      }

      // 3. 提取时间信息
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      const timePatterns = [
        { regex: /明天\s*(早上|上午|中午|下午|晚上)?\s*(\d{1,2})[:：点](\d{0,2})?/g, handler: (m) => {
          const d = new Date(now); d.setDate(d.getDate() + 1);
          const h = parseInt(m[2]); const min = m[3] ? parseInt(m[3]) : 0;
          const am = m[1] && (m[1].includes('下午') || m[1].includes('晚上'));
          const hour = am && h < 12 ? h + 12 : h;
          result.time = d.toISOString().slice(0, 10) + 'T' + String(hour).padStart(2,'0') + ':' + String(min).padStart(2,'0');
          result.timeLabel = '明天 ' + String(hour).padStart(2,'0') + ':' + String(min).padStart(2,'0');
          return m[0];
        }},
        { regex: /后天/g, handler: () => {
          const d = new Date(now); d.setDate(d.getDate() + 2);
          result.time = d.toISOString().slice(0, 10) + 'T09:00';
          result.timeLabel = '后天 09:00';
          return '后天';
        }},
        { regex: /周([一二三四五六日天])\s*(\d{1,2})[:：点](\d{0,2})?/g, handler: (m) => {
          const dayMap = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':0,'天':0 };
          const target = dayMap[m[1]];
          const d = new Date(now);
          const current = d.getDay();
          let diff = target - current;
          if (diff <= 0) diff += 7;
          d.setDate(d.getDate() + diff);
          const h = parseInt(m[2]); const min = m[3] ? parseInt(m[3]) : 0;
          result.time = d.toISOString().slice(0, 10) + 'T' + String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
          result.timeLabel = '周' + m[1] + ' ' + String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
          return m[0];
        }},
        { regex: /(今天|今晚)?\s*(早上|上午|中午|下午|晚上|傍晚)?\s*(\d{1,2})[:：点](\d{0,2})?/g, handler: (m) => {
          let h = parseInt(m[3]); const min = m[4] ? parseInt(m[4]) : 0;
          const period = m[2] || '';
          if (period.includes('下午') || period.includes('晚上') || period.includes('傍晚')) {
            if (h < 12) h += 12;
          }
          result.time = today + 'T' + String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
          result.timeLabel = '今天 ' + String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
          return m[0];
        }},
        { regex: /(早上|上午|中午|下午|晚上|傍晚)/g, handler: (m) => {
          const periods = { '早上':'08:00', '上午':'09:00', '中午':'12:00', '下午':'14:00', '晚上':'19:00', '傍晚':'17:00' };
          result.time = today + 'T' + periods[m[1]];
          result.timeLabel = '今天 ' + periods[m[1]];
          return m[0];
        }},
      ];

      for (const p of timePatterns) {
        const match = p.regex.exec(remaining);
        if (match) {
          remaining = remaining.replace(p.handler(match), '');
          p.regex.lastIndex = 0;
          break;
        }
        p.regex.lastIndex = 0;
      }

      // 4. 提取时长
      const durPatterns = [
        { regex: /(\d+)\s*(小时|个?钟头|h|hrs?)/gi, handler: (m) => { result.duration = parseInt(m[1]) * 60; result.durationSource = '从文本提取'; return m[0]; }},
        { regex: /(\d+)\s*(分钟|分|min|mins?)/gi, handler: (m) => { result.duration = parseInt(m[1]); result.durationSource = '从文本提取'; return m[0]; }},
      ];
      for (const p of durPatterns) {
        const match = p.regex.exec(remaining);
        if (match) { remaining = remaining.replace(p.handler(match), ''); break; }
        p.regex.lastIndex = 0;
      }

      // 5. 剩余文本作为标题
      result.title = remaining.replace(/[#@]/g, '').replace(/\s+/g, ' ').trim();

      // 6. 智能补充时长（基于历史）
      if (!result.durationSource && result.title) {
        const hist = this.nlpHistory.filter(h => h.title && result.title && h.title.includes(result.title.slice(0, 2)));
        if (hist.length > 0) {
          result.duration = hist[hist.length - 1].duration;
          result.durationSource = '根据历史习惯';
        }
      }

      // 7. 关联目标建议
      if (result.title && result.title.length >= 2) {
        this.nlpSuggestions = this.goals.filter(g => {
          const kw = result.title.slice(0, 3);
          return g.title.includes(kw) || g.kr.some(k => k.includes(kw));
        }).slice(0, 3);
        if (this.nlpSuggestions.length > 0 && !result.suggestedGoal) {
          result.suggestedGoal = this.nlpSuggestions[0].id;
          result.suggestedGoalTitle = this.nlpSuggestions[0].title;
        }
      } else {
        this.nlpSuggestions = [];
      }

      // 8. 冲突检测
      if (result.time) {
        const conflict = this.tasks.find(t => t.date === result.time.slice(0, 10) && t.time === result.timeLabel);
        if (conflict) {
          result.warning = '该时段已有任务：「' + conflict.title + '」，建议调整时间或设为弹性任务。';
          result.type = '弹性';
        }
      }

      // 9. 肌肉记忆提示
      this.nlpMemoryHints = [];
      if (this.nlpHistory.length >= 3) {
        const recentTags = this.nlpHistory.slice(-5).map(h => h.tags[0]).filter(Boolean);
        const topTag = recentTags.sort((a,b) => recentTags.filter(v => v===a).length - recentTags.filter(v => v===b).length).pop();
        if (topTag && !result.tags.includes(topTag)) {
          this.nlpMemoryHints.push('你最近常用「' + this.tagLabel(topTag) + '」标签');
        }
        const avgDur = Math.round(this.nlpHistory.slice(-10).reduce((s, h) => s + h.duration, 0) / Math.min(this.nlpHistory.length, 10));
        if (Math.abs(result.duration - avgDur) > 20) {
          this.nlpMemoryHints.push('你通常的任务时长约' + avgDur + '分钟');
        }
      }

      this.nlpResult = result;
    },

    confirmNLP() {
      if (!this.nlpResult.title) return;
      const r = this.nlpResult;
      const today = new Date().toISOString().slice(0, 10);
      const date = r.time ? r.time.slice(0, 10) : today;

      const task = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: r.title,
        time: r.timeLabel || '今天',
        duration: r.duration,
        tags: r.tags,
        priority: r.priority,
        type: r.type,
        locked: r.locked,
        recurring: r.recurring,
        completed: false,
        date: date,
        goalId: r.suggestedGoal || '',
        createdAt: new Date().toISOString(),
      };

      this.tasks.push(task);

      // 记录到历史（肌肉记忆）
      this.nlpHistory.push({
        title: r.title,
        tags: r.tags,
        duration: r.duration,
        priority: r.priority,
        time: r.timeLabel,
        at: new Date().toISOString(),
      });
      if (this.nlpHistory.length > 50) this.nlpHistory = this.nlpHistory.slice(-50);

      // 重置
      this.nlpInput = '';
      this.nlpResult = { title: '', time: '', timeLabel: '', duration: 30, durationSource: '', priority: 'normal', priorityLabel: '普通', tags: [], type: '固定', recurring: false, locked: false, suggestedGoal: '', suggestedGoalTitle: '', warning: '' };
      this.nlpSuggestions = [];
      this.nlpMemoryHints = [];
      this.saveData();

      // 跳回首页查看
      this.page = 'home';
    },

    applyTemplate(tpl) {
      this.nlpInput = tpl;
      this.parseNLP();
    },

    saveAsTemplate() {
      if (this.nlpInput && !this.nlpTemplates.includes(this.nlpInput)) {
        this.nlpTemplates.push(this.nlpInput);
        if (this.nlpTemplates.length > 10) this.nlpTemplates = this.nlpTemplates.slice(-10);
        this.saveData();
      }
    },

    // ===== 打卡引擎 =====
    currentWeekLabel() {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return start.getMonth() + 1 + '/' + start.getDate() + ' - ' + (end.getMonth() + 1) + '/' + end.getDate();
    },
    todayCheckinDate() {
      const d = new Date();
      return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    },
    getTodayStr() {
      return new Date().toISOString().slice(0, 10);
    },
    todayCheckedIn() {
      return this.checkins.some(c => c.date === this.getTodayStr());
    },
    todayCheckinGrade() {
      const c = this.checkins.find(c => c.date === this.getTodayStr());
      return c ? c.grade : '';
    },
    todayCheckinNote() {
      const c = this.checkins.find(c => c.date === this.getTodayStr());
      return c ? c.note : '';
    },
    todayCheckinGradeColor() {
      const g = this.todayCheckinGrade();
      return g === 'A' ? 'var(--accent)' : g === 'B' ? 'var(--task-color)' : 'var(--timeline-color)';
    },
    todayCompletedCount() {
      const today = this.getTodayStr();
      return this.tasks.filter(t => t.date === today && t.completed).length;
    },
    autoCheckinGrade() {
      const total = this.todayTasks().length;
      if (total === 0) return;
      const done = this.todayCompletedCount();
      const ratio = done / total;
      if (ratio >= 0.9) this.tempCheckinGrade = 'A';
      else if (ratio >= 0.5) this.tempCheckinGrade = 'B';
      else this.tempCheckinGrade = 'C';
    },
    submitCheckin() {
      const today = this.getTodayStr();
      const done = this.todayCompletedCount();
      const total = this.todayTasks().length;
      const existing = this.checkins.findIndex(c => c.date === today);

      const record = {
        id: 'ch' + today,
        date: today,
        grade: this.tempCheckinGrade,
        note: this.tempCheckinNote.trim(),
        emotion: this.tempEmotion,
        completedTasks: done,
        totalTasks: total,
        createdAt: new Date().toISOString(),
      };

      if (existing >= 0) {
        this.checkins[existing] = { ...this.checkins[existing], ...record };
      } else {
        this.checkins.push(record);
      }

      this.todayCheckinEdit = false;
      this.saveData();
    },
    currentStreak() {
      if (this.checkins.length === 0) return 0;
      const sorted = [...this.checkins].sort((a, b) => b.date.localeCompare(a.date));
      const today = this.getTodayStr();
      let expected = today;
      let streak = 0;
      for (const c of sorted) {
        if (c.date === expected) {
          streak++;
          const d = new Date(expected);
          d.setDate(d.getDate() - 1);
          expected = d.toISOString().slice(0, 10);
        } else if (c.date < expected) {
          break;
        }
      }
      return streak;
    },
    weekStats() {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const counts = { A: 0, B: 0, C: 0, total: 0 };
      for (let i = 0; i < 7; i++) {
        const ds = start.toISOString().slice(0, 10);
        const c = this.checkins.find(c => c.date === ds);
        if (c) { counts[c.grade]++; counts.total++; }
        start.setDate(start.getDate() + 1);
      }
      const t = counts.total || 1;
      return { ...counts, pctA: counts.A / t, pctB: counts.B / t, pctC: counts.C / t };
    },
    currentMonthLabel() {
      const d = new Date();
      d.setMonth(d.getMonth() + this.heatmapOffset);
      return d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
    },
    heatmapDays() {
      const d = new Date();
      d.setMonth(d.getMonth() + this.heatmapOffset);
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const today = this.getTodayStr();

      const days = [];
      const startDow = firstDay.getDay();
      const offset = startDow === 0 ? 6 : startDow - 1;

      for (let i = 0; i < offset; i++) {
        days.push({ dayNum: '', date: '', grade: '', inMonth: false, isToday: false, label: '' });
      }

      for (let i = 1; i <= lastDay.getDate(); i++) {
        const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
        const c = this.checkins.find(c => c.date === ds);
        days.push({
          dayNum: i,
          date: ds,
          grade: c ? c.grade : '',
          inMonth: true,
          isToday: ds === today,
          label: ds + (c ? ' ' + c.grade + '档' : ''),
        });
      }
      return days;
    },
    openDayDetail(date) {
      const c = this.checkins.find(c => c.date === date);
      if (c) {
        this.dayDetailData = {
          date: date,
          grade: c.grade,
          note: c.note || '',
          completedTasks: c.completedTasks || 0,
          totalTasks: c.totalTasks || 0,
          emotion: c.emotion || 0,
        };
        this.showDayDetail = true;
      }
    },
    closeDayDetail() {
      this.showDayDetail = false;
      this.dayDetailData = null;
    },

    // ===== 目标-打卡联动 =====
    goalProgress(goalOrId) {
      const goalId = typeof goalOrId === 'string' ? goalOrId : (goalOrId && goalOrId.id);
      if (!goalId) return 0;
      const today = this.getTodayStr();
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const weekStart = start.toISOString().slice(0, 10);
      const tasks = this.tasks.filter(t => t.goalId === goalId && t.date >= weekStart && t.date <= today);
      if (tasks.length === 0) return 0;
      const done = tasks.filter(t => t.completed).length;
      return Math.round(done / tasks.length * 100);
    },

    // ===== AI 辅助方法 =====
    getWeekSummary() {
      const ws = this.weekStats();
      return {
        total: ws.total,
        A: ws.A,
        B: ws.B,
        C: ws.C,
        avgGrade: ws.total > 0 ? (ws.A * 3 + ws.B * 2 + ws.C * 1) / ws.total : 0,
      };
    },

    async generateAIInsight() {
      if (this.aiInsightLoading) return;
      this.aiInsightLoading = true;

      const weekData = this.getWeekSummary();
      const energy = this.weekEnergyData();
      const tasks = this.tasks.filter(t => {
        const d = new Date(); const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
        return t.date >= start.toISOString().slice(0, 10);
      });
      const completedTasks = tasks.filter(t => t.completed);
      const incompleteTasks = tasks.filter(t => !t.completed);
      const pomCount = this.weekPomodoroCount();
      const focusHours = this.weekFocusHours();

      const messages = [
        {
          role: 'system',
          content: `你是「个人之旅」App的AI洞察助手。根据用户本周数据生成个性化分析和建议。

语气风格：${this.aiTone === 'companion' ? '温暖陪伴，像朋友聊天' : this.aiTone === 'efficiency' ? '专业高效，数据驱动' : '简洁精炼，直击要点'}

要求：
1. 分析本周时间分配是否合理
2. 找出效率高峰和低谷模式
3. 给出2-3条具体可执行的建议
4. 如果有连续低能期，提供关怀建议
5. 回答控制在200字以内
6. 不要使用emoji
7. 不要使用markdown格式`
        },
        {
          role: 'user',
          content: `本周数据摘要：
- 打卡：${weekData.total}天（A档${weekData.A}天，B档${weekData.B}天，C档${weekData.C}天）
- 每日精力：${energy.map(d => d.label + '(' + Math.round(d.pct * 100) + '%)').join('、')}
- 任务：完成${completedTasks.length}项，未完成${incompleteTasks.length}项
- 完成任务列表：${completedTasks.slice(0, 10).map(t => t.title).join('、') || '无'}
- 未完成任务列表：${incompleteTasks.slice(0, 5).map(t => t.title).join('、') || '无'}
- 番茄钟：${pomCount}个，专注${focusHours}小时
- 连续打卡：${this.currentStreak()}天
- 当前目标：${this.goals.map(g => g.title + '(' + this.goalProgress(g.id) + '%)').join('、') || '无'}`
        }
      ];

      const result = await this.callDeepSeek(messages, { temperature: 0.8, max_tokens: 500 });
      this.aiInsightLoading = false;
      if (result) {
        this.aiInsightText = result.trim();
      }
    },

    async generateAIReview() {
      if (this.aiReviewLoading) return;
      const today = new Date().toISOString().slice(0, 10);
      this.aiReviewLoading = true;

      const todayTasks = this.todayTasks();
      const completed = todayTasks.filter(t => t.completed);
      const incomplete = todayTasks.filter(t => !t.completed);
      const checkin = this.checkins.find(c => c.date === today);
      const pomodoros = this.pomodoros.filter(p => p.date === today);
      const emotion = checkin?.emotion || this.tempEmotion;
      const emotionLabels = ['', '低落', '不安', '平淡', '愉快', '兴奋'];

      const messages = [
        {
          role: 'system',
          content: `你是「个人之旅」App的晚间复盘助手。每天结束时，帮助用户回顾一天、总结收获、规划明天。

语气风格：${this.aiTone === 'companion' ? '温暖贴心，像睡前好友聊天，多鼓励少批评' : this.aiTone === 'efficiency' ? '专业复盘，数据驱动，注重方法论' : '简洁精炼，5句话以内总结'}

要求：
1. 回顾今天完成的事项，给予正面肯定
2. 分析未完成事项的原因（不是批评，而是帮助思考）
3. 总结今天的情绪状态和精力模式
4. 给出明天的一条具体建议
5. 总长度150字以内
6. 不要使用emoji和markdown`
        },
        {
          role: 'user',
          content: `今日数据：
- 完成任务：${completed.map(t => t.title + '(' + (t.duration||30) + 'min)').join('、') || '无'}
- 未完成任务：${incomplete.map(t => t.title).join('、') || '无'}
- 完成率：${todayTasks.length > 0 ? Math.round(completed.length / todayTasks.length * 100) + '%' : '无数据'}
- 番茄钟：${pomodoros.length}个，${Math.round(pomodoros.reduce((s,p) => s + (p.duration||0), 0) / 60 * 10) / 10}小时
- 打卡等级：${checkin?.grade || '未打卡'}
- 心情：${emotionLabels[emotion] || '未记录'}（${emotion}/5）
- 备注和高光：${checkin?.note || this.tempCheckinNote || '无'}`
        }
      ];

      const result = await this.callDeepSeek(messages, { temperature: 0.8, max_tokens: 400 });
      this.aiReviewLoading = false;
      if (result) {
        this.aiReviewText = result.trim();
        this.lastReviewDate = today;
      }
    },

    weeklyABC(goalId) {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const counts = { A: 0, B: 0, C: 0 };
      for (let i = 0; i < 7; i++) {
        const ds = start.toISOString().slice(0, 10);
        const c = this.checkins.find(c => c.date === ds);
        if (c) {
          const hasTaskForGoal = this.tasks.some(t => t.goalId === goalId && t.date === ds);
          if (hasTaskForGoal) counts[c.grade]++;
        }
        start.setDate(start.getDate() + 1);
      }
      return counts;
    },

    // ===== 番茄钟 =====
    setPomodoroMode(mode) {
      this.pomodoroMode = mode;
      this.pomodoroRunning = false;
      clearInterval(this.pomodoroTimer);
      if (mode === 'custom') {
        const mins = Math.max(1, Math.min(120, parseInt(this.customMinutes) || 25));
        this.customMinutes = mins;
        this.pomodoroRemaining = mins * 60;
        this.pomodoroTotal = mins * 60;
      } else {
        this.pomodoroRemaining = this.getPomodoroDuration(mode);
        this.pomodoroTotal = this.pomodoroRemaining;
        this.customMinutes = this.pomodoroDurations[mode] || 25;
      }
    },
    adjustCustomMinutes(delta) {
      const newVal = Math.max(1, Math.min(180, (this.customMinutes || 25) + delta));
      this.customMinutes = newVal;
      this.applyCustomMinutes();
    },
    applyCustomMinutes() {
      const mins = Math.max(1, Math.min(180, parseInt(this.customMinutes) || 25));
      this.customMinutes = mins;
      if (!this.pomodoroRunning) {
        this.pomodoroMode = 'custom';
        this.pomodoroRemaining = mins * 60;
        this.pomodoroTotal = mins * 60;
      }
    },
    togglePomodoro() {
      if (this.pomodoroRunning) {
        clearInterval(this.pomodoroTimer);
        this.pomodoroRunning = false;
      } else {
        this.pomodoroRunning = true;
        this.pomodoroTimer = setInterval(() => {
          if (this.pomodoroRemaining > 0) {
            this.pomodoroRemaining--;
          } else {
            clearInterval(this.pomodoroTimer);
            this.pomodoroRunning = false;
            this.completePomodoro();
          }
        }, 1000);
      }
    },
    stopPomodoro() {
      clearInterval(this.pomodoroTimer);
      this.pomodoroRunning = false;
      this.focusMode = false;
      const completed = this.pomodoroTotal - this.pomodoroRemaining;
      const durationMin = Math.round(this.pomodoroTotal / 60);

      if (completed > 0) {
        // 部分完成也算一棵枯萎的树
        this.plantedTrees.push({
          id: Date.now().toString(36),
          date: new Date().toISOString().slice(0, 10),
          duration: durationMin,
          completed: Math.round(completed / 60),
          mode: this.pomodoroMode,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          dead: true,
        });
        this.treeTotalCount = this.plantedTrees.length;
        this.showToast('🥀 种下了一棵枯萎的树…下次坚持到底吧', 'warning');
      }

      // 保留原pomodoro记录
      if (completed > 60) {
        this.pomodoros.push({
          id: Date.now().toString(36),
          mode: this.pomodoroMode,
          duration: this.pomodoroTotal,
          completed: completed,
          date: new Date().toISOString().slice(0, 10),
          startedAt: new Date(Date.now() - completed * 1000).toISOString(),
          endedAt: new Date().toISOString(),
        });
      }
      this.pomodoroRemaining = this.pomodoroTotal;
      this.saveData();
      // 番茄钟停止后刷新3D森林
      this.$nextTick(() => {
        setTimeout(() => { this.initForest3D(); }, 100);
      });
    },
    completePomodoro() {
      const durationMin = Math.round(this.pomodoroTotal / 60);
      this.pomodoros.push({
        id: Date.now().toString(36),
        mode: this.pomodoroMode,
        duration: this.pomodoroTotal,
        completed: this.pomodoroTotal,
        date: new Date().toISOString().slice(0, 10),
        startedAt: new Date(Date.now() - this.pomodoroTotal * 1000).toISOString(),
        endedAt: new Date().toISOString(),
      });
      this.pomodoroRemaining = this.pomodoroTotal;

      // ===== 种树！=====
      this.plantedTrees.push({
        date: new Date().toISOString().slice(0, 10),
        duration: durationMin,
        mode: this.pomodoroMode,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      });
      this.treeTotalCount = this.plantedTrees.length;
      this.saveData();

      // 种树完成提示
      const emoji = this.getTreeEmoji(this.plantedTrees[this.plantedTrees.length - 1]);
      const treeName = this.getTreeName(durationMin);
      this.showToast(emoji + ' 种下一棵' + treeName + '！专注 ' + durationMin + ' 分钟', 'success');

      // 检查里程碑
      this.checkTreeMilestone();

      // 番茄钟完成后刷新3D森林
      this.$nextTick(() => {
        setTimeout(() => { this.initForest3D(); }, 100);
      });
    },
    todayPomodoros() {
      const today = new Date().toISOString().slice(0, 10);
      return this.pomodoros.filter(p => p.date === today).length;
    },
    formatTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return m + ':' + String(s).padStart(2, '0');
    },

    // ===== 种树游戏方法 =====
    getTreeEmoji(tree) {
      if (!tree) return '🌱';
      const min = tree.duration || 25;
      if (min >= 60) return '🌳';
      if (min >= 45) return '🌲';
      if (min >= 25) return '🎄';
      if (min >= 15) return '🌿';
      return '🌱';
    },
    getTreeName(min) {
      if (min >= 60) return '参天大树';
      if (min >= 45) return '大树';
      if (min >= 25) return '松树';
      if (min >= 15) return '小树苗';
      return '嫩芽';
    },
    getTreeClass(tree) {
      if (!tree) return '';
      const min = tree.duration || 25;
      if (min >= 60) return 'tree-huge';
      if (min >= 45) return 'tree-large';
      if (min >= 25) return 'tree-medium';
      return 'tree-small';
    },
    getGrowingEmoji() {
      // 根据倒计时进度显示树的不同生长阶段
      const progress = this.pomodoroTotal > 0 ? (this.pomodoroTotal - this.pomodoroRemaining) / this.pomodoroTotal : 0;
      if (progress < 0.25) return '🌰';
      if (progress < 0.5) return '🌱';
      if (progress < 0.75) return '🪴';
      if (progress < 0.9) return '🌿';
      return '🌲';
    },
    treeMilestoneBadge() {
      if (this.treeTotalCount >= 100) return '🌍';
      if (this.treeTotalCount >= 50) return '🏞️';
      if (this.treeTotalCount >= 20) return '🏕️';
      if (this.treeTotalCount >= 10) return '🌲';
      if (this.treeTotalCount >= 5) return '🌱';
      return '—';
    },
    checkTreeMilestone() {
      const milestones = [
        { count: 5, name: '新芽园丁', emoji: '🌱' },
        { count: 10, name: '小树林', emoji: '🌲' },
        { count: 20, name: '森林守护者', emoji: '🏕️' },
        { count: 50, name: '生态大师', emoji: '🏞️' },
        { count: 100, name: '地球卫士', emoji: '🌍' },
      ];
      for (const m of milestones) {
        if (this.treeTotalCount === m.count) {
          this.showToast(m.emoji + ' 达成里程碑：' + m.name + '！', 'success');
          break;
        }
      }
    },

    // ===== 树林统计视图 =====
    getForestTrees(view) {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      if (view === 'today') {
        return this.plantedTrees.filter(t => t.date === today);
      } else if (view === 'month') {
        const month = now.toISOString().slice(0, 7); // YYYY-MM
        return this.plantedTrees.filter(t => t.date.startsWith(month));
      } else if (view === 'year') {
        const year = now.toISOString().slice(0, 4); // YYYY
        return this.plantedTrees.filter(t => t.date.startsWith(year));
      }
      return this.plantedTrees;
    },

    // ===== 3D 等距森林视图 =====
    setForestPeriod(period) {
      this.forestPeriod = period;
      this.forestDateOffset = 0;
      this.refreshForest3D();
    },
    forestDatePrev() {
      this.forestDateOffset--;
      this.refreshForest3D();
    },
    forestDateNext() {
      this.forestDateOffset++;
      this.refreshForest3D();
    },
    forestDateTitle() {
      const now = new Date();
      const offset = this.forestDateOffset;
      if (this.forestPeriod === 'day') {
        const d = new Date(now); d.setDate(d.getDate() + offset);
        const m = d.getMonth() + 1;
        return m + '月' + d.getDate() + '日';
      } else if (this.forestPeriod === 'week') {
        const d = new Date(now); d.setDate(d.getDate() + offset * 7);
        const start = new Date(d); start.setDate(start.getDate() - start.getDay());
        const end = new Date(start); end.setDate(end.getDate() + 6);
        return (start.getMonth() + 1) + '/' + start.getDate() + ' - ' + (end.getMonth() + 1) + '/' + end.getDate();
      } else if (this.forestPeriod === 'month') {
        const d = new Date(now); d.setMonth(d.getMonth() + offset);
        return d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
      } else if (this.forestPeriod === 'year') {
        return (now.getFullYear() + offset) + '年';
      }
      return '';
    },
    getForest3DTrees() {
      const now = new Date();
      const offset = this.forestDateOffset;
      let filtered = [];
      if (this.forestPeriod === 'day') {
        const d = new Date(now); d.setDate(d.getDate() + offset);
        const dateStr = d.toISOString().slice(0, 10);
        filtered = this.plantedTrees.filter(t => t.date === dateStr);
        if (filtered.length === 0) return [];
        return [{ key: dateStr, type: 'single', label: '', trees: filtered, style: '' }];
      } else if (this.forestPeriod === 'week') {
        const d = new Date(now); d.setDate(d.getDate() + offset * 7);
        const start = new Date(d); start.setDate(start.getDate() - start.getDay());
        const groups = [];
        for (let i = 0; i < 7; i++) {
          const day = new Date(start); day.setDate(day.getDate() + i);
          const dateStr = day.toISOString().slice(0, 10);
          const dayTrees = this.plantedTrees.filter(t => t.date === dateStr);
          if (dayTrees.length > 0) {
            const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
            groups.push({
              key: dateStr, type: 'week-day', label: dayLabels[i],
              trees: dayTrees,
              style: 'flex: ' + Math.max(dayTrees.length, 1) + ';'
            });
          }
        }
        return groups;
      } else if (this.forestPeriod === 'month') {
        const d = new Date(now); d.setMonth(d.getMonth() + offset);
        const year = d.getFullYear(), month = d.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const groups = [];
        for (let day = 1; day <= daysInMonth; day += 7) {
          const weekTrees = [];
          for (let i = 0; i < 7 && day + i <= daysInMonth; i++) {
            const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day + i).padStart(2, '0');
            weekTrees.push(...this.plantedTrees.filter(t => t.date === dateStr));
          }
          if (weekTrees.length > 0) {
            groups.push({
              key: 'w' + Math.ceil(day / 7), type: 'month-week',
              label: '第' + Math.ceil(day / 7) + '周',
              trees: weekTrees,
              style: 'flex: ' + Math.max(weekTrees.length, 1) + ';'
            });
          }
        }
        return groups;
      } else if (this.forestPeriod === 'year') {
        const year = now.getFullYear() + offset;
        const groups = [];
        for (let m = 1; m <= 12; m++) {
          const monthStr = year + '-' + String(m).padStart(2, '0');
          const monthTrees = this.plantedTrees.filter(t => t.date.startsWith(monthStr));
          if (monthTrees.length > 0) {
            groups.push({
              key: monthStr, type: 'year-month', label: m + '月',
              trees: monthTrees,
              style: 'flex: ' + Math.max(monthTrees.length, 1) + ';'
            });
          }
        }
        return groups;
      }
      return [];
    },
    forest3DAliveCount() {
      const trees = this.getForest3DTrees();
      return trees.reduce((sum, g) => sum + g.trees.filter(t => !t.dead).length, 0);
    },
    forest3DDeadCount() {
      const trees = this.getForest3DTrees();
      return trees.reduce((sum, g) => sum + g.trees.filter(t => t.dead).length, 0);
    },
    forest3DFocusMinutes() {
      const trees = this.getForest3DTrees();
      return trees.reduce((sum, g) => sum + g.trees.reduce((s, t) => s + (t.duration || 0), 0), 0);
    },
    forest3DFocusHours() {
      return Math.floor(this.forest3DFocusMinutes() / 60);
    },
    getForestChartBars() {
      const now = new Date();
      const offset = this.forestDateOffset;
      // 每天总时长基准：24小时 = 1440分钟（用于计算百分比）
      const DAY_TOTAL_MINS = 1440;
      let bars = [];
      if (this.forestPeriod === 'day') {
        // 按小时显示 — 每个时段占当天总时长的百分比
        const d = new Date(now); d.setDate(d.getDate() + offset);
        const dateStr = d.toISOString().slice(0, 10);
        const dayTrees = this.plantedTrees.filter(t => t.date === dateStr);
        for (let h = 6; h <= 22; h += 2) {
          const mins = dayTrees
            .filter(t => {
              const hour = parseInt(t.time?.split(':')[0] || 0);
              return hour >= h && hour < h + 2;
            })
            .reduce((s, t) => s + (t.duration || 0), 0);
          // 每个时段占全天总时长的百分比（每段2小时=120分钟）
          bars.push({ label: h + '时', mins: mins, pct: Math.round((mins / DAY_TOTAL_MINS) * 100) });
        }
      } else if (this.forestPeriod === 'week') {
        const d = new Date(now); d.setDate(d.getDate() + offset * 7);
        const start = new Date(d); start.setDate(start.getDate() - start.getDay());
        const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
        for (let i = 0; i < 7; i++) {
          const day = new Date(start); day.setDate(day.getDate() + i);
          const dateStr = day.toISOString().slice(0, 10);
          const isToday = dateStr === now.toISOString().slice(0, 10);
          // 如果是今天，使用已过去的时间作为总时长基准；否则用全天24小时
          const totalMinsForDay = isToday ? ((now - new Date(dateStr)) / 60000) : DAY_TOTAL_MINS;
          const mins = this.plantedTrees
            .filter(t => t.date === dateStr)
            .reduce((s, t) => s + (t.duration || 0), 0);
          bars.push({
            label: dayLabels[i],
            mins: mins,
            pct: totalMinsForDay > 0 ? Math.round((mins / totalMinsForDay) * 100) : 0,
            totalBase: totalMinsForDay
          });
        }
      } else if (this.forestPeriod === 'month') {
        const d = new Date(now); d.setMonth(d.getMonth() + offset);
        const year = d.getFullYear(), month = d.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let week = 1; week <= Math.ceil(daysInMonth / 7); week++) {
          let weekMins = 0;
          for (let day = (week - 1) * 7 + 1; day <= week * 7 && day <= daysInMonth; day++) {
            const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            weekMins += this.plantedTrees
              .filter(t => t.date === dateStr)
              .reduce((s, t) => s + (t.duration || 0), 0);
          }
          // 一周总时长基准 = 7天 × 1440分钟 = 10080分钟
          const WEEK_TOTAL_MINS = 10080;
          bars.push({ label: 'W' + week, mins: weekMins, pct: Math.round((weekMins / WEEK_TOTAL_MINS) * 100) });
        }
      } else if (this.forestPeriod === 'year') {
        const year = now.getFullYear() + offset;
        for (let m = 1; m <= 12; m++) {
          const monthStr = year + '-' + String(m).padStart(2, '0');
          const mins = this.plantedTrees
            .filter(t => t.date.startsWith(monthStr))
            .reduce((s, t) => s + (t.duration || 0), 0);
          // 每月总时长基准 ≈ 30天 × 1440分钟 = 43200分钟
          const MONTH_TOTAL_MINS = 43200;
          bars.push({ label: m + '月', mins: mins, pct: Math.round((mins / MONTH_TOTAL_MINS) * 100) });
        }
      }
      return bars;
    },
    totalAliveTrees() {
      return this.plantedTrees.filter(t => !t.dead).length;
    },
    totalDeadTrees() {
      return this.plantedTrees.filter(t => t.dead).length;
    },
    showTreeTooltip(tree, event) {
      const rect = event.target.getBoundingClientRect();
      this.treeTooltip = {
        show: true,
        x: rect.left + rect.width / 2 - 80,
        y: rect.top - 110,
        date: tree.date,
        duration: tree.duration,
        time: tree.time || '',
        dead: tree.dead || false,
      };
    },
    hideTreeTooltip() {
      this.treeTooltip.show = false;
    },

    // ===== Three.js 3D 森林引擎 =====
    _forest3d: null, // Three.js 引擎实例

    initForest3D() {
      const container = document.getElementById('forest3dContainer');
      if (!container || !window.THREE) return;

      // 确保完全销毁旧实例（包括清理 window 事件监听器）
      if (this._forest3d) {
        this._forest3d.dispose();
        this._forest3d = null;
      }

      // 确保 canvas 是干净的（重新创建 canvas 避免事件监听器残留）
      const oldCanvas = document.getElementById('forest3dCanvas');
      if (oldCanvas) {
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'forest3dCanvas';
        oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
      }

      this._forest3d = new Forest3DEngine(container);
      this._forest3d.setTrees(this.getForest3DTrees());
    },

    refreshForest3D() {
      if (this._forest3d) {
        this._forest3d.setTrees(this.getForest3DTrees());
      }
    },

    destroyForest3D() {
      if (this._forest3d) {
        this._forest3d.dispose();
        this._forest3d = null;
      }
    },

    // ===== 人脉管理 =====
    filteredContacts() {
      if (!this.contactFilter) return this.contacts;
      const lvl = parseInt(this.contactFilter.replace('L', ''));
      return this.contacts.filter(c => c.level === lvl);
    },
    levelLabel(l) {
      return { L1: '核心圈', L2: '重要圈', L3: '常联', L4: '泛联', L5: '存档' }[l] || '';
    },
    openContactModal(contact = null) {
      if (contact) {
        this.editingContactId = contact.id;
        this.contactForm = {
          name: contact.name || '',
          level: contact.level ? 'L' + contact.level : 'L3',
          notes: contact.notes || '',
          birthday: contact.birthday || '',
          preferences: (contact.preferences || []).join(', '),
          taboos: (contact.taboos || []).join(', '),
          milestones: contact.milestones || '',
        };
      } else {
        this.editingContactId = null;
        this.contactForm = { name: '', level: 'L3', notes: '', birthday: '', preferences: '', taboos: '', milestones: '' };
      }
      this.showContactForm = true;
    },
    saveContactForm() {
      if (!this.contactForm.name.trim()) return;
      const level = parseInt(this.contactForm.level.replace('L', ''));
      const data = {
        id: this.editingContactId || Date.now().toString(36),
        name: this.contactForm.name.trim(),
        level,
        notes: this.contactForm.notes.trim(),
        birthday: this.contactForm.birthday,
        preferences: this.contactForm.preferences.split(/[,，]/).map(s => s.trim()).filter(Boolean),
        taboos: this.contactForm.taboos.split(/[,，]/).map(s => s.trim()).filter(Boolean),
        milestones: this.contactForm.milestones.trim(),
        lastContact: '今天',
        createdAt: this.editingContactId
          ? (this.contacts.find(c => c.id === this.editingContactId)?.createdAt || new Date().toISOString())
          : new Date().toISOString(),
      };
      if (this.editingContactId) {
        const idx = this.contacts.findIndex(c => c.id === this.editingContactId);
        if (idx >= 0) {
          data.lastContact = this.contacts[idx].lastContact;
          this.contacts[idx] = { ...this.contacts[idx], ...data };
        }
      } else {
        this.contacts.push(data);
      }
      this.showContactForm = false;
      this.saveData();
    },
    closeContactForm() {
      this.showContactForm = false;
      this.editingContactId = null;
    },
    editContact(contact) { this.openContactModal(contact); },

    // ===== AI 洞察引擎 =====
    insightDays() {
      if (this.checkins.length === 0) return 0;
      const sorted = [...this.checkins].map(c => c.date).sort();
      const first = new Date(sorted[0]);
      const last = new Date(sorted[sorted.length - 1]);
      return Math.ceil((last - first) / (1000 * 60 * 60 * 24)) + 1;
    },
    insightEnergyLabel() {
      const data = this.weekEnergyData();
      const avg = data.reduce((s, d) => s + d.pct, 0) / data.length;
      if (avg >= 0.7) return '精力充沛';
      if (avg >= 0.4) return '状态平稳';
      return '需要休息';
    },
    insightEnergyDesc() {
      const label = this.insightEnergyLabel();
      const tone = this.aiTone;
      if (tone === 'companion') {
        return label === '精力充沛' ? '最近状态很好，继续保持节奏。' :
               label === '状态平稳' ? '一切都在轨道上，不急不躁。' :
               '最近辛苦了，记得给自己留些空白。';
      }
      if (tone === 'efficiency') {
        return label === '精力充沛' ? '高能期，建议集中处理核心任务。' :
               label === '状态平稳' ? '效率正常，适合处理沟通和弹性任务。' :
               '低能期，减少新任务，启动兜底模式。';
      }
      // concise
      return label === '精力充沛' ? '高能' : label === '状态平稳' ? '正常' : '低能';
    },

    weekEnergyData() {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const days = [];
      const labels = ['一','二','三','四','五','六','日'];
      for (let i = 0; i < 7; i++) {
        const ds = start.toISOString().slice(0, 10);
        const tasks = this.tasks.filter(t => t.date === ds);
        const total = tasks.length;
        const done = tasks.filter(t => t.completed).length;
        const pct = total > 0 ? done / total : 0;
        days.push({ label: labels[i], pct, date: ds });
        start.setDate(start.getDate() + 1);
      }
      return days;
    },

    timeDistribution() {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const tags = { work: 0, life: 0, grow: 0 };
      for (let i = 0; i < 7; i++) {
        const ds = start.toISOString().slice(0, 10);
        this.tasks.filter(t => t.date === ds && t.completed).forEach(t => {
          if (t.tags[0] === 'work') tags.work += t.duration;
          else if (t.tags[0] === 'life') tags.life += t.duration;
          else tags.grow += t.duration;
        });
        start.setDate(start.getDate() + 1);
      }
      const total = (tags.work + tags.life + tags.grow) || 1;
      return [
        { label: '工作', hours: Math.round(tags.work / 60), pct: tags.work / total, color: 'var(--task-color)' },
        { label: '生活', hours: Math.round(tags.life / 60), pct: tags.life / total, color: 'var(--contact-color)' },
        { label: '成长', hours: Math.round(tags.grow / 60), pct: tags.grow / total, color: 'var(--goal-color)' },
      ];
    },
    timeDistAdvice() {
      const dist = this.timeDistribution();
      const work = dist[0].pct;
      const grow = dist[2].pct;
      if (work > 0.6) return '工作占比偏高，建议本周留出「成长」和「生活」时间。';
      if (grow < 0.1) return '成长投入较少，每天15分钟也能积少成多。';
      return '时间分布比较均衡，保持就好。';
    },

    weekPomodoroCount() {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const weekStart = start.toISOString().slice(0, 10);
      return this.pomodoros.filter(p => p.date >= weekStart).length;
    },
    weekFocusHours() {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const weekStart = start.toISOString().slice(0, 10);
      const total = this.pomodoros.filter(p => p.date >= weekStart).reduce((s, p) => s + (p.completed || 0), 0);
      return Math.round(total / 3600 * 10) / 10;
    },
    weekAvgFocus() {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const weekStart = start.toISOString().slice(0, 10);
      const arr = this.pomodoros.filter(p => p.date >= weekStart);
      if (arr.length === 0) return 0;
      const total = arr.reduce((s, p) => s + (p.completed || 0), 0);
      return Math.round(total / arr.length / 60);
    },

    aiInsights() {
      const insights = [];
      const tone = this.aiTone;
      const energy = this.weekEnergyData();
      const avgEnergy = energy.reduce((s, d) => s + d.pct, 0) / energy.length;
      const dist = this.timeDistribution();

      // 疲劳感知 L3
      if (avgEnergy < 0.3 && energy.filter(d => d.pct < 0.3).length >= 3) {
        const text = tone === 'companion'
          ? '最近连续几天状态不太好，要不要启动兜底模式，给自己放个假？'
          : tone === 'efficiency'
          ? '检测到连续低能期（3天以上），建议暂停新任务分配，仅保留已锁定事项。'
          : '连续低能 → 建议兜底模式';
        insights.push({ level: 'L3', category: '疲劳感知', text, action: 'whitespace', actionLabel: '开启留白保护' });
      }

      // 时间平衡 L2
      if (dist[0].pct > 0.6) {
        const text = tone === 'companion'
          ? '你本周工作占比偏高，记得留时间给生活和成长哦。'
          : tone === 'efficiency'
          ? '工作时间占比超过60%，建议调整：减少1项工作任务，增加生活/成长时间。'
          : '工作>60% → 建议减1项工作';
        insights.push({ level: 'L2', category: '时间平衡', text, action: '', actionLabel: '' });
      }

      // 社交充电 L2
      if (this.contacts.length > 0 && this.weekPomodoroCount() > 10) {
        const lastContact = this.contacts.filter(c => c.lastContact).sort((a, b) => {
          const num = (s) => { const m = s.match(/(\d+)/); return m ? parseInt(m[1]) : 999; };
          return num(b.lastContact) - num(a.lastContact);
        });
        if (lastContact.length > 0 && lastContact[0].lastContact) {
          const m = lastContact[0].lastContact.match(/(\d+)/);
          if (m && parseInt(m[1]) > 7) {
            const text = tone === 'companion'
              ? '专注了很久，要不要联系下朋友？' + lastContact[0].name + '上次联系是' + lastContact[0].lastContact + '了。'
              : tone === 'efficiency'
              ? '社交维护提醒：' + lastContact[0].name + '超过7天未联系，建议本周安排一次。'
              : '社交：' + lastContact[0].name + ' >7天未联系';
            insights.push({ level: 'L2', category: '社交充电', text, action: '', actionLabel: '' });
          }
        }
      }

      // 番茄效率 L1
      if (this.weekPomodoroCount() > 0 && this.weekAvgFocus() < 20) {
        const text = tone === 'companion'
          ? '番茄钟平均时长偏短，是不是被琐事打断了？没关系，试试深度工作模式。'
          : tone === 'efficiency'
          ? '平均每次专注<20分钟，建议尝试50分钟深度工作模式提高效率。'
          : '番茄偏短 → 建议深度模式';
        insights.push({ level: 'L1', category: '专注质量', text, action: '', actionLabel: '' });
      }

      // 打卡一致性 L1
      if (this.currentStreak() >= 5) {
        const text = tone === 'companion'
          ? '已经连续' + this.currentStreak() + '天打卡记录了，保持自己的节奏就好。'
          : tone === 'efficiency'
          ? '连续' + this.currentStreak() + '天打卡，数据积累有助于下周规划。'
          : '连续' + this.currentStreak() + '天打卡';
        insights.push({ level: 'L1', category: '打卡一致性', text, action: '', actionLabel: '' });
      }

      // V1.2 社交节奏提醒
      const contactRemindThresholds = { 1: 3, 2: 7, 3: 14 };
      const remindContacts = this.contacts.filter(c => {
        const threshold = contactRemindThresholds[c.level];
        if (!threshold) return false;
        const m = (c.lastContact || '').match(/(\d+)/);
        if (!m) return false;
        return parseInt(m[1]) > threshold;
      });
      if (remindContacts.length > 0) {
        const names = remindContacts.map(c => c.name + '(' + this.levelLabel('L' + c.level) + ')').join('、');
        const text = tone === 'companion'
          ? '这些朋友该联系了：' + names
          : tone === 'efficiency'
          ? '社交提醒：' + remindContacts.length + '位人脉需要联系 - ' + names
          : '社交：' + remindContacts.length + '人待联系';
        insights.push({ level: 'L2', category: '社交提醒', text, action: '', actionLabel: '去联系' });
      }

      return insights;
    },

    doAction(action) {
      if (action === 'whitespace') {
        this.whiteSpaceEnabled = true;
        this.whiteSpaceRatio = Math.min(40, this.whiteSpaceRatio + 10);
        this.saveData();
        this.page = 'settings';
      }
    },

    // ===== 正反馈体系（数字断舍离）=====
    getWeekNumber() {
      const d = new Date();
      const start = new Date(d.getFullYear(), 0, 1);
      return Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
    },
    fuzzyFocusLabel() {
      const hours = this.weekFocusHours();
      if (hours > 15) return '很多';
      if (hours > 8) return '较多';
      if (hours > 3) return '适中';
      if (hours > 0) return '较少';
      return '暂无';
    },
    fuzzyTaskLabel() {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const weekStart = start.toISOString().slice(0, 10);
      const tasks = this.tasks.filter(t => t.date >= weekStart);
      const done = tasks.filter(t => t.completed).length;
      const total = tasks.length;
      if (total === 0) return '暂无';
      const ratio = done / total;
      if (ratio >= 0.8) return '顺利';
      if (ratio >= 0.5) return '不错';
      return '还可以';
    },
    fuzzyRestLabel() {
      const weekDays = this.weekDayDetails();
      const cDays = weekDays.filter(d => d.grade === 'C').length;
      if (cDays >= 2) return '较多休息';
      if (cDays === 1) return '有休息';
      return '紧凑';
    },
    weekTrendColor() {
      return 'var(--accent)';
    },
    weekTrendLabel() {
      const d = new Date();
      const thisStart = new Date(d); thisStart.setDate(d.getDate() - d.getDay() + 1);
      const lastStart = new Date(thisStart); lastStart.setDate(lastStart.getDate() - 7);
      const thisWeek = this.checkins.filter(c => c.date >= thisStart.toISOString().slice(0, 10)).length;
      const lastWeek = this.checkins.filter(c => c.date >= lastStart.toISOString().slice(0, 10) && c.date < thisStart.toISOString().slice(0, 10)).length;
      if (thisWeek > lastWeek) return '好一些';
      if (thisWeek === lastWeek) return '差不多';
      return '少一点';
    },

    weekDayDetails() {
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const today = this.getTodayStr();
      const dayNames = ['一','二','三','四','五','六','日'];
      const result = [];
      for (let i = 0; i < 7; i++) {
        const ds = start.toISOString().slice(0, 10);
        const c = this.checkins.find(c => c.date === ds);
        result.push({ date: ds, dayName: dayNames[i], grade: c ? c.grade : '', isToday: ds === today });
        start.setDate(start.getDate() + 1);
      }
      return result;
    },
    weekGradeSummary() {
      const days = this.weekDayDetails();
      const a = days.filter(d => d.grade === 'A').length;
      const b = days.filter(d => d.grade === 'B').length;
      const c = days.filter(d => d.grade === 'C').length;
      if (a + b + c === 0) return '本周还没有打卡记录';
      if (a >= 5) return '这周状态非常好，5天以上完美日！';
      if (a >= 3) return '节奏稳定，' + a + '天完美日。';
      if (c >= 2) return '这周有' + c + '天兜底日，没关系，下周调整。';
      return '整体平稳，保持节奏。';
    },

    autoHighlights() {
      const highlights = [];
      const days = this.weekDayDetails();
      const aCount = days.filter(d => d.grade === 'A').length;
      const streak = this.currentStreak();

      if (aCount >= 3) highlights.push('连续' + aCount + '天达到A档完美日');
      if (streak >= 5) highlights.push('连续' + streak + '天打卡记录');
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const weekStart = start.toISOString().slice(0, 10);
      const tasks = this.tasks.filter(t => t.date >= weekStart && t.completed);
      if (tasks.some(t => t.priority === 'high')) highlights.push('完成了高优先级任务');

      // 番茄相关
      const poms = this.pomodoros.filter(p => p.date >= weekStart && p.mode === 'deep');
      if (poms.length >= 2) highlights.push('完成了' + poms.length + '次深度工作番茄');

      // 留白决策
      if (this.whiteSpaceEnabled && this.whiteSpaceRatio >= 20) {
        highlights.push('主动开启留白模式，给自己缓冲空间');
      }

      return highlights;
    },

    weeklyTips() {
      const tips = [];
      const dist = this.timeDistribution();
      const days = this.weekDayDetails();
      const aDays = days.filter(d => d.grade === 'A');

      if (dist[0].pct > 0.6) tips.push('工作占比偏高，下周建议增加「成长」和「生活」标签的任务。');

      // V1.3 目标进度建议
      const today = this.getTodayStr();
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const weekStart = start.toISOString().slice(0, 10);
      this.goals.forEach(g => {
        if (g.type === '周' || g.type === '月') {
          const progress = this.goalProgress(g.id);
          if (progress < 30 && progress > 0) {
            tips.push('考虑调整目标「' + g.title + '」的优先级，本周进度仅' + Math.round(progress) + '%，可能需要重新评估KR或降低周任务量。');
          }
        }
      });

      // V1.3 工作占比>60%建议
      const weekTasks = this.tasks.filter(t => t.date >= weekStart && t.date <= today && t.completed);
      if (weekTasks.length > 0) {
        const workCount = weekTasks.filter(t => t.tags[0] === 'work').length;
        if (workCount / weekTasks.length > 0.6) {
          tips.push('本周已完成任务中工作类占' + Math.round(workCount / weekTasks.length * 100) + '%，建议下周增加成长/生活类任务，避免单一维度消耗精力。');
        }
      }

      if (aDays.length >= 3 && aDays.every(d => parseInt(d.date.slice(8, 10)) <= 5)) {
        tips.push('A档集中在工作日，周末可以适当放松。');
      }
      if (this.weekPomodoroCount() > 10) {
        tips.push('专注时长充足，继续保持深度工作习惯。');
      } else if (this.weekPomodoroCount() > 0) {
        tips.push('下周试试每天至少1个番茄，从小目标开始。');
      }
      tips.push('本周上午效率明显高于下午，建议下周继续把核心任务安排在上午。');
      return tips;
    },

    milestones() {
      const ms = [];
      const streak = this.currentStreak();
      const totalPoms = this.pomodoros.length;
      const totalCheckins = this.checkins.length;

      if (streak >= 7) ms.push({ text: '连续7天打卡记录！你建立了一个好习惯。' });
      if (totalPoms >= 50) ms.push({ text: '累计完成50个番茄！专注力在提升。' });
      if (totalCheckins >= 30) ms.push({ text: '累计30天打卡，已经坚持一个月了。' });
      if (this.goals.some(g => g.type === '年' && g.kr.length >= 3)) {
        ms.push({ text: '已设定完整的年度目标体系。' });
      }
      return ms;
    },

    lockedTasks() {
      const today = this.getTodayStr();
      return this.tasks.filter(t => t.locked && t.date === today);
    },

    // ===== 系统弹性 =====
    emergencyTemplates: [
      { id: 'meeting', label: '临时会议' },
      { id: 'sick', label: '身体不适' },
      { id: 'urgent', label: '紧急事务' },
      { id: 'transport', label: '交通故障' },
      { id: 'mood', label: '情绪波动' },
      { id: 'other', label: '其他' },
    ],
    emergencySelected: null,

    selectEmergency(tpl) {
      this.emergencySelected = this.emergencySelected === tpl.id ? null : tpl.id;
    },

    applyEmergencyPlan(plan) {
      const today = this.getTodayStr();
      const tasks = this.tasks.filter(t => t.date === today && !t.completed && !t.locked);
      const changes = [];

      if (plan === 'A') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ts = tomorrow.toISOString().slice(0, 10);
        tasks.forEach(t => { changes.push({ title: t.title, detail: '顺延至明日' }); });
      } else if (plan === 'B') {
        const removed = tasks.filter(t => t.priority === 'low' && t.type === '弹性');
        removed.forEach(t => { changes.push({ title: t.title, detail: '删除（低优先级弹性）' }); });
        tasks.filter(t => t.priority !== 'low' && t.type === '弹性').forEach(t => { changes.push({ title: t.title, detail: '锁定为固定' }); });
      } else if (plan === 'C') {
        const removed = tasks.filter(t => t.type !== '固定' || t.priority === 'low');
        removed.forEach(t => { changes.push({ title: t.title, detail: '暂停' }); });
      }

      this.resiliencePreviewPlan = plan;
      this.resiliencePreviewChanges = changes;
      this.showResiliencePreview = true;
    },
    confirmResiliencePlan() {
      const today = this.getTodayStr();
      const tasks = this.tasks.filter(t => t.date === today && !t.completed && !t.locked);
      const plan = this.resiliencePreviewPlan;

      if (plan === 'A') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ts = tomorrow.toISOString().slice(0, 10);
        tasks.forEach(t => { t.date = ts; });
      } else if (plan === 'B') {
        const removed = tasks.filter(t => t.priority === 'low' && t.type === '弹性');
        removed.forEach(t => {
          const idx = this.tasks.indexOf(t);
          if (idx >= 0) this.tasks.splice(idx, 1);
        });
        tasks.filter(t => t.type === '弹性').forEach(t => { t.type = '固定'; t.locked = true; });
      } else if (plan === 'C') {
        const removed = tasks.filter(t => t.type !== '固定' || t.priority === 'low');
        removed.forEach(t => {
          const idx = this.tasks.indexOf(t);
          if (idx >= 0) this.tasks.splice(idx, 1);
        });
      }

      this.emergencySelected = null;
      this.showResiliencePreview = false;
      this.saveData();
    },
    cancelResiliencePreview() {
      this.showResiliencePreview = false;
      this.resiliencePreviewPlan = '';
      this.resiliencePreviewChanges = [];
    },

    // ===== 回顾 =====
    addHighlight() {
      const h = prompt('本周的一个亮点：');
      if (h) {
        this.weeklyHighlights.push(h);
        this.saveData();
      }
    },

    // ===== 任务编辑 =====
    openEditTask(block) {
      const task = this.tasks.find(t => t.id === block.id);
      if (!task) return;
      this.editingTask = task;
      this.editForm = { ...task };
      this.showEditModal = true;
    },
    saveEditTask() {
      if (!this.editingTask || !this.editForm.title.trim()) return;
      Object.assign(this.editingTask, this.editForm);
      this.showEditModal = false;
      this.saveData();
    },
    deleteTaskConfirm(id) {
      if (this.deleteConfirmId === id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.deleteConfirmId = null;
        this.saveData();
      } else {
        this.deleteConfirmId = id;
        clearTimeout(this._deleteTimer);
        this._deleteTimer = setTimeout(() => { this.deleteConfirmId = null; }, 3000);
      }
    },

    // ===== 循环任务克隆 =====
    cloneRecurringTasks() {
      const today = new Date().toISOString().slice(0, 10);
      const cloned = this.tasks.filter(t => t.recurring && t.date !== today);
      cloned.forEach(src => {
        const exists = this.tasks.some(t => t.date === today && t.title === src.title && t.recurring);
        if (!exists) {
          this.tasks.push({
            ...JSON.parse(JSON.stringify(src)),
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            date: today,
            completed: false,
            completedAt: null,
            createdAt: new Date().toISOString(),
          });
        }
      });
      if (cloned.length > 0) this.saveData();
    },

    // ===== 任务截止提醒 =====
    checkTaskReminders() {
      if (!this.notifEnabled || this.notifPermission !== 'granted') return;
      const today = this.getTodayStr();
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const dueSoon = this.tasks.filter(t => {
        if (!t.time || t.completed || t.date !== today) return false;
        const [h, m] = (t.time || '').split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return false;
        const taskMinutes = h * 60 + m;
        const diff = taskMinutes - nowMinutes;
        return diff > 0 && diff <= 30; // 30分钟内到期
      });

      if (dueSoon.length > 0) {
        const names = dueSoon.map(t => t.title).join('、');
        this.sendNotification('⏰ 任务提醒', `${names} 即将开始`, 'task-due');
      }

      // 检查过期任务（时间已过且未完成）
      const overdue = this.tasks.filter(t => {
        if (!t.time || t.completed || t.date !== today) return false;
        const [h, m] = (t.time || '').split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return false;
        const taskMinutes = h * 60 + m;
        return nowMinutes > taskMinutes + 5; // 超过5分钟
      });

      if (overdue.length > 0 && !this._overdueNotified) {
        this._overdueNotified = true;
        this.sendNotification('⚠️ 任务已过期', '有任务未在计划时间内完成', 'task-overdue');
      }
    },

    startTaskReminderTimer() {
      if (this._taskReminderTimer) clearInterval(this._taskReminderTimer);
      this._taskReminderTimer = setInterval(() => {
        if (this.authState === 'active' && !this.authLocked) {
          this.checkTaskReminders();
        }
      }, 60000); // 每分钟检查一次
      this._overdueNotified = false;
    },

    // ===== 首页FAB快速添加 =====
    toggleQuickPanel() {
      this.showQuickPanel = !this.showQuickPanel;
      if (this.showQuickPanel) { setTimeout(() => { document.getElementById('qp-input')?.focus(); }, 100); }
    },
    quickPanelDebounce() {
      clearTimeout(this._quickPanelTimer);
      this._quickPanelTimer = setTimeout(() => this.quickPanelParse(), 200);
    },
    quickPanelParse() {
      const raw = this.quickPanelInput.trim();
      if (!raw) { this.quickPanelResult = null; return; }
      const tags = [];
      if (/#工作|work/i.test(raw)) tags.push('work');
      if (/#生活|life/i.test(raw)) tags.push('life');
      if (/#成长|grow/i.test(raw)) tags.push('grow');
      if (/重要|紧急/i.test(raw)) tags.push('important');
      let title = raw.replace(/#[^\s]+/g, '').replace(/重要|紧急|不急|低优/g, '').trim();
      const hourMatch = raw.match(/(\d{1,2})[点时:](\d{0,2})/);
      const time = hourMatch ? (hourMatch[1].padStart(2,'0') + ':' + (hourMatch[2]||'00').padStart(2,'0')) : '';
      const durationMatch = raw.match(/(\d+)\s*(小时|分钟|min|h)/i);
      const duration = durationMatch ? (durationMatch[2].startsWith('h') || durationMatch[2].startsWith('小') ? parseInt(durationMatch[1]) * 60 : parseInt(durationMatch[1])) : 30;
      this.quickPanelResult = { title: title || raw, time, duration: Math.min(Math.max(duration, 5), 480), tags: tags.length ? tags : [this.defaultTag], priority: tags.includes('important') ? 'high' : 'normal' };
    },
    quickPanelConfirm() {
      if (!this.quickPanelResult || !this.quickPanelResult.title) return;
      const today = new Date().toISOString().slice(0, 10);
      this.tasks.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: this.quickPanelResult.title,
        time: this.quickPanelResult.time || new Date().getHours().toString().padStart(2,'0') + ':' + new Date().getMinutes().toString().padStart(2,'0'),
        duration: this.quickPanelResult.duration,
        tags: this.quickPanelResult.tags,
        priority: this.quickPanelResult.priority,
        type: '固定', locked: false, recurring: false, completed: false,
        date: today, goalId: '', createdAt: new Date().toISOString(),
      });
      this.showQuickPanel = false;
      this.quickPanelInput = '';
      this.quickPanelResult = null;
      this.saveData();
    },

    // ===== 首页打卡 =====
    homeCheckin(grade) {
      this.homeCheckinGrade = grade;
      const today = new Date().toISOString().slice(0, 10);
      let existing = this.checkins.find(c => c.date === today);
      if (existing) {
        existing.grade = grade;
        existing.note = this.homeCheckinNote;
        existing.emotion = this.tempEmotion;
      } else {
        this.checkins.push({
          id: Date.now().toString(36),
          date: today, grade, note: this.homeCheckinNote,
          emotion: this.tempEmotion,
          completedTasks: this.todayCompletedCount(),
          totalTasks: this.todayTasks().length,
        });
      }
      this.saveData();
    },

    // ===== 番茄钟增强 =====
    getPomodoroDuration(mode) {
      if (mode === 'custom') return (this.customMinutes || 25) * 60;
      return (this.pomodoroDurations[mode] || 25) * 60;
    },
    getBreakDuration() {
      const focusMin = this.pomodoroDurations[this.pomodoroMode] || 25;
      return Math.round(focusMin / this.pomodoroBreakRatio);
    },
    longPressStart(block) {
      this._longPressTimer = setTimeout(() => {
        this.startPomodoroForTask(block);
        this._longPressTimer = null;
      }, 600);
    },
    longPressEnd() {
      if (this._longPressTimer) { clearTimeout(this._longPressTimer); this._longPressTimer = null; }
    },
    startPomodoroForTask(block) {
      this.pomodoroMode = 'standard';
      this.pomodoroRemaining = this.getPomodoroDuration('standard');
      this.pomodoroTotal = this.pomodoroRemaining;
      this.pomodoroRunning = true;
      this.page = 'pomodoro';
      this._pomodoroTaskId = block.id;
    },

    // ===== 快速导入（兼容旧设置页按钮） =====
    quickImportData(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.page = 'dataio';
      this.ioTab = 'import';
      this.$nextTick(() => this.ioProcessFile(file));
      event.target.value = '';
    },

    // ===== 快速导出（兼容旧设置页按钮） =====
    quickExportData() {
      this.page = 'dataio';
      this.ioTab = 'export';
    },

    // ===== 反馈 =====
    openFeedback() {
      const body = encodeURIComponent('请描述您遇到的问题或建议：\n\n---\nApp版本: V1.3\n浏览器: ' + navigator.userAgent.slice(0, 80) + '\n时间: ' + new Date().toLocaleString());
      window.open('https://github.com/lian-voyage/feedback/issues/new?title=个人之旅反馈&body=' + body, '_blank');
    },

    // ===== 保存高光 =====
    saveHighlight() {
      if (!this.tempCheckinHighlight.trim()) return;
      this.weeklyHighlights.push(this.tempCheckinHighlight.trim());
      this.tempCheckinHighlight = '';
      this.saveData();
    },

    // ===== 目标预警 =====
    goalWarnings() {
      const today = this.getTodayStr();
      const d = new Date();
      const start = new Date(d); start.setDate(d.getDate() - d.getDay() + 1);
      const weekStart = start.toISOString().slice(0, 10);
      return this.goals.filter(g => {
        const progress = this.goalProgress(g.id);
        const weekTasks = this.tasks.filter(t => t.goalId === g.id && t.date >= weekStart && t.date <= today);
        return progress < 30 && weekTasks.length > 0;
      }).map(g => ({
        id: g.id,
        title: g.title,
        progress: this.goalProgress(g.id),
        kr: g.kr[0] || '',
      }));
    },

    // ===== 个人中心方法 =====
    loadProfileInfo() {
      try {
        const authData = JSON.parse(localStorage.getItem('pj_auth') || '{}');
        if (authData.currentUser && authData.users && authData.users[authData.currentUser]) {
          const user = authData.users[authData.currentUser];
          this.authCreatedAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '未知';
        }
        const loginTime = localStorage.getItem('pj_last_login');
        if (loginTime) {
          this.authLastLogin = new Date(parseInt(loginTime)).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      } catch(e) {}
    },

    startEditProfile() {
      this.profileEditing = true;
    },

    saveProfile() {
      this.profileEditing = false;
      this.saveData();
      this.showToast('个人信息已保存', 'success');
    },

    // ===== 数据清理方法 =====
    runCleanupScan() {
      this.cleanupIssues = { emptyTitles: [], duplicates: [], expired: [], nlpCache: [], localStorageFragments: [] };
      const now = new Date();
      const cutoff90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

      // 1. 空标题记录
      const tableMap = { tasks: this.tasks, goals: this.goals, contacts: this.contacts };
      for (const [table, arr] of Object.entries(tableMap)) {
        for (const item of arr) {
          if (!item.title || !item.title.trim()) {
            this.cleanupIssues.emptyTitles.push({
              id: item.id, table,
              desc: `ID: ${item.id} · 无标题`,
              _type: table, _id: item.id
            });
          }
        }
      }

      // 2. 重复记录（同表内相同标题）
      for (const [table, arr] of Object.entries(tableMap)) {
        const titleMap = {};
        for (const item of arr) {
          const key = (item.title || '').trim().toLowerCase();
          if (key && titleMap[key]) {
            titleMap[key].ids.push(item.id);
          } else if (key) {
            titleMap[key] = { ids: [item.id], title: item.title };
          }
        }
        for (const [, group] of Object.entries(titleMap)) {
          if (group.ids.length > 1) {
            this.cleanupIssues.duplicates.push({
              key: table + '_' + group.ids[0],
              table, desc: `"${group.title}" 有 ${group.ids.length} 条重复`,
              _type: table,
              _ids: group.ids.slice(1) // 保留第一条，删除其余
            });
          }
        }
      }

      // 3. 超过90天的已完成任务
      for (const task of this.tasks) {
        if (task.completed && task.completedAt && task.completedAt < cutoff90) {
          this.cleanupIssues.expired.push({
            id: task.id, table: '任务',
            desc: `"${task.title}" · 完成于 ${task.completedAt.slice(0, 10)}`,
            _type: 'tasks', _id: task.id
          });
        }
      }

      // 4. NLP历史缓存
      for (const h of this.nlpHistory) {
        this.cleanupIssues.nlpCache.push({
          id: h.id || Math.random(),
          desc: (h.input || h.title || '(无输入)').slice(0, 40),
          _type: 'nlpHistory', _id: h.id
        });
      }

      // 5. localStorage碎片
      const knownKeys = ['personal_journey', 'pj_auth', 'pj_migration_history', 'pj_io_logs', 'pj_backups', 'pwa_dismissed', 'pj_last_login'];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!knownKeys.includes(key)) {
          const size = (localStorage.getItem(key) || '').length;
          this.cleanupIssues.localStorageFragments.push({
            key, id: key,
            desc: `"${key}" (${(size / 1024).toFixed(1)} KB)`,
            _type: 'ls', _key: key
          });
        }
      }

      this.cleanupScanned = true;
    },

    cleanupTotalIssues() {
      return this.cleanupIssues.emptyTitles.length
        + this.cleanupIssues.duplicates.length
        + this.cleanupIssues.expired.length
        + this.cleanupIssues.nlpCache.length
        + this.cleanupIssues.localStorageFragments.length;
    },

    deleteCleanupItem(item) {
      if (!confirm('确定删除此条目？')) return;
      const type = item._type;
      if (type === 'tasks') {
        this.tasks = this.tasks.filter(t => t.id !== item._id);
      } else if (type === 'goals') {
        this.goals = this.goals.filter(g => g.id !== item._id);
      } else if (type === 'contacts') {
        this.contacts = this.contacts.filter(c => c.id !== item._id);
      } else if (type === 'nlpHistory') {
        this.nlpHistory = this.nlpHistory.filter(h => h.id !== item._id);
      } else if (type === 'ls') {
        localStorage.removeItem(item._key);
      }
      this.saveData();
      // 从清理列表中移除
      for (const key of Object.keys(this.cleanupIssues)) {
        this.cleanupIssues[key] = this.cleanupIssues[key].filter(i => i.id !== item.id);
      }
      this.showToast('已删除', 'success');
    },

    deleteDuplicateItems(group) {
      if (!confirm(`确定删除 "${group.desc}" 中的多余记录？`)) return;
      const type = group._type;
      if (type === 'tasks') {
        this.tasks = this.tasks.filter(t => !group._ids.includes(t.id));
      } else if (type === 'goals') {
        this.goals = this.goals.filter(g => !group._ids.includes(g.id));
      } else if (type === 'contacts') {
        this.contacts = this.contacts.filter(c => !group._ids.includes(c.id));
      }
      this.saveData();
      this.cleanupIssues.duplicates = this.cleanupIssues.duplicates.filter(d => d.key !== group.key);
      this.showToast('已删除重复记录', 'success');
    },

    cleanupAll() {
      if (!confirm('确定清理所有检测到的问题？')) return;
      // 删除空标题
      for (const item of [...this.cleanupIssues.emptyTitles]) {
        this.deleteCleanupItem(item);
      }
      // 删除重复
      for (const group of [...this.cleanupIssues.duplicates]) {
        const type = group._type;
        if (type === 'tasks') this.tasks = this.tasks.filter(t => !group._ids.includes(t.id));
        else if (type === 'goals') this.goals = this.goals.filter(g => !group._ids.includes(g.id));
        else if (type === 'contacts') this.contacts = this.contacts.filter(c => !group._ids.includes(c.id));
      }
      // 删除过期
      for (const item of this.cleanupIssues.expired) {
        this.tasks = this.tasks.filter(t => t.id !== item._id);
      }
      // 清理NLP历史
      this.nlpHistory = [];
      // 清理localStorage碎片
      for (const item of this.cleanupIssues.localStorageFragments) {
        localStorage.removeItem(item._key);
      }
      this.saveData();
      this.cleanupScanned = false;
      this.showToast('清理完成', 'success');
    },

    // ===== 智能记忆方法 =====
    openMemoryForm() {
      this.memoryShowForm = true;
      this.memoryEditingId = null;
      this.memoryForm = { name: '', location: '', category: 'daily', storedDate: new Date().toISOString().slice(0, 10), note: '' };
    },

    editMemoryItem(item) {
      this.memoryEditingId = item.id;
      this.memoryShowForm = false;
      this.memoryForm = {
        name: item.name || '',
        location: item.location || '',
        category: item.category || 'daily',
        storedDate: item.storedDate || '',
        note: item.note || ''
      };
      // 滚动到顶部显示表单
      const el = document.getElementById('page-memory');
      if (el) el.querySelector('.page-content').scrollTo(0, 0);
    },

    cancelMemoryEdit() {
      this.memoryEditingId = null;
      this.memoryShowForm = false;
      this.memoryForm = { name: '', location: '', category: 'daily', storedDate: '', note: '' };
    },

    saveMemoryItem() {
      const { name, location, category, storedDate, note } = this.memoryForm;
      if (!name.trim()) { this.showToast('请输入物品名称', 'warning'); return; }
      if (!location.trim()) { this.showToast('请输入存放位置', 'warning'); return; }

      const now = new Date().toISOString();
      if (this.memoryEditingId) {
        const item = this.memoryItems.find(i => i.id === this.memoryEditingId);
        if (item) {
          item.name = name.trim();
          item.location = location.trim();
          item.category = category;
          item.storedDate = storedDate;
          item.note = note.trim();
          item.updatedAt = now;
        }
        this.memoryEditingId = null;
        this.showToast('物品信息已更新', 'success');
      } else {
        this.memoryItems.unshift({
          id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: name.trim(),
          location: location.trim(),
          category,
          storedDate: storedDate || '',
          note: note.trim(),
          createdAt: now,
          updatedAt: now,
        });
        this.memoryShowForm = false;
        this.showToast('物品位置已记录', 'success');
      }
      this.saveData();
      this.memoryForm = { name: '', location: '', category: 'daily', storedDate: '', note: '' };
    },

    deleteMemoryItem(id) {
      if (!confirm('确定删除此物品记录？')) return;
      this.memoryItems = this.memoryItems.filter(i => i.id !== id);
      this.saveData();
      this.showToast('已删除', 'success');
    },

    deleteSelectedMemory() {
      if (!confirm(`确定删除选中的 ${this.memorySelectedIds.length} 条记录？`)) return;
      this.memoryItems = this.memoryItems.filter(i => !this.memorySelectedIds.includes(i.id));
      this.memorySelectedIds = [];
      this.saveData();
      this.showToast('已删除选中记录', 'success');
    },

    filteredMemoryItems() {
      let items = [...this.memoryItems];
      // 分类筛选
      if (this.memoryFilter !== 'all') {
        items = items.filter(i => i.category === this.memoryFilter);
      }
      // 搜索过滤
      if (this.memorySearch.trim()) {
        const q = this.memorySearch.trim().toLowerCase();
        items = items.filter(i =>
          (i.name || '').toLowerCase().includes(q) ||
          (i.location || '').toLowerCase().includes(q) ||
          (i.note || '').toLowerCase().includes(q)
        );
      }
      return items;
    },

    filterMemoryItems() {
      // 触发Alpine响应式更新（filteredMemoryItems是计算式）
    },

    getMemoryCategoryLabel(cat) {
      const found = this.memoryCategories.find(c => c.value === cat);
      return found ? found.label : cat;
    },

    // ===== 看板辅助方法 =====
    todayPomodoroMinutes() {
      const today = this.getTodayStr();
      return this.pomodoros
        .filter(p => (p.createdAt || '').slice(0, 10) === today && p.completed)
        .reduce((sum, p) => sum + (p.duration || 25), 0);
    },

    monthlyCheckinDays() {
      const now = new Date();
      const yearMonth = now.toISOString().slice(0, 7);
      return this.checkins.filter(c => c.date && c.date.startsWith(yearMonth)).length;
    },

    // ===== 全局搜索方法 =====
    loadSearchHistory() {
      try {
        this.searchHistory = JSON.parse(localStorage.getItem('pj_search_history') || '[]');
      } catch(e) { this.searchHistory = []; }
    },

    loadJournalDraft() {
      try {
        const draft = JSON.parse(localStorage.getItem('pj_journal_draft') || 'null');
        if (draft && draft.content) this.journalDraft = draft;
      } catch(e) { this.journalDraft = null; }
    },

    saveSearchHistory(query) {
      if (!query.trim()) return;
      this.searchHistory = [query, ...this.searchHistory.filter(h => h !== query)].slice(0, 20);
      localStorage.setItem('pj_search_history', JSON.stringify(this.searchHistory));
    },

    performSearch() {
      const q = (this.searchQuery || '').toLowerCase().trim();
      this.searchResults = { tasks: [], goals: [], contacts: [], memories: [], total: 0 };
      if (q.length < 1) return;

      // 搜索任务
      this.searchResults.tasks = this.tasks.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.time || '').includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      );

      // 搜索目标
      this.searchResults.goals = this.goals.filter(g =>
        (g.title || '').toLowerCase().includes(q) ||
        (g.kr || []).some(kr => kr.toLowerCase().includes(q))
      );

      // 搜索人脉
      this.searchResults.contacts = this.contacts.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.relation || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q)
      );

      // 搜索记忆
      this.searchResults.memories = this.memoryItems.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q) ||
        (m.note || '').toLowerCase().includes(q)
      );

      this.searchResults.total =
        this.searchResults.tasks.length +
        this.searchResults.goals.length +
        this.searchResults.contacts.length +
        this.searchResults.memories.length;

      if (q.length >= 2) this.saveSearchHistory(q);
    },

    highlightText(text, query) {
      if (!text || !query) return text || '';
      const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(${q})`, 'gi');
      return text.replace(re, '<span class="search-highlight">$1</span>');
    },

    // ===== 通知系统方法 =====
    async checkNotifPermission() {
      if (!('Notification' in window)) return;
      this.notifPermission = Notification.permission;
      this.notifChecked = true;
    },

    async requestNotifPermission() {
      if (!('Notification' in window)) {
        this.showToast('浏览器不支持通知', 'warning');
        return;
      }
      try {
        const perm = await Notification.requestPermission();
        this.notifPermission = perm;
        if (perm === 'granted') {
          this.notifEnabled = true;
          this.saveData();
          this.showToast('通知已开启', 'success');
          this.scheduleReminders();
        }
      } catch(e) {
        this.showToast('通知权限请求失败', 'warning');
      }
    },

    sendNotification(title, body, tag) {
      if (this.notifPermission !== 'granted' || !this.notifEnabled) return;
      try {
        const n = new Notification(title, { body, icon: '/favicon.ico', tag, requireInteraction: false });
        n.onclick = () => { window.focus(); n.close(); };
      } catch(e) {}
    },

    scheduleReminders() {
      // 每日打卡提醒
      if (this.dailyReminderHour !== undefined && this.dailyReminderHour !== null) {
        this._scheduleDailyCheckinReminder();
      }
      // 番茄钟完成通知由pomodoro完成时触发
    },

    _scheduleDailyCheckinReminder() {
      const now = new Date();
      const reminderTime = new Date(now);
      reminderTime.setHours(this.dailyReminderHour || 20, 0, 0, 0);
      if (reminderTime <= now) reminderTime.setDate(reminderTime.getDate() + 1);
      const delay = reminderTime.getTime() - now.getTime();
      if (this._reminderTimer) clearTimeout(this._reminderTimer);
      this._reminderTimer = setTimeout(() => {
        if (!this.todayCheckedIn()) {
          this.sendNotification('个人之旅', '该打卡啦！回顾今天的状态', 'daily-checkin');
        }
        this._scheduleDailyCheckinReminder(); // 递归设置下一天
      }, Math.min(delay, 24 * 60 * 60 * 1000));
    },

    // ===== 习惯追踪方法 =====
    habitShowForm: false,
    habitEditingId: null,
    habitForm: { name: '', icon: '📌' },
    habitIconOptions: [
      { value: '📖', emoji: '📖' }, { value: '💪', emoji: '💪' }, { value: '🧘', emoji: '🧘' },
      { value: '📝', emoji: '📝' }, { value: '💧', emoji: '💧' }, { value: '🏃', emoji: '🏃' },
      { value: '🎯', emoji: '🎯' }, { value: '📌', emoji: '📌' }, { value: '🌱', emoji: '🌱' },
      { value: '🎵', emoji: '🎵' }, { value: '💤', emoji: '💤' }, { value: '🍎', emoji: '🍎' },
    ],

    saveHabit() {
      const name = (this.habitForm.name || '').trim();
      if (!name) { this.showToast('请输入习惯名称', 'warning'); return; }
      if (this.habitEditingId) {
        const h = this.habits.find(h => h.id === this.habitEditingId);
        if (h) {
          h.name = name;
          h.icon = this.habitForm.icon;
          h.updatedAt = new Date().toISOString();
        }
        this.habitEditingId = null;
        this.showToast('习惯已更新', 'success');
      } else {
        this.habits.push({
          id: 'h_' + Date.now(),
          name,
          icon: this.habitForm.icon || '📌',
          logs: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        this.habitShowForm = false;
        this.showToast('习惯已创建', 'success');
      }
      this.habitForm = { name: '', icon: '📌' };
      this.saveData();
    },

    deleteHabit(id) {
      if (!confirm('确定删除此习惯？')) return;
      this.habits = this.habits.filter(h => h.id !== id);
      this.saveData();
      this.showToast('已删除', 'success');
    },

    getHabitTodayStr() {
      return new Date().toISOString().slice(0, 10);
    },

    toggleHabitToday(habit) {
      if (!habit) return;
      const today = this.getHabitTodayStr();
      if (!habit.logs) habit.logs = {};
      if (habit.logs[today]) {
        delete habit.logs[today];
      } else {
        habit.logs[today] = { done: true, time: new Date().toISOString() };
      }
      this.saveData();
    },

    habitTodayDone(habit) {
      if (!habit || !habit.logs) return false;
      const today = this.getHabitTodayStr();
      return !!habit.logs[today];
    },

    habitTodayDoneCount() {
      const today = this.getHabitTodayStr();
      return this.habits.filter(h => h.logs && h.logs[today]).length;
    },

    habitHasMissed(habit) {
      if (!habit || !habit.logs) return false;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const ys = yesterday.toISOString().slice(0, 10);
      const today = this.getHabitTodayStr();
      return !habit.logs[today] && !habit.logs[ys] && Object.keys(habit.logs).length > 0;
    },

    habitStreak(habit) {
      if (!habit || !habit.logs) return 0;
      let streak = 0;
      const d = new Date();
      const today = this.getHabitTodayStr();
      // If not done today, start from yesterday
      if (!habit.logs[today]) d.setDate(d.getDate() - 1);
      for (let i = 0; i < 365; i++) {
        const ds = d.toISOString().slice(0, 10);
        if (habit.logs[ds]) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    },

    habitStreakDays() {
      if (this.habits.length === 0) return 0;
      return Math.max(...this.habits.map(h => this.habitStreak(h)));
    },

    habitWeeklyPct() {
      if (this.habits.length === 0) return 0;
      const d = new Date();
      let totalSlots = 0, doneSlots = 0;
      for (let i = 0; i < 7; i++) {
        const ds = d.toISOString().slice(0, 10);
        for (const h of this.habits) {
          totalSlots++;
          if (h.logs && h.logs[ds]) doneSlots++;
        }
        d.setDate(d.getDate() - 1);
      }
      return totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;
    },

    habitWeekStatus(habit) {
      const result = [];
      const d = new Date();
      for (let i = 6; i >= 0; i--) {
        const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i).toISOString().slice(0, 10);
        if (habit.logs && habit.logs[ds]) {
          result.push('done');
        } else {
          // Only mark as missed if the habit existed on that day
          const createdDate = (habit.createdAt || '').slice(0, 10);
          result.push(ds >= createdDate ? 'missed' : '');
        }
      }
      return result;
    },

    // ===== AI建议引擎 =====

    generatePersonalizedAdvice() {
      const advice = [];
      const now = new Date();
      const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. 任务完成模式分析
      const recentTasks = this.tasks.filter(t => t.createdAt >= cutoff30);
      const completedTasks = recentTasks.filter(t => t.completed);
      const taskPct = recentTasks.length > 0 ? Math.round(completedTasks.length / recentTasks.length * 100) : 0;

      if (taskPct >= 80) {
        advice.push({
          title: '任务管理出色', icon: '🏆', iconBg: 'rgba(201,216,182,0.2)',
          category: '效率分析', priority: 'low',
          body: `过去30天任务完成率达到 ${taskPct}%，你的执行力很强。建议在完成关键任务后给自己一个小奖励，维持正反馈循环。`,
          stats: [{ label: '完成率', value: taskPct + '%' }, { label: '已完成', value: completedTasks.length + '个' }],
          action: null, actionLabel: '',
        });
      } else if (taskPct < 50) {
        advice.push({
          title: '任务积压预警', icon: '⚠️', iconBg: 'rgba(230,195,195,0.2)',
          category: '效率分析', priority: 'high',
          body: `过去30天任务完成率仅 ${taskPct}%。建议启用冲刺模式番茄钟（10分钟），降低每个任务的启动门槛。将大任务拆分为15分钟的小块。`,
          stats: [{ label: '完成率', value: taskPct + '%' }, { label: '待完成', value: (recentTasks.length - completedTasks.length) + '个' }],
          action: 'pomodoro-sprint', actionLabel: '开始冲刺番茄钟',
        });
      }

      // 2. 打卡模式分析
      const recentCheckins = this.checkins.filter(c => c.date >= cutoff7.slice(0, 10));
      const gradeA = recentCheckins.filter(c => c.grade === 'A').length;
      const gradeC = recentCheckins.filter(c => c.grade === 'C').length;

      if (gradeC >= 3) {
        advice.push({
          title: '连续低能量日', icon: '🔋', iconBg: 'rgba(184,212,227,0.2)',
          category: '精力管理', priority: 'high',
          body: `最近7天有 ${gradeC} 天为C档。你可能正处于精力低谷期。建议：1) 降低本周目标难度 2) 保证7小时睡眠 3) 每天15分钟散步。`,
          stats: [{ label: 'C档天数', value: gradeC + '天' }, { label: 'A档天数', value: gradeA + '天' }],
          action: 'resilience', actionLabel: '调整本周计划',
        });
      }

      if (gradeA >= 4) {
        advice.push({
          title: '高能状态持续中', icon: '🚀', iconBg: 'rgba(201,216,182,0.2)',
          category: '精力管理', priority: 'low',
          body: `最近7天有 ${gradeA} 天达到A档！你正处于高效期，可以趁势推进重要目标或开启新项目。`,
          stats: [{ label: 'A档天数', value: gradeA + '天' }],
          action: null, actionLabel: '',
        });
      }

      // 3. 番茄钟模式
      const recentPomodoros = this.pomodoros.filter(p => p.createdAt >= cutoff30 && p.completed);
      const pomCount = recentPomodoros.length;

      if (pomCount < 5 && this.habits.length > 0) {
        advice.push({
          title: '专注时间不足', icon: '⏰', iconBg: 'rgba(242,226,196,0.2)',
          category: '专注力', priority: 'medium',
          body: `过去30天仅完成 ${pomCount} 个番茄钟。尝试使用冲刺模式（10分钟）建立专注习惯，从短时间开始。`,
          stats: [{ label: '番茄钟', value: pomCount + '个' }],
          action: 'pomodoro-sprint', actionLabel: '试试10分钟冲刺',
        });
      }

      // 4. 习惯Streak分析
      const maxStreak = this.habits.length > 0 ? Math.max(...this.habits.map(h => this.habitStreak(h))) : 0;
      if (maxStreak >= 7) {
        advice.push({
          title: '习惯坚持力优秀', icon: '🔥', iconBg: 'rgba(240,160,96,0.2)',
          category: '习惯追踪', priority: 'low',
          body: `最长连续 ${maxStreak} 天完成习惯，你的自控力很强。现在可以尝试添加一个新习惯来扩展舒适区。`,
          stats: [{ label: '最长Streak', value: maxStreak + '天' }],
          action: 'habits', actionLabel: '添加新习惯',
        });
      }

      this.personalizedAdvice = advice;
    },

    doAdviceAction(action) {
      if (action === 'pomodoro-sprint') {
        this.pomodoroMode = 'sprint';
        this.pomodoroRemaining = this.getPomodoroDuration('sprint');
        this.pomodoroTotal = this.pomodoroRemaining;
        this.pomodoroRunning = true;
        this.page = 'pomodoro';
      } else if (action === 'resilience') {
        this.page = 'resilience';
      } else if (action === 'habits') {
        this.page = 'habits';
        this.habitShowForm = true;
      }
    },

    // ===== 生活节律 =====
    rhythmBlocks() {
      const now = new Date();
      const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const recentPoms = this.pomodoros.filter(p => p.createdAt >= cutoff30 && p.completed);

      // 按小时分组统计番茄钟完成数
      const hourBuckets = {};
      for (let i = 0; i < 24; i++) hourBuckets[i] = 0;
      recentPoms.forEach(p => {
        const h = new Date(p.createdAt).getHours();
        hourBuckets[h] = (hourBuckets[h] || 0) + 1;
      });

      const blocks = [];
      for (let h = 6; h < 23; h++) {
        const count = hourBuckets[h] || 0;
        let type = 'normal', label = '平稳期', desc = '';
        if (count >= 5) { type = 'peak'; label = '高效期'; desc = '番茄钟完成最多的时段，适合深度工作'; }
        else if (count >= 2) { type = 'normal'; label = '正常期'; desc = '可安排常规任务'; }
        else { type = 'slump'; label = '低效期'; desc = '适合休息、会议或轻度任务'; }

        blocks.push({
          time: String(h).padStart(2, '0') + ':00 - ' + String(h + 1).padStart(2, '0') + ':00',
          type, label, desc,
        });
      }
      return blocks;
    },

    rhythmStats() {
      const recentPoms = this.pomodoros.filter(p => p.completed);
      const hourBuckets = {};
      for (let i = 0; i < 24; i++) hourBuckets[i] = 0;
      recentPoms.forEach(p => {
        const h = new Date(p.createdAt).getHours();
        hourBuckets[h] = (hourBuckets[h] || 0) + 1;
      });

      let peakHour = '--', maxCount = 0;
      for (let h = 6; h < 23; h++) {
        if (hourBuckets[h] > maxCount) { maxCount = hourBuckets[h]; peakHour = h + ':00-' + (h + 1) + ':00'; }
      }

      const avgFocus = recentPoms.length > 0
        ? Math.round(recentPoms.reduce((s, p) => s + (p.duration || 25), 0) / recentPoms.length)
        : 0;

      // 按星期几统计
      const dayBuckets = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };
      recentPoms.forEach(p => { dayBuckets[new Date(p.createdAt).getDay()]++; });
      let bestDayNum = '0', maxDay = 0;
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      Object.entries(dayBuckets).forEach(([k, v]) => { if (v > maxDay) { maxDay = v; bestDayNum = k; } });

      let tip = '';
      if (maxCount >= 5) tip = `你的高效时段是 ${peakHour}，建议将重要任务安排在此时间段`;
      else tip = '继续记录番茄钟数据，AI将为你发现最佳工作时段';

      return {
        peakHour: maxCount >= 2 ? peakHour : '数据不足',
        avgFocus,
        bestDay: maxDay >= 2 ? '周' + dayNames[parseInt(bestDayNum)] : '--',
        tip,
      };
    },

    habitRecommendations() {
      const recs = [];
      const recentCheckins = this.checkins.slice(-14);
      const gradeC = recentCheckins.filter(c => c.grade === 'C').length;
      const hasHabit = (name) => this.habits.some(h => h.name.includes(name));

      if (gradeC >= 3 && !hasHabit('睡眠')) {
        recs.push({ name: '早睡早起', icon: '💤', urgency: 'high', reason: `近两周有 ${gradeC} 天C档打卡，规律作息可能帮助改善精力状态。` });
      }
      if (this.tasks.filter(t => !t.completed).length >= 5 && !hasHabit('整理')) {
        recs.push({ name: '每日整理5分钟', icon: '📝', urgency: 'high', reason: `当前有 ${this.tasks.filter(t => !t.completed).length} 个未完成任务，每日微整理可减少积压。` });
      }
      if (this.journals.filter(j => j.mood === 'sad').length >= 3 && !hasHabit('运动')) {
        recs.push({ name: '每日散步15分钟', icon: '🏃', urgency: 'medium', reason: '近期情绪低落记录较多，运动被证明能有效改善情绪状态。' });
      }
      if (!hasHabit('阅读') && this.habits.length >= 2) {
        recs.push({ name: '每日阅读30分钟', icon: '📖', urgency: 'low', reason: '你已有良好习惯基础，阅读可以帮助知识积累和心态放松。' });
      }
      if (this.pomodoros.filter(p => p.completed).length < 10 && !hasHabit('专注')) {
        recs.push({ name: '每天1个番茄钟', icon: '🍅', urgency: 'medium', reason: '专注时间偏少，从每天1个番茄钟开始建立深度工作习惯。' });
      }

      return recs.slice(0, 4);
    },

    addRecommendedHabit(rec) {
      this.page = 'habits';
      this.habitShowForm = true;
      this.habitForm = { name: rec.name, icon: rec.icon };
    },

    // ===== 周报 =====
    weeklyDateRange() {
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
      return `${fmt(start)} - ${fmt(end)} · ${now.getFullYear()}`;
    },

    weeklyReportData() {
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      const startStr = start.toISOString().slice(0, 10);
      const endStr = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const weekTasks = this.tasks.filter(t => t.date >= startStr && t.date < endStr);
      const done = weekTasks.filter(t => t.completed).length;
      const taskPct = weekTasks.length > 0 ? Math.round(done / weekTasks.length * 100) : 0;

      const weekPoms = this.pomodoros.filter(p => p.createdAt >= start.toISOString() && p.completed);

      const weekHabits = this.habits;
      let habitDone = 0, habitTotal = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        weekHabits.forEach(h => { habitTotal++; if (h.logs && h.logs[ds]) habitDone++; });
      }
      const habitPct = habitTotal > 0 ? Math.round(habitDone / habitTotal * 100) : 0;

      const weekCheckins = this.checkins.filter(c => c.date >= startStr && c.date < endStr);
      const gradeA = weekCheckins.filter(c => c.grade === 'A').length;
      const gradeB = weekCheckins.filter(c => c.grade === 'B').length;
      const gradeC = weekCheckins.filter(c => c.grade === 'C').length;

      const weekJournals = this.journals.filter(j => j.date >= startStr && j.date < endStr);
      const moodHappy = weekJournals.filter(j => j.mood === 'happy').length;
      const moodNeutral = weekJournals.filter(j => j.mood === 'neutral').length;
      const moodSad = weekJournals.filter(j => j.mood === 'sad').length;

      const highlights = this.weeklyHighlights.filter(h => {
        const hd = new Date(h.date || h.createdAt);
        return hd >= start && hd < end;
      }).map(h => h.text || h.title || h);

      return {
        taskPct, pomodoroCount: weekPoms.length,
        habitPct, checkinDays: weekCheckins.length,
        gradeA, gradeB, gradeC,
        moodHappy, moodNeutral, moodSad,
        highlights,
      };
    },

    weeklyMoodSummary() {
      const d = this.weeklyReportData();
      if (d.moodHappy + d.moodNeutral + d.moodSad === 0) return '本周暂无情绪记录。';
      if (d.moodHappy >= 4) return '本周情绪以开心为主，生活节奏良好。';
      if (d.moodSad >= 3) return '本周低落情绪较多，记得给自己一些放松的空间。';
      return '情绪平稳的一周，继续保持。';
    },

    exportWeeklyReport() {
      const d = this.weeklyReportData();
      const lines = [
        `个人之旅 · 周报`,
        `${this.weeklyDateRange()}`,
        ``,
        `=== 核心数据 ===`,
        `任务完成率: ${d.taskPct}%`,
        `番茄钟完成: ${d.pomodoroCount}个`,
        `习惯完成率: ${d.habitPct}%`,
        `打卡天数: ${d.checkinDays}天`,
        ``,
        `=== 打卡分布 ===`,
        `A档(完美日): ${d.gradeA}天`,
        `B档(基础日): ${d.gradeB}天`,
        `C档(兜底日): ${d.gradeC}天`,
        ``,
        `=== 情绪趋势 ===`,
        `😊 开心: ${d.moodHappy}天`,
        `😐 一般: ${d.moodNeutral}天`,
        `😔 低落: ${d.moodSad}天`,
        `${this.weeklyMoodSummary()}`,
        ``,
        `=== 高光时刻 ===`,
        ...(d.highlights.length > 0 ? d.highlights.map(h => `⭐ ${h}`) : ['本周暂无高光记录']),
        ``,
        `生成于 ${new Date().toLocaleDateString('zh-CN')}`,
      ];

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `个人之旅周报_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('周报已导出', 'success');
    },

    // ===== 数据可视化方法 =====
    taskCompletionTrend() {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const dayTasks = this.tasks.filter(t => t.date === ds || (!t.date && i === 0));
        const completed = dayTasks.filter(t => t.completed).length;
        const total = dayTasks.length;
        result.push({
          label: ['日','一','二','三','四','五','六'][d.getDay()],
          completed, total,
          pct: total > 0 ? completed / total : 0,
        });
      }
      return result;
    },

    pomodoroStats() {
      const today = this.getTodayStr();
      const todayMinutes = this.pomodoros
        .filter(p => (p.createdAt || '').slice(0, 10) === today && p.completed)
        .reduce((s, p) => s + (p.duration || 25), 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekPoms = this.pomodoros.filter(p => p.completed && new Date(p.createdAt) >= weekAgo);
      return {
        todayMinutes,
        weekCount: weekPoms.length,
        totalCount: this.pomodoros.filter(p => p.completed).length,
      };
    },

    monthHeatmap() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const result = [];

      // 填充月初空白
      for (let i = 0; i < firstDay; i++) {
        result.push({ date: '', intensity: 'none' });
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const checkin = this.checkins.find(c => c.date === ds);
        let intensity = 'none';
        if (checkin) {
          if (checkin.grade === 'A') intensity = 'high';
          else if (checkin.grade === 'B') intensity = 'medium';
          else intensity = 'low';
        }
        result.push({ date: ds, intensity });
      }

      return result;
    },

    // ===== 数据管理 =====
    exportData() {
      this.quickExportData();
    },
    resetData() {
      if (!confirm('确定要重置所有数据吗？此操作不可恢复。建议先导出备份。')) return;
      localStorage.removeItem('personal_journey');
      this.goals = [];
      this.tasks = [];
      this.pomodoros = [];
      this.contacts = [];
      this.checkins = [];
      this.weeklyHighlights = [];
      this.nlpTemplates = ['每日阅读 #成长', '下午开会讨论 #工作', '运动健身 #生活'];
      this.nlpHistory = [];
      this.memoryItems = [];
      this.habits = [];
      this.journals = [];
      this.plantedTrees = [];
      this.treeTotalCount = 0;
      this.profileForm = { nickname: '', bio: '', email: '', phone: '' };
      this.cleanupScanned = false;
      this.searchHistory = [];
      this.showToast('所有数据已清除', 'warning');
    },
    seedDemoData() {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      this.goals = [
        { id: 'g1', type: '年', title: '提升专业能力', kr: ['通过PMP认证', '读完12本专业书籍'], parentId: null, antiGoals: ['不要为了考证牺牲睡眠质量'], ifThen: [], createdAt: now },
        { id: 'g2', type: '季', title: 'Q2完成培训课程', kr: ['学完35学时', '完成3次模拟考'], parentId: 'g1', antiGoals: [], ifThen: [], createdAt: now },
      ];
      this.tasks = [
        { id: 't1', title: '阅读《原则》第三章', date: today, completed: false, priority: 'high', tags: ['grow'], createdAt: now },
      ];
      this.pomodoros = [];
      this.contacts = [
        { id: 'c1', name: '张三', relation: '同事', level: 3, company: '', note: '', tags: ['work'], createdAt: now },
      ];
      this.checkins = [{ date: today, grade: 'B' }];
      this.weeklyHighlights = ['完成了第一个番茄钟！'];
      this.habits = [{ id: 'h1', name: '阅读', icon: '📖', logs: {}, createdAt: now }];
      this.journals = [{ date: today, mood: 'neutral', content: '第一天使用个人之旅，感觉不错。', gratitude: '' }];
      this.plantedTrees = [];
      this.treeTotalCount = 0;
      this.saveData();
      this.showToast('演示数据已加载（可删除）', 'success');
    },

    // ===== Alpine 初始化回调 =====
    init() {
      this.loadData();
      this.loadProfileInfo();
      this.loadSearchHistory();
      this.loadJournalDraft();
      this.startTaskReminderTimer();
      this.initGlobalBack();
      this.initSwipeNav();

      // 3D 森林在切换到 pomodoro 页面时初始化
    },
  };
}

// ===== Three.js 3D 森林引擎 =====
class Forest3DEngine {
  constructor(container) {
    this.container = container;
    this.canvas = container.querySelector('canvas');
    if (!this.canvas) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.trees = [];
    this.ground = null;
    this.clouds = [];
    this.butterflies = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.cameraAngle = { theta: 0.6, phi: 0.8 };
    this.cameraDistance = 18;
    this.targetDistance = 18;
    this.treeMeshes = [];
    this.hoveredTree = null;
    this.tooltipEl = null;

    this.init();
  }

  init() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    this.updateCameraPosition();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Lighting
    this.setupLighting();

    // Ground
    this.createGround();

    // Events
    this.bindEvents();

    // Animation loop
    this.animate();
  }

  setupLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Hemisphere (sky/ground)
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x4a7c3a, 0.5);
    this.scene.add(hemi);

    // Directional sun
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    sun.position.set(15, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Rim light
    const rim = new THREE.DirectionalLight(0xa8d5ba, 0.3);
    rim.position.set(-10, 8, -10);
    this.scene.add(rim);
  }

  createGround() {
    // Main ground plane
    const geo = new THREE.CircleGeometry(40, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5a9e3a,
      roughness: 0.9,
      metalness: 0.0,
    });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Grass tufts (instanced for performance)
    this.createGrassTufts();

    // Small hills
    this.createHills();

    // Decorative rocks
    this.createRocks();

    // Clouds
    this.createClouds();

    // Butterflies
    this.createButterflies();
  }

  createGrassTufts() {
    const tuftGeo = new THREE.ConeGeometry(0.08, 0.25, 4);
    const tuftMat = new THREE.MeshStandardMaterial({ color: 0x6ab04a, roughness: 0.8 });
    const count = 300;
    const mesh = new THREE.InstancedMesh(tuftGeo, tuftMat, count);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const r = Math.random() * 18;
      const a = Math.random() * Math.PI * 2;
      dummy.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.setScalar(0.5 + Math.random() * 1.0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(mesh);
  }

  createHills() {
    const hillGeo = new THREE.SphereGeometry(4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x4a8c2a, roughness: 0.95 });

    const hills = [
      { x: -12, z: -8, s: 1.2 },
      { x: 14, z: -6, s: 0.9 },
      { x: -6, z: 12, s: 1.0 },
      { x: 10, z: 10, s: 0.7 },
    ];

    hills.forEach(h => {
      const mesh = new THREE.Mesh(hillGeo, hillMat);
      mesh.position.set(h.x, -3.5, h.z);
      mesh.scale.set(h.s * 2, h.s * 1.5, h.s * 2);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
  }

  createRocks() {
    const rockGeo = new THREE.DodecahedronGeometry(0.3, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7, metalness: 0.1 });

    for (let i = 0; i < 8; i++) {
      const r = 3 + Math.random() * 12;
      const a = Math.random() * Math.PI * 2;
      const mesh = new THREE.Mesh(rockGeo, rockMat);
      mesh.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r);
      mesh.scale.setScalar(0.5 + Math.random() * 0.8);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
  }

  createClouds() {
    const cloudGeo = new THREE.SphereGeometry(1, 16, 12);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      roughness: 1,
    });

    for (let i = 0; i < 5; i++) {
      const group = new THREE.Group();
      const blobs = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < blobs; j++) {
        const mesh = new THREE.Mesh(cloudGeo, cloudMat);
        mesh.position.set(
          (Math.random() - 0.5) * 2.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 1.5
        );
        mesh.scale.setScalar(0.6 + Math.random() * 0.6);
        group.add(mesh);
      }
      group.position.set(
        (Math.random() - 0.5) * 30,
        12 + Math.random() * 5,
        (Math.random() - 0.5) * 20
      );
      group.userData.speed = 0.005 + Math.random() * 0.01;
      this.clouds.push(group);
      this.scene.add(group);
    }
  }

  createButterflies() {
    const wingGeo = new THREE.PlaneGeometry(0.15, 0.1);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group();
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.x = -0.08;
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.x = 0.08;
      b.add(leftWing, rightWing);

      b.position.set(
        (Math.random() - 0.5) * 10,
        1 + Math.random() * 2,
        (Math.random() - 0.5) * 10
      );
      b.userData = {
        leftWing, rightWing,
        basePos: b.position.clone(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      };
      this.butterflies.push(b);
      this.scene.add(b);
    }
  }

  // ===== Tree Models =====
  createTreeModel(treeData, x, z) {
    const group = new THREE.Group();
    const duration = treeData.duration || 25;
    const isDead = treeData.dead;

    // Size based on duration
    let scale = 0.6;
    if (duration >= 60) scale = 1.4;
    else if (duration >= 45) scale = 1.15;
    else if (duration >= 25) scale = 0.9;

    // Trunk
    const trunkH = 0.8 * scale;
    const trunkR = 0.08 * scale;
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 8);
    const trunkColor = isDead ? 0x6b5b4f : 0x8B6914;
    const trunkMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage layers
    const foliageColors = isDead
      ? [0x8b7355, 0x7a6b4f, 0x6b5b3f]
      : [0x4CAF50, 0x66BB6A, 0x81C784];

    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const r = (0.5 - i * 0.12) * scale;
      const h = (0.5 - i * 0.05) * scale;
      const coneGeo = new THREE.ConeGeometry(r, h, 8);
      const coneMat = new THREE.MeshStandardMaterial({
        color: foliageColors[i],
        roughness: 0.7,
        metalness: 0.0,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = trunkH + i * h * 0.55;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    }

    // Shadow blob on ground
    const shadowGeo = new THREE.CircleGeometry(0.4 * scale, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    group.add(shadow);

    // Position
    group.position.set(x, 0, z);

    // Gentle sway animation data
    group.userData = {
      treeData,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.3 + Math.random() * 0.4,
      baseRotation: group.rotation.clone(),
    };

    return group;
  }

  createDeadTreeModel(treeData, x, z) {
    const group = new THREE.Group();
    const scale = 0.7;

    // Bent trunk
    const trunkGeo = new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 0.6 * scale, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.95 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.3 * scale;
    trunk.rotation.z = 0.3;
    trunk.castShadow = true;
    group.add(trunk);

    // Dried leaves (small brown spheres)
    for (let i = 0; i < 3; i++) {
      const leafGeo = new THREE.SphereGeometry(0.06 * scale, 6, 6);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(
        (Math.random() - 0.5) * 0.2,
        0.5 * scale + Math.random() * 0.15,
        (Math.random() - 0.5) * 0.2
      );
      group.add(leaf);
    }

    group.position.set(x, 0, z);
    group.userData = { treeData, isDead: true };
    return group;
  }

  // ===== Set Trees =====
  setTrees(treeGroups) {
    // Remove old trees
    this.treeMeshes.forEach(m => this.scene.remove(m));
    this.treeMeshes = [];

    if (!treeGroups || treeGroups.length === 0) {
      // Empty state - show a seedling
      this.createEmptyState();
      return;
    }

    // Flatten all trees and position them
    const allTrees = [];
    treeGroups.forEach(g => {
      g.trees.forEach(t => allTrees.push(t));
    });

    // Arrange in a natural cluster pattern
    const count = allTrees.length;
    const radius = Math.min(8, Math.sqrt(count) * 1.2);

    allTrees.forEach((tree, i) => {
      // Spiral / golden angle distribution for natural look
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const r = radius * Math.sqrt(i / Math.max(count, 1));
      const theta = i * goldenAngle;
      const x = Math.cos(theta) * r + (Math.random() - 0.5) * 0.5;
      const z = Math.sin(theta) * r + (Math.random() - 0.5) * 0.5;

      const model = tree.dead
        ? this.createDeadTreeModel(tree, x, z)
        : this.createTreeModel(tree, x, z);

      this.scene.add(model);
      this.treeMeshes.push(model);
    });
  }

  createEmptyState() {
    // Small seedling in center
    const seedGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const seedMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.6 });
    const seed = new THREE.Mesh(seedGeo, seedMat);
    seed.position.y = 0.08;
    seed.castShadow = true;

    // Tiny sprout
    const sproutGeo = new THREE.ConeGeometry(0.04, 0.15, 6);
    const sproutMat = new THREE.MeshStandardMaterial({ color: 0x90EE90, roughness: 0.7 });
    const sprout = new THREE.Mesh(sproutGeo, sproutMat);
    sprout.position.y = 0.2;
    sprout.castShadow = true;

    const group = new THREE.Group();
    group.add(seed, sprout);
    group.userData = { isEmptyState: true, swayPhase: 0, swaySpeed: 1 };
    this.scene.add(group);
    this.treeMeshes.push(group);
  }

  // ===== Camera =====
  updateCameraPosition() {
    const { theta, phi } = this.cameraAngle;
    const d = this.cameraDistance;
    this.camera.position.set(
      d * Math.sin(phi) * Math.cos(theta),
      d * Math.cos(phi),
      d * Math.sin(phi) * Math.sin(theta)
    );
    this.camera.lookAt(0, 1, 0);
  }

  // ===== Events =====
  bindEvents() {
    const canvas = this.canvas;

    // Store bound handlers so they can be removed later
    this._onMouseDown = (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    };
    this._onMouseMove = (e) => {
      if (!this.isDragging) {
        this.updateHover(e);
        return;
      }
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.cameraAngle.theta -= dx * 0.008;
      this.cameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, this.cameraAngle.phi + dy * 0.008));
      this.lastMouse = { x: e.clientX, y: e.clientY };
    };
    this._onMouseUp = () => { this.isDragging = false; };
    this._onWheel = (e) => {
      e.preventDefault();
      this.targetDistance = Math.max(5, Math.min(40, this.targetDistance + e.deltaY * 0.02));
    };
    this._onTouchStart = (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    this._onTouchMove = (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastMouse.x;
      const dy = e.touches[0].clientY - this.lastMouse.y;
      this.cameraAngle.theta -= dx * 0.008;
      this.cameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, this.cameraAngle.phi + dy * 0.008));
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    this._onTouchEnd = () => { this.isDragging = false; };
    this._resizeHandler = () => this.onResize();

    // Attach
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: true });
    canvas.addEventListener('touchend', this._onTouchEnd);
    window.addEventListener('resize', this._resizeHandler);
  }

  updateHover(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Collect all tree mesh children
    const targets = [];
    this.treeMeshes.forEach(g => {
      g.traverse(child => {
        if (child.isMesh) targets.push(child);
      });
    });

    const intersects = this.raycaster.intersectObjects(targets);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      let group = hit.parent;
      while (group && !group.userData.treeData && !group.userData.isEmptyState) {
        group = group.parent;
      }
      if (group && group.userData.treeData) {
        this.showTooltip(group.userData.treeData, e.clientX, e.clientY);
        this.hoveredTree = group;
        document.body.style.cursor = 'pointer';
        return;
      }
    }
    this.hideTooltip();
    this.hoveredTree = null;
    document.body.style.cursor = '';
  }

  showTooltip(treeData, x, y) {
    if (!this.tooltipEl) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.className = 'tree-3d-tooltip';
      this.tooltipEl.style.cssText = 'position:fixed;z-index:300;background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);border-radius:10px;padding:10px 14px;box-shadow:0 8px 32px rgba(0,0,0,0.15);border:0.5px solid rgba(0,0,0,0.08);font-size:12px;pointer-events:none;transition:opacity 0.15s;min-width:140px;';
      document.body.appendChild(this.tooltipEl);
    }
    const status = treeData.dead ? '<span style="color:#C62828">中途放弃</span>' : '<span style="color:#2E7D32">专注完成</span>';
    this.tooltipEl.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;color:#333">${treeData.date || ''}</div>
      <div style="color:#666;margin-bottom:2px">专注时长: <b>${treeData.duration || 0}分钟</b></div>
      <div>${status}</div>
    `;
    this.tooltipEl.style.left = (x + 12) + 'px';
    this.tooltipEl.style.top = (y - 12) + 'px';
    this.tooltipEl.style.opacity = '1';
  }

  hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.style.opacity = '0';
  }

  onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ===== Animation =====
  animate() {
    if (!this.renderer) return;
    this._animationId = requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Smooth zoom
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * 0.08;
    this.updateCameraPosition();

    // Tree sway
    this.treeMeshes.forEach(tree => {
      const ud = tree.userData;
      if (ud.swayPhase !== undefined) {
        const sway = Math.sin(time * ud.swaySpeed + ud.swayPhase) * 0.03;
        tree.rotation.z = sway;
        tree.rotation.x = sway * 0.5;
      }
      // Hover scale
      if (this.hoveredTree === tree) {
        const targetScale = 1.15;
        tree.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      } else {
        tree.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    });

    // Cloud drift
    this.clouds.forEach(cloud => {
      cloud.position.x += cloud.userData.speed;
      if (cloud.position.x > 25) cloud.position.x = -25;
    });

    // Butterflies
    this.butterflies.forEach(b => {
      const ud = b.userData;
      const t = time * ud.speed + ud.phase;
      b.position.x = ud.basePos.x + Math.sin(t) * 2;
      b.position.y = ud.basePos.y + Math.sin(t * 1.5) * 0.5;
      b.position.z = ud.basePos.z + Math.cos(t) * 2;
      // Wing flap
      const flap = Math.sin(time * 15 + ud.phase);
      ud.leftWing.rotation.y = flap * 0.6;
      ud.rightWing.rotation.y = -flap * 0.6;
    });

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }

    // Remove all event listeners
    const canvas = this.canvas;
    if (canvas) {
      if (this._onMouseDown) canvas.removeEventListener('mousedown', this._onMouseDown);
      if (this._onWheel) canvas.removeEventListener('wheel', this._onWheel);
      if (this._onTouchStart) canvas.removeEventListener('touchstart', this._onTouchStart);
      if (this._onTouchMove) canvas.removeEventListener('touchmove', this._onTouchMove);
      if (this._onTouchEnd) canvas.removeEventListener('touchend', this._onTouchEnd);
    }
    if (this._onMouseMove) window.removeEventListener('mousemove', this._onMouseMove);
    if (this._onMouseUp) window.removeEventListener('mouseup', this._onMouseUp);
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);

    if (this.tooltipEl) { this.tooltipEl.remove(); this.tooltipEl = null; }

    // Dispose renderer and release GL context
    if (this.renderer) {
      this.renderer.dispose();
      // Force context loss to free GPU resources
      const gl = this.renderer.getContext();
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
      this.renderer.forceContextLoss();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
  }
}

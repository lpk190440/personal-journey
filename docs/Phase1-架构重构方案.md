# 「个人智能操作系统」Phase 1 架构重构方案

> 文档版本: 1.0 | 2026-06-10 | 只做架构设计，不写代码

---

## 目录

1. [技术栈推荐及理由](#1-技术栈推荐及理由)
2. [文件结构重组方案](#2-文件结构重组方案)
3. [数据层统一方案](#3-数据层统一方案)
4. [模块加载机制](#4-模块加载机制)
5. [实施步骤](#5-实施步骤)

---

## 1. 技术栈推荐及理由

### 1.1 候选方案对比

| 维度 | Vue 3 + Pinia + Vite | Svelte | React + Zustand | 保持 Alpine.js + 模块化 |
|------|---------------------|--------|-----------------|------------------------|
| **学习成本** | 中（Composition API） | 低（模板语法简单） | 中高（Hooks思维） | **极低（已掌握）** |
| **构建工具** | Vite（必须） | Vite（必须） | Vite/CRA（必须） | **零构建（script标签即可）** |
| **打包体积** | ~40KB (gzip) | ~10KB (gzip) | ~45KB (gzip) | **~15KB (gzip)** |
| **组件化** | SFC单文件组件 | SFC单文件组件 | JSX组件 | 模板片段 + x-data |
| **状态管理** | Pinia（内置devtools） | Svelte stores | Zustand | **OS.store + Alpine reactive** |
| **路由** | vue-router | svelte-routing | react-router | **x-show/page切换（已实现）** |
| **TypeScript** | 原生支持 | 原生支持 | 原生支持 | 需额外配置 |
| **PWA/离线** | vite-plugin-pwa | 同左 | workbox | **已实现 sw.js** |
| **迁移成本** | 高：重写所有模板/逻辑 | 高：重写所有模板/逻辑 | 高：重写所有模板/逻辑 | **低：渐进式拆分** |
| **单开发者效率** | 中（需维护构建链） | 中（需维护构建链） | 中（需维护构建链） | **高：保存即刷新** |
| **未来扩展** | 生态丰富 | 生态较新 | 生态最丰富 | 有限（需逐步引入工具） |

### 1.2 推荐方案：保持 Alpine.js + 模块化 + 逐步引入工具

**理由：**

1. **零破坏性迁移**：当前 5411 行 app.js + 4083 行 index.html 已经在 Alpine.js 上跑通所有功能，换框架意味着重写全部模板和逻辑，风险极高且无业务增量。

2. **单人开发者友好**：Alpine.js 不需要构建工具链，修改后浏览器刷新即可看到效果。Vue/Svelte/React 都需要 Vite 构建管线，增加日常开发摩擦。

3. **离线可用无影响**：项目是纯前端 SPA + localStorage，Alpine.js 已通过 CDN 加载后进入 Service Worker 缓存，换框架不会改善离线体验。

4. **Alpine.js 足够支撑组件化**：
   - `Alpine.data()` 可以定义可复用的组件级状态
   - `x-teleport` 支持弹窗/模态框
   - `$dispatch` / `$watch` 支持跨组件通信
   - 模板可以用 `<template x-if>` 按需渲染

5. **未来渐进式升级路径**：
   - Phase 2 可以引入 Vite 做 CSS/JS 打包压缩（不换框架）
   - Phase 3 如需 TypeScript，可在 Vite 中配置 Alpine.js + TS
   - Phase 4 如需复杂状态管理，可引入 Pinia 与 Alpine 并存

**推荐的技术组合：**

```
框架层: Alpine.js 3.14 (保持不变)
模板引擎: Alpine x-data / x-if / x-for / x-teleport
数据层: OS.store (core/store.js) -- 统一入口
图谱引擎: OS.graph (core/graph.js) -- 双向链接
模块注册: OS.registry (core/registry.js) -- 模块发现
CSS: CSS Variables + 按模块拆分
构建: 当前无构建（Phase 2 可选引入 Vite）
测试: 当前无（Phase 3 可选引入 Vitest + Playwright）
```

### 1.3 不做的事（Anti-Goals）

- **不引入 npm/Node.js 构建链**：Phase 1 保持零构建，浏览器直接可用
- **不换 UI 框架**：不引入 Tailwind CSS / UnoCSS 等工具类框架
- **不引入后端**：保持纯前端 + localStorage
- **不改变现有 CSS 变量体系**：现有 `--bg-primary` / `--accent` 等变量体系已经很成熟

---

## 2. 文件结构重组方案

### 2.1 目标结构

```
个人之旅/
├── index.html                    # 精简为 ~1800行：框架骨架 + 模板分区 + 脚本加载
├── manifest.json                 # PWA清单（不变）
├── sw.js                         # Service Worker（不变）
│
├── core/                         # 基础设施层（增强）
│   ├── registry.js               # 模块注册中心（已有，增强懒加载支持）
│   ├── store.js                  # 统一数据存储（已有，增强 watch 能力）
│   ├── graph.js                  # 知识图谱引擎（已有，增强自动链接钩子）
│   ├── modules.js                # 模块注册清单（已有，增强模块元数据）
│   ├── router.js                 # [新增] 路由管理器
│   ├── bridge.js                 # [新增] Alpine.js 数据桥接层
│   └── utils.js                  # [新增] 通用工具函数（Toast/通知/确认框）
│
├── modules/                      # 功能模块（每个模块独立目录）
│   ├── home/                     # 首页仪表盘
│   │   ├── manifest.json
│   │   ├── module.js             # 模块逻辑（Alpine.data）
│   │   ├── template.html         # 模块模板片段
│   │   └── style.css             # 模块样式
│   ├── tasks/                    # 任务管理
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html
│   │   ├── nlp-engine.js         # NLP解析引擎（从app.js拆出）
│   │   └── style.css
│   ├── goals/                    # 目标管理
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html
│   │   └── style.css
│   ├── pomodoro/                 # 番茄钟 + 种树
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html
│   │   ├── forest.js             # 3D森林视图（从app.js拆出）
│   │   └── style.css
│   ├── checkin/                  # 每日打卡
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html
│   │   └── style.css
│   ├── habits/                   # 习惯追踪
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html
│   │   └── style.css
│   ├── journal/                  # 日记随笔
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html
│   │   └── style.css
│   ├── contacts/                 # 人脉网络
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html
│   │   └── style.css
│   ├── memory/                   # 物品记忆
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html
│   │   └── style.css
│   ├── lifeplan/                 # 人生规划（已有，规范化）
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html         # [新增] 从index.html拆出
│   │   └── style.css             # [新增]
│   ├── models/                   # 思维模型（已有，规范化）
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html         # [新增]
│   │   └── style.css             # [新增]
│   ├── settings/                 # 系统设置
│   │   ├── manifest.json
│   │   ├── module.js
│   │   ├── template.html
│   │   └── style.css
│   └── profile/                  # 个人中心
│       ├── manifest.json
│       ├── module.js
│       ├── template.html
│       └── style.css
│
├── components/                   # [新增] 共享UI组件
│   ├── modal.js                  # 通用模态框
│   ├── toast.js                  # Toast通知
│   ├── confirm-dialog.js         # 确认对话框
│   ├── empty-state.js            # 空状态占位
│   ├── task-card.js              # 任务卡片组件
│   ├── goal-card.js              # 目标卡片组件
│   ├── checkin-panel.js          # 打卡面板组件
│   ├── heatmap.js                # 热力图组件
│   └── pomodoro-timer.js         # 番茄钟计时器组件
│
├── css/                          # 全局样式
│   ├── variables.css             # [新] CSS变量定义（从style.css拆出）
│   ├── reset.css                 # [新] Reset + 排版基础
│   ├── layout.css                # [新] 页面布局 / 底部导航
│   ├── components.css            # [新] 通用组件样式
│   ├── utilities.css             # [新] 工具类（flex/gap/text等）
│   ├── themes/                   # 主题
│   │   ├── ocean.css             # Ocean主题（原ocean-theme.css）
│   │   ├── flat-green.css        # Flat Green主题（原flat-green-theme.css）
│   │   └── dark.css              # 暗色模式（从style.css拆出）
│   ├── os-launcher.css           # 启动器（保持独立）
│   └── irregular-shapes.css      # 不规则形状（保持独立）
│
└── js/
    ├── app.js                    # 精简为 ~400行：Alpine初始化 + 全局状态
    ├── auth.js                   # [新] 用户认证系统（从app.js拆出 ~800行）
    ├── data-migration.js         # [新] 版本迁移系统（从app.js拆出 ~500行）
    ├── data-io.js                # [新] 数据导入导出（从app.js拆出 ~400行）
    ├── ai-engine.js              # [新] AI引擎（从app.js拆出 ~600行）
    └── notifications.js          # [新] 通知系统（从app.js拆出 ~200行）
```

### 2.2 HTML 模板拆分策略

Phase 1 推荐：**保持模板在 index.html，但按 section 加清晰注释分隔**。

Phase 2 再拆为独立 HTML 模板文件 + fetch 加载。

### 2.3 JS 模块化拆分方案

**拆分映射表**：

| 原 app.js 区域 | 行数估计 | 目标文件 | 说明 |
|---------------|---------|---------|------|
| 数据存储 (saveData/loadData) | ~90行 | 删除（迁移到OS.store） | store.js已替代 |
| 深色模式 + 主题系统 | ~350行 | `js/theme.js` | 主题切换/预设/自定义 |
| 用户认证系统 | ~500行 | `js/auth.js` | 登录/注册/锁屏/加密 |
| 数据导入导出 | ~350行 | `js/data-io.js` | JSON/CSV/Excel |
| 版本迁移 | ~280行 | `js/data-migration.js` | 数据版本升级 |
| AI引擎 | ~400行 | `js/ai-engine.js` | NLP AI / 洞察 / 复盘 |
| 通知系统 | ~60行 | `js/notifications.js` | Browser Notification |
| 番茄钟 + 种树 | ~450行 | `modules/pomodoro/module.js` | 计时器+3D森林 |
| 任务管理 | ~300行 | `modules/tasks/module.js` | CRUD + 排序 |
| NLP解析引擎 | ~350行 | `modules/tasks/nlp-engine.js` | 文本→结构化 |
| 目标管理 | ~200行 | `modules/goals/module.js` | OKR + 反目标 |
| 打卡引擎 | ~350行 | `modules/checkin/module.js` | ABC三档+热力图 |
| 习惯追踪 | ~150行 | `modules/habits/module.js` | 勾选+Streak |
| 日记/随笔 | ~120行 | `modules/journal/module.js` | 日记CRUD+情绪 |
| 人脉管理 | ~60行 | `modules/contacts/module.js` | 联系人CRUD |
| 物品记忆 | ~110行 | `modules/memory/module.js` | 物品CRUD |
| 全局搜索 | ~70行 | `js/search.js` | 跨模块搜索 |
| 首页/启动器/导航 | ~400行 | `js/app.js` | 保留在app.js |

### 2.4 CSS 组织方案

```
css/
├── variables.css        # :root 变量 + 暗色模式变量 + 主题过渡
├── reset.css            # *, body, 排版层级, 基础元素
├── layout.css           # .page-container, .header, .bottom-nav, 页面切换
├── components.css       # .btn, .card, .dash-card, .input, .tag, .toggle, .fab, .badge
├── utilities.css        # .flex, .gap-*, .text-*, .items-center 等工具类
├── themes/
│   ├── ocean.css
│   ├── flat-green.css
│   └── dark.css
├── os-launcher.css
└── irregular-shapes.css
```

模块级 CSS 放在 `modules/<name>/style.css`，只包含该页面特有样式。

---

## 3. 数据层统一方案

### 3.1 当前问题

app.js 使用 `localStorage['personal_journey']` 读写，store.js 使用 `localStorage['personal_journey_os']` —— **两套独立存储，数据不同步**。

### 3.2 统一方案

**Step 1: 统一 localStorage Key** → `personal_journey_os`，首次加载自动从旧 key 迁移。

**Step 2: 删除 app.js 中的 saveData/loadData** → 所有读写统一走 `OS.store`。

**Step 3: 桥接层** → Phase 1 采用双写模式：每个模块 init 时从 store 读取，操作后手动 `OS.store.set()` + `this.xxx = newValue`。

**Step 4: 图谱自动链接** → 创建任务/日记/目标时自动调用 `OS.graph.registerNode()` + `OS.graph.link()`。

### 3.3 数据流架构图

```
┌──────────────────────────────────────────────────────────┐
│                     数据流架构                            │
│                                                          │
│  Alpine.js 组件 (this.xxx)                               │
│       │ get / set                                        │
│       ▼                                                  │
│  ┌──────────────┐    watch/callback    ┌──────────────┐  │
│  │  OS.bridge   │◄───────────────────►│  OS.store    │  │
│  │  (桥接层)    │    Proxy/双写        │  (_cache)    │  │
│  └──────┬───────┘                     └──────┬───────┘  │
│         │                                    │           │
│         │ 写入时自动触发                      │ 防抖保存   │
│         ▼                                    ▼           │
│  ┌──────────────┐                     localStorage     │
│  │  OS.graph    │                     (personal_       │
│  │  (知识图谱)  │                     journey_os)      │
│  └──────────────┘                                      │
│                                                          │
│  所有模块统一通过 OS.store 读写数据                       │
│  OS.graph 在数据变更时自动建立双向链接                    │
└──────────────────────────────────────────────────────────┘
```

---

## 4. 模块加载机制

### 4.1 增强方案

启动时只加载 core/*.js + modules.js + app.js。用户点击模块时动态加载 JS + CSS + HTML。

manifest.json 增强字段：
- `files`：模块文件清单
- `eager: true`：启动时立即加载（home 设为 eager）
- `preload: true`：空闲时预加载

### 4.2 模块与 Alpine.js 的集成

每个模块通过 `Alpine.data()` 注册为独立组件：

```javascript
// modules/tasks/module.js
document.addEventListener('alpine:init', () => {
  Alpine.data('tasksModule', () => ({
    tasks: [],
    init() {
      this.tasks = OS.store.get('tasks') || [];
    },
    createTask() {
      // ...使用 OS.store.set() 统一写入
    },
  }));
});
```

---

## 5. 实施步骤

### 5.1 子阶段划分

Phase 1 总工期估计：**7-10 个工作日**（单人）

```
子阶段 1.1：基础设施加固（1-2天）
子阶段 1.2：数据层统一（1-2天）
子阶段 1.3：JS 模块化拆分（3-4天）
子阶段 1.4：CSS 模块化拆分（1天）
子阶段 1.5：HTML 模板规范化（1-2天）
子阶段 1.6：集成测试与回归（1-2天）
```

### 5.2 子阶段详细任务

#### 子阶段 1.1：基础设施加固（1-2天）

| 任务 | 文件 | 工作量 |
|------|------|--------|
| 创建 `core/router.js` 路由管理器 | `core/router.js` | 2h |
| 创建 `core/bridge.js` Alpine桥接层 | `core/bridge.js` | 2h |
| 创建 `core/utils.js` 通用工具 | `core/utils.js` | 1h |
| 增强 `core/store.js` 旧数据迁移 | `core/store.js` | 1h |
| 增强 `core/graph.js` 自动链接规则 | `core/graph.js` | 1h |
| 增强 `core/registry.js` 懒加载 | `core/registry.js` | 1h |
| 更新 `core/modules.js` 元数据 | `core/modules.js` | 0.5h |

#### 子阶段 1.2：数据层统一（1-2天）

| 任务 | 文件 | 工作量 |
|------|------|--------|
| store.js 支持所有现有 dataKey | `core/store.js` | 1h |
| 逐模块迁移数据读写 | 各模块 module.js | 4h |
| 删除 app.js saveData/loadData | `js/app.js` | 0.5h |
| 图谱自动链接集成 | `core/graph.js` + 各模块 | 2h |
| 验证数据一致性 | 手动测试 | 1h |

#### 子阶段 1.3：JS 模块化拆分（3-4天）

**拆分顺序**（按耦合度从低到高）：

| 顺序 | 模块 | 目标文件 | 工作量 | 风险 |
|------|------|---------|--------|------|
| 1 | 用户认证 | `js/auth.js` | 3h | 低 |
| 2 | 数据导入导出 | `js/data-io.js` | 2h | 低 |
| 3 | 版本迁移 | `js/data-migration.js` | 2h | 低 |
| 4 | 通知系统 | `js/notifications.js` | 1h | 低 |
| 5 | 主题系统 | `js/theme.js` | 2h | 低 |
| 6 | AI引擎 | `js/ai-engine.js` | 2h | 中 |
| 7 | 物品记忆 | `modules/memory/module.js` | 1.5h | 低 |
| 8 | 人脉管理 | `modules/contacts/module.js` | 1h | 低 |
| 9 | 习惯追踪 | `modules/habits/module.js` | 2h | 低 |
| 10 | 日记随笔 | `modules/journal/module.js` | 2h | 低 |
| 11 | 全局搜索 | `js/search.js` | 1h | 低 |
| 12 | 打卡引擎 | `modules/checkin/module.js` | 3h | 中 |
| 13 | 目标管理 | `modules/goals/module.js` | 2h | 中 |
| 14 | NLP解析 | `modules/tasks/nlp-engine.js` | 3h | 高 |
| 15 | 任务管理 | `modules/tasks/module.js` | 3h | 高 |
| 16 | 番茄钟+种树 | `modules/pomodoro/module.js` | 4h | 高 |
| 17 | 首页/启动器 | 保留在 `js/app.js` | 2h | 中 |

#### 子阶段 1.4：CSS 模块化拆分（1天）

| 任务 | 文件 | 工作量 |
|------|------|--------|
| 拆分 CSS 变量到 variables.css | `css/variables.css` | 0.5h |
| 拆分 reset + 排版到 reset.css | `css/reset.css` | 0.5h |
| 拆分布局到 layout.css | `css/layout.css` | 0.5h |
| 拆分组件样式到 components.css | `css/components.css` | 1h |
| 拆分工具类到 utilities.css | `css/utilities.css` | 0.5h |
| 拆分暗色模式到 themes/dark.css | `css/themes/dark.css` | 0.5h |
| 创建模块级 CSS 文件 | `modules/*/style.css` | 3h |
| 更新 index.html link 标签顺序 | `index.html` | 0.5h |

#### 子阶段 1.5：HTML 模板规范化（1-2天）

| 任务 | 工作量 |
|------|--------|
| 提取可复用组件（Modal/Toast/Confirm）到独立模板区块 | 2h |
| 为每个模块页面添加 `<!-- MODULE: xxx START/END -->` 标记 | 1h |
| 移除重复的内联样式（统一到 CSS 类） | 2h |
| 确认所有 x-data/x-show 绑定正确 | 1h |

#### 子阶段 1.6：集成测试与回归（1-2天）

| 任务 | 工作量 |
|------|--------|
| 逐模块功能回归测试 | 4h |
| 数据迁移测试（旧数据→新 store） | 1h |
| 暗色模式/主题切换测试 | 1h |
| PWA 离线可用性测试 | 1h |
| 移动端布局检查 | 1h |
| 性能对比（首屏加载时间） | 0.5h |

### 5.3 风险点与对策

| 风险 | 等级 | 对策 |
|------|------|------|
| **拆分过程中引入 bug** | 高 | 每拆分一个模块立即测试；保留原 app.js 完整备份 |
| **Alpine.js 作用域断裂** | 高 | 拆分后各模块通过 `Alpine.data()` 注册独立组件，用 `$dispatch` 通信 |
| **数据迁移丢失** | 高 | store.js 增加自动迁移逻辑 + 迁移前自动备份 |
| **CSS 级联断裂** | 中 | 保持原有选择器不变，仅拆分文件，不重写选择器 |
| **加载顺序依赖** | 中 | core/*.js 先加载，全局模块次之，业务模块按需 |
| **NLP/AI 引擎拆分后失效** | 中 | NLP 引擎依赖多个状态，拆分时保持引用完整性 |
| **番茄钟定时器状态丢失** | 中 | 番茄钟状态独立管理，页面切换时不销毁 timer |

### 5.4 回滚策略

每次子阶段完成后打 Git tag：
```
git tag v1.0-phase1.1-core-done
git tag v1.0-phase1.2-store-done
...
```

### 5.5 验收标准

Phase 1 完成后：

1. **文件行数指标**：
   - index.html：4083行 → <2000行
   - app.js：5411行 → <500行
   - 所有模块文件独立存在

2. **功能指标**：
   - 17个模块全部功能正常
   - 暗色模式 + Ocean 主题切换正常
   - PWA 离线可用
   - 数据导入导出正常

3. **架构指标**：
   - 所有数据读写通过 `OS.store`
   - `OS.graph` 在任务/目标/日记创建时自动注册节点
   - 新增模块只需：创建目录 + 写 manifest.json + 写 module.js + 注册

4. **性能指标**：
   - 首屏加载时间不增加超过 20%
   - 页面切换响应时间不增加

---

## 附录 A：模块开发模板

### manifest.json 模板

```json
{
  "id": "模块ID",
  "name": "显示名称",
  "icon": "📦",
  "layer": "action",
  "layerName": "日常执行",
  "order": 99,
  "status": "active",
  "version": "1.0.0",
  "description": "模块描述",
  "dataKeys": ["data_key_1", "data_key_2"],
  "dependencies": [],
  "files": {
    "js": "module.js",
    "css": "style.css",
    "template": "template.html"
  },
  "eager": false
}
```

### module.js 模板

```javascript
/**
 * [模块名] 模块
 */
window.ModuleName = {
  init() {
    const data = OS.store.getModuleData('module_id');
    Object.assign(this, data);
    return this;
  },

  save() {
    OS.store.set('data_key', this.data);
  },

  // ...业务方法
};
```

### 注册

在 `core/modules.js` 中添加：

```javascript
OS.registry.register({ id: 'module_id', name: '模块名', icon: '📦', layer: 'action', layerName: '日常执行', order: 99, route: '/module_id', dataKeys: ['data_key'], status: 'active' });
```

---

## 附录 B：当前文件规模统计

| 文件 | 行数 | Phase 1 后预计 |
|------|------|----------------|
| `index.html` | 4,083 | ~1,800 |
| `js/app.js` | 5,411 | ~400 |
| `css/style.css` | 1,772 | 拆分为 8 个文件 |
| `core/registry.js` | 124 | ~180 |
| `core/store.js` | 147 | ~200 |
| `core/graph.js` | 158 | ~220 |
| `core/modules.js` | 39 | ~50 |
| **新增文件** | 0 | ~35个 |
| **总计** | ~11,734 | ~13,000（行数增加但结构清晰） |

---

*文档结束*

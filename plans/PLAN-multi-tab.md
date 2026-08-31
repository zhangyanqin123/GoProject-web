# PLAN-multi-tab：管理台多标签页（multi-tab + keep-alive）

> 状态：实施中（2026-08-31 立项）。本文档为实施计划 + 实测记录回填处。

## 背景与目标

管理台目前点左侧菜单即整体切换路由，内容区无页签承载，切走即卸载页面（筛选/分页丢失、切回重发请求）。目标：点菜单在右侧内容区顶部以 tab 承载——新菜单新增 tab、已打开菜单激活对应 tab、tab 可关闭，效果对标经典管理台（若依式 card 页签）。

## 已拍板的决策

1. **保活（keep-alive）**：切 tab 不卸载组件，列表筛选/分页/页内暂存保留、不重复发请求
2. **默认页常驻**：`/teacher`（老师管理）作为首个不可关闭 tab，不新增首页
3. **刷新仅恢复当前页**：不做 localStorage 持久化，F5 后 tab = [常驻 tab + 当前 URL tab]

## 关键机制结论

- `<Outlet />` **不能删**：`index → Navigate /teacher` 与 `* → Navigate /teacher` 是布局子路由的 element，靠 Outlet 渲染才执行。方案：六个页面子路由改显式 `element: null`（省略会触发 RR 的 leaf 无 element dev warning），Outlet 保留但仅剩重定向职责、渲染无 DOM——避免双挂载双发请求
- antd `Tabs type="editable-card"`：`hideAdd` 藏加号、`items[].closable: false` 藏关闭按钮（常驻 tab）、`onEdit` remove 分支首参即被关 tab 的 key；chip 底色/边框/激活态全走 token，明暗主题自动适配；需 `style={{ marginBottom: 0 }}` 压默认 16px 下边距
- 高度链无需动 `index.css`：`.ant-layout`/`.ant-layout-content` 自带 `flex: auto; min-height: 0`
- tab 状态仅 AdminLayout 消费，不建 Context，`useState` 内聚
- 401/登出走 `window.location.replace` 整页跳转，内存 tab 态天然清空

## 分阶段实施

### Phase 1 — 抽取页面注册表（纯重构，零行为变化）

- 新建 `src/router/pages.tsx`：`APP_PAGES`（path/label/icon/element 四合一单一清单，路由表与布局共用）+ `HOME_PATH` + `tabKeyOf`（pathname → 一级路径）+ `findPage`
- `src/router/index.tsx`：children 从 `APP_PAGES` 派生（本阶段 element 仍为 `p.element`，行为不变）
- `src/layouts/AdminLayout.tsx`：删模块内 `MENU_ITEMS`，菜单 items 从 `APP_PAGES` 派生；`activeKey` 改用 `tabKeyOf`

### Phase 2 — keep-alive 渲染架构（单页直渲染 + 滚动链，尚无 tab 状态）

- 六子路由 `element` 置 `null`（显式），注释说明路由仅声明 URL 合法性
- Content 改 `flex column` 不再自滚；padding 20 下移到页面 holder；激活页包独立滚动容器；`<Outlet />` 保留（只剩重定向职责）
- 核心回归点：**Network 无双请求**

### Phase 3 — 多标签状态机 + tab 栏

- `initOpenTabs(pathname)`：常驻 tab + 当前 URL 对应 tab（F5/深链初始化）
- `useEffect` 监听 `activeKey` 追加 tab（`includes` 判重，StrictMode 双跑幂等；未知路径不建脏 tab）
- `closeTab`：关激活 tab 时 `nextTabs[idx] ?? nextTabs[idx - 1]`（先右后左）并 navigate
- tab 栏：`Tabs type="editable-card" hideAdd`，常驻 tab `closable: false`，包 `colorBgContainer` 色带
- 页面区：全量已开 tab 常驻渲染，非激活 `display: none`

### Phase 4 — 收尾

- 删 `activeLabel`（Header 标题与 tab 栏重复）；注释同步；暗黑模式全检；order 页嵌套 Tabs 视觉检查
- 本文档回填实测记录

## 端到端验证清单

1. 登录落 `/teacher`：仅一个「老师管理」tab，无关闭 X
2. 新菜单开新 tab；已开菜单激活对应 tab；Menu selectedKeys 与 tab 激活恒一致
3. keep-alive：老师页筛选+翻页切走切回保留且 Network 无新请求；订单页内嵌子 tab 同样
4. 关中间激活 tab → 激活右侧；关最右激活 tab → 激活左侧；关非激活 tab → 激活态不动；常驻 tab 不可关
5. F5 于 `/order` → tab = [老师管理, 订单管理]；F5 于 `/teacher` → 仅常驻
6. `/foobar` → 跳 `/teacher` 无脏 tab；`/` → 跳 `/teacher`；深链 `/diagnose` 直接进
7. 浏览器前进/后退 → tab 随 URL 激活/按需追加
8. 滚动保留：列表滚到底切走切回位置不变
9. tab 溢出 → antd 横向滚动箭头正常
10. 退出登录/401 → 整页跳登录，再登录 tab 从零开始

## 风险与回滚

- 双挂载双请求：Phase 2 单独验证排除后才进 Phase 3
- `display:none` 重置滚动位置：实测；fallback 为 `visibility:'hidden'; height:0; overflow:hidden` 或存 scrollTop 恢复
- 改动面 = 1 新文件 + 2 文件修改，每阶段独立 commit 可逐级 revert

## 实测记录（实施后回填）

（待回填）

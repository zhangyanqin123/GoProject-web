// 管理台布局：浅色侧边栏 + 白色 Header（主题开关 + 用户下拉）+ 内容区多标签（keep-alive 页签）
// 整体 100vh 固定：Sider/Header 固定，仅各页签内容滚动（避免整页滚动导致的割裂感）
import { useEffect, useMemo, useState } from 'react'
import { Avatar, Dropdown, Layout, Menu, Switch, Tabs, theme } from 'antd'
import {
  UserOutlined, LogoutOutlined, FundViewOutlined, MoonOutlined, SunOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { useThemeMode } from '@/hooks/useThemeMode'
import { APP_PAGES, HOME_PATH, findPage, tabKeyOf } from '@/router/pages'

const { Header, Sider, Content } = Layout

// 菜单项从页面注册表派生（单 admin 角色，固定菜单；不 over-engineer 动态权限）
const menuItems = APP_PAGES.map(({ path, label, icon }) => ({ key: path, label, icon }))

const AdminLayout = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { mode, toggle: toggleTheme } = useThemeMode()
  const { token: themeToken } = theme.useToken()

  const activeKey = useMemo(() => tabKeyOf(pathname), [pathname])

  // F5/深链初始化：常驻 tab + 当前 URL 对应 tab（不做持久化，刷新即回默认）
  const initOpenTabs = (initPathname: string): string[] => {
    const key = tabKeyOf(initPathname)
    return key !== HOME_PATH && findPage(key) ? [HOME_PATH, key] : [HOME_PATH]
  }

  const [openTabs, setOpenTabs] = useState<string[]>(() => initOpenTabs(pathname))

  // URL 驱动补 tab：菜单点击/前进后退/深链统一入口（includes 判重，StrictMode 双跑幂等）
  useEffect(() => {
    if (!findPage(activeKey)) return // 未知路径：等 * 兜底重定向，不建脏 tab
    setOpenTabs((prev) => (prev.includes(activeKey) ? prev : [...prev, activeKey]))
  }, [activeKey])

  // 关 tab：关激活 tab 时优先激活右侧、无右侧取左侧（HOME 常驻保证 next 非空）
  const closeTab = (key: string) => {
    if (key === HOME_PATH) return
    const idx = openTabs.indexOf(key)
    if (idx < 0) return
    const nextTabs = openTabs.filter((k) => k !== key)
    setOpenTabs(nextTabs)
    if (key === activeKey) {
      const next = nextTabs[idx] ?? nextTabs[idx - 1]
      if (next) navigate(next)
    }
  }

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider theme="light" width={216} style={{ borderRight: `1px solid ${themeToken.colorBorderSecondary}`, overflow: 'auto' }}>
        {/* Logo 区 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 64 }}>
          <FundViewOutlined style={{ fontSize: 22, color: themeToken.colorPrimary }} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 1, color: themeToken.colorTextHeading }}>
            股宇宙管理台
          </span>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none', padding: '4px 8px' }}
        />
      </Sider>

      <Layout style={{ overflow: 'hidden' }}>
        <Header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 64,
            paddingInline: 24,
            background: themeToken.colorBgContainer,
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            lineHeight: 'normal',
          }}
        >
          {/* 当前页标题由 tab 栏承载，Header 只留主题开关 + 用户下拉 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
            <Switch
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              checked={mode === 'dark'}
              onChange={toggleTheme}
              aria-label="切换主题"
            />
            <Dropdown
              menu={{
                items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
                onClick: ({ key }) => key === 'logout' && logout(),
              }}
            >
              <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, color: themeToken.colorText }}>
                <Avatar size={28} style={{ background: themeToken.colorPrimary }} icon={<UserOutlined />} />
                {user?.name ?? '-'}
              </span>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {/* 多标签栏：editable-card 的 chip 底色/边框/激活态全走 token，明暗主题自动适配 */}
          <div style={{ flex: 'none', padding: '4px 16px 0', background: themeToken.colorBgContainer }}>
            <Tabs
              type="editable-card"
              hideAdd
              style={{ marginBottom: 0 }}
              activeKey={openTabs.includes(activeKey) ? activeKey : HOME_PATH}
              items={openTabs.flatMap((key) => {
                const page = findPage(key)
                return page ? [{ key, label: page.label, closable: key !== HOME_PATH }] : []
              })}
              onChange={(key) => navigate(key)}
              onEdit={(targetKey, action) => action === 'remove' && closeTab(String(targetKey))}
            />
          </div>
          {/* keep-alive：所有已开 tab 常驻渲染，非激活 display:none 隐藏——状态/滚动保留、切回不重发请求 */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {openTabs.flatMap((key) => {
              const page = findPage(key)
              if (!page) return []
              return [
                <div key={key} style={{ display: key === activeKey ? 'block' : 'none', height: '100%', overflow: 'auto' }}>
                  {page.element}
                </div>,
              ]
            })}
          </div>
          {/* 路由出口只剩重定向职责（index/* 的 Navigate）；页面子路由 element=null 渲染无 DOM */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout

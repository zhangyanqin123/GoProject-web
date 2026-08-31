// 管理台布局：浅色侧边栏 + 白色 Header（当前页标题 + 用户下拉）+ 灰底内容区
// 整体 100vh 固定：Sider/Header 固定，仅 Content 滚动（避免整页滚动导致的割裂感）
import { useMemo } from 'react'
import { Avatar, Dropdown, Layout, Menu, Switch, theme } from 'antd'
import {
  UserOutlined, LogoutOutlined, FundViewOutlined, MoonOutlined, SunOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { useThemeMode } from '@/hooks/useThemeMode'
import { APP_PAGES, findPage, tabKeyOf } from '@/router/pages'

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
  const activeLabel = useMemo(() => APP_PAGES.find((m) => m.path === activeKey)?.label ?? '', [activeKey])

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
          <span style={{ fontSize: 16, fontWeight: 600, color: themeToken.colorTextHeading }}>{activeLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
          {/* keep-alive 页面区：本阶段只渲染激活页（后续多标签改为全量常驻 + 隐藏） */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 20 }}>
            {(() => {
              const page = findPage(activeKey)
              if (!page) return null // 未知/根路径：等路由重定向，本帧留白（与改造前行为一致）
              return <div style={{ height: '100%', overflow: 'auto' }}>{page.element}</div>
            })()}
          </div>
          {/* 路由出口只剩重定向职责（index/* 的 Navigate）；页面子路由 element=null 渲染无 DOM */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout

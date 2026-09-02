// 页面注册表：路由表与 AdminLayout（菜单 / 多标签 / keep-alive 渲染）共用的单一清单
// path 同时充当：菜单 key、多标签 tab key、路由子路径前缀
import type { ReactNode } from 'react'
import {
  TeamOutlined, SwapOutlined, FileTextOutlined, UserOutlined, ShoppingOutlined, VideoCameraOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'

import TeacherPage from '@/pages/teacher'
import ResignPage from '@/pages/resign'
import DiagnosePage from '@/pages/diagnose'
import UserPage from '@/pages/user'
import OrderPage from '@/pages/order'
import LivePage from '@/pages/live'
import ABModulePage from '@/pages/abmodule'

export interface AppPage {
  path: string       // 一级路径（菜单 key / tab key）
  label: string      // 菜单与 tab 共用标题
  icon: ReactNode
  element: ReactNode // keep-alive 手动渲染的页面组件
}

export const APP_PAGES: AppPage[] = [
  { path: '/teacher',  label: '老师管理', icon: <TeamOutlined />,        element: <TeacherPage /> },
  { path: '/resign',   label: '离职转移', icon: <SwapOutlined />,        element: <ResignPage /> },
  { path: '/diagnose', label: '诊股记录', icon: <FileTextOutlined />,   element: <DiagnosePage /> },
  { path: '/users',    label: '用户管理', icon: <UserOutlined />,       element: <UserPage /> },
  { path: '/order',    label: '订单管理', icon: <ShoppingOutlined />,   element: <OrderPage /> },
  { path: '/live',     label: '直播工具', icon: <VideoCameraOutlined />, element: <LivePage /> },
  { path: '/abmodule', label: 'AB 模块配置', icon: <AppstoreOutlined />, element: <ABModulePage /> },
]

export const HOME_PATH = APP_PAGES[0].path // 常驻不可关闭 tab（/teacher）

// pathname → 一级路径（tab key）：'/order/x' → '/order'；'/' → '/'
export const tabKeyOf = (pathname: string): string => `/${pathname.split('/')[1]}`

export const findPage = (path: string): AppPage | undefined => APP_PAGES.find((p) => p.path === path)

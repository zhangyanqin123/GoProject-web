import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

import AppRoutes from '@/router'
import { ThemeProvider, useThemeMode } from '@/hooks/useThemeMode'
import './index.css'

dayjs.locale('zh-cn')

// ConfigProvider 需读当前主题切算法，故拆内层组件包在 ThemeProvider 里
const AntdProvider = ({ children }: { children: ReactNode }) => {
  const { mode } = useThemeMode()
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{ algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm }}
    >
      {children}
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AntdProvider>
        <AppRoutes />
      </AntdProvider>
    </ThemeProvider>
  </StrictMode>,
)

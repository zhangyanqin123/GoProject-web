// 主题 Context：light/dark 双主题，localStorage 持久化，data-theme 落到 <html> 供全局 CSS 联动（body 背景等非 antd 样式）
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'theme-mode'

interface ThemeState {
  mode: ThemeMode
  toggle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

// localStorage 非法值（手改/旧版残留）一律回落 light
const readInitialMode = (): ThemeMode => (localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light')

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(readInitialMode)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
  }, [mode])

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return <ThemeContext.Provider value={{ mode, toggle }}>{children}</ThemeContext.Provider>
}

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode 必须在 ThemeProvider 内使用')
  return ctx
}

import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

const themeAtom = atomWithStorage<Theme>('theme', 'system')

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return { theme, setTheme }
}
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext<{ theme: string, setTheme: (value: string) => void }>({
  theme: 'bg-gray-50',
  setTheme: () => undefined,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('bg-gray-50')
  useEffect(() => {
    const saved = localStorage.getItem('app-theme')
    if (saved) setTheme(saved)
  }, [])

  const handleSetTheme = (t: string) => {
    setTheme(t)
    localStorage.setItem('app-theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      <div className={`min-h-screen transition-colors duration-300 ${theme}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

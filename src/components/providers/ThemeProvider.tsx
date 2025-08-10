import { useTheme } from '@/hooks/useTheme';
import { ReactNode, useEffect } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  
  // Also apply appearance settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('appearance-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        
        // Apply font size
        if (settings.fontSize) {
          document.documentElement.style.fontSize = {
            small: '14px',
            medium: '16px',
            large: '18px',
          }[settings.fontSize] || '16px';
        }
        
        // Apply compact mode
        if (settings.compactMode) {
          document.documentElement.classList.add('compact');
        }
        
        // Apply animations preference
        if (settings.animations === false) {
          document.documentElement.classList.add('no-animations');
        }
      } catch (error) {
        console.error('Failed to load appearance settings:', error);
      }
    }
    
    // Apply color scheme
    const colorScheme = localStorage.getItem('color-scheme');
    if (colorScheme) {
      document.documentElement.setAttribute('data-color-scheme', colorScheme);
    }
  }, []);
  
  return <>{children}</>;
}
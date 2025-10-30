import type { ReactNode } from 'react';
import { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '~/hooks/useLocalStorage';

type ColorModes = 'dark' | 'light';

const ColorModeContext = createContext<{
  colorMode?: ColorModes | null;
  setColorMode?: (mode: ColorModes) => void;
}>({});

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorMode] = useLocalStorage<ColorModes>('color-mode', undefined);

  useEffect(() => {
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    if (colorMode !== undefined) return;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setColorMode('dark');
    } else {
      setColorMode('light');
    }
  }, [colorMode]);

  return (
    <ColorModeContext.Provider value={{ colorMode, setColorMode }}>
      {children}
    </ColorModeContext.Provider>
  );
}

export const useColorMode = () => useContext(ColorModeContext);

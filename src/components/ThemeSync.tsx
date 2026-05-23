import { useEffect } from 'react';

import { resolveTheme, syncThemeToDocument, useThemeStore } from '../stores/theme';

export default function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    syncThemeToDocument(theme);

    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => syncThemeToDocument('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return null;
}

export const getAppTheme = (theme: 'light' | 'dark') => {
  const isDark = theme === 'dark';

  return {
    isDark,
    background: isDark ? '#121212' : '#F7F9F8',
    surface: isDark ? '#1A1A1A' : '#FFFFFF',
    surfaceAlt: isDark ? '#1E1E1E' : '#EEF3F0',
    raised: isDark ? '#242424' : '#F4F7F5',
    border: isDark ? '#292929' : '#DDE7E1',
    text: isDark ? '#FFFFFF' : '#11181C',
    muted: isDark ? '#888888' : '#65706A',
    subtle: isDark ? '#AAAAAA' : '#4E5A54',
    primary: '#8BE0B0',
    primaryText: '#121212',
    accent: '#7A70D8',
    danger: '#E85D75',
    warning: '#E8C46B',
    overlay: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(17,24,28,0.45)',
  };
};

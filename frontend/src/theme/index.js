import { light, dark, semantic, notification, accentColors } from './colors';
import { getTypography } from './typography';
import { spacing, borderRadius, hitSlop } from './spacing';
import { shadows } from './shadows';

function buildTheme({ isDark = false, accentColor = 'green', textSize = 'medium' }) {
  const colors = isDark ? { ...dark } : { ...light };
  const primary = accentColors[accentColor] || accentColors.green;

  return {
    isDark,
    colors: {
      ...colors,
      primary,
      primaryLight: primary + '20',
      primaryDark: primary,
      ...semantic,
      notification,
      accent: accentColors,
    },
    typography: getTypography(textSize),
    spacing,
    borderRadius,
    hitSlop,
    shadows,
  };
}

export { buildTheme, accentColors };
export { spacing, borderRadius, hitSlop } from './spacing';
export { shadows } from './shadows';

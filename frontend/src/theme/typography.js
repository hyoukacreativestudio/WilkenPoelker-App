import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

const baseSizes = {
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
  body: 16,
  bodySmall: 14,
  caption: 12,
  small: 11,
  button: 16,
  buttonSmall: 14,
  input: 16,
  tabLabel: 12,
};

const fontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

const textSizeMultipliers = {
  small: 0.85,
  medium: 1,
  large: 1.15,
  extraLarge: 1.3,
};

function getTypography(textSize = 'medium') {
  const multiplier = textSizeMultipliers[textSize] || 1;

  const scaled = {};
  for (const [key, size] of Object.entries(baseSizes)) {
    scaled[key] = Math.round(size * multiplier);
  }

  return {
    fontFamily,
    sizes: scaled,
    weights: fontWeights,
    lineHeight: (fontSize) => Math.round(fontSize * 1.5),

    // Pre-built text styles
    styles: {
      h1: { fontSize: scaled.h1, fontWeight: fontWeights.bold, fontFamily },
      h2: { fontSize: scaled.h2, fontWeight: fontWeights.bold, fontFamily },
      h3: { fontSize: scaled.h3, fontWeight: fontWeights.semiBold, fontFamily },
      h4: { fontSize: scaled.h4, fontWeight: fontWeights.semiBold, fontFamily },
      h5: { fontSize: scaled.h5, fontWeight: fontWeights.semiBold, fontFamily },
      h6: { fontSize: scaled.h6, fontWeight: fontWeights.semiBold, fontFamily },
      body: { fontSize: scaled.body, fontWeight: fontWeights.regular, fontFamily },
      bodySmall: { fontSize: scaled.bodySmall, fontWeight: fontWeights.regular, fontFamily },
      caption: { fontSize: scaled.caption, fontWeight: fontWeights.regular, fontFamily },
      small: { fontSize: scaled.small, fontWeight: fontWeights.regular, fontFamily },
      button: { fontSize: scaled.button, fontWeight: fontWeights.bold, fontFamily },
      buttonSmall: { fontSize: scaled.buttonSmall, fontWeight: fontWeights.semiBold, fontFamily },
    },
  };
}

export { getTypography, textSizeMultipliers, fontFamily, fontWeights };

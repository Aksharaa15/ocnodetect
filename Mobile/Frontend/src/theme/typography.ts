import { Platform } from 'react-native';

// Typography scale matching the web app font sizes
export const typography = {
  // Monospace font family matching web
  fontMono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),

  // Matching the web's font-size values (px → pt approx same on mobile)
  xs: 10,      // text-[10px]
  xs2: 10.5,   // text-[10.5px]
  sm: 11,      // text-[11px]
  sm2: 11.5,   // text-[11.5px]
  base: 12,    // text-[12px]
  base2: 12.5, // text-[12.5px]
  md: 13,      // text-[13px]
  md2: 13.5,   // text-[13.5px]
  lg: 14,      // text-[14px]
  lg2: 15,     // text-[15px]
  xl: 16,      // text-[16px]
  xl2: 18,     // text-[18px]
  '2xl': 20,   // text-[20px]
  '3xl': 22,   // text-[22px]
  '4xl': 24,   // text-[24px]
  '5xl': 28,   // text-[28px]

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // Line heights
  lineHeightNormal: 1.6,
  lineHeightTight: 1.4,
  lineHeightSnug: 1.5,
  lineHeightRelaxed: 1.55,
};

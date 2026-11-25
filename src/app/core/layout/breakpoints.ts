/**
 * Zentrale Media-Query-Strings für Angular CDK BreakpointObserver.
 * Entsprechen den Breakpoints in src/styles/_breakpoints.scss und src/styles.scss.
 */
export const APP_BREAKPOINTS = {
  /** Schmale Bildschirme unter 600 px (Smartphones, z. B. iPhone SE 375 px). */
  mobile: '(max-width: 599.98px)',
  /** Mittlere Bildschirme von 600 px bis 959,98 px (Tablets). */
  tablet: '(min-width: 600px) and (max-width: 959.98px)',
  /** Mobil & Tablet unter 960 px: kompakte Header-Navigation über mat-menu. */
  compactNav: '(max-width: 959.98px)',
  /** Breite Bildschirme ab 960 px (Desktop). */
  desktop: '(min-width: 960px)',
  /** Große Desktop-Bildschirme ab 1280 px (vollständiger Header inkl. E-Mail & Status-Text). */
  desktopWide: '(min-width: 1280px)',
} as const;

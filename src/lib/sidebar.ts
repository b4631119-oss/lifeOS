/**
 * Whether the sidebar has to be taken out of the tab order and hidden from
 * assistive technology.
 *
 * Only the mobile drawer qualifies, and only while it is closed. On desktop the
 * sidebar is always on screen: keying this off `!isMobileOpen` alone made the
 * whole nav `inert` there, so every link inside it silently stopped working.
 */
export function isDrawerHidden(isMobile: boolean, isMobileOpen: boolean) {
  return isMobile && !isMobileOpen;
}

import { Page } from '@playwright/test';
import { MIN_TAP_TARGET_PX } from '../utils/TapTargets';

export type ViewportSize = { width: number; height: number };

export type TapTarget = {
  tag: string;
  label: string;
  width: number;
  height: number;
};

export class MobileService {
  async getViewportSize(page: Page): Promise<ViewportSize | null> {
    return page.viewportSize();
  }

  async isTouchEnabled(page: Page): Promise<boolean> {
    return page.evaluate(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  }

  async findUndersizedTapTargets(page: Page, minSizePx: number = MIN_TAP_TARGET_PX): Promise<TapTarget[]> {
    return page.evaluate((minSize) => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, a[href], input[type="submit"], input[type="button"], [role="button"]'
        )
      );
      const undersized: TapTarget[] = [];

      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          continue; // not rendered (display: none, detached, etc.) — not a real tap target
        }
        if (rect.width < minSize || rect.height < minSize) {
          undersized.push({
            tag: el.tagName.toLowerCase(),
            label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }

      return undersized;
    }, minSizePx);
  }
}

import { Page } from '@playwright/test';

export type NavigationTiming = {
  ttfbMs: number;
  domContentLoadedMs: number;
  loadMs: number;
};

export type WebVitals = {
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number;
};

export class PerformanceService {
  async getNavigationTiming(page: Page): Promise<NavigationTiming> {
    return page.evaluate(() => {
      const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return {
        ttfbMs: entry.responseStart - entry.requestStart,
        domContentLoadedMs: entry.domContentLoadedEventEnd - entry.startTime,
        loadMs: entry.loadEventEnd - entry.startTime,
      };
    });
  }

  async getWebVitals(page: Page): Promise<WebVitals> {
    return page.evaluate(() => {
      type LcpEntry = PerformanceEntry & { renderTime: number; loadTime: number };
      type LayoutShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean };

      return new Promise<{ fcpMs: number | null; lcpMs: number | null; cls: number }>((resolve) => {
        let lcpMs: number | null = null;
        let cls = 0;

        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as LcpEntry[];
          const last = entries[entries.length - 1];
          if (last) {
            lcpMs = last.renderTime || last.loadTime || last.startTime;
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as LayoutShiftEntry[]) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // PerformanceObserver callbacks with buffered:true fire asynchronously on the next
        // task, so give them a beat before reading the accumulated values back out.
        setTimeout(() => {
          lcpObserver.disconnect();
          clsObserver.disconnect();
          const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
          resolve({ fcpMs: fcpEntry ? fcpEntry.startTime : null, lcpMs, cls });
        }, 500);
      });
    });
  }
}

export type PerformanceBudget = {
  domContentLoadedMs: number;
  loadMs: number;
  lcpMs: number;
  cls: number;
};

export const performanceThresholds: Record<'login' | 'inventory', PerformanceBudget> = {
  login: {
    domContentLoadedMs: 3000,
    loadMs: 5000,
    lcpMs: 3000,
    cls: 0.1,
  },
  inventory: {
    domContentLoadedMs: 3000,
    loadMs: 5000,
    lcpMs: 3000,
    cls: 0.1,
  },
};

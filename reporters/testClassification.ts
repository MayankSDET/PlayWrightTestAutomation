// Shared by every custom reporter (FriendlyReporter, ComponentDashboardReporter, ...) so
// "why did this fail" is classified the same way everywhere: a real problem, or just a
// domain that needs real credentials/setup (not a bug).
export function blockedReason(file: string): string | null {
  if (file.startsWith('aws/')) {
    return 'Needs setup — a real Amazon (AWS) account must be connected. Currently using a placeholder key.';
  }
  if (file.startsWith('azure/')) {
    return 'Needs setup — a real Microsoft (Azure) storage account must be connected. Currently using a placeholder key.';
  }
  if (file === 'api/tests/reqres-user.spec.ts') {
    return 'Needs setup — a real access key for the accounts service is required. Currently using a placeholder key.';
  }
  return null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

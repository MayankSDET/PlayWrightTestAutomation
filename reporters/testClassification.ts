// Shared by every custom reporter (FriendlyReporter, ComponentDashboardReporter, ...) so
// "why did this fail" is classified the same way everywhere: a real problem, or just a
// domain that needs real credentials/setup (not a bug). `errorMessage` lets a handful of
// well-known external-service error signatures (an exhausted rate limit, an invalid key)
// get classified correctly wherever they show up, instead of only file-path-based domains
// that *always* need a real credential — api-object.spec.ts, for instance, runs fine with
// zero setup until its shared public quota is used up, so it can't be blocked by file
// path alone the way aws/azure/reqres-user.spec.ts can.
export function blockedReason(file: string, errorMessage?: string): string | null {
  if (errorMessage) {
    if (/daily request limit/i.test(errorMessage)) {
      return 'Needs setup — the free public API quota (50 requests/24h) is used up. Add an API_KEY in api/.env for a higher limit, or wait for the daily reset.';
    }
    if (/invalid_api_key|API key is not recognized/i.test(errorMessage)) {
      return 'Needs setup — a real access key is required. Currently using a placeholder key.';
    }
    if (/Missing required environment variable/i.test(errorMessage)) {
      return 'Needs setup — a required environment variable is missing. Check the relevant .env file.';
    }
  }
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

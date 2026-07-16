// Azure's management-plane SDKs (arm-network, arm-dns, arm-appservice) all throw a
// RestError with a numeric statusCode on a missing resource, unlike Blob Storage's
// exists()-style calls — this one check is shared by every ARM-backed service's
// *Exists()/get-by-name method instead of being repeated per service.
export function isAzureNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: number }).statusCode === 404
  );
}

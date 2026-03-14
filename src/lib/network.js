export function getPingTier(pingValue) {
  if (typeof pingValue !== 'number') {
    return 'unknown';
  }

  if (pingValue < 180) {
    return 'good';
  }

  if (pingValue < 320) {
    return 'medium';
  }

  return 'bad';
}
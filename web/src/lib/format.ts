export function getGreeting(hour: number = new Date().getHours()): string {
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]! : fullName;
}

export function getMinutesUntil(expiresAt: unknown): number | null {
  if (typeof expiresAt !== 'number') return null;
  return Math.max(0, Math.round((expiresAt * 1000 - Date.now()) / 60_000));
}

export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('pt-BR');
}

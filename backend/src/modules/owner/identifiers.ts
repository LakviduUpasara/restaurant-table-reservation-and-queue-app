export function nextStaffId(existing: Array<string | null>): string {
  const numbers = existing.flatMap(value => {
    const match = value?.match(/^ST-?(\d{3})$/i);
    return match ? [Number(match[1])] : [];
  });
  const next = Math.max(0, ...numbers) + 1;
  if (next > 999) throw new Error('All three-digit Staff IDs have been allocated in this restaurant.');
  return `ST${String(next).padStart(3, '0')}`;
}

export function nextTableLabel(existing: string[]): string {
  const numbers = existing.flatMap(value => {
    const match = value.match(/^T(\d+)$/i);
    return match ? [Number(match[1])] : [];
  });
  return `T${Math.max(0, ...numbers) + 1}`;
}

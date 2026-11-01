/**
 * Recruitment notices rarely say whether 1 KB is 1,000 or 1,024 bytes.
 * We check each limit against the stricter reading so a file that passes here
 * passes under either interpretation:
 *  - maximum: 1 KB = 1,000 bytes (the smaller ceiling)
 *  - minimum: 1 KB = 1,024 bytes (the larger floor)
 */
export function maxKBToBytes(kb: number): number {
  return Math.floor(kb * 1000);
}

export function minKBToBytes(kb: number): number {
  return Math.ceil(kb * 1024);
}

export function formatKB(kb: number): string {
  return kb >= 1000 && kb % 1000 === 0 ? `${kb / 1000} MB` : `${kb} KB`;
}

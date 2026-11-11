function escapeCell(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** UTF-8 with a byte-order mark, so Excel opens Cyrillic / Uzbek text correctly. */
export function downloadCsv(filename: string, header: string[], rows: string[][]): void {
  const body = [header, ...rows].map((r) => r.map(escapeCell).join(',')).join('\n');
  const blob = new Blob(['﻿', body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

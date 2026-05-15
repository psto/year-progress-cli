import * as fs from 'node:fs';

const BAR_WIDTH = 40;

export function yearProgress(date: Date = new Date(), precision?: number): number {
  const start = new Date(date.getFullYear(), 0, 1).valueOf();
  const end = new Date(date.getFullYear() + 1, 0, 1).valueOf();
  const pct = (date.valueOf() - start) / (end - start) * 100;

  if (precision == null) return Math.round(pct);

  const factor = 10 ** precision;
  return Math.round(pct * factor) / factor;
}

function renderBar(value: number, total: number): string {
  const filled = Math.round((value / total) * BAR_WIDTH);
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

export function yearLoading(options?: { interval?: number; precision?: number }): void {
  const interval = options?.interval ?? 16;
  const precision = options?.precision ?? 0;
  const target = yearProgress(new Date(), precision);
  const isPipe = !process.stdout.isTTY;

  if (isPipe) {
    const bar = renderBar(target, 100);
    fs.writeSync(1, `[${bar}] ${target}/100%\n`);
    process.exit(0);
  }

  let progress = 0;

  const timer = setInterval(() => {
    progress++;
    const bar = renderBar(progress, 100);
    fs.writeSync(2, `\r[${bar}] ${progress}/100%`);

    if (progress >= target) {
      clearInterval(timer);
      fs.writeSync(2, '\n');
      process.exit(0);
    }
  }, interval);
}

export function main(): void {
  yearLoading();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

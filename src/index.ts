import * as cliProgress from 'cli-progress';

export function yearProgress(date: Date = new Date(), precision?: number): number {
  const start = new Date(date.getFullYear(), 0, 1).valueOf();
  const end = new Date(date.getFullYear() + 1, 0, 1).valueOf();
  const pct = (date.valueOf() - start) / (end - start) * 100;

  if (precision == null) return Math.round(pct);

  const factor = 10 ** precision;
  return Math.round(pct * factor) / factor;
}

export function yearLoading(options?: { interval?: number; precision?: number }): void {
  const interval = options?.interval ?? 16;
  const precision = options?.precision ?? 0;
  const target = yearProgress(new Date(), precision);

  const bar = new cliProgress.Bar(
    {
      format: '{bar} | {value}/{total}%',
    },
    cliProgress.Presets.shades_classic
  );

  bar.start(100, 0);
  let progress = 0;

  const timer = setInterval(() => {
    progress++;
    bar.update(progress);

    if (progress >= target) {
      clearInterval(timer);
      bar.stop();
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

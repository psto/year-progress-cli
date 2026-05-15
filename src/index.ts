import * as fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version: VERSION } = require('../package.json');

const NO_COLOR = process.env.NO_COLOR !== undefined;

const NAMED_COLORS: Record<string, [number, number, number]> = {
  red: [255, 0, 0],
  green: [0, 255, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  white: [255, 255, 255],
};

type ColorFn = (index: number, fillCount: number, progressPct: number) => string | null;

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface BarChars {
  filled: string;
  empty: string;
}

const BAR_STYLES: Record<string, BarChars> = {
  bar: { filled: '█', empty: '░' },
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function parseColor(s: string): [number, number, number] | null {
  const named = NAMED_COLORS[s];
  if (named) return named;

  const hex = s.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];

  const rgb = s.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

  return null;
}

function resolveColor(colorArg: string | undefined): ColorFn | null {
  if (colorArg === 'rainbow') {
    return (i) => {
      const [r, g, b] = hslToRgb(i * 30, 1, 0.5);
      return `\x1b[38;2;${r};${g};${b}m`;
    };
  }

  if (colorArg === 'gradient') {
    return (_, __, pct) => {
      if (pct < 0.5) {
        const r = Math.round(pct * 2 * 255);
        return `\x1b[38;2;${r};255;0m`;
      }
      const g = Math.round((1 - pct) * 2 * 255);
      return `\x1b[38;2;255;${g};0m`;
    };
  }

  if (colorArg && colorArg !== 'auto' && colorArg !== 'never') {
    const rgb = parseColor(colorArg);
    if (rgb) return () => `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
  }

  return null;
}

function colorizeString(str: string, colorFn: ColorFn | null, pct: number): string {
  if (!colorFn) return str;
  const chars = [...str];
  let result = '';
  for (let i = 0; i < chars.length; i++) {
    const esc = colorFn(i, chars.length, pct);
    result += `${esc}${chars[i]}\x1b[0m`;
  }
  return result;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function timeUnitInfo(date: Date) {
  const doy = Math.floor((date.valueOf() - new Date(date.getFullYear(), 0, 1).valueOf()) / 86_400_000) + 1;
  return {
    month: date.getMonth() + 1,
    monthName: MONTH_NAMES[date.getMonth()],
    week: Math.ceil(doy / 7),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

function timeRemaining() {
  const end = new Date(new Date().getFullYear() + 1, 0, 1).valueOf();
  const diff = Math.max(0, end - Date.now());
  const ms = diff % 1000;
  const totalSeconds = Math.floor(diff / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);
  return { days, hours, minutes, seconds, ms };
}

function formatCountdown(r: ReturnType<typeof timeRemaining>): string {
  return `${r.days}d : ${String(r.hours).padStart(2, '0')}h : ${String(r.minutes).padStart(2, '0')}m : ${String(r.seconds).padStart(2, '0')}s : ${String(r.ms).padStart(3, '0')}ms`;
}

const HEATMAP_LVL = [
  { char: '░' },  // 0: future
  { char: '▓' },  // 1: past
  { char: '▓' },  // 2
  { char: '▓' },  // 3
  { char: '▓' },  // 4: today
];

const HEATMAP_ROWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function renderHeatmap(year: number, colorFn: ColorFn | null): string {
  const startDay = new Date(year, 0, 1).getDay();
  const totalDays = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
  const numCols = Math.ceil((startDay + totalDays) / 7);
  const now = new Date();
  const todayDOY = Math.floor((Date.UTC(year, now.getMonth(), now.getDate()) - Date.UTC(year, 0, 1)) / 86_400_000);

  const lines: string[] = [];
  const mh = Array<string>(numCols).fill(' ');
  for (let m = 0; m < 12; m++) {
    const doy = Math.floor((Date.UTC(year, m, 1) - Date.UTC(year, 0, 1)) / 86_400_000);
    const col = Math.floor((startDay + doy) / 7);
    for (let i = 0; i < 3 && col + i < numCols; i++) mh[col + i] = MONTH_NAMES[m][i];
  }
  lines.push('    ' + mh.join(''));

  const grid: number[][] = Array.from({ length: 7 }, () => Array<number>(numCols).fill(0));
  for (let d = 0; d < totalDays; d++) {
    const row = (startDay + d) % 7;
    const col = Math.floor((startDay + d) / 7);
    const level = d === todayDOY ? 4 : d > todayDOY ? 0 : todayDOY - d <= 7 ? 3 : todayDOY - d <= 30 ? 2 : 1;
    grid[row][col] = level;
  }

  const cellIdx: number[][] = Array.from({ length: 7 }, () => Array<number>(numCols).fill(-1));
  let pastCount = 0;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < numCols; c++) {
      if (grid[r][c] !== 0) cellIdx[r][c] = pastCount++;
    }
  }

  for (let r = 0; r < 7; r++) {
    let line = HEATMAP_ROWS[r] + ' ';
    for (let c = 0; c < numCols; c++) {
      const l = grid[r][c];
      if (l === 0 || !colorFn) {
        line += HEATMAP_LVL[l].char;
      } else {
        line += `${colorFn(cellIdx[r][c], pastCount, todayDOY / totalDays)}▓\x1b[0m`;
      }
    }
    lines.push(line);
  }
  return lines.join('\n');
}

function yearDays(date: Date): { dayOfYear: number; totalDays: number } {
  const start = new Date(date.getFullYear(), 0, 1).valueOf();
  const end = new Date(date.getFullYear() + 1, 0, 1).valueOf();
  const now = date.valueOf();
  const totalDays = Math.round((end - start) / 86_400_000);
  const dayOfYear = Math.floor((now - start) / 86_400_000) + 1;
  return { dayOfYear, totalDays };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: {
    width: number;
    interval: number;
    precision: number;
    output: 'bar' | 'percent' | 'json' | 'text' | 'days' | 'spinner' | 'months' | 'weeks' | 'countdown' | 'heatmap';
    color: string | undefined;
    help: boolean;
    version: boolean;
  } = {
    width: 40,
    interval: 16,
    precision: 0,
    output: 'bar',
    color: undefined,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-h': case '--help':
        opts.help = true; break;
      case '-v': case '--version':
        opts.version = true; break;
      case '-p': case '--precision':
        opts.precision = Number(args[++i]); break;
      case '-w': case '--width':
        opts.width = Number(args[++i]); break;
      case '-i': case '--interval':
        opts.interval = Number(args[++i]); break;
      case '-o': case '--output':
        opts.output = args[++i] as typeof opts.output; break;
      case '-c': case '--color':
        opts.color = args[++i]; break;
    }
  }

  return opts;
}

function printHelp(): void {
  fs.writeSync(1, `Usage: year-progress [options]

Options:
  -p, --precision <n>   Decimal places for percentage (default: 0)
  -w, --width <n>       Bar width in characters (default: 40)
  -i, --interval <n>    Animation speed in ms (default: 16)
  -o, --output <type>   Output type: bar, percent, json, text, days, months, weeks, countdown, spinner, heatmap (default: bar)
  -c, --color <mode>    Color mode: auto, never, gradient, rainbow, <name>, <hex> (default: auto)
  -h, --help            Show this help
  -v, --version         Show version
`);
}

export function yearProgress(date: Date = new Date(), precision?: number): number {
  const start = new Date(date.getFullYear(), 0, 1).valueOf();
  const end = new Date(date.getFullYear() + 1, 0, 1).valueOf();
  const pct = (date.valueOf() - start) / (end - start) * 100;

  if (precision == null) return Math.round(pct);

  const factor = 10 ** precision;
  return Math.round(pct * factor) / factor;
}

function renderBar(value: number, total: number, width: number, colorFn: ColorFn | null, style: BarChars): string {
  const filled = Math.round((value / total) * width);
  const emptyPart = style.empty.repeat(width - filled);

  if (!colorFn) return style.filled.repeat(filled) + emptyPart;

  let filledPart = '';
  for (let i = 0; i < filled; i++) {
    const esc = colorFn(i, filled, value / total);
    filledPart += `${esc}${style.filled}\x1b[0m`;
  }

  return filledPart + emptyPart;
}

export function yearLoading(options?: {
  interval?: number;
  precision?: number;
  width?: number;
  output?: 'bar' | 'percent' | 'json' | 'text' | 'days' | 'spinner' | 'months' | 'weeks' | 'countdown' | 'heatmap';
  color?: string;
}): void {
  const interval = options?.interval ?? 16;
  const precision = options?.precision ?? 0;
  const width = options?.width ?? 40;
  const output = options?.output ?? 'bar';
  const target = yearProgress(new Date(), precision);
  const isPipe = !process.stdout.isTTY;
  const colorFn = resolveColor(options?.color);

  if (output === 'percent') {
    fs.writeSync(1, `${target}\n`);
    process.exit(0);
  }

  if (output === 'json') {
    const data = JSON.stringify({ percent: target, date: new Date().toISOString().slice(0, 10) });
    fs.writeSync(1, data + '\n');
    process.exit(0);
  }

  if (output === 'text') {
    const { dayOfYear, totalDays } = yearDays(new Date());
    const remaining = totalDays - dayOfYear;
    const year = new Date().getFullYear();
    fs.writeSync(1, `${target}% through ${year} — day ${dayOfYear} of ${totalDays}, ${remaining} days remaining\n`);
    process.exit(0);
  }

  if (output === 'days') {
    const { dayOfYear, totalDays } = yearDays(new Date());
    fs.writeSync(1, `Day ${dayOfYear} of ${totalDays}\n`);
    process.exit(0);
  }

  if (output === 'months') {
    const { month, monthName } = timeUnitInfo(new Date());
    fs.writeSync(1, `${monthName} (${month}/12)\n`);
    process.exit(0);
  }

  if (output === 'weeks') {
    const { week } = timeUnitInfo(new Date());
    fs.writeSync(1, `Week ${week} of 52\n`);
    process.exit(0);
  }

  if (output === 'countdown') {
    if (isPipe) {
      const r = timeRemaining();
      fs.writeSync(1, colorizeString(formatCountdown(r), colorFn, 1) + '\n');
      process.exit(0);
    }

    const timer = setInterval(() => {
      const r = timeRemaining();
      const line = formatCountdown(r);
      fs.writeSync(2, `\r\x1b[K${colorizeString(line, colorFn, 1)}`);

      if (r.days === 0 && r.hours === 0 && r.minutes === 0 && r.seconds === 0 && r.ms === 0) {
        clearInterval(timer);
        fs.writeSync(2, '\n');
        process.exit(0);
      }
    }, 50);
    return;
  }

  if (output === 'heatmap') {
    fs.writeSync(1, renderHeatmap(new Date().getFullYear(), colorFn) + '\n');
    process.exit(0);
  }

  if (output === 'spinner') {
    if (isPipe) {
      fs.writeSync(1, colorizeString(`⠿ ${target}%`, colorFn, target / 100) + '\n');
      process.exit(0);
    }

    let progress = 0;
    let frame = 0;

    const timer = setInterval(() => {
      progress++;
      frame = (frame + 1) % SPINNER.length;
      fs.writeSync(2, `\r${colorizeString(`${SPINNER[frame]} ${progress}%`, colorFn, progress / 100)}`);

      if (progress >= target) {
        clearInterval(timer);
        fs.writeSync(2, `\r\x1b[K${colorizeString(`${target}%`, colorFn, target / 100)}\n`);
        process.exit(0);
      }
    }, interval);
    return;
  }

  const style = BAR_STYLES[output] ?? BAR_STYLES.bar;

  if (isPipe) {
    const bar = renderBar(target, 100, width, colorFn, style);
    fs.writeSync(1, `[${bar}] ${target}/100%\n`);
    process.exit(0);
  }

  let progress = 0;

  const timer = setInterval(() => {
    progress++;
    const bar = renderBar(progress, 100, width, colorFn, style);
    fs.writeSync(2, `\r[${bar}] ${progress}/100%`);

    if (progress >= target) {
      clearInterval(timer);
      fs.writeSync(2, '\n');
      process.exit(0);
    }
  }, interval);
}

export function main(): void {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.version) {
    fs.writeSync(1, VERSION + '\n');
    process.exit(0);
  }

  yearLoading(opts);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

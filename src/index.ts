import * as fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json");

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

type ColorFn = (
  index: number,
  fillCount: number,
  progressPct: number,
) => string | null;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];
}

function parseColor(s: string): [number, number, number] | null {
  const named = NAMED_COLORS[s];
  if (named) return named;

  const hex = s.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex)
    return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];

  const rgb = s.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

  return null;
}

function resolveColor(
  colorArg: string | undefined,
  isTTY: boolean,
): ColorFn | null {
  if (colorArg === "rainbow") {
    return (i) => {
      const [r, g, b] = hslToRgb(i * 30, 1, 0.5);
      return `\x1b[38;2;${r};${g};${b}m`;
    };
  }

  if (colorArg && colorArg !== "auto" && colorArg !== "never") {
    const rgb = parseColor(colorArg);
    if (rgb) return () => `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
  }

  if (colorArg === "never" || NO_COLOR || !isTTY) return null;

  return (_, __, pct) => {
    if (pct < 0.5) {
      const r = Math.round(pct * 2 * 255);
      return `\x1b[38;2;${r};255;0m`;
    }
    const g = Math.round((1 - pct) * 2 * 255);
    return `\x1b[38;2;255;${g};0m`;
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: {
    width: number;
    interval: number;
    precision: number;
    output: "bar" | "percent" | "json";
    color: string | undefined;
    help: boolean;
    version: boolean;
  } = {
    width: 40,
    interval: 16,
    precision: 0,
    output: "bar",
    color: undefined,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "-v":
      case "--version":
        opts.version = true;
        break;
      case "-p":
      case "--precision":
        opts.precision = Number(args[++i]);
        break;
      case "-w":
      case "--width":
        opts.width = Number(args[++i]);
        break;
      case "-i":
      case "--interval":
        opts.interval = Number(args[++i]);
        break;
      case "-o":
      case "--output":
        opts.output = args[++i] as typeof opts.output;
        break;
      case "-c":
      case "--color":
        opts.color = args[++i];
        break;
    }
  }

  return opts;
}

function printHelp(): void {
  fs.writeSync(
    1,
    `Usage: year-progress [options]

Options:
  -p, --precision <n>   Decimal places for percentage (default: 0)
  -w, --width <n>       Bar width in characters (default: 40)
  -i, --interval <n>    Animation speed in ms (default: 16)
  -o, --output <type>   Output type: bar, percent, json (default: bar)
  -c, --color <mode>    Color mode: auto, never, rainbow, <name>, '<hex>' (default: auto)
  -h, --help            Show this help
  -v, --version         Show version
`,
  );
}

export function yearProgress(
  date: Date = new Date(),
  precision?: number,
): number {
  const start = new Date(date.getFullYear(), 0, 1).valueOf();
  const end = new Date(date.getFullYear() + 1, 0, 1).valueOf();
  const pct = ((date.valueOf() - start) / (end - start)) * 100;

  if (precision == null) return Math.round(pct);

  const factor = 10 ** precision;
  return Math.round(pct * factor) / factor;
}

function renderBar(
  value: number,
  total: number,
  width: number,
  colorFn: ColorFn | null,
): string {
  const filled = Math.round((value / total) * width);
  const emptyPart = "░".repeat(width - filled);

  if (!colorFn) return "█".repeat(filled) + emptyPart;

  let filledPart = "";
  for (let i = 0; i < filled; i++) {
    const esc = colorFn(i, filled, value / total);
    filledPart += `${esc}█\x1b[0m`;
  }

  return filledPart + emptyPart;
}

export function yearLoading(options?: {
  interval?: number;
  precision?: number;
  width?: number;
  output?: "bar" | "percent" | "json";
  color?: string;
}): void {
  const interval = options?.interval ?? 16;
  const precision = options?.precision ?? 0;
  const width = options?.width ?? 40;
  const output = options?.output ?? "bar";
  const target = yearProgress(new Date(), precision);
  const isPipe = !process.stdout.isTTY;
  const colorFn = resolveColor(options?.color, !isPipe);

  if (output === "percent") {
    fs.writeSync(1, `${target}\n`);
    process.exit(0);
  }

  if (output === "json") {
    const data = JSON.stringify({
      percent: target,
      date: new Date().toISOString().slice(0, 10),
    });
    fs.writeSync(1, data + "\n");
    process.exit(0);
  }

  if (isPipe) {
    const bar = renderBar(target, 100, width, colorFn);
    fs.writeSync(1, `[${bar}] ${target}/100%\n`);
    process.exit(0);
  }

  let progress = 0;

  const timer = setInterval(() => {
    progress++;
    const bar = renderBar(progress, 100, width, colorFn);
    fs.writeSync(2, `\r[${bar}] ${progress}/100%`);

    if (progress >= target) {
      clearInterval(timer);
      fs.writeSync(2, "\n");
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
    fs.writeSync(1, VERSION + "\n");
    process.exit(0);
  }

  yearLoading(opts);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

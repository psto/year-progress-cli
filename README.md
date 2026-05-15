# Year Progress CLI

A command line tool to display how much of the year has passed as an animated bar,
GitHub-style heatmap, live countdown, or plain text/JSON.
Inspired by [Year Progress](https://twitter.com/year_progress). Zero runtime dependencies.

## Install

```bash
npm install year-progress-cli -g
```

## Usage

```bash
year-progress
```

**Tip:** add it as a custom command when you open your terminal.

### Options

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--precision` | `-p` | `0` | Decimal places for percentage |
| `--width` | `-w` | `40` | Bar width in characters |
| `--interval` | `-i` | `16` | Animation speed in ms |
| `--output` | `-o` | `bar` | Output type (see below) |
| `--color` | `-c` | `auto` | Color mode (see below) |
| `--help` | `-h` | | Show help |
| `--version` | `-v` | | Show version |

### Output modes

| `-o` | Example |
|------|---------|
| `bar` | `[███████████████░░░░░░░░░░░░░░░░░░░░░░░░░] 37/100%` |
| `percent` | `37` |
| `json` | `{"percent":37,"date":"2026-05-15"}` |
| `text` | `37% through 2026 — day 135 of 365, 230 days remaining` |
| `days` | `Day 135 of 365` |
| `months` | `May (5/12)` |
| `weeks` | `Week 20 of 52` |
| `spinner` | Animated `⠋ 37%` → `⠿ 37%` |
| `countdown` | Live `230d : 02h : 14m : 50s : 673ms` ticking in real-time |
| `heatmap` | GitHub-style contribution grid of elapsed days |

### Heatmap

```
    Jan  Feb Mar Apr May  Jun Jul Aug  Sep Oct  Nov Dec
Sun ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Mon ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Tue ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Wed ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Thu ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Fri ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Sat ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

### Color modes

| `-c` | Effect |
|------|--------|
| `auto` (default) | Terminal default text color |
| `never` | No color (explicit) |
| `gradient` | Green → yellow → red based on progress |
| `rainbow` | Each character cycles through the rainbow |
| `red`, `green`, `blue`, `yellow`, `cyan`, `magenta`, `white` | Named colors |
| `#ff6600` | Hex color |
| `rgb(255,0,0)` | RGB triple |

Respects the [`NO_COLOR`](https://no-color.org) environment variable in `auto` mode.

### Piping

```bash
year-progress | lolcat          # colorize final bar via lolcat
year-progress -o json | jq .percent
year-progress -o percent | wl-copy
```

In pipe mode, `bar` and `dots` output a single static line (no animation).

## Programmatic API

```typescript
import { yearProgress, yearLoading, main } from 'year-progress-cli';

// Get current year progress as integer
yearProgress();                            // → 37

// With precision
yearProgress(new Date(), 2);               // → 36.94

// Animate a progress bar
yearLoading({ precision: 2, color: 'rainbow' });

// CLI entry point
main();
```

## Author

[stojanow.com](http://stojanow.com) | twitter: [@piotrstojanow](https://twitter.com/piotrstojanow) | github: [@psto](https://github.com/psto)

## License

Released under the [MIT](./LICENSE) license.

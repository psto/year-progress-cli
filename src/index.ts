#!/usr/bin/env node
import * as cliProgress from 'cli-progress';

const bar = new cliProgress.Bar(
  {
    format: "{bar} | {percentage}/{total}%"
  },
  cliProgress.Presets.shades_classic
);

yearLoading();

function yearProgress() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0).valueOf();
  const end = new Date(now.getFullYear() + 1, 0, 0).valueOf();

  return Math.round((((now.valueOf() - start) / (end - start)) * 100) * 1e2) / 1e2;
}

function yearLoading() {
  bar.start(100, 0);
  let progress = 0;
  let yearPassed = yearProgress();

  const timer = setInterval(() => {
    progress++;
    bar.update(progress);

    if (progress >= yearPassed) {
      clearInterval(timer);
      bar.stop();
    }
  }, 5);
}

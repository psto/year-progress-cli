#!/usr/bin/env node
'use strict';
const cliProgress = require("cli-progress");
const bar = new cliProgress.Bar(
  {
    format: "{bar} | {percentage}/{total}%"
  },
  cliProgress.Presets.shades_classic
);

yearLoading();

function yearProgress() {
  let now = new Date();
  let start = new Date(now.getFullYear(), 0, 0);
  let end = new Date(now.getFullYear() + 1, 0, 0);
  return (((now - start) / (end - start)) * 100).toFixed(2);
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

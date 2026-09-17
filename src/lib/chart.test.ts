import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HOURS_LAYOUT,
  hourBars,
  niceMax,
  plotMetrics,
} from "./chart.ts";

const layout = { height: 300, top: 20, right: 20, bottom: 30, left: 40 };

describe("plotMetrics", () => {
  it("reserves the padding", () => {
    assert.deepEqual(plotMetrics(640, layout), {
      plotWidth: 580,
      plotHeight: 250,
      baseline: 270,
    });
  });

  it("keeps a positive plot width before the container has been measured", () => {
    assert.equal(plotMetrics(0, layout).plotWidth, 10);
  });
});

describe("niceMax", () => {
  it("rounds up to a multiple of four so gridlines stay whole", () => {
    assert.equal(niceMax(5), 8);
    assert.equal(niceMax(4), 4);
  });

  it("never returns zero, which would divide by zero in the bar heights", () => {
    assert.equal(niceMax(0), 4);
  });
});

describe("hourBars", () => {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hour === 9 ? 2 : 0,
  }));
  const { plotWidth, plotHeight } = plotMetrics(640, HOURS_LAYOUT);
  const yMax = niceMax(2);

  it("scales a bar's height against the rounded maximum", () => {
    const bars = hourBars(buckets, plotWidth, plotHeight, HOURS_LAYOUT, yMax);
    const peak = bars[9];

    assert.equal(yMax, 4);
    assert.equal(peak.height, plotHeight / 2);
    assert.equal(bars[8].height, 0);
  });

  it("keeps every bar inside the plot area", () => {
    const bars = hourBars(buckets, plotWidth, plotHeight, HOURS_LAYOUT, yMax);
    const first = bars[0];
    const last = bars[bars.length - 1];

    assert.ok(first.x >= HOURS_LAYOUT.left);
    assert.ok(last.x + last.width <= HOURS_LAYOUT.left + plotWidth);
  });

  it("returns nothing for an empty histogram", () => {
    assert.deepEqual(hourBars([], plotWidth, plotHeight, HOURS_LAYOUT, 4), []);
  });
});

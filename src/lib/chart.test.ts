import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  axisPositions,
  COMPLETION_LAYOUT,
  labelIndexes,
  niceMax,
  percentY,
  plotMetrics,
  peakHour,
  hourBars,
  joinRuns,
  type SeriesPoint,
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

describe("axisPositions", () => {
  it("spreads points evenly and ends flush with the plot", () => {
    assert.deepEqual(axisPositions(3, 600, 40), [40, 340, 640]);
  });

  it("handles the single point of a one day window", () => {
    assert.deepEqual(axisPositions(1, 600, 40), [40]);
    assert.deepEqual(axisPositions(0, 600, 40), []);
  });
});

describe("percentY", () => {
  const plotHeight = 250;
  const top = 20;

  it("puts 100% on the top edge and 0% on the baseline", () => {
    assert.equal(percentY(100, plotHeight, top), 20);
    assert.equal(percentY(0, plotHeight, top), 270);
  });

  it("puts 50% halfway down", () => {
    assert.equal(percentY(50, plotHeight, top), 145);
  });
});

describe("joinRuns", () => {
  it("joins neighbours that both have a value", () => {
    const points: SeriesPoint[] = [
      { x: 0, y: 10 },
      { x: 10, y: 20 },
    ];

    const runs = joinRuns(points, 100);

    assert.equal(runs.length, 1);
    assert.equal(runs[0].line, "M 0 10 L 10 20");
    assert.equal(runs[0].area, "M 0 100 L 0 10 L 10 20 L 10 100 Z");
  });

  it("breaks the line at a day with nothing planned", () => {
    const points: SeriesPoint[] = [
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: null },
      { x: 30, y: 40 },
      { x: 40, y: 50 },
    ];

    const runs = joinRuns(points, 100);

    assert.equal(runs.length, 2);
    assert.equal(runs[0].line, "M 0 10 L 10 20");
    assert.equal(runs[1].line, "M 30 40 L 40 50");
  });

  it("draws nothing when no day has a percentage", () => {
    assert.deepEqual(
      joinRuns(
        [
          { x: 0, y: null },
          { x: 10, y: null },
        ],
        100,
      ),
      [],
    );
  });
});

describe("labelIndexes", () => {
  it("labels every day when the window is short", () => {
    assert.deepEqual(labelIndexes(7), [0, 1, 2, 3, 4, 5, 6]);
  });

  it("thins the labels out for a 30 day window but keeps the last one", () => {
    const indexes = labelIndexes(30, 8);

    assert.deepEqual(indexes, [0, 4, 8, 12, 16, 20, 24, 28, 29]);
  });

  it("copes with an empty window", () => {
    assert.deepEqual(labelIndexes(0), []);
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
  const { plotWidth, plotHeight } = plotMetrics(640, COMPLETION_LAYOUT);
  const yMax = niceMax(2);

  it("scales a bar's height against the rounded maximum", () => {
    const bars = hourBars(buckets, plotWidth, plotHeight, COMPLETION_LAYOUT, yMax);
    const peak = bars[9];

    assert.equal(yMax, 4);
    assert.equal(peak.height, plotHeight / 2);
    assert.equal(bars[8].height, 0);
  });

  it("keeps every bar inside the plot area", () => {
    const bars = hourBars(buckets, plotWidth, plotHeight, COMPLETION_LAYOUT, yMax);
    const first = bars[0];
    const last = bars[bars.length - 1];

    assert.ok(first.x >= COMPLETION_LAYOUT.left);
    assert.ok(last.x + last.width <= COMPLETION_LAYOUT.left + plotWidth);
  });

  it("returns nothing for an empty histogram", () => {
    assert.deepEqual(hourBars([], plotWidth, plotHeight, COMPLETION_LAYOUT, 4), []);
  });
});

describe("peakHour", () => {
  it("finds the strongest hour", () => {
    assert.equal(
      peakHour([
        { hour: 8, count: 1 },
        { hour: 9, count: 3 },
        { hour: 10, count: 0 },
      ]),
      9,
    );
  });

  it("reports no peak when nothing was completed", () => {
    assert.equal(
      peakHour([
        { hour: 8, count: 0 },
        { hour: 9, count: 0 },
      ]),
      null,
    );
  });
});

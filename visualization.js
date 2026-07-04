// 一般貼文 / Reels 封面：1080×1350（4:5）
const IG_RATIO = 4 / 5;
const GRID_COLS = 40;
const GRID_ROWS = 40;
const BORDER_COLOR = "#ff0000";
const GRID_COLOR = "rgba(255, 255, 255, 0.25)";
const GRID_MAJOR_COLOR = "rgba(255, 255, 255, 0.45)";
const GRID_WIDTH = 1;
const GRID_MAJOR_WIDTH = 2.5;
const GUIDE_LINE_BOTTOM_COLOR = "#c9fbff";
const GUIDE_LINE_TOP_COLOR = "#d8b7ff";
const GUIDE_LINE_WIDTH = 2.6667; // 2pt
const GUIDE_LINE_SHADOWS = [
  { width: 32, opacity: 0.025 },
  { width: 26, opacity: 0.04 },
  { width: 21, opacity: 0.06 },
  { width: 16, opacity: 0.09 },
  { width: 12, opacity: 0.13 },
  { width: 8, opacity: 0.18 },
  { width: 5, opacity: 0.28 },
];
const CIRCLE_SHADOWS = [
  { width: 22, opacity: 0.08 },
  { width: 14, opacity: 0.16 },
  { width: 8, opacity: 0.28 },
];
const INTERPOLATED_LINE_COUNT = 6;
const MIN_GUIDE_LINE_GAP_CELLS = 1;
const MAX_GUIDE_LINE_GAP_CELLS = 4;
const PAGE_CONFIG = window.PAGE_CONFIG || {};
const MERGED_ORANGE_OUTLINE_FILTER_ID = "merged-orange-outline";

const BORDER_WIDTH = 3;

function isMajorGridLine(index) {
  return index % 10 === 0;
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function interpolateGuideLineColor(t) {
  return d3.interpolateRgb(GUIDE_LINE_BOTTOM_COLOR, GUIDE_LINE_TOP_COLOR)(t);
}

function colorWithOpacity(color, opacity) {
  const rgb = d3.rgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

function createExpandingTValues(lineCount, verticalSpanCells) {
  const intervalCount = lineCount - 1;
  let minGap = Math.min(
    MIN_GUIDE_LINE_GAP_CELLS,
    verticalSpanCells / intervalCount
  );
  const maxGapBySpan = (2 * verticalSpanCells) / intervalCount - minGap;
  const maxGap = Math.min(
    MAX_GUIDE_LINE_GAP_CELLS,
    Math.max(minGap, maxGapBySpan)
  );
  minGap = Math.max(
    minGap,
    (2 * verticalSpanCells) / intervalCount - maxGap
  );
  const gaps = d3
    .range(intervalCount)
    .map((index) =>
      intervalCount === 1
        ? verticalSpanCells
        : lerp(minGap, maxGap, index / (intervalCount - 1))
    );

  const values = [0];
  let t = 0;

  gaps.forEach((gap, index) => {
    t += gap / verticalSpanCells;
    values.push(index === intervalCount - 1 ? 1 : t);
  });

  return values;
}

const svg = d3.select("#canvas");
const defs = svg.append("defs");
const mergedOrangeOutlineFilter = defs
  .append("filter")
  .attr("id", MERGED_ORANGE_OUTLINE_FILTER_ID)
  .attr("x", "-100%")
  .attr("y", "-100%")
  .attr("width", "300%")
  .attr("height", "300%");

mergedOrangeOutlineFilter
  .append("feMorphology")
  .attr("in", "SourceAlpha")
  .attr("operator", "dilate")
  .attr("radius", 1.3)
  .attr("result", "outlineAlpha");

mergedOrangeOutlineFilter
  .append("feComposite")
  .attr("in", "outlineAlpha")
  .attr("in2", "SourceAlpha")
  .attr("operator", "out")
  .attr("result", "outerOutlineAlpha");

mergedOrangeOutlineFilter
  .append("feFlood")
  .attr("flood-color", "#ffc37a")
  .attr("flood-opacity", 1)
  .attr("result", "outlineColor");

mergedOrangeOutlineFilter
  .append("feComposite")
  .attr("in", "outlineColor")
  .attr("in2", "outerOutlineAlpha")
  .attr("operator", "in")
  .attr("result", "outline");

mergedOrangeOutlineFilter
  .append("feDropShadow")
  .attr("in", "outline")
  .attr("dx", 0)
  .attr("dy", 0)
  .attr("stdDeviation", 4)
  .attr("flood-color", "#ffc37a")
  .attr("flood-opacity", 0.9)
  .attr("result", "outlineGlowSmall");

mergedOrangeOutlineFilter
  .append("feDropShadow")
  .attr("in", "outline")
  .attr("dx", 0)
  .attr("dy", 0)
  .attr("stdDeviation", 11)
  .attr("flood-color", "#ffc37a")
  .attr("flood-opacity", 0.62)
  .attr("result", "outlineGlowLarge");

mergedOrangeOutlineFilter
  .append("feDropShadow")
  .attr("in", "outline")
  .attr("dx", 0)
  .attr("dy", 0)
  .attr("stdDeviation", 18)
  .attr("flood-color", "#ffc37a")
  .attr("flood-opacity", 0.38)
  .attr("result", "outlineGlowOuter");

const mergedOrangeOutlineMerge = mergedOrangeOutlineFilter.append("feMerge");

mergedOrangeOutlineMerge.append("feMergeNode").attr("in", "outlineGlowOuter");
mergedOrangeOutlineMerge.append("feMergeNode").attr("in", "outlineGlowLarge");
mergedOrangeOutlineMerge.append("feMergeNode").attr("in", "outlineGlowSmall");
mergedOrangeOutlineMerge.append("feMergeNode").attr("in", "outline");

const content = svg.append("g");
const uiState = {
  showSunsetBackground: false,
  showBorder: true,
  showGrid: true,
  showPageCircles: true,
};
const controls = {
  background: document.querySelector("#toggle-background"),
  border: document.querySelector("#toggle-border"),
  grid: document.querySelector("#toggle-grid"),
  pageCircles: document.querySelector("#toggle-page-circles"),
  copyPrompt: document.querySelector(".copy-prompt-button"),
  promptText: document.querySelector(".prompt-text"),
};
let transform = d3.zoomIdentity;

const zoom = d3
  .zoom()
  .scaleExtent([0.2, 30])
  .on("zoom", (event) => {
    transform = event.transform;
    content.attr("transform", transform);
  });

svg.call(zoom);

controls.background.addEventListener("change", (event) => {
  uiState.showSunsetBackground = event.target.checked;
  document.body.classList.toggle(
    "sunset-background",
    uiState.showSunsetBackground
  );
});

controls.border.addEventListener("change", (event) => {
  uiState.showBorder = event.target.checked;
  render();
});

controls.grid.addEventListener("change", (event) => {
  uiState.showGrid = event.target.checked;
  render();
});

controls.pageCircles?.addEventListener("change", (event) => {
  uiState.showPageCircles = event.target.checked;
  render();
});

controls.copyPrompt.addEventListener("click", async () => {
  const prompt = controls.promptText.textContent.trim();

  try {
    await navigator.clipboard.writeText(prompt);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = prompt;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  controls.copyPrompt.textContent = "已複製";
  window.setTimeout(() => {
    controls.copyPrompt.textContent = "Copy prompt";
  }, 1200);
});

function render() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  content.selectAll("*").remove();

  // 計算符合 4:5 且盡量填滿視窗的框尺寸
  let frameWidth, frameHeight;

  if (width / height > IG_RATIO) {
    // 視窗較寬，以高度為準
    frameHeight = height;
    frameWidth = height * IG_RATIO;
  } else {
    // 視窗較高，以寬度為準
    frameWidth = width;
    frameHeight = width / IG_RATIO;
  }

  const x = (width - frameWidth) / 2;
  const y = 0;

  const cellSize = frameWidth / GRID_COLS;
  const gridHeight = cellSize * GRID_ROWS;

  if (uiState.showGrid) {
    const grid = content.append("g");

    d3.range(GRID_COLS + 1).forEach((i) => {
      const lx = x + i * cellSize;
      const major = isMajorGridLine(i);
      grid
        .append("line")
        .attr("x1", lx)
        .attr("y1", y)
        .attr("x2", lx)
        .attr("y2", y + gridHeight)
        .attr("stroke", major ? GRID_MAJOR_COLOR : GRID_COLOR)
        .attr("stroke-width", major ? GRID_MAJOR_WIDTH : GRID_WIDTH);
    });

    d3.range(GRID_ROWS + 1).forEach((i) => {
      const ly = y + i * cellSize;
      const major = isMajorGridLine(i);
      grid
        .append("line")
        .attr("x1", x)
        .attr("y1", ly)
        .attr("x2", x + frameWidth)
        .attr("y2", ly)
        .attr("stroke", major ? GRID_MAJOR_COLOR : GRID_COLOR)
        .attr("stroke-width", major ? GRID_MAJOR_WIDTH : GRID_WIDTH);
    });

    const labelSize = Math.max(6, cellSize * 0.5);
    const points = [];
    let label = 1;

    for (let row = 1; row < GRID_ROWS; row++) {
      for (let col = 1; col < GRID_COLS; col++) {
        if (label % 5 === 0) {
          points.push({
            x: x + col * cellSize,
            y: y + row * cellSize,
            text: label,
          });
        }
        label++;
      }
    }

    content
      .append("g")
      .selectAll("text")
      .data(points)
      .join("text")
      .attr("class", "grid-label")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("font-size", labelSize)
      .text((d) => d.text);
  }

  function pointFromLabel(labelNumber) {
    const pointsPerRow = GRID_COLS - 1;
    const row = Math.floor((labelNumber - 1) / pointsPerRow) + 1;
    const col = ((labelNumber - 1) % pointsPerRow) + 1;

    return {
      x: x + col * cellSize,
      y: y + row * cellSize,
    };
  }

  function mirrorPoint(point) {
    return {
      x: x + frameWidth - (point.x - x),
      y: y + gridHeight - (point.y - y),
    };
  }

  function drawGuideLines(lines) {
    const guideLines = content.append("g");

    function linePath(line) {
      if (!line.wave) {
        return d3.line()([
          [line.start.x, line.start.y],
          [line.end.x, line.end.y],
        ]);
      }

      const dx = line.end.x - line.start.x;
      const dy = line.end.y - line.start.y;
      const length = Math.hypot(dx, dy);
      const ux = dx / length;
      const uy = dy / length;
      const nx = -uy;
      const ny = ux;
      const amplitude = line.wave.heightCells * cellSize;
      const wavelength = line.wave.widthCells * cellSize;
      const sampleCount = Math.max(24, Math.ceil(length / (cellSize * 0.25)));
      const phase = line.wave.phase ?? 0;
      const points = d3.range(sampleCount + 1).map((index) => {
        const distance = (index / sampleCount) * length;
        const waveOffset =
          Math.sin((distance / wavelength) * Math.PI * 2 + phase) * amplitude;

        return [
          line.start.x + ux * distance + nx * waveOffset,
          line.start.y + uy * distance + ny * waveOffset,
        ];
      });

      return d3.line()(points);
    }

    GUIDE_LINE_SHADOWS.forEach((shadow, index) => {
      guideLines
        .append("g")
        .selectAll(`line.guide-line-shadow-${index}`)
        .data(lines)
        .join("path")
        .attr("class", `guide-line-shadow-${index}`)
        .attr("d", linePath)
        .attr("fill", "none")
        .attr("stroke", (d) => d.color)
        .attr("stroke-width", shadow.width)
        .attr("stroke-linecap", "round")
        .attr("opacity", shadow.opacity);
    });

    guideLines
      .selectAll("path.guide-line-core")
      .data(lines)
      .join("path")
      .attr("class", "guide-line-core")
      .attr("d", linePath)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", GUIDE_LINE_WIDTH)
      .attr("stroke-linecap", "round")
      .style(
        "filter",
        (d) =>
          `drop-shadow(0 0 4px ${colorWithOpacity(
            d.color,
            0.95
          )}) drop-shadow(0 0 12px ${colorWithOpacity(d.color, 0.75)})`
      );
  }

  function drawPageCircles(circles) {
    const circleGroup = content.append("g");
    const shadowCircles = circles.filter((circle) => circle.shadow !== false);

    CIRCLE_SHADOWS.forEach((shadow, index) => {
      circleGroup
        .append("g")
        .selectAll(`circle.page-circle-shadow-${index}`)
        .data(shadowCircles)
        .join("circle")
        .attr("class", `page-circle-shadow-${index}`)
        .attr("cx", (d) => pointFromLabel(d.centerLabel).x)
        .attr("cy", (d) => pointFromLabel(d.centerLabel).y)
        .attr("r", (d) => d.radiusCells * cellSize)
        .attr("fill", "none")
        .attr("stroke", (d) => d.color)
        .attr("stroke-width", shadow.width)
        .attr("opacity", shadow.opacity);
    });

    circleGroup
      .selectAll("circle.page-circle")
      .data(circles)
      .join("circle")
      .attr("class", "page-circle")
      .attr("cx", (d) => pointFromLabel(d.centerLabel).x)
      .attr("cy", (d) => pointFromLabel(d.centerLabel).y)
      .attr("r", (d) => d.radiusCells * cellSize)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => d.strokeWidth ?? GUIDE_LINE_WIDTH)
      .style(
        "filter",
        (d) =>
          d.shadow === false
            ? null
            : `drop-shadow(0 0 4px ${colorWithOpacity(
                d.color,
                0.9
              )}) drop-shadow(0 0 12px ${colorWithOpacity(d.color, 0.65)})`
      );
  }

  function drawCircleVerticalIntersections(intersections) {
    const outlineColor = "#ffc37a";
    const pathData = intersections.flatMap((intersection) => {
      const center = pointFromLabel(intersection.centerLabel);
      const innerRadiusCells = intersection.innerCircleRadiusCells;
      const paths = [];

      if (innerRadiusCells) {
        const innerRadius = innerRadiusCells * cellSize;
        const gridBottom = y + gridHeight;

        if (center.y + innerRadius <= gridBottom) {
          paths.push(
            [
              `M ${center.x + innerRadius},${center.y}`,
              `A ${innerRadius},${innerRadius} 0 1 0 ${
                center.x - innerRadius
              },${center.y}`,
              `A ${innerRadius},${innerRadius} 0 1 0 ${
                center.x + innerRadius
              },${center.y}`,
              "Z",
            ].join(" ")
          );
        } else if (center.y - innerRadius < gridBottom) {
          const cutDy = gridBottom - center.y;
          const cutHalfWidth = Math.sqrt(innerRadius ** 2 - cutDy ** 2);
          const rightX = center.x + cutHalfWidth;
          const leftX = center.x - cutHalfWidth;
          const largeArcFlag = gridBottom > center.y ? 1 : 0;

          paths.push(
            [
              `M ${rightX},${gridBottom}`,
              `A ${innerRadius},${innerRadius} 0 ${largeArcFlag} 0 ${leftX},${gridBottom}`,
              `L ${rightX},${gridBottom}`,
              "Z",
            ].join(" ")
          );
        }
      }

      (intersection.radiusCells || []).forEach((radiusCells) => {
        const radius = radiusCells * cellSize;
        const chordOffsetCells =
          intersection.chordOffsetCellsByRadius?.[radiusCells];
        let leftX;
        let leftY;
        let rightX;
        let rightY;

        if (chordOffsetCells !== undefined) {
          const chordY = center.y - radius + chordOffsetCells * cellSize;
          const dy = chordY - center.y;
          const halfWidth = Math.sqrt(radius ** 2 - dy ** 2);

          leftX = center.x - halfWidth;
          rightX = center.x + halfWidth;
          leftY = chordY;
          rightY = chordY;
        } else {
          const [leftGridLine, rightGridLine] = d3.extent(
            intersection.verticalGridLines
          );

          if (leftGridLine === undefined || rightGridLine === undefined) {
            return;
          }

          leftX = x + leftGridLine * cellSize;
          rightX = x + rightGridLine * cellSize;

          const leftDx = leftX - center.x;
          const rightDx = rightX - center.x;

          if (Math.abs(leftDx) > radius || Math.abs(rightDx) > radius) {
            return;
          }

          leftY = center.y - Math.sqrt(radius ** 2 - leftDx ** 2);
          rightY = center.y - Math.sqrt(radius ** 2 - rightDx ** 2);
        }

        paths.push(
          [
            `M ${leftX},${leftY}`,
            `A ${radius},${radius} 0 0 1 ${rightX},${rightY}`,
            `L ${leftX},${leftY}`,
            "Z",
          ].join(" ")
        );
      });

      return paths;
    });
    const mergedPath = pathData.join(" ");

    if (!mergedPath) {
      return;
    }

    const outlineGroup = content.append("g");
    const shadowLayers = [
      { width: 32, opacity: 0.025 },
      { width: 26, opacity: 0.04 },
      { width: 21, opacity: 0.06 },
      { width: 16, opacity: 0.09 },
      { width: 12, opacity: 0.13 },
      { width: 8, opacity: 0.18 },
      { width: 5, opacity: 0.28 },
    ];

    shadowLayers.forEach((shadow) => {
      outlineGroup
        .append("path")
        .attr("d", mergedPath)
        .attr("fill", "none")
        .attr("stroke", outlineColor)
        .attr("stroke-width", shadow.width)
        .attr("stroke-linecap", "butt")
        .attr("stroke-linejoin", "miter")
        .attr("stroke-miterlimit", 10)
        .attr("opacity", shadow.opacity);
    });

    outlineGroup
      .append("path")
      .attr("d", mergedPath)
      .attr("fill", "none")
      .attr("stroke", outlineColor)
      .attr("stroke-width", GUIDE_LINE_WIDTH)
      .attr("stroke-linecap", "butt")
      .attr("stroke-linejoin", "miter")
      .attr("stroke-miterlimit", 10)
      .style(
        "filter",
        "drop-shadow(0 0 4px rgba(255, 195, 122, 0.95)) drop-shadow(0 0 12px rgba(255, 195, 122, 0.7))"
      );
  }

  const startLine = {
    start: pointFromLabel(1445),
    end: pointFromLabel(1449),
  };
  const endLine = {
    start: pointFromLabel(743),
    end: pointFromLabel(69),
  };
  const shortestVerticalSpanCells =
    Math.min(
      Math.abs(endLine.start.y - startLine.start.y),
      Math.abs(endLine.end.y - startLine.end.y)
    ) / cellSize;
  const tValues = createExpandingTValues(
    INTERPOLATED_LINE_COUNT + 2,
    shortestVerticalSpanCells
  );
  const guideLines = tValues.map((t) => {
    return {
      color: interpolateGuideLineColor(t),
      start: {
        x: lerp(startLine.start.x, endLine.start.x, t),
        y: lerp(startLine.start.y, endLine.start.y, t),
      },
      end: {
        x: lerp(startLine.end.x, endLine.end.x, t),
        y: lerp(startLine.end.y, endLine.end.y, t),
      },
    };
  });

  if (PAGE_CONFIG.showGuideLines !== false) {
    drawGuideLines(guideLines);
    drawGuideLines(
      guideLines.map((line) => ({
        color: line.color,
        start: mirrorPoint(line.start),
        end: mirrorPoint(line.end),
      }))
    );
  }

  if (PAGE_CONFIG.customGuideLines?.length) {
    if (PAGE_CONFIG.customGuideInterpolation) {
      const [startGuideLine, endGuideLine] = PAGE_CONFIG.customGuideLines;
      const startLine = {
        start: pointFromLabel(startGuideLine.startLabel),
        end: pointFromLabel(startGuideLine.endLabel),
      };
      const endLine = {
        start: pointFromLabel(endGuideLine.startLabel),
        end: pointFromLabel(endGuideLine.endLabel),
      };
      const interpolationCount =
        PAGE_CONFIG.customGuideInterpolation.count ?? 0;
      const totalLineCount = interpolationCount + 2;
      const customTValues = PAGE_CONFIG.customGuideInterpolation.gapCells
        ? (() => {
            const intervalCount = totalLineCount - 1;
            const { max, min, values } =
              PAGE_CONFIG.customGuideInterpolation.gapCells;
            const gaps =
              values ||
              d3
                .range(intervalCount)
                .map((index) =>
                  intervalCount === 1
                    ? 1
                    : lerp(min, max, index / (intervalCount - 1))
                );
            const totalGap = d3.sum(gaps);
            let accumulatedGap = 0;

            return [
              0,
              ...gaps.map((gap, index) => {
                accumulatedGap += gap;
                return index === gaps.length - 1
                  ? 1
                  : accumulatedGap / totalGap;
              }),
            ];
          })()
        : d3.range(totalLineCount).map((index) => index / (totalLineCount - 1));
      const interpolationLines = customTValues.map((t, index) => {
          const endWave = endGuideLine.wave || {
            heightCells: 0,
            widthCells: 1,
          };
          const heightCells = lerp(0, endWave.heightCells, t);
          const firstLineOffsetY =
            index === 0
              ? (PAGE_CONFIG.customGuideInterpolation.firstLineOffsetCellsY ||
                  0) * cellSize
              : 0;

          return {
            color:
              PAGE_CONFIG.customGuideInterpolation.color ||
              startGuideLine.color ||
              GUIDE_LINE_BOTTOM_COLOR,
            wave:
              heightCells === 0
                ? null
                : {
                    heightCells,
                    phase:
                      PAGE_CONFIG.customGuideInterpolation.alternateWavePhase
                        ? (index % 2) * Math.PI
                        : endWave.phase,
                    widthCells: endWave.widthCells,
                  },
            start: {
              x: lerp(startLine.start.x, endLine.start.x, t),
              y: lerp(startLine.start.y, endLine.start.y, t) + firstLineOffsetY,
            },
            end: {
              x: lerp(startLine.end.x, endLine.end.x, t),
              y: lerp(startLine.end.y, endLine.end.y, t) + firstLineOffsetY,
            },
          };
        });

      drawGuideLines(interpolationLines);
    } else {
      drawGuideLines(
        PAGE_CONFIG.customGuideLines.map((line) => ({
          color: line.color || GUIDE_LINE_BOTTOM_COLOR,
          wave: line.wave,
          start: pointFromLabel(line.startLabel),
          end: pointFromLabel(line.endLabel),
        }))
      );
    }
  }

  if (uiState.showPageCircles) {
    drawPageCircles(PAGE_CONFIG.circles || []);
  }
  drawCircleVerticalIntersections(PAGE_CONFIG.circleVerticalIntersections || []);

  if (uiState.showBorder) {
    content
      .append("rect")
      .attr("x", x)
      .attr("y", y)
      .attr("width", frameWidth)
      .attr("height", frameHeight)
      .attr("fill", "none")
      .attr("stroke", BORDER_COLOR)
      .attr("stroke-width", BORDER_WIDTH);
  }

  content.attr("transform", transform);
  svg.call(zoom.transform, transform);
}

render();
window.addEventListener("resize", render);

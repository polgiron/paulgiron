import { CatmullRomCurve3, Vector3 } from 'three/webgpu';

type Point = readonly [x: number, y: number];

// One continuous hand-drawn stroke. Units: baseline y=0, x-height y=1, capitals y≈2.1.
const PAUL: Point[] = [
  // P: stem, narrow return loop, bowl, then a small loop at the waist
  [0.42, 2.1],
  [0.36, 1.7],
  [0.22, 1.0],
  [0.08, 0.2],
  [0.12, -0.1],
  [0.3, -0.12],
  [0.52, 0.3],
  [0.66, 1.2],
  [0.86, 1.92],
  [1.32, 2.14],
  [1.74, 1.8],
  [1.54, 1.28],
  [1.0, 1.02],
  [0.46, 1.04],
  [0.32, 0.86],
  [0.72, 0.64],
  [1.4, 0.68],
  // a
  [2.1, 0.86],
  [2.56, 0.98],
  [2.64, 1.1],
  [2.4, 1.12],
  [1.98, 0.92],
  [1.82, 0.5],
  [2.0, 0.08],
  [2.34, 0.04],
  [2.6, 0.46],
  [2.72, 0.96],
  [2.8, 1.0],
  [2.78, 0.5],
  [2.84, 0.12],
  [3.08, 0.0],
  [3.36, 0.4],
  // u
  [3.56, 0.94],
  [3.66, 0.98],
  [3.62, 0.38],
  [3.8, 0.0],
  [4.12, 0.2],
  [4.34, 0.72],
  [4.46, 0.98],
  [4.42, 0.5],
  [4.5, 0.1],
  [4.76, 0.0],
  [5.1, 0.38],
  // l
  [5.48, 1.16],
  [5.84, 1.86],
  [5.86, 2.24],
  [5.56, 2.2],
  [5.38, 1.6],
  [5.32, 0.72],
  [5.44, 0.12],
  [5.74, 0.0],
  [6.16, 0.14],
];

const GIRON: Point[] = [
  // G, drawn from its top right, with a stem that drops into a tail loop
  [1.86, 1.9],
  [1.2, 2.16],
  [0.52, 1.92],
  [0.08, 1.24],
  [0.06, 0.52],
  [0.46, 0.04],
  [1.1, -0.02],
  [1.6, 0.22],
  [1.84, 0.72],
  [1.92, 1.04],
  [2.02, 1.02],
  [2.0, 0.42],
  [1.9, -0.34],
  [1.62, -0.82],
  [1.32, -0.8],
  [1.38, -0.44],
  [1.92, -0.14],
  [2.42, 0.3],
  // i
  [2.72, 0.92],
  [2.84, 1.02],
  [2.92, 0.92],
  [2.88, 0.4],
  [3.0, 0.04],
  [3.26, 0.04],
  [3.52, 0.42],
  // r: a stem, then an arm that runs on into the top of the o
  [3.72, 0.9],
  [3.82, 1.02],
  [3.9, 0.9],
  [3.86, 0.4],
  [3.84, 0.1],
  [3.92, -0.03],
  [4.04, 0.1],
  [4.08, 0.52],
  [4.22, 0.94],
  [4.52, 1.08],
  [4.84, 0.98],
  // o
  [5.2, 1.04],
  [5.56, 0.74],
  [5.54, 0.26],
  [5.2, 0.0],
  [4.86, 0.22],
  [4.84, 0.66],
  [5.12, 0.94],
  [5.48, 1.0],
  [5.88, 0.84],
  // n
  [6.12, 0.92],
  [6.24, 1.0],
  [6.34, 0.9],
  [6.3, 0.4],
  [6.28, 0.1],
  [6.36, -0.03],
  [6.48, 0.1],
  [6.54, 0.5],
  [6.86, 0.98],
  [7.22, 0.8],
  [7.26, 0.3],
  [7.46, 0.02],
  [7.8, 0.1],
  [8.14, 0.56],
];

// The stroke dots the i on its way out. Relative to GIRON.
const I_DOT: Point[] = [
  [8.36, 1.1],
  [7.7, 1.5],
  [5.7, 1.62],
  [3.7, 1.62],
  [3.12, 1.56],
  [2.92, 1.46],
  [2.76, 1.6],
  [2.92, 1.78],
  [3.16, 1.72],
  [3.7, 2.3],
];

const WIDE_GAP = 1.3;
const LINE_GAP = 4.1;
const SLANT = 0.17;
const SLANT_Y_ORIGIN = 1;

export interface SignatureLayout {
  /** Evenly spaced positions along the stroke, flat xyz. */
  points: Float32Array;
  /** Index range that holds the letters, ignoring the entry and exit tails. */
  letters: [start: number, end: number];
  /** Strokes between letters, kept thin so they don't read as letters themselves. */
  hairlines: [start: number, end: number][];
  /** The dot on the i, kept at full width. */
  dot: [start: number, end: number];
  /** Where the ribbon has left the letters for good. */
  exit: number;
  /** World size of one letter unit. */
  scale: number;
}

function slanted(points: readonly Point[], dx: number, dy: number): Point[] {
  return points.map(([x, y]) => [x + (y - SLANT_Y_ORIGIN) * SLANT + dx, y + dy]);
}

function bounds(points: readonly Point[]) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * Lays the stroke out for a visible area in world units. Wide screens get one line. Narrow
 * screens get their own two-line composition, with the ribbon falling from the l to the G.
 */
export function layoutSignature(count: number, viewWidth: number, viewHeight: number): SignatureLayout {
  const stacked = viewWidth / viewHeight < 1.15;

  const paul = slanted(PAUL, 0, stacked ? LINE_GAP : 0);
  const gironX = stacked ? -0.5 : PAUL[PAUL.length - 1][0] + WIDE_GAP;
  const giron = slanted(GIRON, gironX, 0);
  // On two lines, a steep exit would strike through Paul, so the ribbon leaves to the right instead.
  const dot = slanted(stacked ? I_DOT.slice(0, -1) : I_DOT, gironX, 0);

  const box = bounds([...paul, ...giron, ...dot.slice(0, 9)]);
  const unitsWide = box.maxX - box.minX;
  const unitsHigh = box.maxY - box.minY;
  const scale = Math.min((viewWidth * (stacked ? 0.86 : 0.84)) / unitsWide, (viewHeight * 0.6) / unitsHigh);

  // Slightly above centre, to leave Contact its own space.
  const offsetX = -(box.minX + box.maxX) / 2;
  const offsetY = -(box.minY + box.maxY) / 2 + (viewHeight * 0.05) / scale;
  const toWorld = ([x, y]: Point) => new Vector3((x + offsetX) * scale, (y + offsetY) * scale, 0);

  const left = -viewWidth / 2 / scale - offsetX - 1.2;
  const right = viewWidth / 2 / scale - offsetX + 1.2;
  const top = viewHeight / 2 / scale - offsetY + 1.2;

  const entry: Point[] = [
    [left, paul[0][1] - 1.4],
    [(left + paul[0][0]) / 2 - 0.2, paul[0][1] - 0.6],
    [paul[0][0] - 0.5, paul[0][1] - 0.25],
    [paul[0][0] - 0.1, paul[0][1] + 0.12],
  ];

  const from = paul[paul.length - 1];
  const to = giron[0];
  const connector: Point[] = stacked
    ? [
        [from[0] + 0.5, from[1] - 0.15],
        [from[0] + 0.55, from[1] - 0.62],
        [from[0] - 0.2, from[1] - 0.95],
        [(from[0] + to[0]) / 2, to[1] + 1.15],
        [to[0] + 0.85, to[1] + 0.72],
        [to[0] + 0.3, to[1] + 0.28],
      ]
    : [
        [from[0] + 0.55, from[1] + 0.5],
        [from[0] + 1.2, from[1] + 1.36],
        [to[0] - 1.45, to[1] + 0.45],
        [to[0] - 0.6, to[1] + 0.82],
        [to[0] + 0.22, to[1] + 0.48],
        [to[0] + 0.12, to[1] + 0.08],
      ];

  const last = dot[dot.length - 1];
  const exit: Point[] = stacked
    ? [
        [last[0] + 0.55, last[1] + 0.5],
        [(last[0] + right) / 2, last[1] + 0.72],
        [right, last[1] + 0.92],
      ]
    : [
        [(last[0] * 2 + right) / 3, (last[1] + top * 2) / 3],
        [(last[0] + right) / 2, top],
      ];

  const stroke = [...entry, ...paul, ...connector, ...giron, ...dot, ...exit];
  const curve = new CatmullRomCurve3(stroke.map(toWorld), false, 'centripetal');
  curve.arcLengthDivisions = count * 4;
  const spaced = curve.getSpacedPoints(count - 1);

  const points = new Float32Array(count * 3);
  spaced.forEach((point, index) => point.toArray(points, index * 3));

  const nearest = (target: Vector3) => {
    let best = 0;
    let bestDistance = Infinity;
    spaced.forEach((point, index) => {
      const distance = point.distanceToSquared(target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  };

  return {
    points,
    letters: [nearest(toWorld(paul[0])), nearest(toWorld(dot[8]))],
    hairlines: [
      [nearest(toWorld(connector[0])), nearest(toWorld(connector[connector.length - 1]))],
      [nearest(toWorld(dot[0])), nearest(toWorld(dot[3]))],
    ],
    dot: [nearest(toWorld(dot[4])), nearest(toWorld(dot[8]))],
    exit: nearest(toWorld(dot[8])),
    scale,
  };
}

import type { SudokuGrid } from "@/lib/sudoku";

type ScanProgress = (label: string, percent: number) => void;

interface CvMat {
  rows: number;
  cols: number;
  data32S: Int32Array;
  data32F: Float32Array;
  delete: () => void;
  roi: (rect: unknown) => CvMat;
}

interface CvMatVector {
  size: () => number;
  get: (index: number) => CvMat;
  delete: () => void;
}

interface OpenCvRuntime {
  Mat: new (...args: unknown[]) => CvMat;
  MatVector: new () => CvMatVector;
  Size: new (width: number, height: number) => unknown;
  Rect: new (x: number, y: number, width: number, height: number) => unknown;
  Scalar: new (...values: number[]) => unknown;
  matFromArray: (rows: number, columns: number, type: number, values: number[]) => CvMat;
  imread: (canvas: HTMLCanvasElement) => CvMat;
  imshow: (canvas: HTMLCanvasElement, mat: CvMat) => void;
  cvtColor: (source: CvMat, destination: CvMat, code: number) => void;
  GaussianBlur: (source: CvMat, destination: CvMat, size: unknown, sigmaX: number) => void;
  adaptiveThreshold: (
    source: CvMat,
    destination: CvMat,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    constant: number,
  ) => void;
  findContours: (
    source: CvMat,
    contours: CvMatVector,
    hierarchy: CvMat,
    mode: number,
    method: number,
  ) => void;
  approxPolyDP: (curve: CvMat, approximation: CvMat, epsilon: number, closed: boolean) => void;
  arcLength: (curve: CvMat, closed: boolean) => number;
  contourArea: (contour: CvMat) => number;
  isContourConvex: (contour: CvMat) => boolean;
  getPerspectiveTransform: (source: CvMat, destination: CvMat) => CvMat;
  warpPerspective: (
    source: CvMat,
    destination: CvMat,
    transform: CvMat,
    size: unknown,
    flags: number,
    borderMode: number,
    borderValue: unknown,
  ) => void;
  threshold: (source: CvMat, destination: CvMat, value: number, maxValue: number, type: number) => number;
  countNonZero: (mat: CvMat) => number;
  bitwise_not: (source: CvMat, destination: CvMat) => void;
  resize: (
    source: CvMat,
    destination: CvMat,
    size: unknown,
    scaleX: number,
    scaleY: number,
    interpolation: number,
  ) => void;
  COLOR_RGBA2GRAY: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  THRESH_BINARY_INV: number;
  THRESH_BINARY: number;
  THRESH_OTSU: number;
  RETR_LIST: number;
  CHAIN_APPROX_SIMPLE: number;
  CV_32FC2: number;
  INTER_CUBIC: number;
  BORDER_REPLICATE: number;
  onRuntimeInitialized?: () => void;
}

type Point = { x: number; y: number };

let cvPromise: Promise<OpenCvRuntime> | null = null;

async function loadOpenCv(): Promise<OpenCvRuntime> {
  if (!cvPromise) {
    cvPromise = (async () => {
      const browser = window as Window & { cv?: OpenCvRuntime | Promise<OpenCvRuntime> };
      if (!browser.cv) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `${import.meta.env.BASE_URL}opencv.js`;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => {
            script.remove();
            reject(new Error("The image scanner could not start. Please try again."));
          };
          document.head.append(script);
        });
      }
      // The UMD build exposes a native Promise while WASM initializes.
      // Loading it directly avoids a bundler wrapping the Promise in a module proxy.
      const cv = await browser.cv;
      if (!cv) throw new Error("The image scanner could not start. Please try again.");
      if (cv.Mat) return cv;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("The image scanner could not start. Please try again.")),
          20000,
        );
        cv.onRuntimeInitialized = () => {
          window.clearTimeout(timeout);
          resolve();
        };
      });
      return cv;
    })();
  }
  try {
    return await cvPromise;
  } catch (error) {
    // A temporary script or WASM load failure should not poison later attempts.
    cvPromise = null;
    delete (window as Window & { cv?: OpenCvRuntime | Promise<OpenCvRuntime> }).cv;
    throw error;
  }
}

function orderCorners(points: Point[]): [Point, Point, Point, Point] {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDifference = [...points].sort((a, b) => a.y - a.x - (b.y - b.x));
  return [bySum[0], byDifference[0], bySum[3], byDifference[3]];
}

function findSudokuBoundary(source: CvMat, cv: OpenCvRuntime): [Point, Point, Point, Point] | null {
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const thresholded = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const approximation = new cv.Mat();

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.adaptiveThreshold(
      blurred,
      thresholded,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      11,
      2,
    );
    cv.findContours(thresholded, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let largestArea = 0;
    let largestQuad: [Point, Point, Point, Point] | null = null;
    const imageArea = source.rows * source.cols;

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const area = cv.contourArea(contour);
      if (area < imageArea * 0.06 || area <= largestArea) {
        contour.delete();
        continue;
      }

      cv.approxPolyDP(contour, approximation, 0.02 * cv.arcLength(contour, true), true);
      if (approximation.rows === 4 && cv.isContourConvex(approximation)) {
        const values = Array.from(approximation.data32S);
        const points = Array.from({ length: 4 }, (_, pointIndex) => ({
          x: values[pointIndex * 2],
          y: values[pointIndex * 2 + 1],
        }));
        const ordered = orderCorners(points);
        const top = Math.hypot(ordered[1].x - ordered[0].x, ordered[1].y - ordered[0].y);
        const bottom = Math.hypot(ordered[2].x - ordered[3].x, ordered[2].y - ordered[3].y);
        const left = Math.hypot(ordered[3].x - ordered[0].x, ordered[3].y - ordered[0].y);
        const right = Math.hypot(ordered[2].x - ordered[1].x, ordered[2].y - ordered[1].y);
        const width = (top + bottom) / 2;
        const height = (left + right) / 2;
        const ratio = width / height;

        if (ratio >= 0.72 && ratio <= 1.38) {
          largestArea = area;
          largestQuad = ordered;
        }
      }
      contour.delete();
    }

    return largestQuad;
  } finally {
    approximation.delete();
    hierarchy.delete();
    contours.delete();
    thresholded.delete();
    blurred.delete();
    gray.delete();
  }
}

function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("This browser could not open the photo."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo could not be opened. Try another image."));
    };
    image.src = url;
  });
}

function createCellImage(binaryCell: CvMat, cv: OpenCvRuntime): HTMLCanvasElement {
  const enlarged = new cv.Mat();
  const imageCanvas = document.createElement("canvas");
  const paddedCanvas = document.createElement("canvas");
  imageCanvas.width = 144;
  imageCanvas.height = 144;
  paddedCanvas.width = 200;
  paddedCanvas.height = 200;

  try {
    cv.resize(binaryCell, enlarged, new cv.Size(144, 144), 0, 0, cv.INTER_CUBIC);
    cv.imshow(imageCanvas, enlarged);
    const context = paddedCanvas.getContext("2d");
    if (!context) throw new Error("The photo could not be prepared for reading.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
    context.drawImage(imageCanvas, 28, 28);
    return paddedCanvas;
  } finally {
    enlarged.delete();
  }
}

export async function readSudokuPhoto(file: File, onProgress: ScanProgress): Promise<SudokuGrid> {
  onProgress("Opening photo", 5);
  const canvas = await fileToCanvas(file);
  onProgress("Finding the puzzle grid", 14);

  const cv = await loadOpenCv();
  const source = cv.imread(canvas);
  const warped = new cv.Mat();
  let transform: CvMat | null = null;
  let sourcePoints: CvMat | null = null;
  let destinationPoints: CvMat | null = null;
  const gray = new cv.Mat();
  let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | null = null;

  try {
    const corners = findSudokuBoundary(source, cv);
    if (!corners) {
      throw new Error("I couldn't find a square Sudoku grid. Try a closer, straight-on photo with the full grid visible.");
    }

    const points = corners.flatMap((point) => [point.x, point.y]);
    sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, points);
    destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 900, 0, 900, 900, 0, 900]);
    transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints);
    cv.warpPerspective(
      source,
      warped,
      transform,
      new cv.Size(900, 900),
      cv.INTER_CUBIC,
      cv.BORDER_REPLICATE,
      new cv.Scalar(255, 255, 255, 255),
    );
    cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);

    const cells: Array<{ row: number; col: number; canvas: HTMLCanvasElement }> = [];
    const cellSize = 100;
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        const inset = 15;
        const crop = gray.roi(new cv.Rect(col * cellSize + inset, row * cellSize + inset, 70, 70));
        const binary = new cv.Mat();
        const ink = new cv.Mat();
        try {
          cv.threshold(crop, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
          cv.bitwise_not(binary, ink);
          const inkRatio = cv.countNonZero(ink) / (70 * 70);
          if (inkRatio > 0.012 && inkRatio < 0.42) {
            cells.push({ row, col, canvas: createCellImage(binary, cv) });
          }
        } finally {
          ink.delete();
          binary.delete();
          crop.delete();
        }
      }
    }

    onProgress("Loading number reader", 23);
    const { createWorker, PSM } = await import("tesseract.js");
    worker = await createWorker("eng", 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      workerBlobURL: true,
      gzip: true,
      logger: (message) => {
        if (message.status.includes("load") || message.status.includes("initial")) {
          const ratio = Math.max(0, Math.min(1, message.progress || 0));
          onProgress("Loading number reader", 23 + Math.round(ratio * 19));
        }
      },
    });
    await worker.setParameters({
      tessedit_char_whitelist: "123456789",
      tessedit_pageseg_mode: PSM.SINGLE_CHAR,
    });

    const grid = Array.from({ length: 9 }, () => Array(9).fill(0)) as SudokuGrid;
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      const { data } = await worker.recognize(cell.canvas);
      const digit = data.text.match(/[1-9]/)?.[0];
      if (digit) grid[cell.row][cell.col] = Number(digit);
      const ratio = cells.length ? (index + 1) / cells.length : 1;
      onProgress(`Reading clues · ${index + 1} of ${cells.length}`, 44 + Math.round(ratio * 54));
    }

    if (cells.length === 0) {
      throw new Error("I couldn't read any numbers in that grid. Try a sharper photo with better light.");
    }
    return grid;
  } finally {
    if (worker) await worker.terminate();
    gray.delete();
    if (transform) transform.delete();
    if (sourcePoints) sourcePoints.delete();
    if (destinationPoints) destinationPoints.delete();
    warped.delete();
    source.delete();
  }
}

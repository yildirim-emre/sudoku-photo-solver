import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../node_modules/@techstark/opencv-js/dist/opencv.js", import.meta.url));
const target = fileURLToPath(new URL("../public/opencv.js", import.meta.url));
await mkdir(fileURLToPath(new URL("../public/", import.meta.url)), { recursive: true });
await copyFile(source, target);

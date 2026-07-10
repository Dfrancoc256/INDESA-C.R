export function isValidImageSource(value: string) {
  if (!value) return true;
  return /^https?:\/\//i.test(value) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo procesar la imagen."));
    image.src = dataUrl;
  });
}

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function colorDistance(r: number, g: number, b: number, color: [number, number, number]) {
  const dr = r - color[0];
  const dg = g - color[1];
  const db = b - color[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getCornerBackground(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const samples: Array<[number, number, number]> = [];
  const sampleSize = Math.max(8, Math.floor(Math.min(width, height) * 0.06));
  const zones = [
    [0, 0],
    [width - sampleSize, 0],
    [0, height - sampleSize],
    [width - sampleSize, height - sampleSize],
  ];

  for (const [startX, startY] of zones) {
    for (let y = startY; y < startY + sampleSize; y += 3) {
      for (let x = startX; x < startX + sampleSize; x += 3) {
        const index = (y * width + x) * 4;
        if (data[index + 3] > 18) {
          samples.push([data[index], data[index + 1], data[index + 2]]);
        }
      }
    }
  }

  if (!samples.length) return [255, 255, 255];

  const average = samples.reduce<[number, number, number]>(
    (acc, sample) => [acc[0] + sample[0], acc[1] + sample[1], acc[2] + sample[2]],
    [0, 0, 0],
  );

  return [
    Math.round(average[0] / samples.length),
    Math.round(average[1] / samples.length),
    Math.round(average[2] / samples.length),
  ];
}

function detectForegroundBounds(context: CanvasRenderingContext2D, width: number, height: number): Bounds | null {
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const background = getCornerBackground(data, width, height);
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  let foregroundPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      if (alpha <= 18) continue;

      const distance = colorDistance(data[index], data[index + 1], data[index + 2], background);
      const isTransparentForeground = alpha > 18 && alpha < 245;
      const isDifferentFromBackground = distance > 32;

      if (isTransparentForeground || isDifferentFromBackground) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
        foregroundPixels += 1;
      }
    }
  }

  if (foregroundPixels < width * height * 0.01 || right <= left || bottom <= top) {
    return null;
  }

  return { left, top, right, bottom };
}

function createProductImageDataUrl(image: HTMLImageElement) {
  const sourceMaxSide = 1400;
  const sourceScale = Math.min(1, sourceMaxSide / Math.max(image.width, image.height));
  const sourceWidth = Math.max(1, Math.round(image.width * sourceScale));
  const sourceHeight = Math.max(1, Math.round(image.height * sourceScale));
  const sourceCanvas = document.createElement("canvas");
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });

  if (!sourceContext) return null;

  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  sourceContext.imageSmoothingEnabled = true;
  sourceContext.imageSmoothingQuality = "high";
  sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  const detectedBounds = detectForegroundBounds(sourceContext, sourceWidth, sourceHeight);
  const fallbackBounds = { left: 0, top: 0, right: sourceWidth, bottom: sourceHeight };
  const bounds = detectedBounds ?? fallbackBounds;
  const boundsWidth = bounds.right - bounds.left;
  const boundsHeight = bounds.bottom - bounds.top;
  const almostFullImage = boundsWidth > sourceWidth * 0.92 && boundsHeight > sourceHeight * 0.92;
  const crop = almostFullImage ? fallbackBounds : bounds;
  const cropWidth = crop.right - crop.left;
  const cropHeight = crop.bottom - crop.top;
  const outputSize = 900;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return null;

  canvas.width = outputSize;
  canvas.height = outputSize;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputSize, outputSize);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const maxProductSize = outputSize * 0.86;
  const scale = Math.min(maxProductSize / cropWidth, maxProductSize / cropHeight);
  const drawWidth = Math.round(cropWidth * scale);
  const drawHeight = Math.round(cropHeight * scale);
  const drawX = Math.round((outputSize - drawWidth) / 2);
  const drawY = Math.round((outputSize - drawHeight) / 2);

  context.drawImage(sourceCanvas, crop.left, crop.top, cropWidth, cropHeight, drawX, drawY, drawWidth, drawHeight);

  return canvas.toDataURL("image/jpeg", 0.9);
}

async function compressImageDataUrl(dataUrl: string) {
  const image = await loadImage(dataUrl);
  const compressed = createProductImageDataUrl(image);

  return compressed ?? dataUrl;
}

export async function readImageFileAsDataUrl(file: File, maxSizeMb = 6) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Seleccione un archivo de imagen valido.");
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`La imagen no debe superar ${maxSizeMb} MB.`);
  }

  const dataUrl = await readFileAsDataUrl(file);
  return compressImageDataUrl(dataUrl);
}

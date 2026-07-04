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

async function compressImageDataUrl(dataUrl: string, fileType: string) {
  const image = await loadImage(dataUrl);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return dataUrl;

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const outputType = fileType === "image/png" && dataUrl.length < 900_000 ? "image/png" : "image/jpeg";
  const compressed = canvas.toDataURL(outputType, outputType === "image/jpeg" ? 0.82 : undefined);

  return compressed.length < dataUrl.length ? compressed : dataUrl;
}

export async function readImageFileAsDataUrl(file: File, maxSizeMb = 6) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Seleccione un archivo de imagen valido.");
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`La imagen no debe superar ${maxSizeMb} MB.`);
  }

  const dataUrl = await readFileAsDataUrl(file);
  return compressImageDataUrl(dataUrl, file.type);
}

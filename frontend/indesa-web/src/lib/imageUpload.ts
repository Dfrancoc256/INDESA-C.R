export function isValidImageSource(value: string) {
  if (!value) return true;
  return /^https?:\/\//i.test(value) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

export function readImageFileAsDataUrl(file: File, maxSizeMb = 5) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Seleccione un archivo de imagen valido."));
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      reject(new Error(`La imagen no debe superar ${maxSizeMb} MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

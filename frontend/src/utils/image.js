// Resizes an image File/Blob down to maxDim on its longest side and returns
// { base64, mimeType } ready to send to the AI endpoints. Keeps upload payloads
// small (a few hundred KB instead of multi-MB camera photos) and normalizes
// HEIC-from-iPhone-shaped surprises down to a plain JPEG.
export function fileToResizedBase64(file, { maxDim = 1024, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("Please choose an image file"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't load that image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg", previewUrl: dataUrl });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

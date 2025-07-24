/**
 * Client-side helper to down-scale and compress an image before uploading.
 * Returns a new File that can be passed directly to Supabase Storage.
 */
export function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      reject(new Error("Canvas context not available"))
      return
    }

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      /* calculate new dimensions while preserving aspect ratio */
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image compression failed"))
            return
          }
          resolve(
            new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            }),
          )
        },
        file.type,
        quality,
      )
    }

    img.onerror = () => reject(new Error("Failed to load image for compression"))
    img.src = URL.createObjectURL(file)
  })
}

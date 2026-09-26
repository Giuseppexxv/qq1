const luminanceCache = new Map<string, boolean>();

/**
 * Samples the top region of an image to detect if it has a light/bright background.
 * Returns true if the top area has high luminance, false otherwise.
 */
export function checkPosterLuminance(src: string): Promise<boolean> {
  if (!src) return Promise.resolve(false);
  if (luminanceCache.has(src)) {
    return Promise.resolve(luminanceCache.get(src)!);
  }

  return new Promise((resolve) => {
    const analyzeImage = (imageObj: HTMLImageElement) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(false);
          return;
        }

        // Sample top 30% of image where badges and ratings are placed
        ctx.drawImage(imageObj, 0, 0, imageObj.naturalWidth, Math.max(1, imageObj.naturalHeight * 0.3), 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let totalLum = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          // Standard ITU-R BT.709 perceived luminance
          const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          totalLum += lum;
          count++;
        }

        const avgLum = count > 0 ? totalLum / count : 0;
        // Average luminance threshold: > 135 indicates a bright/light cover
        const isLight = avgLum > 135;
        luminanceCache.set(src, isLight);
        resolve(isLight);
      } catch {
        resolve(false);
      }
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => analyzeImage(img);

    img.onerror = () => {
      // If direct cross-origin fails, try via local stremio proxy which forwards CORS headers
      if (!src.startsWith('/api/') && !src.startsWith('data:')) {
        const proxyImg = new Image();
        proxyImg.crossOrigin = 'anonymous';
        proxyImg.onload = () => analyzeImage(proxyImg);
        proxyImg.onerror = () => {
          luminanceCache.set(src, false);
          resolve(false);
        };
        proxyImg.src = `/api/stremio-proxy?url=${encodeURIComponent(src)}`;
      } else {
        luminanceCache.set(src, false);
        resolve(false);
      }
    };

    img.src = src;
  });
}

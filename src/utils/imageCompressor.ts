// Compress uploaded logo images into lightweight web-friendly data URLs
// to prevent browser localStorage quota exceeded errors and keep them permanently saved

export const CARGAS_CUSTOM_LOGO_KEY = 'cargas_custom_logo_permanent';
export const CARGAS_CUSTOM_LOGO_BACKUP_KEY = 'cargas_custom_logo';

export function getStoredCustomLogo(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(CARGAS_CUSTOM_LOGO_KEY) || 
           localStorage.getItem(CARGAS_CUSTOM_LOGO_BACKUP_KEY) || 
           '';
  } catch {
    return '';
  }
}

export function saveStoredCustomLogo(logoDataUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (logoDataUrl) {
      localStorage.setItem(CARGAS_CUSTOM_LOGO_KEY, logoDataUrl);
      localStorage.setItem(CARGAS_CUSTOM_LOGO_BACKUP_KEY, logoDataUrl);
    } else {
      localStorage.removeItem(CARGAS_CUSTOM_LOGO_KEY);
      localStorage.removeItem(CARGAS_CUSTOM_LOGO_BACKUP_KEY);
    }
  } catch (err) {
    console.warn('Error saving custom logo to localStorage:', err);
  }
}

export function compressLogoImage(
  input: File | string, 
  maxDimension: number = 200, 
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImageSource = (src: string, isFilePng: boolean) => {
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try PNG first if source had alpha
        let format = isFilePng ? 'image/png' : 'image/jpeg';
        let compressed = canvas.toDataURL(format, quality);

        // If PNG is unexpectedly large (> 35KB), fall back to WEBP or JPEG for safety
        if (compressed.length > 35000) {
          try {
            const webp = canvas.toDataURL('image/webp', quality);
            if (webp && webp.startsWith('data:image/webp')) {
              compressed = webp;
            } else {
              compressed = canvas.toDataURL('image/jpeg', quality);
            }
          } catch {}
        }

        resolve(compressed);
      };
      img.src = src;
    };

    if (typeof input === 'string') {
      const isPng = input.startsWith('data:image/png');
      processImageSource(input, isPng);
    } else {
      const isPng = input.type === 'image/png' || input.name.toLowerCase().endsWith('.png');
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) return resolve('');
        processImageSource(result, isPng);
      };
      reader.readAsDataURL(input);
    }
  });
}

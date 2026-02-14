// Photo compression and EXIF data extraction utilities

export interface PhotoMetadata {
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  deviceModel?: string;
  orientation?: number;
}

export async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export async function extractEXIF(file: File): Promise<PhotoMetadata> {
  const metadata: PhotoMetadata = {};
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    
    metadata.timestamp = new Date().toISOString();
    
    if (navigator.geolocation) {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      
      metadata.latitude = position.coords.latitude;
      metadata.longitude = position.coords.longitude;
    }
  } catch (error) {
    console.warn('EXIF extraction failed:', error);
  }
  
  return metadata;
}

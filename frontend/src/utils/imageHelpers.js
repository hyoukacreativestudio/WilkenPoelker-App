import { Platform } from 'react-native';

/**
 * Image preview helpers for web.
 *
 * expo-image-picker on web returns blob: URIs that get revoked almost
 * immediately, so <Image source={{uri: blobUri}} /> renders blank.
 *
 * The picker *does* provide asset.file – the native File object from the
 * <input type="file"> element. We create a controlled ObjectURL from that
 * file which stays valid until we explicitly revoke it.
 */

/**
 * Create a stable preview URI for a picked asset.
 * On native the original uri is fine; on web we create an ObjectURL.
 */
export function getPreviewUri(asset) {
  if (Platform.OS !== 'web') return asset.uri;
  if (asset.file) {
    try {
      return URL.createObjectURL(asset.file);
    } catch {
      return asset.uri; // fallback
    }
  }
  // For data: URIs (from ImageManipulator or edited images), keep as-is — they are stable
  if (asset.uri && asset.uri.startsWith('data:')) {
    return asset.uri;
  }
  return asset.uri;
}

/**
 * Asynchronously create a stable blob URL from an asset's URI on web.
 * Use this after image manipulation to ensure the preview stays valid.
 *
 * expo-image-picker on web returns blob: URIs that are revoked almost
 * immediately. We convert them to stable ObjectURLs. Priority:
 * 1. Use asset.file / asset._webFile (native File object) if available
 * 2. Fetch the blob URI and re-create an ObjectURL
 * 3. data: URIs are already stable
 */
export async function createStablePreviewUri(asset) {
  if (Platform.OS !== 'web') return asset.uri;

  // data: URIs are already stable
  if (asset.uri && asset.uri.startsWith('data:')) return asset.uri;

  // Use the File object if available (most reliable)
  const fileObj = asset.file || asset._webFile;
  if (fileObj && (fileObj instanceof Blob || fileObj instanceof File)) {
    try {
      return URL.createObjectURL(fileObj);
    } catch {
      // fall through
    }
  }

  // Try to fetch the blob URI and recreate
  if (asset.uri) {
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      // Store the blob on the asset so we can reuse it for uploads
      if (!asset._webFile) {
        try {
          asset._webFile = new File([blob], asset.fileName || 'image.jpg', {
            type: blob.type || 'image/jpeg',
          });
        } catch {
          asset._webFile = blob;
        }
      }
      return URL.createObjectURL(blob);
    } catch {
      // blob was already revoked or network error
    }
  }

  return asset.uri;
}

/**
 * Revoke a previously created preview URI (web only, no-op on native).
 */
export function revokePreviewUri(uri) {
  if (Platform.OS !== 'web' || !uri) return;
  try {
    if (uri.startsWith('blob:')) {
      URL.revokeObjectURL(uri);
    }
  } catch {
    // ignore
  }
}

/**
 * Return the best URI to display in an <Image> component.
 * Prefers _previewUri (our controlled ObjectURL) over the picker's uri.
 */
export function getDisplayUri(image) {
  if (!image) return undefined;
  return image._previewUri || image.uri;
}

/**
 * Process an array of expo-image-picker assets and attach _previewUri.
 * Returns new array of asset objects with _previewUri added.
 */
export function processPickerAssets(assets) {
  if (!assets || assets.length === 0) return [];
  return assets.map((asset) => ({
    ...asset,
    _previewUri: getPreviewUri(asset),
  }));
}

/**
 * Revoke all preview URIs in an array of images (cleanup on unmount).
 */
export function revokeAllPreviewUris(images) {
  if (!images || images.length === 0) return;
  images.forEach((img) => {
    if (img._previewUri) {
      revokePreviewUri(img._previewUri);
    }
  });
}

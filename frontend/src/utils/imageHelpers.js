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
 */
export async function createStablePreviewUri(asset) {
  if (Platform.OS !== 'web') return asset.uri;
  if (asset.file) {
    try {
      return URL.createObjectURL(asset.file);
    } catch {
      return asset.uri;
    }
  }
  if (asset.uri) {
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return asset.uri;
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

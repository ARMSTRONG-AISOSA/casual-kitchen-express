import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/**
 * The customer's profile photo is taken or chosen, cropped square, and compressed on the phone
 * before upload (architecture.md 8.1, CUS-16): at most 512 px and 80 KB, saved as WebP, which also
 * drops the location and camera data. The same rules as staff photos in the Business app.
 */
const EDGE = 512;
const MAX_BYTES = 80_000;

export type Compressed = { uri: string; bytes: number; originalBytes: number };

const sizeOf = async (uri: string) => (await (await fetch(uri)).blob()).size;

export async function pickProfilePhoto(from: "camera" | "library"): Promise<Compressed | null> {
  const perm =
    from === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted)
    throw new Error(
      from === "camera"
        ? "Allow the camera in your phone’s settings to take a photo."
        : "Allow photos in your phone’s settings to choose one.",
    );
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true, // the crop step, square
    aspect: [1, 1],
    quality: 1,
    exif: false,
  };
  const res =
    from === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  const originalBytes = asset.fileSize ?? (await sizeOf(asset.uri));
  const longest = Math.max(asset.width, asset.height);
  const resize =
    longest > EDGE ? (asset.width >= asset.height ? { width: EDGE } : { height: EDGE }) : null;
  // Quality about 78 first (8.1), lower step by step until it fits the size target.
  for (let q = 0.78; q >= 0.38; q -= 0.08) {
    const out = await manipulateAsync(asset.uri, resize ? [{ resize }] : [], {
      compress: q,
      format: SaveFormat.WEBP,
    });
    const bytes = await sizeOf(out.uri);
    if (bytes <= MAX_BYTES) return { uri: out.uri, bytes, originalBytes };
  }
  throw new Error("This photo couldn’t be made small enough. Try another one.");
}

/** “3.8 MB made 74 KB”, shown before the photo is saved. */
export function sizeNote(c: Compressed) {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} KB`;
  const saved = c.originalBytes > c.bytes ? Math.round((1 - c.bytes / c.originalBytes) * 100) : 0;
  return `${fmt(c.originalBytes)} shrunk to ${fmt(c.bytes)}${saved ? ` (${saved}% smaller)` : ""}`;
}

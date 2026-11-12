import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/**
 * The one way every photo in the Business app is taken, cropped, and compressed before upload
 * (architecture.md 8.1): menu and soup photos are cropped 4:3 and capped at 1200 px and 250 KB;
 * staff photos are cropped square and capped at 512 px and 80 KB. Saved as WebP, which also drops
 * the location and camera data.
 */
export type Purpose = "menu" | "profile";
const RULES: Record<Purpose, { edge: number; maxBytes: number; aspect: [number, number] }> = {
  menu: { edge: 1200, maxBytes: 250_000, aspect: [4, 3] },
  profile: { edge: 512, maxBytes: 80_000, aspect: [1, 1] },
};

export type Compressed = {
  uri: string;
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
};

const sizeOf = async (uri: string) => (await (await fetch(uri)).blob()).size;

export async function pickPhoto(from: "camera" | "library", purpose: Purpose) {
  const rule = RULES[purpose];
  const perm =
    from === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted)
    throw new Error(
      from === "camera"
        ? "Allow the camera in the phone’s settings to take a photo."
        : "Allow photos in the phone’s settings to choose one.",
    );
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true, // the crop step, at the right shape
    aspect: rule.aspect,
    quality: 1,
    exif: false,
  };
  const res =
    from === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets[0]) return null;
  return compress(res.assets[0], purpose);
}

async function compress(asset: ImagePicker.ImagePickerAsset, purpose: Purpose) {
  const rule = RULES[purpose];
  const originalBytes = asset.fileSize ?? (await sizeOf(asset.uri));
  const longest = Math.max(asset.width, asset.height);
  const resize =
    longest > rule.edge
      ? asset.width >= asset.height
        ? { width: rule.edge }
        : { height: rule.edge }
      : null;
  // Quality about 78 first (8.1), lower step by step until it fits the size target.
  for (let q = 0.78; q >= 0.38; q -= 0.08) {
    const out = await manipulateAsync(asset.uri, resize ? [{ resize }] : [], {
      compress: q,
      format: SaveFormat.WEBP,
    });
    const bytes = await sizeOf(out.uri);
    if (bytes <= rule.maxBytes)
      return { uri: out.uri, width: out.width, height: out.height, bytes, originalBytes };
  }
  throw new Error("This photo couldn’t be made small enough. Try another one.");
}

/** “4.2 MB reduced to 180 KB” (design.md 7.3). */
export function sizeNote(c: Compressed) {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} KB`;
  return `${fmt(c.originalBytes)} reduced to ${fmt(c.bytes)}`;
}

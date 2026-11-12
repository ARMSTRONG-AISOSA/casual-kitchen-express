// Sets which phone processor types (ABIs) the Android apps are built for.
// Decided by the owner on 11 November 2026 (architecture.md 17.2):
//   - Everyday and test builds: arm64-v8a only.
//   - Release builds: arm64-v8a and armeabi-v7a, by setting
//     CKE_ANDROID_ARCHITECTURES="arm64-v8a,armeabi-v7a" before the build.
//   - x86 and x86_64 are never built. This plugin refuses them.
const { withGradleProperties } = require("expo/config-plugins");

const ALLOWED = new Set(["arm64-v8a", "armeabi-v7a"]);
const DEFAULT = "arm64-v8a";

function resolveArchitectures() {
  const raw = process.env.CKE_ANDROID_ARCHITECTURES || DEFAULT;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const refused = list.filter((abi) => !ALLOWED.has(abi));
  if (refused.length) {
    throw new Error(
      `CKE builds only for arm64-v8a and armeabi-v7a. Refused: ${refused.join(", ")}.`,
    );
  }
  return list.join(",");
}

module.exports = function withAndroidArchitectures(config) {
  return withGradleProperties(config, (cfg) => {
    const value = resolveArchitectures();
    cfg.modResults = cfg.modResults.filter(
      (item) => !(item.type === "property" && item.key === "reactNativeArchitectures"),
    );
    cfg.modResults.push({ type: "property", key: "reactNativeArchitectures", value });
    return cfg;
  });
};

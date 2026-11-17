// Signs release builds with the app's own key (architecture.md 17.2: one signing key per app, the
// same key for every update). The keys and their passwords never enter the repository: they live
// in ~/cke-keys on the build computer (backed up by the owner), and Gradle reads their details from
// properties in ~/.gradle/gradle.properties, one set per app:
//   CKE_<APP>_STORE_FILE, CKE_<APP>_STORE_PASSWORD, CKE_<APP>_KEY_ALIAS, CKE_<APP>_KEY_PASSWORD
// where <APP> is CUSTOMER, RIDER, or BUSINESS. Debug builds are unchanged. A release build without
// its key stops with a message instead of quietly using the debug key.
const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withReleaseSigning(config, { app }) {
  const P = `CKE_${app.toUpperCase()}`;
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes(`${P}_STORE_FILE`)) return cfg;
    g = g.replace(
      /signingConfigs \{\n(\s*)debug \{/,
      (m, indent) => `signingConfigs {
${indent}release {
${indent}    if (findProperty('${P}_STORE_FILE')) {
${indent}        storeFile file(findProperty('${P}_STORE_FILE'))
${indent}        storePassword findProperty('${P}_STORE_PASSWORD')
${indent}        keyAlias findProperty('${P}_KEY_ALIAS')
${indent}        keyPassword findProperty('${P}_KEY_PASSWORD')
${indent}    }
${indent}}
${indent}debug {`,
    );
    g = g.replace(
      /(release \{\n\s*\/\/ Caution![^\n]*\n\s*\/\/ see[^\n]*\n\s*)signingConfig signingConfigs\.debug/,
      `$1signingConfig findProperty('${P}_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
    );
    // Only a release build needs the key, so the check waits until Gradle knows what it's building.
    g += `
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name.contains("Release") } && !findProperty('${P}_STORE_FILE')) {
        throw new GradleException("Release signing key missing: set ${P}_STORE_FILE and its passwords in ~/.gradle/gradle.properties (tools/expo-plugins/with-release-signing.js).")
    }
}
`;
    if (!g.includes("signingConfigs.release :"))
      throw new Error("with-release-signing: the release block in build.gradle has changed shape.");
    cfg.modResults.contents = g;
    return cfg;
  });
};

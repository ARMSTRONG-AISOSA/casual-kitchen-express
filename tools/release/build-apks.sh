#!/bin/bash
# Usage: bash tools/release/build-apks.sh   (APPS="rider" to build one; keys in ~/cke-keys, see
# tools/expo-plugins/with-release-signing.js). The APKs and SHA256SUMS.txt go to ~/cke-release/<version>.
# Builds the three signed release APKs (arm64-v8a and armeabi-v7a) against the online API.
# Resumable: an APK already built from the current commit is kept, so a rerun after a power cut
# only builds what's missing. Each app's android folder is regenerated from scratch (--clean).
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
VERSION=${VERSION:-$(node -p "require('$ROOT/apps/customer/app.json').expo.version")}
OUT=$HOME/cke-release/$VERSION
# The last commit that changed the apps, so a tooling-only commit doesn't force a rebuild.
COMMIT=$(git -C $ROOT log -1 --format=%h -- apps packages tools/expo-plugins)
export CKE_ANDROID_ARCHITECTURES="arm64-v8a,armeabi-v7a"
export EXPO_PUBLIC_API_URL="https://cke-api.casualkitchenexpress.workers.dev"
export NODE_OPTIONS="--network-family-autoselection-attempt-timeout=2000"
mkdir -p $OUT
for app in ${APPS:-customer rider business}; do
  if [ -f $OUT/cke-$app-$VERSION.apk ] && [ "$(cat $OUT/cke-$app.commit 2>/dev/null)" = "$COMMIT" ]; then
    echo "=== $app: already built from $COMMIT, kept"; continue
  fi
  rm -f $OUT/cke-$app-$VERSION.apk $OUT/cke-$app.commit
  echo "=== $app: clean prebuild $(date +%T)"
  cd $ROOT/apps/$app
  npx expo prebuild --platform android --clean --no-install > /tmp/cke-prebuild-$app.log 2>&1 || { echo "PREBUILD FAILED $app"; tail -20 /tmp/cke-prebuild-$app.log; exit 1; }
  grep -q "signingConfigs.release :" android/app/build.gradle || { echo "signing plugin not applied for $app"; exit 1; }
  echo "=== $app: gradle $(date +%T)"
  cd android
  ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a > /tmp/cke-gradle-$app.log 2>&1 || { echo "BUILD FAILED $app"; grep -E "error|FAILURE|What went wrong" -A3 /tmp/cke-gradle-$app.log | tail -30; exit 1; }
  cp app/build/outputs/apk/release/app-release.apk $OUT/cke-$app-$VERSION.apk
  echo $COMMIT > $OUT/cke-$app.commit
  echo "=== $app: done $(date +%T) $(du -h $OUT/cke-$app-$VERSION.apk | cut -f1)"
done
cd $OUT && sha256sum cke-*-$VERSION.apk > SHA256SUMS.txt && cat SHA256SUMS.txt
echo "ALL DONE from $COMMIT"

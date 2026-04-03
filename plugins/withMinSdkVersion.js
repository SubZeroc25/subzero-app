/**
 * Custom Expo config plugin to ensure minSdkVersion is correctly set to 24
 * across ALL Android build configurations, including CMake/NDK builds.
 *
 * This fixes: "User has minSdkVersion 22 but library was built for 24 [//ReactAndroid/hermestooling]"
 *
 * The fix is applied at EVERY level where minSdkVersion can be set:
 * 1. gradle.properties: android.minSdkVersion=24
 * 2. settings.gradle: Force version catalog to use minSdk=24 (overrides any -P flag)
 * 3. root build.gradle: rootProject.ext.set("minSdkVersion", 24)
 * 4. app/build.gradle: Clean stale .cxx NDK cache directories
 */
const {
  withGradleProperties,
  withProjectBuildGradle,
  withAppBuildGradle,
  withSettingsGradle,
} = require("expo/config-plugins");

const MIN_SDK_VERSION = 24;

/**
 * Ensures gradle.properties has the correct minSdkVersion.
 */
function withMinSdkGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    // Remove any existing android.minSdkVersion entries
    const filtered = props.filter(
      (p) => !(p.type === "property" && p.key === "android.minSdkVersion")
    );
    // Add the correct value
    filtered.push({
      type: "property",
      key: "android.minSdkVersion",
      value: String(MIN_SDK_VERSION),
    });
    config.modResults = filtered;
    return config;
  });
}

/**
 * Modifies settings.gradle to force the Expo version catalog to use minSdk=24.
 *
 * The version catalog is created by useExpoVersionCatalog() in settings.gradle.
 * It reads gradle properties (including command-line -P flags) to override values.
 * If the build environment passes -Pandroid.minSdkVersion=22, it would override
 * our gradle.properties value. By replacing useExpoVersionCatalog() with a version
 * that explicitly sets minSdk=24, we ensure the correct value is always used.
 */
function withMinSdkSettingsGradle(config) {
  return withSettingsGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Replace the plain useExpoVersionCatalog() call with one that forces minSdk
    // The override closure runs AFTER gradle properties are applied, so it wins
    if (contents.includes("expoAutolinking.useExpoVersionCatalog()")) {
      contents = contents.replace(
        "expoAutolinking.useExpoVersionCatalog()",
        `expoAutolinking.useExpoVersionCatalog { catalog ->
    catalog.version("minSdk", "${MIN_SDK_VERSION}")
}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

/**
 * Modifies the root build.gradle to explicitly set rootProject.ext.minSdkVersion = 24
 * at the very top, before any plugin evaluation. This ensures all subprojects
 * using safeExtGet("minSdkVersion", ...) pick up the correct value.
 */
function withMinSdkRootBuildGradle(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const forceMinSdkBlock = `// Force minSdkVersion to ${MIN_SDK_VERSION} (fixes hermestooling CXX1214 error)
rootProject.ext.set("minSdkVersion", ${MIN_SDK_VERSION})
`;

    if (!contents.includes("Force minSdkVersion to")) {
      contents = forceMinSdkBlock + contents;
    }

    config.modResults.contents = contents;
    return config;
  });
}

/**
 * Adds a pre-build task to app/build.gradle that cleans stale .cxx directories
 * from native module dependencies, preventing cached minSdkVersion mismatches.
 */
function withCleanStaleCxxCache(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const cleanCxxBlock = `
// Clean stale .cxx directories that may cache incorrect minSdkVersion
task cleanStaleCxxCache {
    doLast {
        def modulesDir = new File(rootDir, "../node_modules")
        def cxxDirs = []
        modulesDir.eachDirRecurse { dir ->
            if (dir.name == ".cxx" && dir.parentFile.name == "android") {
                cxxDirs.add(dir)
            }
        }
        cxxDirs.each { dir ->
            println "Cleaning stale .cxx cache: \${dir.absolutePath}"
            delete dir
        }
    }
}
preBuild.dependsOn cleanStaleCxxCache
`;

    if (!contents.includes("cleanStaleCxxCache")) {
      contents += cleanCxxBlock;
    }

    config.modResults.contents = contents;
    return config;
  });
}

/**
 * Main plugin that combines all minSdkVersion fixes.
 * Applied at every level to ensure no override can sneak in.
 */
function withMinSdkVersion(config) {
  config = withMinSdkGradleProperties(config);
  config = withMinSdkSettingsGradle(config);
  config = withMinSdkRootBuildGradle(config);
  config = withCleanStaleCxxCache(config);
  return config;
}

module.exports = withMinSdkVersion;

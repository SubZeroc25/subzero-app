/**
 * Custom Expo config plugin to ensure minSdkVersion is correctly set to 24
 * across all Android build configurations, including CMake/NDK builds.
 *
 * This fixes the known issue where a stale NDK cache causes the build to
 * use minSdkVersion 22 instead of the configured 24, resulting in:
 * "User has minSdkVersion 22 but library was built for 24 [//ReactAndroid/hermestooling]"
 *
 * The plugin:
 * 1. Modifies android/build.gradle to explicitly set rootProject.ext.minSdkVersion = 24
 * 2. Ensures gradle.properties has the correct android.minSdkVersion=24
 * 3. Adds a clean task for stale .cxx directories
 */
const {
  withGradleProperties,
  withProjectBuildGradle,
  withAppBuildGradle,
} = require("expo/config-plugins");

const MIN_SDK_VERSION = 24;

/**
 * Ensures gradle.properties has the correct minSdkVersion
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
 * Modifies the root build.gradle to explicitly set minSdkVersion in ext block
 * This ensures that even if the version catalog or gradle.properties are not
 * correctly read, the minSdkVersion is still set correctly.
 */
function withMinSdkRootBuildGradle(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Add an afterEvaluate block that forces minSdkVersion on rootProject.ext
    const forceMinSdkBlock = `
// Force minSdkVersion to ${MIN_SDK_VERSION} to prevent stale NDK cache issues
// This fixes: "User has minSdkVersion 22 but library was built for 24 [//ReactAndroid/hermestooling]"
allprojects {
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            project.android {
                if (it.hasProperty('defaultConfig')) {
                    it.defaultConfig {
                        if (minSdkVersion.apiLevel < ${MIN_SDK_VERSION}) {
                            minSdkVersion ${MIN_SDK_VERSION}
                        }
                    }
                }
            }
        }
    }
}
`;

    // Only add if not already present
    if (!contents.includes("Force minSdkVersion to")) {
      contents += forceMinSdkBlock;
    }

    config.modResults.contents = contents;
    return config;
  });
}

/**
 * Modifies app/build.gradle to add a pre-build task that cleans stale .cxx directories
 * from native module dependencies, preventing cached minSdkVersion mismatches.
 */
function withCleanStaleCxxCache(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const cleanCxxBlock = `
// Clean stale .cxx directories that may cache incorrect minSdkVersion
// This prevents the CXX1214 error with hermestooling
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

    // Only add if not already present
    if (!contents.includes("cleanStaleCxxCache")) {
      contents += cleanCxxBlock;
    }

    config.modResults.contents = contents;
    return config;
  });
}

/**
 * Main plugin that combines all minSdkVersion fixes
 */
function withMinSdkVersion(config) {
  config = withMinSdkGradleProperties(config);
  config = withMinSdkRootBuildGradle(config);
  config = withCleanStaleCxxCache(config);
  return config;
}

module.exports = withMinSdkVersion;

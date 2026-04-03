import { describe, it, expect } from "vitest";

/**
 * Test the withMinSdkVersion config plugin transformations.
 *
 * We test the transformation logic directly since the plugin uses
 * expo/config-plugins which are difficult to mock in vitest.
 */

// Helper functions that replicate the plugin's transformation logic
// (extracted from plugins/withMinSdkVersion.js)

function transformGradleProperties(modResults: any[]) {
  const filtered = modResults.filter(
    (p: any) => !(p.type === "property" && p.key === "android.minSdkVersion")
  );
  filtered.push({
    type: "property",
    key: "android.minSdkVersion",
    value: "24",
  });
  return filtered;
}

function transformProjectBuildGradle(contents: string) {
  const forceMinSdkBlock = `
// Force minSdkVersion to 24 to prevent stale NDK cache issues
// This fixes: "User has minSdkVersion 22 but library was built for 24 [//ReactAndroid/hermestooling]"
rootProject.ext.set("minSdkVersion", 24)
`;
  if (!contents.includes("Force minSdkVersion to")) {
    // Prepend to the top of the file
    contents = forceMinSdkBlock + contents;
  }
  return contents;
}

function transformAppBuildGradle(contents: string) {
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
  if (!contents.includes("cleanStaleCxxCache")) {
    contents += cleanCxxBlock;
  }
  return contents;
}

describe("withMinSdkVersion config plugin", () => {
  describe("gradle.properties transformation", () => {
    it("should replace minSdkVersion=22 with 24", () => {
      const input = [
        { type: "property", key: "android.minSdkVersion", value: "22" },
        { type: "property", key: "android.compileSdkVersion", value: "36" },
      ];
      const result = transformGradleProperties(input);

      const minSdkProps = result.filter(
        (p: any) => p.key === "android.minSdkVersion"
      );
      expect(minSdkProps).toHaveLength(1);
      expect(minSdkProps[0].value).toBe("24");
    });

    it("should preserve other properties", () => {
      const input = [
        { type: "property", key: "android.minSdkVersion", value: "22" },
        { type: "property", key: "android.compileSdkVersion", value: "36" },
        { type: "property", key: "android.targetSdkVersion", value: "36" },
      ];
      const result = transformGradleProperties(input);

      expect(
        result.filter((p: any) => p.key === "android.compileSdkVersion")
      ).toHaveLength(1);
      expect(
        result.filter((p: any) => p.key === "android.targetSdkVersion")
      ).toHaveLength(1);
    });

    it("should add minSdkVersion when not present", () => {
      const input = [
        { type: "property", key: "android.compileSdkVersion", value: "36" },
      ];
      const result = transformGradleProperties(input);

      const minSdkProps = result.filter(
        (p: any) => p.key === "android.minSdkVersion"
      );
      expect(minSdkProps).toHaveLength(1);
      expect(minSdkProps[0].value).toBe("24");
    });
  });

  describe("root build.gradle transformation", () => {
    it("should prepend rootProject.ext.set for minSdkVersion", () => {
      const input = `apply plugin: "expo-root-project"`;
      const result = transformProjectBuildGradle(input);

      expect(result).toContain("Force minSdkVersion to 24");
      expect(result).toContain('rootProject.ext.set("minSdkVersion", 24)');
      // The force block should be at the beginning
      expect(result.indexOf("Force minSdkVersion")).toBeLessThan(
        result.indexOf("expo-root-project")
      );
    });

    it("should NOT use afterEvaluate (causes crash in EAS builds)", () => {
      const input = `apply plugin: "expo-root-project"`;
      const result = transformProjectBuildGradle(input);

      expect(result).not.toContain("afterEvaluate");
    });

    it("should not duplicate force block", () => {
      const input = `// Force minSdkVersion to 24 to prevent stale NDK cache issues
rootProject.ext.set("minSdkVersion", 24)
apply plugin: "expo-root-project"`;
      const result = transformProjectBuildGradle(input);

      const matches = result.match(/Force minSdkVersion to/g);
      expect(matches).toHaveLength(1);
    });
  });

  describe("app build.gradle transformation", () => {
    it("should add cleanStaleCxxCache task", () => {
      const input = `android { defaultConfig { } }`;
      const result = transformAppBuildGradle(input);

      expect(result).toContain("cleanStaleCxxCache");
      expect(result).toContain("preBuild.dependsOn cleanStaleCxxCache");
      expect(result).toContain('dir.name == ".cxx"');
    });

    it("should not duplicate cleanStaleCxxCache", () => {
      const input = `android { }
task cleanStaleCxxCache { }
preBuild.dependsOn cleanStaleCxxCache`;
      const result = transformAppBuildGradle(input);

      const matches = result.match(/cleanStaleCxxCache/g);
      expect(matches!.length).toBe(2);
    });
  });

  describe("plugin file structure", () => {
    it("should export correctly and NOT contain afterEvaluate", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const pluginPath = path.resolve(
        __dirname,
        "../plugins/withMinSdkVersion.js"
      );
      const pluginContent = fs.readFileSync(pluginPath, "utf-8");

      expect(pluginContent).toContain("module.exports = withMinSdkVersion");
      expect(pluginContent).toContain("withGradleProperties");
      expect(pluginContent).toContain("withProjectBuildGradle");
      expect(pluginContent).toContain("withAppBuildGradle");
      expect(pluginContent).toContain("MIN_SDK_VERSION = 24");
      expect(pluginContent).toContain('rootProject.ext.set("minSdkVersion"');
      // CRITICAL: must NOT contain afterEvaluate
      expect(pluginContent).not.toContain("afterEvaluate");
    });
  });
});

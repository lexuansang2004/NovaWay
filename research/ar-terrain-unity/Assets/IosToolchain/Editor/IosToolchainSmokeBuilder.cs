using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace NovaWay.ArTerrain.IosToolchain.Editor
{
    public static class IosToolchainSmokeBuilder
    {
        public const string SmokeScenePath = "Assets/Scenes/ToolchainSmoke.unity";
        public const string BundleIdentifier = "com.novaway.arterrainprototype";

        // Windows may only export the Xcode project; building, signing and installing still need Xcode on macOS.
        public static bool IsSupportedEditorPlatform(RuntimePlatform platform)
        {
            return platform == RuntimePlatform.OSXEditor || platform == RuntimePlatform.WindowsEditor;
        }

        [MenuItem("NovaWay/Build iOS Toolchain Smoke")]
        public static void Build()
        {
            if (!IsSupportedEditorPlatform(Application.platform))
            {
                throw new PlatformNotSupportedException(
                    "The iOS toolchain smoke build must run from Unity Editor on macOS or Windows.");
            }

            if (!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.iOS, BuildTarget.iOS))
            {
                throw new InvalidOperationException(
                    "Unity iOS Build Support is not installed for this Editor version.");
            }

            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(SmokeScenePath) == null)
            {
                throw new FileNotFoundException($"Missing smoke scene: {SmokeScenePath}");
            }

            var activeIdentifier = PlayerSettings.GetApplicationIdentifier(NamedBuildTarget.iOS);
            if (!string.Equals(activeIdentifier, BundleIdentifier, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"Unexpected iOS bundle identifier '{activeIdentifier}'. Expected '{BundleIdentifier}'.");
            }

            if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.iOS, BuildTarget.iOS))
            {
                throw new InvalidOperationException("Unity could not switch the active build target to iOS.");
            }

            var runId = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
            var projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            var outputPath = Path.Combine(projectRoot, "Build", $"iOS-ToolchainSmoke-{runId}");

            var options = new BuildPlayerOptions
            {
                scenes = new[] { SmokeScenePath },
                locationPathName = outputPath,
                target = BuildTarget.iOS,
                options = BuildOptions.Development
            };

            var report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"iOS toolchain smoke build failed: {report.summary.result}. " +
                    $"Errors={report.summary.totalErrors}, warnings={report.summary.totalWarnings}.");
            }

            Debug.Log(
                $"[iOS TOOLCHAIN SMOKE] Xcode project created at '{outputPath}'. " +
                $"Size={report.summary.totalSize} bytes, duration={report.summary.totalTime}.");
        }

        [MenuItem("NovaWay/Build iOS Toolchain Smoke", true)]
        private static bool ValidateBuildMenu()
        {
            return IsSupportedEditorPlatform(Application.platform);
        }
    }
}

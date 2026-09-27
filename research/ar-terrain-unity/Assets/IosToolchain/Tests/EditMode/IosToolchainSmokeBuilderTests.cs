using NovaWay.ArTerrain.IosToolchain.Editor;
using NUnit.Framework;
using UnityEditor;
using UnityEditor.Build;
using UnityEngine;

namespace NovaWay.ArTerrain.IosToolchain.Tests
{
    public class IosToolchainSmokeBuilderTests
    {
        [TestCase(RuntimePlatform.WindowsEditor, true)]
        [TestCase(RuntimePlatform.OSXEditor, true)]
        [TestCase(RuntimePlatform.LinuxEditor, false)]
        [TestCase(RuntimePlatform.WindowsPlayer, false)]
        [TestCase(RuntimePlatform.IPhonePlayer, false)]
        public void IsSupportedEditorPlatform_AllowsOnlyWindowsAndMacEditors(RuntimePlatform platform, bool expected)
        {
            Assert.AreEqual(expected, IosToolchainSmokeBuilder.IsSupportedEditorPlatform(platform));
        }

        [Test]
        public void SmokeScene_ExistsAsAnAsset()
        {
            Assert.IsNotNull(AssetDatabase.LoadAssetAtPath<SceneAsset>(IosToolchainSmokeBuilder.SmokeScenePath));
        }

        [Test]
        public void ProjectBundleIdentifier_MatchesBuilderExpectation()
        {
            Assert.AreEqual(
                IosToolchainSmokeBuilder.BundleIdentifier,
                PlayerSettings.GetApplicationIdentifier(NamedBuildTarget.iOS));
        }
    }
}

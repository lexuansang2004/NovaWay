using System.Linq;
using NovaWay.ArTerrain.DriveMock;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace NovaWay.ArTerrain.DriveMock.Editor
{
    public static class DriveVisualMockSceneBuilder
    {
        public const string ScenePath = "Assets/Scenes/DriveVisualMock.unity";

        [MenuItem("NovaWay/Build Drive Visual Mock Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var root = new GameObject("DriveVisualMock — SYNTHETIC FIXTURE");
            root.AddComponent<DriveVisualMockController>();

            if (!EditorSceneManager.SaveScene(scene, ScenePath))
            {
                throw new System.InvalidOperationException($"Could not save {ScenePath}.");
            }

            var existingScenes = EditorBuildSettings.scenes
                .Where(item => item.path != ScenePath)
                .ToList();
            existingScenes.Insert(0, new EditorBuildSettingsScene(ScenePath, true));
            EditorBuildSettings.scenes = existingScenes.ToArray();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log($"[SYNTHETIC/FIXTURE] Built Drive Visual Mock scene at {ScenePath}.");
        }
    }
}

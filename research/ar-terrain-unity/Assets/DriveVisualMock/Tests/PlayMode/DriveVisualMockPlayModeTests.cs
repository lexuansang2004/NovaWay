using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace NovaWay.ArTerrain.DriveMock.Tests
{
    public sealed class DriveVisualMockPlayModeTests
    {
        [UnityTest]
        public IEnumerator SceneStartsMovesWarnsAndSwitchesViewWithoutErrors()
        {
            var loadOperation = SceneManager.LoadSceneAsync("DriveVisualMock", LoadSceneMode.Single);
            Assert.That(loadOperation, Is.Not.Null);
            yield return loadOperation;
            yield return null;

            var controller = Object.FindFirstObjectByType<DriveVisualMockController>();
            Assert.That(controller, Is.Not.Null);
            Assert.That(controller.HasStartupError, Is.False);
            Assert.That(controller.IsThirdPerson, Is.True);

            var initialDistance = controller.VehicleRouteDistanceM;
            yield return new WaitForSeconds(0.25f);

            Assert.That(controller.VehicleRouteDistanceM, Is.GreaterThan(initialDistance));
            Assert.That(controller.HasActiveWarning, Is.True);

            controller.ToggleView();
            Assert.That(controller.IsThirdPerson, Is.False);
            Assert.That(controller.HasActiveWarning, Is.True);

            controller.TogglePause();
            Assert.That(controller.IsPaused, Is.True);
            var pausedDistance = controller.VehicleRouteDistanceM;
            yield return new WaitForSeconds(0.15f);
            Assert.That(controller.VehicleRouteDistanceM, Is.EqualTo(pausedDistance).Within(0.001f));
        }
    }
}

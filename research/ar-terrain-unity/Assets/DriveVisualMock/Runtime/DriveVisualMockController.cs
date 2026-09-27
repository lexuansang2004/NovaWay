using System;
using UnityEngine;

namespace NovaWay.ArTerrain.DriveMock
{
    public sealed class DriveVisualMockController : MonoBehaviour
    {
        private const string FixtureResourceName = "terrain_catalog_fixture";
        private const float VehicleSpeedMps = 8f;
        private const float RouteEndPaddingM = 35f;

        private TerrainCatalog catalog;
        private TerrainWarningEngine warningEngine;
        private TerrainWarningEvaluation warning = TerrainWarningEvaluation.None;
        private Transform vehicle;
        private Camera sceneCamera;
        private float vehicleDistanceM;
        private float routeLengthM;
        private bool isThirdPerson = true;
        private bool isPaused;
        private string startupError;

        private GUIStyle titleStyle;
        private GUIStyle bodyStyle;
        private GUIStyle fixtureStyle;
        private GUIStyle warningStyle;
        private GUIStyle buttonStyle;
        private GUIStyle panelStyle;

        public bool IsThirdPerson => isThirdPerson;
        public bool IsPaused => isPaused;
        public bool HasStartupError => startupError != null;
        public bool HasActiveWarning => warning.HasWarning;
        public float VehicleRouteDistanceM => vehicleDistanceM;

        private void Start()
        {
            Application.targetFrameRate = 60;

            try
            {
                var fixture = Resources.Load<TextAsset>(FixtureResourceName);
                if (fixture == null)
                {
                    throw new InvalidOperationException(
                        $"Missing Resources/{FixtureResourceName}.json fixture.");
                }

                catalog = TerrainCatalogParser.Parse(fixture.text);
                warningEngine = new TerrainWarningEngine(catalog);
                routeLengthM = GetRouteLength(catalog);
                BuildWorld();
                UpdateCameraTransform();
            }
            catch (Exception exception)
            {
                startupError = exception.Message;
                Debug.LogError($"[SYNTHETIC/FIXTURE] Drive visual mock failed to start: {exception}");
            }
        }

        private void Update()
        {
            if (startupError != null || vehicle == null || isPaused)
            {
                return;
            }

            vehicleDistanceM += VehicleSpeedMps * Time.deltaTime;
            if (vehicleDistanceM > routeLengthM)
            {
                RestartRoute();
            }

            vehicle.position = new Vector3(0f, 0.65f, vehicleDistanceM);
            warning = warningEngine.Evaluate(vehicleDistanceM, VehicleSpeedMps, Time.time);

            if (warning.ShouldAnnounce)
            {
                Debug.Log(
                    $"[SYNTHETIC/FIXTURE] Terrain warning {warning.Hazard.hazard_id}: " +
                    $"distance={warning.DistanceAheadM:F1}m, lead={warning.LeadTimeSeconds:F1}s, " +
                    $"severity={warning.Hazard.severity}.");
            }
        }

        private void LateUpdate()
        {
            if (sceneCamera != null && vehicle != null)
            {
                UpdateCameraTransform();
            }
        }

        private void OnGUI()
        {
            EnsureStyles();

            const float margin = 16f;
            const float gap = 12f;
            const float headerHeight = 160f;

            var availableWidth = Mathf.Max(320f, Screen.width - margin * 2f);
            var useStackedHeaders = Screen.width < 720f;
            var overviewWidth = useStackedHeaders
                ? availableWidth
                : Mathf.Clamp(availableWidth * 0.55f, 360f, availableWidth - gap - 300f);
            var overviewRect = new Rect(margin, margin, overviewWidth, headerHeight);
            var warningRect = useStackedHeaders
                ? new Rect(margin, overviewRect.yMax + gap, availableWidth, headerHeight)
                : new Rect(overviewRect.xMax + gap, margin, availableWidth - overviewWidth - gap, headerHeight);

            GUI.Box(overviewRect, GUIContent.none, panelStyle);
            GUI.Label(
                new Rect(overviewRect.x + 16f, overviewRect.y + 10f, overviewRect.width - 32f, 34f),
                "NovaWay — Drive Mode Visual Mock",
                titleStyle);
            GUI.Label(
                new Rect(overviewRect.x + 16f, overviewRect.y + 45f, overviewRect.width - 32f, 46f),
                "SYNTHETIC / FIXTURE\nKHÔNG PHẢI LiDAR, AR HAY DỮ LIỆU THỰC ĐỊA",
                fixtureStyle);

            if (startupError != null)
            {
                GUI.Label(
                    new Rect(overviewRect.x + 16f, overviewRect.y + 102f, overviewRect.width - 32f, 46f),
                    $"Không thể khởi động: {startupError}",
                    warningStyle);
                return;
            }

            var viewLabel = isThirdPerson
                ? "TPP — bản đồ tổng quan (mặc định)"
                : "FPP — mô phỏng bản đồ phía trước, không phải camera/AR";
            GUI.Label(
                new Rect(overviewRect.x + 16f, overviewRect.y + 100f, overviewRect.width - 32f, 50f),
                $"{viewLabel}   |   Tốc độ mô phỏng: {VehicleSpeedMps * 3.6f:F0} km/h   |   Vị trí: {vehicleDistanceM:F1} m",
                bodyStyle);

            var buttonTop = Screen.height - 66f;
            var buttonsWidth = availableWidth - gap * 2f;
            var viewButtonWidth = buttonsWidth * 0.4f;
            var actionButtonWidth = (buttonsWidth - viewButtonWidth) * 0.5f;
            if (GUI.Button(
                    new Rect(margin, buttonTop, viewButtonWidth, 48f),
                    "Đổi góc nhìn TPP / FPP",
                    buttonStyle))
            {
                ToggleView();
            }

            var pauseButtonX = margin + viewButtonWidth + gap;
            if (GUI.Button(
                    new Rect(pauseButtonX, buttonTop, actionButtonWidth, 48f),
                    isPaused ? "Tiếp tục" : "Tạm dừng",
                    buttonStyle))
            {
                TogglePause();
            }

            var restartButtonX = pauseButtonX + actionButtonWidth + gap;
            if (GUI.Button(
                    new Rect(restartButtonX, buttonTop, actionButtonWidth, 48f),
                    "Chạy lại tuyến",
                    buttonStyle))
            {
                RestartRoute();
            }

            DrawWarningPanel(warningRect);
        }

        private void DrawWarningPanel(Rect panelRect)
        {
            GUI.Box(panelRect, GUIContent.none, panelStyle);

            if (!warning.HasWarning)
            {
                GUI.Label(
                    new Rect(panelRect.x + 18f, panelRect.y + 16f, panelRect.width - 36f, 70f),
                    "Đang theo dõi hành lang phía trước\nChưa có cảnh báo trong khoảng nhìn hiện tại.",
                    bodyStyle);
                GUI.Label(
                    new Rect(panelRect.x + 18f, panelRect.y + 98f, panelRect.width - 36f, 48f),
                    $"Catalog: {catalog.catalog_version}\nNguồn: {catalog.source_label}",
                    fixtureStyle);
                return;
            }

            GUI.Label(
                new Rect(panelRect.x + 18f, panelRect.y + 12f, panelRect.width - 36f, 38f),
                $"CẢNH BÁO ĐỊA HÌNH — {warning.Hazard.severity.ToUpperInvariant()}",
                warningStyle);
            GUI.Label(
                new Rect(panelRect.x + 18f, panelRect.y + 52f, panelRect.width - 36f, 98f),
                $"{warning.Hazard.description}\n" +
                $"Còn {warning.DistanceAheadM:F1} m — khoảng {warning.LeadTimeSeconds:F1} giây\n" +
                $"Mã fixture: {warning.Hazard.hazard_id}",
                bodyStyle);
        }

        private void BuildWorld()
        {
            CreateCamera();
            CreateLight();
            CreateGround();
            CreateRoad();
            CreateVehicle();

            for (var index = 0; index < catalog.hazards.Length; index++)
            {
                CreateHazardMarker(catalog.hazards[index], index);
            }
        }

        private void CreateCamera()
        {
            var cameraObject = new GameObject("Drive Camera");
            sceneCamera = cameraObject.AddComponent<Camera>();
            sceneCamera.clearFlags = CameraClearFlags.SolidColor;
            sceneCamera.backgroundColor = new Color(0.53f, 0.72f, 0.86f);
            sceneCamera.fieldOfView = 60f;
            cameraObject.AddComponent<AudioListener>();
        }

        private static void CreateLight()
        {
            var lightObject = new GameObject("Directional Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.2f;
            lightObject.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
        }

        private void CreateGround()
        {
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "Ground";
            ground.transform.position = new Vector3(0f, -0.35f, routeLengthM * 0.5f);
            ground.transform.localScale = new Vector3(44f, 0.5f, routeLengthM + 20f);
            ApplyColor(ground, new Color(0.24f, 0.43f, 0.22f));
        }

        private void CreateRoad()
        {
            var road = GameObject.CreatePrimitive(PrimitiveType.Cube);
            road.name = "Synthetic Route";
            road.transform.position = new Vector3(0f, 0f, routeLengthM * 0.5f);
            road.transform.localScale = new Vector3(8f, 0.12f, routeLengthM);
            ApplyColor(road, new Color(0.16f, 0.18f, 0.21f));

            for (var distance = 4f; distance < routeLengthM; distance += 7f)
            {
                var marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
                marker.name = $"Lane Marker {distance:F0}m";
                marker.transform.position = new Vector3(0f, 0.09f, distance);
                marker.transform.localScale = new Vector3(0.16f, 0.03f, 2.6f);
                ApplyColor(marker, Color.white);
            }
        }

        private void CreateVehicle()
        {
            var vehicleObject = GameObject.CreatePrimitive(PrimitiveType.Cube);
            vehicleObject.name = "Fixture Vehicle";
            vehicleObject.transform.position = new Vector3(0f, 0.65f, 0f);
            vehicleObject.transform.localScale = new Vector3(1.5f, 0.8f, 3f);
            ApplyColor(vehicleObject, new Color(0.1f, 0.48f, 0.93f));
            vehicle = vehicleObject.transform;

            var front = GameObject.CreatePrimitive(PrimitiveType.Cube);
            front.name = "Vehicle Front Marker";
            front.transform.SetParent(vehicle, false);
            front.transform.localPosition = new Vector3(0f, 0.15f, 0.48f);
            front.transform.localScale = new Vector3(0.7f, 0.2f, 0.1f);
            ApplyColor(front, Color.white);
        }

        private static void CreateHazardMarker(TerrainHazard hazard, int index)
        {
            var color = SeverityColor(hazard.severity);
            var zone = GameObject.CreatePrimitive(PrimitiveType.Cube);
            zone.name = $"Fixture Hazard Zone {hazard.hazard_id}";
            zone.transform.position = new Vector3(0f, 0.1f, hazard.route_distance_m);
            zone.transform.localScale = new Vector3(7.7f, 0.08f, 2.2f);
            ApplyColor(zone, color);

            var sign = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            sign.name = $"Fixture Hazard Sign {hazard.hazard_id}";
            sign.transform.position = new Vector3(index % 2 == 0 ? 5f : -5f, 0.8f, hazard.route_distance_m);
            sign.transform.localScale = new Vector3(0.8f, 0.8f, 0.8f);
            ApplyColor(sign, color);

            var textObject = new GameObject($"Fixture Label {hazard.hazard_id}");
            textObject.transform.position = sign.transform.position + new Vector3(0f, 1.8f, 0f);
            textObject.transform.rotation = Quaternion.Euler(0f, 180f, 0f);
            var text = textObject.AddComponent<TextMesh>();
            text.text = $"FIXTURE\n{hazard.type}\n{hazard.route_distance_m:F0} m";
            text.fontSize = 42;
            text.characterSize = 0.11f;
            text.anchor = TextAnchor.MiddleCenter;
            text.alignment = TextAlignment.Center;
            text.color = Color.white;
        }

        private void UpdateCameraTransform()
        {
            if (sceneCamera == null || vehicle == null)
            {
                return;
            }

            if (isThirdPerson)
            {
                sceneCamera.transform.position = vehicle.position + new Vector3(0f, 17f, -17f);
                sceneCamera.transform.LookAt(vehicle.position + new Vector3(0f, 0f, 14f));
            }
            else
            {
                sceneCamera.transform.position = vehicle.position + new Vector3(0f, 1.6f, 1.1f);
                sceneCamera.transform.rotation = Quaternion.Euler(7f, 0f, 0f);
            }
        }

        private void RestartRoute()
        {
            vehicleDistanceM = 0f;
            warning = TerrainWarningEvaluation.None;
            warningEngine?.Reset();
            if (vehicle != null)
            {
                vehicle.position = new Vector3(0f, 0.65f, 0f);
            }
        }

        public void ToggleView()
        {
            isThirdPerson = !isThirdPerson;
            UpdateCameraTransform();
        }

        public void TogglePause()
        {
            isPaused = !isPaused;
        }

        private static float GetRouteLength(TerrainCatalog terrainCatalog)
        {
            var farthest = 0f;
            foreach (var hazard in terrainCatalog.hazards)
            {
                farthest = Mathf.Max(farthest, hazard.route_distance_m);
            }

            return farthest + RouteEndPaddingM;
        }

        private static Color SeverityColor(string severity)
        {
            if (string.Equals(severity, "danger", StringComparison.OrdinalIgnoreCase))
            {
                return new Color(0.86f, 0.12f, 0.12f);
            }

            if (string.Equals(severity, "warning", StringComparison.OrdinalIgnoreCase))
            {
                return new Color(1f, 0.58f, 0.05f);
            }

            return new Color(0.12f, 0.65f, 0.9f);
        }

        private static void ApplyColor(GameObject target, Color color)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            var material = new Material(shader)
            {
                color = color
            };
            target.GetComponent<Renderer>().material = material;
        }

        private void EnsureStyles()
        {
            if (titleStyle != null)
            {
                return;
            }

            titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 22,
                fontStyle = FontStyle.Bold,
                normal = { textColor = Color.white }
            };
            bodyStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 16,
                wordWrap = true,
                normal = { textColor = Color.white }
            };
            fixtureStyle = new GUIStyle(bodyStyle)
            {
                fontSize = 14,
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(0.35f, 0.9f, 1f) }
            };
            warningStyle = new GUIStyle(bodyStyle)
            {
                fontSize = 18,
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(1f, 0.72f, 0.2f) }
            };
            buttonStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = 16,
                fontStyle = FontStyle.Bold
            };
            panelStyle = new GUIStyle(GUI.skin.box);
            panelStyle.normal.background = MakeTexture(new Color(0.03f, 0.05f, 0.08f, 0.9f));
        }

        private static Texture2D MakeTexture(Color color)
        {
            var texture = new Texture2D(1, 1);
            texture.SetPixel(0, 0, color);
            texture.Apply();
            return texture;
        }
    }
}

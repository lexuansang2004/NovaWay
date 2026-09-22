using System;
using System.Collections.Generic;
using UnityEngine;

namespace NovaWay.ArTerrain.DriveMock
{
    public sealed class TerrainWarningEvaluation
    {
        public static readonly TerrainWarningEvaluation None =
            new TerrainWarningEvaluation(null, 0f, 0f, false);

        public TerrainWarningEvaluation(
            TerrainHazard hazard,
            float distanceAheadM,
            float leadTimeSeconds,
            bool shouldAnnounce)
        {
            Hazard = hazard;
            DistanceAheadM = distanceAheadM;
            LeadTimeSeconds = leadTimeSeconds;
            ShouldAnnounce = shouldAnnounce;
        }

        public TerrainHazard Hazard { get; }
        public float DistanceAheadM { get; }
        public float LeadTimeSeconds { get; }
        public bool ShouldAnnounce { get; }
        public bool HasWarning => Hazard != null;
    }

    public sealed class TerrainWarningEngine
    {
        public const float MinimumWarningDistanceM = 25f;
        public const float MaximumWarningDistanceM = 120f;
        public const float DefaultAnnouncementCooldownSeconds = 8f;

        private readonly TerrainCatalog catalog;
        private readonly float announcementCooldownSeconds;
        private readonly Dictionary<string, float> lastAnnouncementAt =
            new Dictionary<string, float>(StringComparer.Ordinal);

        private string currentHazardId;

        public TerrainWarningEngine(
            TerrainCatalog catalog,
            float announcementCooldownSeconds = DefaultAnnouncementCooldownSeconds)
        {
            this.catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
            this.announcementCooldownSeconds = Mathf.Max(0f, announcementCooldownSeconds);
        }

        public TerrainWarningEvaluation Evaluate(float vehicleRouteDistanceM, float speedMps, float nowSeconds)
        {
            if (speedMps <= 0.1f)
            {
                currentHazardId = null;
                return TerrainWarningEvaluation.None;
            }

            TerrainHazard nearest = null;
            var nearestDistance = float.PositiveInfinity;

            foreach (var hazard in catalog.hazards)
            {
                var distanceAhead = hazard.route_distance_m - vehicleRouteDistanceM;
                if (distanceAhead < 0f)
                {
                    continue;
                }

                var warningDistance = CalculateWarningDistance(speedMps, hazard.recommended_lead_time_s);
                if (distanceAhead <= warningDistance && distanceAhead < nearestDistance)
                {
                    nearest = hazard;
                    nearestDistance = distanceAhead;
                }
            }

            if (nearest == null)
            {
                currentHazardId = null;
                return TerrainWarningEvaluation.None;
            }

            var hazardChanged = !string.Equals(currentHazardId, nearest.hazard_id, StringComparison.Ordinal);
            var cooldownElapsed = !lastAnnouncementAt.TryGetValue(nearest.hazard_id, out var lastAt) ||
                                  nowSeconds - lastAt >= announcementCooldownSeconds;
            var shouldAnnounce = hazardChanged || cooldownElapsed;

            if (shouldAnnounce)
            {
                lastAnnouncementAt[nearest.hazard_id] = nowSeconds;
            }

            currentHazardId = nearest.hazard_id;
            return new TerrainWarningEvaluation(
                nearest,
                nearestDistance,
                nearestDistance / speedMps,
                shouldAnnounce);
        }

        public void Reset()
        {
            currentHazardId = null;
            lastAnnouncementAt.Clear();
        }

        public static float CalculateWarningDistance(float speedMps, float recommendedLeadTimeSeconds)
        {
            return Mathf.Clamp(
                Mathf.Max(0f, speedMps) * Mathf.Max(0f, recommendedLeadTimeSeconds),
                MinimumWarningDistanceM,
                MaximumWarningDistanceM);
        }
    }
}

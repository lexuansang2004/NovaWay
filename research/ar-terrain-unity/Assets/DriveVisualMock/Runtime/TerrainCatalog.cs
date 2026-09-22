using System;
using System.Collections.Generic;
using UnityEngine;

namespace NovaWay.ArTerrain.DriveMock
{
    [Serializable]
    public sealed class TerrainCatalog
    {
        public string schema_version;
        public string catalog_version;
        public string coordinate_reference;
        public string source_label;
        public TerrainHazard[] hazards;
    }

    [Serializable]
    public sealed class TerrainHazard
    {
        public string hazard_id;
        public string type;
        public string severity;
        public string description;
        public float route_distance_m;
        public float recommended_lead_time_s;
        public string source_scan_id;
    }

    public static class TerrainCatalogParser
    {
        public const string SupportedSchemaVersion = "1.0";

        private static readonly HashSet<string> SupportedSeverities =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "info",
                "warning",
                "danger"
            };

        public static TerrainCatalog Parse(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                throw new FormatException("Terrain catalog JSON is empty.");
            }

            TerrainCatalog catalog;
            try
            {
                catalog = JsonUtility.FromJson<TerrainCatalog>(json);
            }
            catch (ArgumentException exception)
            {
                throw new FormatException("Terrain catalog JSON is invalid.", exception);
            }

            if (catalog == null)
            {
                throw new FormatException("Terrain catalog could not be parsed.");
            }

            if (!string.Equals(catalog.schema_version, SupportedSchemaVersion, StringComparison.Ordinal))
            {
                throw new FormatException(
                    $"Unsupported terrain catalog schema '{catalog.schema_version ?? "<null>"}'. " +
                    $"Expected '{SupportedSchemaVersion}'.");
            }

            if (string.IsNullOrWhiteSpace(catalog.catalog_version))
            {
                throw new FormatException("Terrain catalog_version is required.");
            }

            if (!string.Equals(catalog.source_label, "SYNTHETIC/FIXTURE", StringComparison.Ordinal))
            {
                throw new FormatException("This mock accepts only a SYNTHETIC/FIXTURE catalog.");
            }

            if (catalog.hazards == null || catalog.hazards.Length == 0)
            {
                throw new FormatException("Terrain catalog must contain at least one hazard.");
            }

            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (var hazard in catalog.hazards)
            {
                ValidateHazard(hazard, ids);
            }

            return catalog;
        }

        private static void ValidateHazard(TerrainHazard hazard, HashSet<string> ids)
        {
            if (hazard == null || string.IsNullOrWhiteSpace(hazard.hazard_id))
            {
                throw new FormatException("Every terrain hazard requires a hazard_id.");
            }

            if (!ids.Add(hazard.hazard_id))
            {
                throw new FormatException($"Duplicate terrain hazard id '{hazard.hazard_id}'.");
            }

            if (string.IsNullOrWhiteSpace(hazard.type) || string.IsNullOrWhiteSpace(hazard.description))
            {
                throw new FormatException($"Terrain hazard '{hazard.hazard_id}' requires type and description.");
            }

            if (!SupportedSeverities.Contains(hazard.severity ?? string.Empty))
            {
                throw new FormatException(
                    $"Terrain hazard '{hazard.hazard_id}' has unsupported severity '{hazard.severity ?? "<null>"}'.");
            }

            if (hazard.route_distance_m < 0f)
            {
                throw new FormatException($"Terrain hazard '{hazard.hazard_id}' has a negative route distance.");
            }

            if (hazard.recommended_lead_time_s <= 0f)
            {
                throw new FormatException($"Terrain hazard '{hazard.hazard_id}' requires a positive lead time.");
            }
        }
    }
}

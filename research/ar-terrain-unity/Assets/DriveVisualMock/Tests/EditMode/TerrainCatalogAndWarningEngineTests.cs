using System;
using NUnit.Framework;

namespace NovaWay.ArTerrain.DriveMock.Tests
{
    public sealed class TerrainCatalogAndWarningEngineTests
    {
        [Test]
        public void Parse_AcceptsVersionedSyntheticCatalog()
        {
            var catalog = TerrainCatalogParser.Parse(ValidCatalogJson());

            Assert.That(catalog.schema_version, Is.EqualTo("1.0"));
            Assert.That(catalog.source_label, Is.EqualTo("SYNTHETIC/FIXTURE"));
            Assert.That(catalog.hazards, Has.Length.EqualTo(3));
        }

        [Test]
        public void Parse_RejectsUnsupportedSchema()
        {
            var json = ValidCatalogJson().Replace("\"schema_version\":\"1.0\"", "\"schema_version\":\"2.0\"");

            var exception = Assert.Throws<FormatException>(() => TerrainCatalogParser.Parse(json));
            Assert.That(exception.Message, Does.Contain("Unsupported terrain catalog schema"));
        }

        [Test]
        public void Parse_RejectsDuplicateHazardIds()
        {
            var json = ValidCatalogJson().Replace("\"hazard_id\":\"hazard-02\"", "\"hazard_id\":\"hazard-01\"");

            var exception = Assert.Throws<FormatException>(() => TerrainCatalogParser.Parse(json));
            Assert.That(exception.Message, Does.Contain("Duplicate terrain hazard id"));
        }

        [Test]
        public void Parse_RejectsCatalogNotLabeledAsSyntheticFixture()
        {
            var json = ValidCatalogJson().Replace(
                "\"source_label\":\"SYNTHETIC/FIXTURE\"",
                "\"source_label\":\"REAL_SCAN\"");

            var exception = Assert.Throws<FormatException>(() => TerrainCatalogParser.Parse(json));
            Assert.That(exception.Message, Does.Contain("only a SYNTHETIC/FIXTURE catalog"));
        }

        [Test]
        public void Evaluate_SelectsNearestHazardAndCalculatesLeadTime()
        {
            var engine = new TerrainWarningEngine(TerrainCatalogParser.Parse(ValidCatalogJson()));

            var result = engine.Evaluate(vehicleRouteDistanceM: 10f, speedMps: 5f, nowSeconds: 1f);

            Assert.That(result.HasWarning, Is.True);
            Assert.That(result.Hazard.hazard_id, Is.EqualTo("hazard-01"));
            Assert.That(result.DistanceAheadM, Is.EqualTo(20f).Within(0.001f));
            Assert.That(result.LeadTimeSeconds, Is.EqualTo(4f).Within(0.001f));
            Assert.That(result.ShouldAnnounce, Is.True);
        }

        [Test]
        public void Evaluate_IgnoresHazardsOutsideCalculatedWarningDistance()
        {
            var engine = new TerrainWarningEngine(TerrainCatalogParser.Parse(ValidCatalogJson()));

            var result = engine.Evaluate(vehicleRouteDistanceM: 0f, speedMps: 1f, nowSeconds: 1f);

            Assert.That(result.HasWarning, Is.False);
        }

        [Test]
        public void Evaluate_KeepsWarningVisibleButSuppressesRepeatInsideCooldown()
        {
            var engine = new TerrainWarningEngine(
                TerrainCatalogParser.Parse(ValidCatalogJson()),
                announcementCooldownSeconds: 8f);

            var first = engine.Evaluate(vehicleRouteDistanceM: 10f, speedMps: 5f, nowSeconds: 1f);
            var repeated = engine.Evaluate(vehicleRouteDistanceM: 11f, speedMps: 5f, nowSeconds: 4f);
            var afterCooldown = engine.Evaluate(vehicleRouteDistanceM: 12f, speedMps: 5f, nowSeconds: 10f);

            Assert.That(first.ShouldAnnounce, Is.True);
            Assert.That(repeated.HasWarning, Is.True);
            Assert.That(repeated.ShouldAnnounce, Is.False);
            Assert.That(afterCooldown.ShouldAnnounce, Is.True);
        }

        [Test]
        public void Evaluate_AdvancesToNextHazardAfterPassingPreviousOne()
        {
            var engine = new TerrainWarningEngine(TerrainCatalogParser.Parse(ValidCatalogJson()));

            var result = engine.Evaluate(vehicleRouteDistanceM: 31f, speedMps: 10f, nowSeconds: 20f);

            Assert.That(result.HasWarning, Is.True);
            Assert.That(result.Hazard.hazard_id, Is.EqualTo("hazard-02"));
            Assert.That(result.DistanceAheadM, Is.EqualTo(39f).Within(0.001f));
        }

        [Test]
        public void CalculateWarningDistance_ClampsToSafetyBounds()
        {
            Assert.That(
                TerrainWarningEngine.CalculateWarningDistance(1f, 2f),
                Is.EqualTo(TerrainWarningEngine.MinimumWarningDistanceM));
            Assert.That(
                TerrainWarningEngine.CalculateWarningDistance(40f, 10f),
                Is.EqualTo(TerrainWarningEngine.MaximumWarningDistanceM));
        }

        private static string ValidCatalogJson()
        {
            return "{" +
                   "\"schema_version\":\"1.0\"," +
                   "\"catalog_version\":\"test-v1\"," +
                   "\"coordinate_reference\":\"LOCAL_ROUTE_METERS\"," +
                   "\"source_label\":\"SYNTHETIC/FIXTURE\"," +
                   "\"hazards\":[" +
                   "{" +
                   "\"hazard_id\":\"hazard-01\"," +
                   "\"type\":\"speed_bump\"," +
                   "\"severity\":\"warning\"," +
                   "\"description\":\"Fixture speed bump\"," +
                   "\"route_distance_m\":30.0," +
                   "\"recommended_lead_time_s\":6.0," +
                   "\"source_scan_id\":\"fixture-only\"" +
                   "}," +
                   "{" +
                   "\"hazard_id\":\"hazard-02\"," +
                   "\"type\":\"pothole\"," +
                   "\"severity\":\"danger\"," +
                   "\"description\":\"Fixture pothole\"," +
                   "\"route_distance_m\":70.0," +
                   "\"recommended_lead_time_s\":7.0," +
                   "\"source_scan_id\":\"fixture-only\"" +
                   "}," +
                   "{" +
                   "\"hazard_id\":\"hazard-03\"," +
                   "\"type\":\"slope\"," +
                   "\"severity\":\"info\"," +
                   "\"description\":\"Fixture slope\"," +
                   "\"route_distance_m\":120.0," +
                   "\"recommended_lead_time_s\":8.0," +
                   "\"source_scan_id\":\"fixture-only\"" +
                   "}" +
                   "]" +
                   "}";
        }
    }
}

import 'package:flutter/widgets.dart';
import 'package:flutter_map/flutter_map.dart';

/// Returns a 1x1 transparent PNG synchronously (from flutter_map's own
/// [TileProvider.transparentImage]) instead of hitting the real network —
/// keeps widget tests fast, deterministic and network-free.
class FakeTileProvider extends TileProvider {
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) {
    return MemoryImage(TileProvider.transparentImage);
  }
}

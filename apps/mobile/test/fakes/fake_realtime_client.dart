import 'dart:async';
import 'package:mobile/services/realtime_client.dart';

class FakeRealtimeClient implements RealtimeClient {
  final bool autoConnectSucceeds;
  final _stateController = StreamController<RealtimeConnectionState>.broadcast();
  final _rejectionController = StreamController<String>.broadcast();
  final List<LocationUpdatePayload> sentLocations = [];
  bool connectCalled = false;
  bool disconnectCalled = false;
  String? lastToken;

  FakeRealtimeClient({this.autoConnectSucceeds = true});

  @override
  Stream<RealtimeConnectionState> get connectionState => _stateController.stream;

  @override
  Stream<String> get rejections => _rejectionController.stream;

  @override
  void connect(String token) {
    connectCalled = true;
    lastToken = token;
    _stateController.add(RealtimeConnectionState.connecting);
    if (autoConnectSucceeds) {
      Future.microtask(() => _stateController.add(RealtimeConnectionState.connected));
    }
  }

  @override
  void sendLocation(LocationUpdatePayload payload) {
    sentLocations.add(payload);
  }

  @override
  void disconnect() {
    disconnectCalled = true;
    _stateController.add(RealtimeConnectionState.disconnected);
  }

  void simulateServerDisconnect() {
    _stateController.add(RealtimeConnectionState.disconnected);
  }

  // Mirrors socket.io's real reconnect behavior: a dropped-then-restored
  // connection can re-emit `connected` without an intervening
  // `disconnected` event reaching the app layer first.
  void simulateReconnect() {
    _stateController.add(RealtimeConnectionState.connected);
  }

  void simulateRejection(String errorCode) {
    _rejectionController.add(errorCode);
  }
}

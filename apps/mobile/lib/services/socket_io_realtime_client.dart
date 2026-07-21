import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/api_config.dart';
import 'realtime_client.dart';

class SocketIoRealtimeClient implements RealtimeClient {
  io.Socket? _socket;
  final _stateController = StreamController<RealtimeConnectionState>.broadcast();
  final _rejectionController = StreamController<String>.broadcast();

  @override
  Stream<RealtimeConnectionState> get connectionState => _stateController.stream;

  @override
  Stream<String> get rejections => _rejectionController.stream;

  @override
  void connect(String token) {
    _stateController.add(RealtimeConnectionState.connecting);

    final socket = io.io(
      '${ApiConfig.socketBaseUrl}/realtime',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );
    _socket = socket;

    socket.onConnect((_) => _stateController.add(RealtimeConnectionState.connected));
    socket.onDisconnect((_) => _stateController.add(RealtimeConnectionState.disconnected));
    socket.on('connection:rejected', (_) => _stateController.add(RealtimeConnectionState.rejected));
    socket.on('location:rejected', (data) {
      final errorCode = (data is Map) ? (data['error_code']?.toString() ?? 'UNKNOWN') : 'UNKNOWN';
      _rejectionController.add(errorCode);
    });

    socket.connect();
  }

  @override
  void sendLocation(LocationUpdatePayload payload) {
    _socket?.emit('location:update', {
      'trip_id': payload.tripId,
      'client_event_id': payload.clientEventId,
      'latitude': payload.latitude,
      'longitude': payload.longitude,
      'speed_kmh': payload.speedKmh,
      'accuracy_m': payload.accuracyM,
      'timestamp': payload.timestamp,
    });
  }

  @override
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _stateController.add(RealtimeConnectionState.disconnected);
  }
}

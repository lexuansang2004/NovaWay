import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/selectable_vehicle.dart';
import '../session/auth_session.dart';
import 'api_exception.dart';
import 'vehicle_repository.dart';

class ApiVehicleRepository implements VehicleRepository {
  const ApiVehicleRepository();

  Map<String, String> get _authHeaders => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${AuthSession.token}',
      };

  @override
  Future<List<SelectableVehicle>> fetchSelectableVehicles() async {
    final owned = await _fetchOwnedVehicles();
    final borrowed = await _fetchActiveBorrowedVehicles();
    return [...owned, ...borrowed];
  }

  Future<List<SelectableVehicle>> _fetchOwnedVehicles() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/vehicles'),
      headers: _authHeaders,
    );
    if (response.statusCode != 200) {
      // R5-7: status checked before decoding, so a malformed error body
      // (proxy HTML, empty body) degrades to UNKNOWN_ERROR instead of
      // throwing FormatException.
      final errorBody = _tryDecode(response.body);
      throw ApiException(
        statusCode: response.statusCode,
        errorCode: (errorBody?['error_code'] as String?) ?? 'UNKNOWN_ERROR',
        message: (errorBody?['message'] as String?) ?? 'Không lấy được danh sách xe.',
      );
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final vehicles = body['vehicles'] as List<dynamic>;
    return vehicles
        .cast<Map<String, dynamic>>()
        .map(SelectableVehicle.fromOwnedJson)
        .toList();
  }

  Future<List<SelectableVehicle>> _fetchActiveBorrowedVehicles() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/authorizations/me'),
      headers: _authHeaders,
    );
    if (response.statusCode != 200) {
      final errorBody = _tryDecode(response.body);
      throw ApiException(
        statusCode: response.statusCode,
        errorCode: (errorBody?['error_code'] as String?) ?? 'UNKNOWN_ERROR',
        message: (errorBody?['message'] as String?) ?? 'Không lấy được danh sách uỷ quyền.',
      );
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final authorizations = body['authorizations'] as List<dynamic>;
    return authorizations
        .cast<Map<String, dynamic>>()
        .where((a) => a['status'] == 'active')
        .map(SelectableVehicle.fromAuthorizationJson)
        .toList();
  }
}

/// Returns the decoded body, or null if it isn't valid JSON — mirrors
/// api_auth_repository.dart's helper of the same name/purpose.
Map<String, dynamic>? _tryDecode(String body) {
  try {
    return jsonDecode(body) as Map<String, dynamic>;
  } on FormatException {
    return null;
  }
}

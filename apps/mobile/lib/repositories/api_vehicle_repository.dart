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
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw ApiException(
        statusCode: response.statusCode,
        errorCode: (body['error_code'] as String?) ?? 'UNKNOWN_ERROR',
        message: (body['message'] as String?) ?? 'Không lấy được danh sách xe.',
      );
    }
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
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw ApiException(
        statusCode: response.statusCode,
        errorCode: (body['error_code'] as String?) ?? 'UNKNOWN_ERROR',
        message: (body['message'] as String?) ?? 'Không lấy được danh sách uỷ quyền.',
      );
    }
    final authorizations = body['authorizations'] as List<dynamic>;
    return authorizations
        .cast<Map<String, dynamic>>()
        .where((a) => a['status'] == 'active')
        .map(SelectableVehicle.fromAuthorizationJson)
        .toList();
  }
}

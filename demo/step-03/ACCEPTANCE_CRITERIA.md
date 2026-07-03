# Điều kiện qua step tiếp theo

Step `DEMO-03` chỉ được coi là hoàn thành khi:

1. Trải nghiệm Scan Face mượt mà, Animation Laser không bị giật.
2. Code hỗ trợ tốt 2 luồng Mode mà không bị lỗi logic; component không chứa bất kỳ lệnh điều hướng route nào (tất cả qua `onComplete`).
3. Việc mock Text phân quyền Chủ xe/Người mượn hiển thị đúng chính xác như mong đợi, không bị lỗi hiển thị.
4. Có comment note TODO rõ ràng trong code để tránh nợ kỹ thuật (technical debt) sau này.
5. Flow Login có bước quét Face ID (`login_auth`) chạy end-to-end tới `/dashboard`, khớp kịch bản pitch.
6. Đã commit code đúng chuẩn.

# DEMO-00 - Scope Lock

## Mục tiêu
Chốt phạm vi demo gọn gàng, tránh làm dồn và lan man sang các tính năng phức tạp. Tạo tài liệu `DEMO_SCOPE_LOCK.md` lưu tại thư mục `/demo/` để định hình rõ các giới hạn mock/demo-only cho toàn bộ các step phía sau, đảm bảo tiến độ demo hoàn thành trong hôm nay và sáng mai.

## Scope
- Tạo file tài liệu `DEMO_SCOPE_LOCK.md` tại thư mục `/demo/`.
- Định nghĩa công nghệ: React + Vite, localStorage, OpenStreetMap + Leaflet (demo; định hướng MapLibre GL JS cho production)...
- Giới hạn mock: offline queue, Face ID, GPS.
- Yêu cầu UI: Tối ưu hiển thị cho kích thước màn hình Laptop.
- Chiến lược Git: Code trên branch `feature/quick-demo`; sau demo review và merge có chọn lọc vào `develop` (demo là nền cho project chính, không phải throwaway).

## Non-scope
- Không thiết kế UI/UX thực tế.
- Không setup code project React.
- Không setup backend, database, hay các dịch vụ thật.

## Tech stack
- Markdown
- Git (Branching strategy)

## UI requirements
*Không yêu cầu*

## Data/state requirements
*Không yêu cầu*

## Behavior requirements
*Không yêu cầu*

## Output expected
- File `/demo/DEMO_SCOPE_LOCK.md` được tạo.
- Nội dung file nêu rõ các giới hạn công nghệ, mock, chiến lược Git, nguyên tắc Clean Demo Foundation, và tối ưu UI Laptop.

## Commit message
```bash
git commit -m "docs: add NovaWay demo scope and git strategy"
```

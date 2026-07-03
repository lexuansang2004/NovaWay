# NovaWay Demo - Scope Update

## Demo Scope

Bản demo NovaWay hiện chỉ tập trung vào 2 nhóm chính:

* Xe máy
* Ô tô

Hai nhóm sau sẽ hiển thị trong giao diện dưới trạng thái `Coming soon`:

* Đi bộ
* Xe đạp

## Lý do chưa đưa Đi bộ và Xe đạp vào demo chính

* Tốc độ đi bộ, chạy bộ, xe đạp, xe đạp điện và xe máy có thể bị chồng lấn.
* Nếu chỉ dùng GPS, hệ thống không thể kết luận chính xác 100%.
* Việc phân biệt người đi bộ đang chạy, người đi xe đạp đang đổ dốc, hoặc xe đạp điện cần thêm dữ liệu ngữ cảnh.
* Demo cần giữ gọn để tập trung vào lõi: bản đồ, phương tiện, realtime GPS, AR Lite overlay và cảnh báo an toàn.

## Core Demo Modes

Trong bản demo hiện tại, người dùng chỉ chọn được:

* Xe máy
* Ô tô

## Coming Soon Modes

Hai chế độ sau chỉ hiển thị định hướng mở rộng:

* Đi bộ
* Xe đạp

## Module mở rộng sau MVP

Tên module:

`Mobility Mode Expansion`

Tên tiếng Việt:

`Mở rộng chế độ di chuyển`

Bao gồm:

* Walking mode
* Bicycle mode
* Electric bicycle/scooter mode
* Public transport mode
* Delivery/commercial vehicle mode

## Demo UI Rule

Trong màn hình chọn chế độ di chuyển, hiển thị:

* Xe máy — Available
* Ô tô — Available
* Đi bộ — Coming soon
* Xe đạp — Coming soon

Người dùng chỉ chọn được Xe máy hoặc Ô tô trong demo.

Đi bộ và Xe đạp chỉ hiển thị để thể hiện định hướng mở rộng tương lai.

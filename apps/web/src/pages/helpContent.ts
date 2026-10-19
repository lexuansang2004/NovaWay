// WEB-10 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.5, FR-WEBHELP-01…03).
//
// Every sentence on the help page lives here with a stable id. Each id is
// traced to its requirement and to the source line that makes it true in
// docs/web/WEB_HELP_CONTENT_MAP.md — change a sentence there and here
// together, and only when the product behaviour it describes has changed.
//
// Ground rules for this content (spec §4.5 / AC-WEBHELP-01…05): describe only
// what the web app does today; the web app watches trips, it never starts or
// ends one; no contact channel, ticket or form (none has been confirmed); no
// request for passwords, login codes or face images; nothing about the
// unfinished Offline Sync page; privacy is a link only (WEB-11 has its own
// content gate).

export interface HelpItem {
  id: string;
  text: string;
}

export interface HelpSection {
  id: string;
  title: string;
  items: HelpItem[];
  // A route in the app this topic is about (spec §4.5 "Route đích").
  link?: { to: string; label: string };
  // An in-page pointer to another section.
  seeAlso?: { sectionId: string; label: string };
}

export const HELP_INTRO =
  'Hướng dẫn ngắn cho các chức năng đang có trên trang web NovaWay. Chọn một mục để đi tới phần tương ứng.';

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'dang-nhap',
    title: 'Đăng nhập và phiên đăng nhập',
    items: [
      { id: 'H-01', text: 'Đăng nhập bằng email và mật khẩu tài khoản NovaWay tại trang Đăng nhập.' },
      {
        id: 'H-02',
        text: 'Khi bạn mở hoặc tải lại trang web NovaWay ở một trang cần đăng nhập, hoặc ngay sau khi đăng nhập, NovaWay kiểm tra phiên đăng nhập với máy chủ. Chuyển giữa các trang trong ứng dụng không kiểm tra lại mỗi lần. Nếu máy chủ báo phiên không còn hợp lệ, bạn được đưa về trang Đăng nhập để đăng nhập lại.',
      },
      {
        id: 'H-03',
        text: 'Nếu chưa kiểm tra được phiên (ví dụ mất mạng, máy chủ gặp sự cố hoặc phải chờ quá lâu), trang hiện thông báo kèm hai nút “Thử lại” và “Đăng nhập lại”. Những lỗi này tự chúng không đăng xuất bạn. Khi bạn chọn “Thử lại”, nếu máy chủ báo phiên không còn hợp lệ, bạn được đưa về trang Đăng nhập. Chọn “Đăng nhập lại” là chủ động bỏ phiên hiện tại để đăng nhập lại.',
      },
      { id: 'H-04', text: 'Nếu phiên vẫn còn hợp lệ, mở trang Đăng nhập sẽ tự đưa bạn về Dashboard.' },
      {
        id: 'H-05',
        text: 'Không gửi mật khẩu hoặc mã đăng nhập của bạn cho bất kỳ ai. Chỉ nhập mật khẩu tại trang Đăng nhập.',
      },
    ],
    link: { to: '/login', label: 'Mở trang Đăng nhập' },
  },
  {
    id: 'phuong-tien',
    title: 'Quản lý phương tiện',
    items: [
      { id: 'H-06', text: 'Trang Quản lý phương tiện liệt kê các xe của bạn.' },
      {
        id: 'H-07',
        text: 'Thêm xe: chọn “Thêm phương tiện”, chọn Loại xe (Xe máy hoặc Ô tô), nhập Biển số (bắt buộc) và Hãng/Dòng xe nếu muốn, rồi chọn “Lưu”.',
      },
      { id: 'H-08', text: 'Sửa xe: chọn nút Sửa (biểu tượng bút chì) ở dòng của xe, chỉnh thông tin rồi chọn “Lưu”.' },
      {
        id: 'H-09',
        text: 'Xoá xe: chọn nút Xoá (biểu tượng thùng rác), rồi chọn “Xoá” khi trang hỏi “Xoá phương tiện này?”. Chọn “Huỷ” nếu bạn đổi ý.',
      },
      {
        id: 'H-10',
        text: 'Chọn “Đặt đang dùng” để đặt một xe làm xe đang dùng; xe đó có nhãn “Đang hoạt động”. Mỗi lúc chỉ có một xe ở trạng thái này: xe đang dùng trước đó sẽ tự bỏ nhãn. Xe mới thêm chưa phải xe đang dùng.',
      },
      {
        id: 'H-11',
        text: 'Nhãn “Đang hoạt động” chỉ cho biết xe bạn đã chọn để dùng. Nhãn này không có nghĩa xe đang di chuyển hay đang có chuyến đi.',
      },
    ],
    link: { to: '/vehicles', label: 'Mở Quản lý phương tiện' },
  },
  {
    id: 'vi-tri',
    title: 'Xem vị trí chuyến đi',
    items: [
      {
        id: 'H-12',
        text: 'Trang Vị trí trực tiếp chỉ dùng để xem chuyến đi đang diễn ra. Trang web không có nút bắt đầu hay kết thúc chuyến đi; việc bắt đầu và kết thúc chuyến đi thuộc ứng dụng NovaWay trên điện thoại.',
      },
      {
        id: 'H-13',
        text: 'Khi có chuyến đi đang diễn ra và đã nhận được vị trí, trang hiện bản đồ, vị trí mới nhất và tốc độ.',
      },
      {
        id: 'H-14',
        text: 'Trang tự kiểm tra lại sau vài giây, nên bạn không cần tải lại trang khi chuyến đi vừa bắt đầu.',
      },
      {
        id: 'H-15',
        text: 'Nếu trang báo “Chưa có chuyến đi nào đang diễn ra”, có thể chưa có chuyến nào đang chạy, chuyến đã bắt đầu nhưng vị trí chưa được gửi tới, hoặc trang chưa tải được dữ liệu chuyến đi. Thông báo này không chắc chắn rằng không có chuyến đi.',
      },
      {
        id: 'H-16',
        text: 'Nếu thấy “Mất kết nối trực tiếp — đang thử kết nối lại...” hoặc “Không kết nối được máy chủ — đang thử lại...”, vị trí trên bản đồ có thể chưa phải mới nhất trong lúc trang tự kết nối lại.',
      },
    ],
    link: { to: '/start-trip', label: 'Mở Vị trí trực tiếp' },
  },
  {
    id: 'lich-su',
    title: 'Lịch sử và thống kê chuyến đi',
    items: [
      { id: 'H-17', text: 'Trang Lịch sử chuyến đi chỉ tính các chuyến đi đã kết thúc.' },
      { id: 'H-18', text: 'Dùng bộ lọc Tất cả, Xe máy hoặc Ô tô để xem theo loại xe.' },
      {
        id: 'H-19',
        text: 'Các ô tổng cho biết Tổng quãng đường, Tổng thời gian và số Cảnh báo an toàn của những chuyến khớp bộ lọc.',
      },
      {
        id: 'H-20',
        text: 'Biểu đồ cho thấy quãng đường (km, trục trái) và thời gian (phút, trục phải) của từng chuyến; cột màu đỏ là chuyến có cảnh báo an toàn.',
      },
      {
        id: 'H-21',
        text: 'Không cần rê chuột lên biểu đồ: mở mục “Đọc số liệu từng chuyến” để đọc số liệu từng chuyến bằng bàn phím hoặc chạm.',
      },
      {
        id: 'H-22',
        text: 'Nếu chưa có chuyến phù hợp, trang báo “Chưa có chuyến đi nào đã kết thúc phù hợp bộ lọc.”',
      },
    ],
    link: { to: '/trip-history', label: 'Mở Lịch sử chuyến đi' },
  },
  {
    id: 'quyen-rieng-tu',
    title: 'Quyền riêng tư',
    items: [{ id: 'H-23', text: 'Mở trang Quyền riêng tư từ liên kết bên dưới.' }],
    link: { to: '/account/privacy', label: 'Mở trang Quyền riêng tư' },
  },
  {
    id: 'loi-thuong-gap',
    title: 'Lỗi thường gặp',
    items: [
      {
        id: 'H-24',
        text: 'Mất mạng: trang có thể báo không tải được dữ liệu, hoặc báo chưa kiểm tra được phiên đăng nhập. Kiểm tra kết nối mạng rồi tải lại trang; nếu trang có nút “Thử lại”, bạn có thể chọn nút đó.',
      },
      {
        id: 'H-25',
        text: 'Phiên hết hạn: nếu bạn được đưa về trang Đăng nhập, hãy đăng nhập lại bằng email và mật khẩu của bạn.',
      },
      { id: 'H-26', text: 'Bản đồ chưa có vị trí: xem lại hướng dẫn trong mục Xem vị trí chuyến đi.' },
    ],
    seeAlso: { sectionId: 'vi-tri', label: 'Đi tới mục Xem vị trí chuyến đi' },
  },
];

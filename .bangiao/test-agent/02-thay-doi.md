# Summary
Đã hoàn thành toàn bộ các hạng mục tối ưu hóa theo kế hoạch được phê duyệt cho task `test-agent`:
1. Chuyển đổi 96 frames PNG sang WebP (giảm 88% dung lượng dữ liệu, từ ~50MB xuống 6.08MB). Cấu hình SequenceLoader và server sử dụng WebP mặc định.
2. Xử lý khởi tạo an toàn khi người dùng reload trang ở vị trí cuộn bất kỳ (`window.scrollY > 0`), loại bỏ hoàn toàn hiện tượng nhảy frame giật cục từ frame 0.
3. Tối ưu hóa SequenceLoader với cơ chế loại bỏ (discard) các request in-flight đã trở nên cũ/stale khi người dùng cuộn nhanh, bỏ qua bước `img.decode()` tốn kém tài nguyên CPU/GPU.
4. Bổ sung debounce 150ms cho sự kiện `resize` để ngăn ngừa layout thrashing khi người dùng thay đổi kích thước cửa sổ trình duyệt.
5. Thêm centralized error handling middleware (404 và 500) trong Express backend (`server.js`).
6. Cập nhật và chạy thành công bộ kiểm thử tự động Puppeteer (`verify_experience.js`) với kết quả PASS và 0 lỗi runtime.

---

# Files changed

1. **`frame1/*.webp` & `frame2/*.webp`** (Assets mới tạo):
   - 96 file WebP (48 Clip A + 48 Clip B) được nén từ các file PNG gốc với chất lượng cao (q=88).
   - Vẫn giữ nguyên các file PNG gốc để đảm bảo tương thích ngược.

2. **`public/js/sequence-loader.js`**:
   - Chuyển `this.extension` mặc định thành `'webp'`.
   - Bổ sung hàm `isIndexStale(index)` để xác định các khung hình không còn nằm trong sliding window.
   - Bổ sung cơ chế discard ảnh stale trong `startImageLoad()` (ngắt `src`, hủy listener, bỏ qua `await img.decode()`).
   - Cập nhật `init(startFrame)` để hỗ trợ preload linh hoạt xung quanh vị trí cuộn hiện tại khi tải lại trang.
   - Lọc bỏ các phần tử stale khỏi `loadQueue` khi cập nhật sliding window.

3. **`public/js/hero-controller.js`**:
   - Thêm hàm `calculateInitialProgress()` tính toán chính xác tiến trình cuộn ban đầu từ `window.scrollY`.
   - Đồng bộ `targetProgress` và `smoothProgress` ngay tại thời điểm khởi tạo, truyền `currentGlobalFrame` cho `loader.init()`.
   - Cập nhật `onFirstFrameReady(frameImg, frameIndex)` để hiển thị ngay frame tại vị trí cuộn hiện tại.
   - Thêm debounce 150ms cho `ScrollTrigger.refresh()` trong `handleResize()` để chống layout thrashing.
   - Cấu hình SequenceLoader sử dụng `extension: 'webp'`.

4. **`server.js`**:
   - Cập nhật route `/api/frames` hỗ trợ trả về manifest `webp` mặc định, đồng thời hỗ trợ `?format=png` qua query param.
   - Thêm middleware bắt lỗi 404 (Not Found) và 500 (Internal Error) tập trung theo chuẩn Express, hỗ trợ content negotiation (HTML EJS view hoặc JSON).

5. **`verify_experience.js`**:
   - Mở rộng kịch bản kiểm thử: Bổ sung test case Mid-scroll reload recovery và kiểm tra phản hồi mã trạng thái 404.

---

# Behavior implemented (Những gì đã implement)

- **Tối ưu hóa Sequence & Tốc độ tải**:
  - Tổng dung lượng tải toàn bộ sequence giảm từ ~50MB xuống còn 6.08MB (~64KB/frame).
  - Dung lượng đợt preload mở đầu (13 frames) giảm từ ~6.5MB xuống còn ~800KB. Thời gian chuẩn bị ban đầu rút ngắn đáng kể.
- **Xử lý Reload Mid-Scroll**:
  - Khi người dùng ở bất kỳ vị trí cuộn nào (ví dụ Beat 3, Beat 4) và bấm F5, canvas không bị reset về frame 0 rồi giật nhảy tới vị trí cuộn nữa; frame tương ứng với vị trí cuộn hiện tại được ưu tiên tải trước và hiển thị tức thì.
- **Stale Request Discard**:
  - Khi người dùng cuộn chuột rất nhanh (flick scroll) từ đầu đến cuối trang, các frame ở giữa đang tải dở dang sẽ bị hủy quá trình giải mã (`img.decode()`) ngay khi network trả về, giải phóng hàng đợi và slot concurrency cho các frame đích thực tế.
- **Debounced Resize**:
  - Khi resize cửa sổ trình duyệt, canvas cập nhật kích thước tức thì nhưng `ScrollTrigger.refresh()` chỉ kích hoạt một lần duy nhất sau khi người dùng dừng thao tác kéo 150ms.
- **Express Error Handling**:
  - Các route không tồn tại được chuyển hướng về trang 404 thân thiện thông qua `placeholder.ejs` hoặc JSON payload `{ error: 'Not Found', status: 404 }`.

---

# Những gì chưa implement
- Không chỉnh sửa các mô hình 3D hoặc file ảnh render gốc để ép nối camera giữa Clip A frame 48 và Clip B frame 1 (nằm ngoài phạm vi code, thuộc về tài nguyên 3D nguồn).
- Không thêm bất kỳ thư viện smooth-scroll bên ngoài nào (giữ nguyên GSAP + native lerp RAF loop).
- Không thay đổi thiết kế giao diện UI hay cấu trúc nội dung trang.

---

# Important implementation decisions
1. **Giữ song song PNG và WebP**: Không xóa các file PNG gốc để tránh rủi ro mất asset nguồn, đồng thời cho phép fallback tức thì chỉ bằng một tham số cấu hình.
2. **Không cố gắng abort `HTMLImageElement` ở tầng mạng**: Do tính chất không ổn định của việc abort image fetch trên các engine trình duyệt khác nhau, cơ chế tập trung vào việc **discard kết quả và bỏ qua bước `img.decode()`**. Bước decode là thao tác tốn CPU/GPU nhất trên main thread, nên việc bỏ qua nó mang lại hiệu quả tương đương mà hoàn toàn an toàn.
3. **Đồng bộ hóa tức thì ban đầu**: Gán `smoothProgress = targetProgress = initialProgress` ngay từ constructor để tránh việc lerp chạy lướt qua toàn bộ các frame từ 0 đến vị trí hiện tại khi refresh trang.

---

# Commands/checks run
1. **Kiểm tra cú pháp Node.js**:
   - `sequence-loader.js` -> OK
   - `hero-controller.js` -> OK
   - `server.js` -> OK
   - `verify_experience.js` -> OK
2. **Đo lường dung lượng Asset**:
   - Tổng dung lượng 96 frames WebP: **6.08 MB** (so với ~50 MB PNG).
3. **Chạy kiểm thử tự động toàn diện (`node verify_experience.js`)**:
   - Chrome Puppeteer chạy qua toàn bộ 5 Story Beats, Featured Products, Categories, Printing Service, Reviews, Footer.
   - Test Mid-scroll reload tại `scrollY = 1500`: `targetProgress` và `smoothProgress` đạt `0.757`, nạp đúng frame 85, canvas render hoàn chỉnh.
   - Test 404 route handling: Trả về HTTP 404 status chính xác.
   - Kết quả: **0 console warnings, 0 console errors, PASSED with exit code 0**.

---

# Known limitations
- Mối nối trực quan giữa Clip A (frame 48) và Clip B (frame 1): Được quyết định bởi góc quay và ánh sáng của ảnh 3D gốc; nếu 2 frame gốc có sự khác biệt về camera, người dùng vẫn sẽ thấy một bước chuyển cảnh nhỏ tại ranh giới Beat 3 -> Beat 4.

---

# Deviations from plan
- Không có sai lệch. Tất cả 6 hạng mục ưu tiên được lập trong `01-ke-hoach.md` đã được thực thi đầy đủ và chính xác.

---

# What Tester should focus on (Các điểm Tester cần đặc biệt kiểm tra)
1. **Kiểm tra định dạng WebP**: Mở Network tab của Developer Tools, xác nhận các ảnh được nạp từ `/frames/clip-a/` và `/frames/clip-b/` có định dạng `.webp` và trả về mã HTTP `200` (hoặc `304 Not Modified`).
2. **Kiểm tra Reload Mid-Scroll**: Cuộn trang tới Beat 3 (mô hình nổ tung) hoặc Beat 4 (máy in 3D), nhấn F5 để tải lại trang. Xác nhận màn hình không bị chớp giật từ frame 0 mà hiển thị frame tại đúng vị trí cuộn.
3. **Kiểm tra Cuộn nhanh (Flick Scroll)**: Sử dụng chuột cuộn thật nhanh từ đầu xuống cuối và ngược lại. Xác nhận không có hiện tượng đứng hình hay tràn bộ nhớ RAM.
4. **Kiểm tra Resize cửa sổ**: Kéo thay đổi kích thước cửa sổ trình duyệt liên tục để xác nhận hiệu năng không bị giật lag và canvas co giãn chính xác.
5. **Kiểm tra Error Handling**: Truy cập URL bất kỳ không tồn tại (ví dụ `http://localhost:3000/test-404-check`) để xác nhận mã trạng thái 404 và giao diện thông báo lỗi.


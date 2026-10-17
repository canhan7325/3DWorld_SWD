# Task
test-agent: Phân tích kiến trúc Landing Page 3DWorld (Express, EJS, GSAP, ScrollTrigger, SequenceLoader) và lập kế hoạch tối ưu hóa toàn diện.

---

# Goal
- Đánh giá toàn diện kiến trúc hiện tại của dự án:
  - Backend: Node.js, Express 5, EJS view templates, static asset serving.
  - Frontend: Canvas 2D sequence rendering, GSAP ScrollTrigger scrubbing, story beat transitions, CSS styling.
  - Memory & Performance: Image caching, memory footprint (RAM/VRAM), network payload, scroll stutter/smoothness.
- Lập danh sách phân loại các vấn đề (bugs, bottlenecks, memory risks, scroll glitches) theo thứ tự ưu tiên (High / Medium / Low).
- Đưa ra các đề xuất giải pháp kỹ thuật, phạm vi thực hiện (In scope / Out of scope), kế hoạch kiểm thử (Test plan) và quy trình triển khai cho bước Coder tiếp theo mà **không sửa mã nguồn production** trong giai đoạn này.

---

# Current repository findings

### 1. Kiến trúc Backend & Server (`server.js`)
- **Express & Static Serving**:
  - Express 5.2.1 với middleware `compression()` hỗ trợ nén Gzip/Brotli.
  - Static routing phục vụ frames:
    - `/frames/clip-a` -> thư mục `frame1/` (48 file PNG, `ezgif-frame-001.png` đến `048.png`).
    - `/frames/clip-b` -> thư mục `frame2/` (48 file PNG, `ezgif-frame-001.png` đến `048.png`).
    - Cache headers được cấu hình `maxAge: '1d', immutable: true`.
  - API endpoint `/api/frames`: Trả về JSON manifest đầy đủ 96 frames (nhóm A và B).
  - Template Engine: EJS (`views/index.ejs`, `views/placeholder.ejs`).
- **Phát hiện / Nhược điểm backend**:
  - **Payload ảnh gốc quá lớn**: 96 frames PNG 1920x1080 có tổng dung lượng lên tới **~50 MB** (trung bình 450KB - 650KB/frame). Lần truy cập đầu tiên phải tải lượng dữ liệu rất lớn.
  - **Thiếu Error Handling Middleware**: Chưa có middleware xử lý lỗi 404 (Not Found) hoặc 500 (Internal Error) tập trung theo chuẩn Express.
  - **Duplicate Static Aliases**: Mount trùng lặp cả `/frames/clip-a` và `/frame1`, `/frames/clip-b` và `/frame2`.

### 2. Kiến trúc Sequence Loader & Memory (`public/js/sequence-loader.js`)
- **Cơ chế hoạt động**:
  - Quản lý 96 frames qua sliding-window cache với các tham số:
    - `windowAhead = 12`, `windowBehind = 6`, `maxCacheSize = 26`.
    - `maxConcurrentLoads = 4` (kiểm soát số lượng request tải đồng thời qua hàng đợi `loadQueue`).
  - Hỗ trợ giải mã nền rõ ràng bằng `await img.decode()` trước khi đưa vào cache và kích hoạt `onFrameLoaded`.
  - Đã loại bỏ hoàn toàn cơ chế nearest-neighbor jumping (nếu frame chưa có, trả về `null` để controller hiển thị frame trước đó).
  - Bảo vệ các anchor frames quan trọng: `[0, 47, 48, 95]`.
  - Hỗ trợ định dạng mở rộng tập trung: `this.extension = options.extension || 'png'`.
- **Phát hiện / Rủi ro hiệu năng**:
  - **RAM/VRAM footprint**: Mỗi frame RGBA 1920x1080 khi giải mã chiếm `1920 * 1080 * 4 bytes ≈ 8.29 MB` uncompressed bitmap. Với `maxCacheSize = 26`, dung lượng chiếm dụng trong bộ nhớ GPU/RAM là xấp xỉ **~215.5 MB**.
  - **In-flight request cancellation**: Khi người dùng cuộn rất nhanh qua một đoạn dài, 4 frame đang tải dở dang (`activeLoading`) không thể bị abort bằng `AbortController` (hạn chế của `HTMLImageElement`), dẫn đến việc chúng vẫn tiếp tục tải và giải mã xong mới phục vụ các frame đích mới.
  - **Initial Preload Bottleneck**: Hàm `init()` chờ `Promise.all` của 13 frames (0..12). Với định dạng PNG hiện tại, người dùng phải tải **~6.5 MB** trước khi loading badge biến mất. Trên kết nối di động hoặc mạng chậm, thời gian chờ có thể kéo dài 5-10 giây.
  - **Cache Eviction Thrashing**: Nếu người dùng cuộn tới-lui liên tục trong một khoảng ngắn (ví dụ frame 10 -> 35 -> 10), các frame bị xóa khỏi cache sẽ phải decode lại từ đầu khi nạp lại.

### 3. Kiến trúc Canvas Controller & GSAP Animation (`public/js/hero-controller.js`)
- **Cơ chế hoạt động**:
  - Đã triển khai kiến trúc lerp smoothing độc lập:
    - ScrollTrigger chỉ cập nhật `this.targetProgress = self.progress`.
    - Single persistent requestAnimationFrame loop lerp `smoothProgress` với `smoothFactor = 0.12`.
    - Pinning dựa hoàn toàn vào CSS `position: sticky; top: 0;`, đã loại bỏ GSAP pin để tránh double-pinning layout thrashing.
    - Canvas DPR đặt cố định `this.dpr = 1` để tối ưu GPU fill-rate.
    - Frame retention: Giữ lại `this.lastRenderedImage` khi frame mục tiêu đang được nạp, không giật hình.
    - Subpixel rendering: Sử dụng tọa độ floating-point, loại bỏ `Math.round()`.
    - Bỏ vẽ radial gradient lặp đi lặp lại trên canvas mỗi frame; nền được xử lý bởi CSS container.
- **Phát hiện / Rủi ro animation**:
  - **ScrollTrigger Initialization Delay**: `HeroController.init()` là hàm async, gọi `await this.loader.init()` trước khi tạo `ScrollTrigger`. Nếu người dùng refresh trang khi đang ở vị trí cuộn giữa trang (hoặc cuộn chuột ngay lúc đang nạp), `targetProgress` ban đầu là 0, sau đó nhảy tức thì lên vị trí cuộn hiện tại khi ScrollTrigger kích hoạt.
  - **Unthrottled Resize Listener**: Event `resize` gọi `this.handleResize()` và `ScrollTrigger.refresh()` trực tiếp trên mỗi pixel thay đổi kích thước mà không có debounce/throttle.
  - **DPR = 1 trên màn hình 4K/Retina**: Rất mượt về GPU, nhưng trên màn hình siêu nét (3840x2160 hoặc màn hình Retina 5K), canvas có thể hiển thị hơi mềm (soft/blurry) do không có tùy chọn tăng DPR chọn lọc khi GPU cho phép.
  - **Độ trễ pha vi mô (Phase Lag)**: Canvas sử dụng lerp smoothing tự làm (`smoothFactor = 0.12`), trong khi các thẻ chữ GSAP sử dụng `scrub: 0.35`. Khi người dùng cuộn rất nhanh rồi dừng, có thể có độ chênh lệch vi mô giữa vị trí chữ và vị trí mô hình 3D.

### 4. Giao diện & CSS Performance (`public/css/hero.css`, `components.css`)
- **Phát hiện**:
  - Các thẻ nổi trong Hero (`.intro-glass-card`, `.hero-scroll-prompt`, `.beat-panel-card`, `.hero-loader-pill`) đã được chuyển từ `backdrop-filter: blur(...)` sang màu nền gần như đục `rgba(255, 255, 255, 0.94 - 0.95)` và `rgba(29, 29, 31, 0.92)`, giúp giảm tải composite pass của GPU trong khi cuộn.
  - Tuy nhiên, thanh điều hướng `.nav-minimal` trong `public/css/main.css` (dòng 89) vẫn sử dụng `backdrop-filter: blur(20px)` cố định ở `top: 0` đè lên canvas trong suốt quá trình cuộn.

---

# Acceptance criteria

Một kế hoạch hoàn chỉnh và giải pháp cho các bước tiếp theo cần đáp ứng:
1. **Danh sách vấn đề phân cấp rõ ràng**: Có bảng phân loại lỗi/nhược điểm theo mức độ ưu tiên (Cao / Trung bình / Thấp).
2. **Xác định chính xác file liên quan**: Chỉ rõ file và vị trí logic xảy ra vấn đề.
3. **Đề xuất giải pháp khả thi & an toàn**: Có phương án xử lý cụ thể, không phá vỡ UI, không đổi cấu trúc dự án không cần thiết.
4. **Không sửa đổi mã nguồn trong pha Planner**: Tuân thủ nghiêm ngặt vai trò Planner, giữ nguyên codebase cho đến khi được duyệt.

---

# In scope
1. Phân tích toàn diện hiệu năng và logic của `server.js`, `public/js/hero-controller.js`, `public/js/sequence-loader.js`, `public/css/hero.css`, `public/css/main.css`, `views/index.ejs`.
2. Lập danh mục chi tiết các vấn đề hiệu năng, rủi ro bộ nhớ (memory leak / memory pressure), rủi ro animation stutter.
3. Đề xuất kiến trúc tối ưu hóa tải ảnh (chuyển đổi WebP, abort/reset request cũ, adaptive cache sizing theo viewport/device).
4. Đề xuất cơ chế khởi tạo an toàn khi người dùng tải lại trang ở vị trí cuộn bất kỳ.
5. Thiết lập kế hoạch kiểm thử (Test Plan) tự động và thủ công bằng công cụ Puppeteer hiện có (`verify_experience.js`).

---

# Out of scope
1. Không sửa đổi mã nguồn sản phẩm (production code) trong lượt thực thi này.
2. Không thay đổi thiết kế giao diện (UI design), layout sản phẩm, bảng giá hoặc nội dung văn bản marketing.
3. Không thêm các thư viện cuộn trang bên thứ ba nặng nề (không thêm Lenis, Locomotive Scroll).
4. Không thay đổi cấu trúc thư mục hoặc viết lại server backend thành framework khác.

---

# Files/modules likely affected

| File | Module / Thành phần | Bản chất ảnh hưởng dự kiến |
| :--- | :--- | :--- |
| `public/js/sequence-loader.js` | SequenceLoader | Thêm cơ chế Abort/Discard in-flight images, cấu hình nạp WebP, điều chỉnh adaptive cache theo thiết bị |
| `public/js/hero-controller.js` | HeroController | Xử lý scroll khởi tạo an toàn (`initial scroll offset`), debounced resize handler, đồng bộ hóa scrub |
| `server.js` | Express Server | Thêm endpoint/tự động phục vụ WebP khi có file, middleware error handling 404/500 |
| `public/css/main.css` | Navigation Bar | Kiểm tra và tối ưu GPU composite của `.nav-minimal` backdrop-filter |
| `views/index.ejs` | View Template | Thêm `<link rel="preload">` cho frame 0 hoặc critical CSS/fonts |
| `verify_experience.js` | Test Suite | Bổ sung kiểm thử tải trang tại vị trí cuộn giữa chừng và đo lường FPS/Memory |

---

# Data/API/status-flow impact
- **Không thay đổi schema dữ liệu**: Endpoint `/api/frames` tiếp tục trả về manifest khung hình chuẩn.
- **Trạng thái luồng nạp (Loading Flow)**:
  - Hiện tại: `DOMContentLoaded` -> `HeroController.init()` -> `loader.init()` (chờ 13 frames PNG) -> hide loader -> `setupScrollTrigger()`.
  - Tối ưu đề xuất: `DOMContentLoaded` -> Đọc ngay vị trí `window.scrollY` ban đầu -> Preload 10-12 frames tương ứng vị trí đó (nếu ở đầu trang thì 0..12, nếu ở giữa trang thì load xung quanh frame hiện tại) -> Initialize ScrollTrigger ngay lập tức để tránh bước nhảy progress đột ngột.

---

# Security & authorization considerations
- Dự án là trang landing page công khai (public landing page).
- Không có dữ liệu người dùng nhạy cảm hoặc API xác thực bí mật cần can thiệp.
- Cần bổ sung các header bảo mật cơ bản (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) trên Express server khi triển khai production.

---

# Edge cases
1. **Trình duyệt tải lại trang ở giữa Hero Section (`scrollY > 0`)**: Người dùng bấm F5 khi đang ở Beat 3 (progress ~0.49). Cần đảm bảo hệ thống không nhảy khung hình giật cục hoặc giữ màn hình đen/trắng khi frame 47 chưa tải xong.
2. **Cuộn siêu tốc bằng thanh cuộn (Scrollbar Dragging hoặc PageDown/End)**: Người dùng kéo scrollbar từ 0% xuống 100% trong 0.1 giây. Hàng trăm frame bị nhảy qua; hàng đợi `loadQueue` phải ưu tiên ngay lập tức frame 95 và huỷ các request không còn cần thiết.
3. **Màn hình xoay hoặc thay đổi kích thước đột ngột (Resize / Orientation Change)**: Canvas cần resize mượt mà không bị chớp đen hoặc reset mất frame đang hiển thị.
4. **Mạng chập chờn / mất kết nối (Network Offline / Flaky 3G)**: Khi một frame tải lỗi (`onerror`), hệ thống phải tiếp tục giữ frame hợp lệ gần nhất mà không làm crash RAF loop.

---

# Test plan

### 1. Kiểm thử tự động (Automated Testing với Puppeteer)
- Tận dụng và mở rộng script `verify_experience.js`:
  - **Test Case 1: Zero Console Errors**: Xác nhận không có uncaught exception, console warning hoặc 404 image request.
  - **Test Case 2: Multi-Beat Screenshot Validation**: Tự động chụp lại màn hình tại các mốc cuộn:
    - Beat 1: Intro (0%)
    - Beat 2: Figure Separation (30%)
    - Beat 3: Exploded Hold (49%)
    - Beat 4: Printer Reveal (68%)
    - Beat 5: Settled Printer (88%)
  - **Test Case 3: Reload at Mid-Scroll**: Điều hướng tới `scrollY = 1500px`, reload trang và kiểm tra xem canvas có hiển thị frame ổn định không giật không.
  - **Test Case 4: Performance Metrics Capture**: Đo lường thời gian tải DOM, First Meaningful Paint, và số lượng request HTTP trong quá trình cuộn.

### 2. Kiểm thử thủ công (Manual UX Verification)
- Cuộn bằng bánh xe chuột thông thường (mouse wheel tick) trên Chrome và Edge: Kiểm tra độ mượt của lerp smoothing.
- Cuộn bằng bàn rê cảm ứng (trackpad continuous scroll): Kiểm tra độ phản hồi và chuyển động mượt mà không có hiện tượng giật/khựng.
- Kiểm tra trực quan tại ranh giới chuyển tiếp Clip A (frame 48) sang Clip B (frame 1) xem có bị lệch camera hay giật góc nhìn không.

---

# Implementation sequence

### Giai đoạn 1: Khắc phục sự cố tải trang ban đầu & Tối ưu băng thông (High Priority)
1. **Chuyển đổi hình ảnh sang WebP**:
   - Chuyển đổi 96 file PNG (50MB) sang WebP chất lượng 85-90 (~6MB).
   - Đổi cấu hình `extension: 'webp'` trong SequenceLoader (code đã sẵn sàng hỗ trợ).
   - Giảm dung lượng preload mở đầu từ 6.5MB xuống còn ~800KB.
2. **Xử lý Reload ở vị trí cuộn bất kỳ**:
   - Trong `HeroController.init()`, tính toán ngay `targetProgress` và `smoothProgress` dựa trên `window.scrollY` hiện tại trước khi load, ngăn chặn giật khung hình khi người dùng refresh trang.

### Giai đoạn 2: Tối ưu hàng đợi nạp & Quản lý bộ nhớ (Medium Priority)
3. **Cải tiến In-flight Discard trong SequenceLoader**:
   - Thêm cơ chế hủy tải (`img.src = ''` và gỡ listener) đối với các frame đang tải dở dang nhưng đã bị cuộn vượt quá xa khỏi vùng sliding window.
4. **Tối ưu hóa Window Resize**:
   - Thêm `requestAnimationFrame` throttle hoặc `debounce (150ms)` cho `handleResize()` để tránh gọi `ScrollTrigger.refresh()` dồn dập làm đứng UI.
5. **Thêm Error Handling chuẩn trong `server.js`**:
   - Bổ sung 404 handler cho static assets và centralized error handler cho Express.

### Giai đoạn 3: Kiểm thử và Bàn giao (Verification)
6. Chạy bộ kịch bản kiểm thử `verify_experience.js` để xác nhận mọi mốc hiển thị đạt chuẩn.
7. Chuyển giao sang Coder và Tester theo quy trình 4 tác nhân.

---

# Risks / open issues

1. **Rủi ro tính liên tục hình ảnh Clip A -> Clip B (Asset Continuity)**:
   - Hai clip 3D được render độc lập. Mối nối giữa global frame 47 và 48 là do file ảnh gốc quyết định. Nếu file gốc bị lệch góc quay hoặc ánh sáng, code không thể tự động bù trừ mà cần cập nhật lại asset 3D nguồn.
2. **Khả năng tương thích trình duyệt cũ với WebP**:
   - Hầu hết trình duyệt hiện đại (Chrome, Edge, Safari 14+, Firefox) đều hỗ trợ WebP hoàn hảo (>97% toàn cầu). Nếu cần hỗ trợ trình duyệt cực cũ, có thể cần fallback PNG qua Express content-negotiation header `Accept: image/webp`.
3. **Bộ nhớ thiết bị cấu hình yếu (Low-end Hardware)**:
   - Nếu thiết bị có RAM dưới 4GB, việc lưu 26 decoded bitmap cùng lúc có thể cần giảm `maxCacheSize` xuống 16 frames.

---
*Kế hoạch đã hoàn thành và sẵn sàng cho Coder sau khi được người dùng phê duyệt.*


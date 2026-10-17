# Test Summary

Tester độc lập kiểm tra kết quả của Coder cho `test-agent` (WebP, mid-scroll reload, stale discard, debounce resize, Express 404/500). Đã đọc trực tiếp `sequence-loader.js`, `hero-controller.js`, `server.js`, `verify_experience.js` và chạy test hành vi bằng Puppeteer.

- **Hầu hết hạng mục đạt**: WebP đầy đủ, `/api/frames`, 404, resize, regression, concurrency slot, không treo Promise, không rejection.
- **Phát hiện 1 lỗi HIGH**: reload ở gần cuối Hero (~98.5%) vẫn flash frame 0 rồi lerp qua hàng chục frame. Lỗi tái hiện 6/6 lần. Lỗi này nằm đúng hạng mục "Mid-scroll reload" mà Coder báo đã xử lý xong.
- Phát hiện thêm 3 bug MEDIUM và 3 bug LOW.
- `verify_experience.js` PASS nhưng **không phát hiện lỗi HIGH này**: nó chỉ test `scrollY=1500` (~0.757) và không kiểm tra frame được vẽ đầu tiên.

# Environment

- Windows, Node v24.21.0, Express 5.2.1, Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe` qua puppeteer-core (headless new, viewport 1440x900, DPR 1).
- Server test chạy trên port 3100 và 3200; `verify_experience.js` chạy trên port 3000.
- **Thư mục không phải git repo** (`fatal: not a git repository`), nên không có `git diff`. Đã review trực tiếp source thay thế.
- Máy chạy chậm, nên số liệu timing mang tính tương đối.
- Test script Tester thêm vào `tests/`: `tester_assets_http.js`, `tester_server_500.js`, `tester_browser.js`, cùng các file `tests/out_*.txt`.
- Không sửa production code.
- `AGENTS.md` không tồn tại ở root repo. Đã dùng `.agents/agents/tester/agent.md` làm spec.
- Format báo cáo ở agent.md khác format do user yêu cầu; đã dùng format của user.

# Tests executed

1. `tests/tester_assets_http.js`: 18 kiểm tra về asset và HTTP.
   - Kiểm tra header RIFF/WEBP và kích thước 1920x1080 của 96 file.
   - Phục vụ 96 URL qua HTTP.
   - `/api/frames` các biến thể format.
   - 404 HTML/JSON/static/malformed URI và các route placeholder.
2. `tests/tester_server_500.js`: chạy `server.js` nguyên bản nhưng stub `compression` để ném lỗi.
   - Các case: sync throw, `err.status=418`, lỗi dạng string, `err.status=200`, lỗi sau khi đã gửi header.
   - Mỗi case thử với HTML, JSON và `*/*`.
3. `tester_browser.js reload`: reload tại 0, 0.25, 0.5, 0.75, 0.985.
   - Hook `drawImage` để ghi frame, `targetProgress`, `smoothProgress`.
   - Đếm request PNG/WebP và response lỗi.
4. `tester_browser.js reload2`: mỗi mốc 0.25/0.5/0.75/0.9/0.985 chạy 3 lần, với cache bật và tắt.
5. `tester_browser.js fast`:
   - Chạy 25 chu kỳ không throttle và 8 chu kỳ throttle (400KB/s, +120ms).
   - Mỗi chu kỳ: nhảy 0→100%→0 cộng sweep 12 bước/25ms.
   - Đo đỉnh `cache`, `activeLoading`, `loadQueue`, `pendingResolvers`.
   - Đo số request/decode theo URL, JS heap, rejection.
6. `tester_browser.js resize`: resize liên tục 4 giây (~38 sự kiện) tại 50% progress.
   - Đếm `ScrollTrigger.refresh`.
   - Lấy mẫu canvas mỗi rAF (262 mẫu).
7. `tester_browser.js regress`: 6 mốc beat, boundary Clip A→B, các section, ảnh hỏng.
8. `node verify_experience.js`: PASS, 0 lỗi console.
9. Code review thủ công 4 file chính.

# Passed tests

- 96 WebP tồn tại, tên đúng, header hợp lệ, đều 1920x1080, tổng 6.08 MiB. Không thiếu file. PNG gốc vẫn còn đủ 96.
- Cả 96 URL WebP trả HTTP 200 `image/webp`. `/frame1`, `/frame2` alias vẫn hoạt động.
- `/api/frames` mặc định trả `webp` (96 frame). `?format=png` trả toàn bộ URL `.png`. `format=gif` hoặc tham số lặp không crash (fallback webp).
- Tất cả request frame của SequenceLoader là `.webp`. Trong mọi lần chạy: **0 request PNG, 0 response 404, 0 request failed**.
- Reload tại 0, 25%, 50%, 75%, 90%: `targetProgress == smoothProgress == scrollY/maxScroll`. Frame vẽ đầu tiên đúng frame mục tiêu, không có draw frame 0, không có draw stale. Tại 0.75 harness báo "ISSUE" do làm tròn float của harness (84 so với 83), không phải lỗi sản phẩm.
- Reload nhiều lần (3 lần mỗi mốc, cache bật/tắt): 25%, 50%, 75%, 90% đều 3/3 OK.
- Fast scroll (33 chu kỳ):
  - `activeLoading`, `loadQueue`, `pendingResolvers` về 0 sau khi settle, nên không rò slot, Promise không treo.
  - Không có `unhandledrejection`, không có lỗi console.
  - `activeLoading` tối đa 4 (đúng giới hạn).
  - JS heap phẳng (1.3→2.9MB, 1.4→2.1MB). CDP `Nodes` và `JSEventListeners` ổn định, không có dấu hiệu rò listener.
- Anchor frames 0/47/48/95 luôn còn trong cache sau mọi chu kỳ.
- Không thấy eviction loop bất thường. Mỗi frame được nạp lại tối đa một lần cho mỗi lượt quét, đúng kỳ vọng với cache 26 trên 96 frame.
- Resize:
  - Canvas width/height khớp viewport ngay (1092x895).
  - `ScrollTrigger.refresh` chỉ gọi 1 lần trong 4 giây resize liên tục và 1 lần sau khi dừng.
  - Frame không bị mất (frame 47 trước và sau).
  - 0/262 mẫu rAF bị canvas trống.
- Express: route HTML không tồn tại trả 404 HTML. API không tồn tại với `Accept: application/json` trả 404 JSON. Static asset thiếu (`.webp`, `.js`) trả 404. Lỗi 500 trả 500 HTML hoặc JSON, không trả 200 (trừ case `err.status=200` ở BUG-04). Server vẫn sống sau lỗi.
- Regression: 5 Story Beat hiện đúng opacity theo từng mốc. Boundary Clip A→B đúng thứ tự (46→47→47→48→51). Loader pill bị gỡ. Products, Categories, Printing Service, Reviews, Footer đều có. 0 ảnh hỏng. Không thay đổi UI ngoài scope (chỉ đọc cấu trúc, không có diff).
- `verify_experience.js`: PASS, 0 console error và 0 warning.

# Failed tests

1. **Reload tại ~98.5% Hero** (`reload` và `reload2`): FAIL 6/6 (cache bật 3/3, cache tắt 3/3).
   - Frame 0 được vẽ trước, sau đó lerp qua các frame trung gian.
   - Xem BUG-01.
2. **Cache size sau fast scroll**: cache vượt `maxCacheSize` (đỉnh 42/26, ổn định sau settle ở 29–31/26). Xem BUG-02.
3. **Error handler khi headers đã gửi**: gây uncaught exception và request treo. Xem BUG-03.

# Bugs found

### BUG-01
- **ID**: BUG-01
- **Severity**: HIGH
- **File/function**: `public/js/hero-controller.js`: `calculateInitialProgress()`, constructor, `init()`. Nguyên nhân gốc là `public/css/main.css:48` `scroll-behavior: smooth`.
- **Reproduction**:
  1. Chạy server rồi mở Hero, cuộn tới ~98.5% (`scrollY ≈ 1950` khi viewport 1440x900).
  2. Reload (F5), hoặc chạy `PORT=3100 node tests/tester_browser.js reload2`.
  3. Quan sát log draw: lần `drawImage` đầu tiên.
- **Expected**: Frame đầu tiên được vẽ là frame 95. Không vẽ frame 0. `smoothProgress` khởi tạo bằng vị trí cuộn thật.
- **Actual**:
  - Tại thời điểm constructor chạy (DOMContentLoaded), `window.scrollY` mới là 0–27 (đo `sy` ở draw đầu tiên: 7, 3, 27, 785, 1901). Cause: Chrome khôi phục scroll bằng smooth-scroll animation, vì CSS `html { scroll-behavior: smooth }`.
  - `calculateInitialProgress()` trả ~0. `smoothProgress` bắt đầu từ 0 rồi lerp.
  - Kết quả: vẽ frame 0 trước (flash), sau đó lerp qua các frame trung gian trong khi chỉ vẽ frame cũ (frame 10) trong ~20–30 lần draw.
  - Frame 95 chỉ hiện sau ~1 giây.
  - Trường hợp cache tắt: một lần draw đầu là frame 0 ở sy=785, một lần ở sy=1901.
  - Với mốc ≤90% lỗi không xuất hiện (race phụ thuộc khoảng cách smooth-scroll). Vì vậy lỗi mang tính race, và `verify_experience.js` (chỉ test scrollY=1500) không bắt được.
- **Suggested direction**:
  - Đặt `history.scrollRestoration='manual'` rồi tự `window.scrollTo({top, behavior:'instant'})`, hoặc tạm đặt `scroll-behavior:auto`.
  - Hoặc đồng bộ lại `targetProgress/smoothProgress` ngay khi ScrollTrigger tạo xong (`ScrollTrigger.create` với `onRefresh`, hoặc gán `smoothProgress = self.progress` lần update đầu tiên khi frame chưa vẽ).
  - Hoặc đọc `scrollY` sau `window.load` rồi mới preload.
  - Thêm vào `verify_experience.js` mốc reload ~0.985 và kiểm tra frame vẽ đầu tiên.

### BUG-02
- **ID**: BUG-02
- **Severity**: MEDIUM
- **File/function**: `public/js/sequence-loader.js`: `evictCache()` (chỉ gọi từ `updateWindow()`), `startImageLoad()` (`cache.set` không tự evict).
- **Reproduction**: `node tests/tester_browser.js fast`: nhảy 0→100%→0 liên tục (tốc độ nhanh), sau đó đọc `loader.cache.size` khi đang scroll và sau khi settle.
- **Expected**: `cache.size ≤ maxCacheSize` (26), chỉ vượt tạm thời ở mức hợp lý.
- **Actual**: cache đạt đỉnh **42** (đo cả không throttle lẫn throttle), tức ~348MB bitmap decode thay vì ~215MB. Sau settle, cache giữ ở **31 (unthrottled) / 29 (throttled)** vì frame đã nạp xong sau lần `updateWindow` cuối không bị evict. Cache đứng yên ở trên giới hạn cho đến khi frame đổi. Điều này lệch với mục tiêu giảm memory pressure (kế hoạch cảnh báo thiết bị RAM thấp).
- **Suggested direction**: gọi `evictCache(this.currentFrame)` sau `cache.set(...)` trong `startImageLoad`, hoặc không cho promote vào cache nếu đã đầy mà frame nằm ngoài window. Ngoài ra bỏ frame stale ngay khi `onload` (đã làm) nhưng cũng áp dụng ở bước set.

### BUG-03
- **ID**: BUG-03
- **Severity**: MEDIUM
- **File/function**: `server.js`, error middleware 500 (`app.use((err, req, res, next) => …)`).
- **Reproduction**: `PORT=3200 node tests/tester_server_500.js`, case "late error (headers sent)": middleware ghi `res.write('partial')` rồi `next(new Error(...))`.
- **Expected**: nếu `res.headersSent`, handler chuyển cho `next(err)` (default handler đóng socket), không crash, không treo.
- **Actual**: handler vẫn gọi `res.status().render(...)` nên phát sinh `Cannot set headers after they are sent to the client` dưới dạng **uncaughtException** (harness phải bắt `process.on('uncaughtException')`; không có handler này thì tiến trình Node sẽ crash). Request treo tới timeout. Khả năng xảy ra thấp (lỗi giữa lúc stream), nhưng hậu quả là sập server.
- **Suggested direction**: thêm `if (res.headersSent) return next(err);` ở đầu error middleware.

### BUG-04
- **ID**: BUG-04
- **Severity**: LOW
- **File/function**: `server.js`, error middleware 500: `const status = err.status || err.statusCode || 500`.
- **Reproduction**: `tester_server_500.js`, case "status 200 error json": lỗi có `err.status = 200`.
- **Expected**: lỗi luôn trả 4xx/5xx.
- **Actual**: HTTP 200 kèm body `{error:'weird', status:200}`. Chưa có route nào tạo ra tình huống này, nhưng lỗi thư viện hoặc lỗi tự đặt có thể.
- **Suggested direction**: chuẩn hóa `status >= 400 && status < 600 ? status : 500`.

### BUG-05
- **ID**: BUG-05
- **Severity**: LOW
- **File/function**: `server.js`, error middleware 500 (nhánh JSON) và 404 handler.
- **Reproduction**: `tester_server_500.js`: JSON 500 trả `{"error":"secret internal detail /etc/passwd"}`. Với 404, `path: req.originalUrl` được phản chiếu.
- **Expected**: Response 500 cho client không lộ `err.message` nội bộ.
- **Actual**: `err.message` được trả nguyên cho client (information disclosure). Stack chỉ ghi log, không lộ.
- **Suggested direction**: trả thông điệp chung khi `status >= 500`, chỉ log chi tiết ở server.

### BUG-06
- **ID**: BUG-06
- **Severity**: LOW
- **File/function**: `server.js` 404 handler; `public/js/sequence-loader.js` `loadFrame()` / `processQueue()` / `updateWindow()`.
- **Reproduction (a)**: `GET /frames/clip-a/ezgif-frame-999.webp` với `Accept: image/webp,image/*,*/*` hoặc `GET /js/missing.js` với `*/*`.
- **Reproduction (b)**: đọc code: `loadFrame(i)` đưa `i` vào `loadQueue`, sau đó `updateWindow()` lọc stale khỏi hàng đợi.
- **Expected (a)**: static asset thiếu trả 404 gọn (không render trang EJS ~2KB).
- **Actual (a)**: trả 404 đúng status nhưng body là trang HTML 2006 bytes, vì `req.accepts('html')` đúng với `*/*`.
- **Actual (b)**: nếu một frame đang chờ trong `loadQueue` bị lọc stale, `pendingResolvers` của promise đó không bao giờ được resolve (treo tiềm ẩn). Hiện chỉ `init()` dùng `loadFrame`, và `updateWindow` chưa chạy trong lúc `init()` (ScrollTrigger chưa tạo). Test thực tế không tái hiện (pending=0). Là rủi ro latent nếu sau này gọi `loadFrame` ở chỗ khác.
- **Suggested direction (a)**: trả 404 text rỗng cho đường dẫn có phần mở rộng tĩnh (`/frames`, `.js`, `.css`, hình ảnh).
- **Suggested direction (b)**: resolve `null` cho các resolver của index bị loại khỏi queue.

# Regression results

| Hạng mục | Kết quả |
|---|---|
| 5 Story Beat (0.02/0.3/0.49/0.68/0.88) | Hoạt động đúng, mỗi mốc chỉ 1 beat opacity=1 |
| Clip A → Clip B (frame 47→48) | Đúng thứ tự frame (46,47,47,48,51 tại 0.43…0.56) |
| Release transition tại 0.99 | Frame 95, các beat ẩn |
| Featured Products | Có 18 phần tử khớp selector, 0 ảnh hỏng |
| Categories | Có 49 phần tử khớp selector |
| Printing Service | Có `#printing-service` |
| Reviews / Why us | Có 13 phần tử khớp |
| Footer | Có |
| Route `/printing`, `/login`, `/marketplace`, `/` | 200 |
| UI ngoài scope | Không phát hiện thay đổi (không có git diff để đối chiếu, chỉ so sánh hành vi) |
| `verify_experience.js` | PASS, 0 lỗi console/warning |

# Performance observations

- Payload frame: 6.08 MiB (WebP) so với ~50MB (PNG). Preload ban đầu 16 request WebP ở vị trí 0.
- Không có console error, uncaught exception, 404 frame, hoặc request thất bại trong mọi lần chạy.
- Số request frame: 3216 request cho 96 URL duy nhất sau 25 chu kỳ quét toàn dải (tối đa 50 lần cho một URL). Phù hợp với việc cache chỉ 26 trên 96 frame; không có vòng lặp nạp cùng một frame liên tục khi đứng yên.
- Decode: 5618 lần `decode()` / 96 frame (tối đa 90 lần cho một frame, nhiều hơn số request vì request có thể được phục vụ từ cache trình duyệt). Là chi phí do eviction, chưa có dấu hiệu vòng lặp.
- Memory: JS heap phẳng (1.3→2.9MB). Không có dấu hiệu rò listener/DOM (`JSEventListeners` ~106→102, `Nodes` ~1530). Bộ nhớ bitmap đã decode không đo được trực tiếp. Cache 42 (đỉnh) tương đương ~348MB là **memory pressure tạm thời** (BUG-02), không phải leak thật vì sau settle ổn định ở 29–31 và không tăng thêm qua các chu kỳ.
- Máy chậm nên timing tuyệt đối không đáng tin; so sánh payload với trước dựa trên số liệu file (WebP vs PNG), không có đo network thực tế bản cũ.

# Risks not fully tested

- Safari/Firefox: chưa test. Chỉ test Chrome headless. Hành vi scroll restoration và decode có thể khác.
- GPU thật, màn hình DPR cao, thiết bị di động, và hiệu năng FPS thực chưa đo. Headless không phản ánh jank.
- Bộ nhớ bitmap decode thực tế (GPU/RAM) chưa đo; chỉ suy ra từ `cache.size`.
- Trường hợp cuộn bằng bánh xe/trackpad thực (không phải `scrollTo`) và kéo scrollbar chưa mô phỏng đầy đủ.
- Mất mạng giữa chừng/offline (`onerror`) mới review code, chưa chạy test mạng lỗi. Code xử lý `onerror` giải phóng slot đúng.
- Trình duyệt không hỗ trợ WebP: không có fallback PNG ở client (kế hoạch đã nêu rủi ro).
- Reload giữa 0.9–0.985 chưa quét mịn; ngưỡng thực sự để BUG-01 xảy ra có thể thấp hơn 0.985 trên máy khác.
- Không so sánh được với source trước thay đổi do không có git history.

# Verdict

FAIL

Lý do: BUG-01 là HIGH. Reload gần cuối Hero vẫn vẽ frame 0 rồi lerp qua frame trung gian (tái hiện 6/6), trái với yêu cầu "không được flash frame 0" và mô tả hoàn tất của Coder. Hai bug MEDIUM (BUG-02, BUG-03) cũng nên sửa cùng đợt.


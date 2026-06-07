Distributed Nested Loop Join Simulator
Dự án mô phỏng thuật toán Distributed Nested Loop Join (DNJL) trên dữ liệu mẫu `Customers` và `Orders`. Ứng dụng được xây dựng bằng Next.js, dùng để minh họa cách dữ liệu được phân tán lên nhiều node, cách từng node thực hiện join cục bộ và cách coordinator thu thập kết quả.
1. Giới thiệu
Distributed Nested Loop Join Simulator là một website mô phỏng trực quan quá trình join dữ liệu trong môi trường cơ sở dữ liệu phân tán. Dữ liệu ban đầu gồm hai bảng:
`Customers`: danh sách khách hàng.
`Orders`: danh sách đơn hàng.
Hai bảng được chia đều cho nhiều node. Sau đó, hệ thống thực hiện thuật toán Nested Loop Join để tìm các đơn hàng tương ứng với từng khách hàng thông qua khóa `customer_id`.
Project phù hợp cho môn Cơ sở dữ liệu phân tán, đặc biệt khi cần trình bày quá trình xử lý join, phân tán dữ liệu, thu thập kết quả và mô phỏng lỗi node.
2. Công nghệ sử dụng
Next.js 16
React 19
JavaScript
CSS
Turbopack
Một số thư viện có trong project:
`next`
`react`
`react-dom`
`chart.js`
`react-chartjs-2`
`swiper`
`mysql2`
`bcryptjs`
`jsonwebtoken`
3. Chức năng chính
Mô phỏng phân tán dữ liệu `Customers` và `Orders` lên nhiều node.
Thực hiện thuật toán Distributed Nested Loop Join.
Hiển thị trạng thái xử lý của từng node.
Ghi log từng bước trong quá trình mô phỏng.
Đếm số phép so sánh và số kết quả join thành công.
Hiển thị kết quả join cuối cùng.
Cho phép điều chỉnh số lượng node.
Cho phép điều chỉnh tốc độ mô phỏng.
Mô phỏng lỗi node trong quá trình xử lý.
Hiển thị số node bị lỗi và lượng dữ liệu bị mất.
4. Cấu trúc thư mục chính
```txt
laluz-next/
├── app/
│   ├── (site)/
│   │   └── dnjl-simulator/
│   │       ├── data.js
│   │       ├── layout.js
│   │       ├── page.jsx
│   │       └── style.css
│   ├── globals.css
│   ├── layout.js
│   └── favicon.ico
├── next.config.mjs
├── package.json
├── package-lock.json
├── jsconfig.json
├── eslint.config.mjs
└── README.md
```
Trong đó:
`app/(site)/dnjl-simulator/page.jsx`: file chính chứa giao diện và logic mô phỏng.
`app/(site)/dnjl-simulator/data.js`: dữ liệu mẫu, màu node, trạng thái node và các kịch bản lỗi.
`app/(site)/dnjl-simulator/style.css`: giao diện của trang mô phỏng.
`app/layout.js`: layout gốc của ứng dụng.
`app/globals.css`: CSS dùng chung toàn project.
`next.config.mjs`: cấu hình Next.js.
`package.json`: danh sách dependencies và scripts chạy project.
5. Yêu cầu cài đặt
Trước khi chạy project, cần cài đặt:
Node.js phiên bản 20 trở lên. Khuyến nghị dùng Node.js 22.
npm đi kèm với Node.js.
Kiểm tra phiên bản Node.js và npm:
```bash
node -v
npm -v
```
6. Cài đặt project
Sau khi tải project về, mở terminal tại thư mục gốc của project:
```bash
cd laluz-next
```
Cài đặt các thư viện cần thiết:
```bash
npm install
```
7. Chạy project ở chế độ development
Chạy lệnh:
```bash
npm run dev
```
Sau khi server chạy thành công, mở trình duyệt tại:
```txt
http://localhost:3000/dnjl-simulator
```
Trong project hiện tại, script `dev` có in thêm đường dẫn tiện sử dụng:
```json
"dev": "echo Local DNJL: http://localhost:3000/dnjl-simulator && next dev"
```
Lưu ý: Next.js vẫn có thể hiển thị dòng mặc định:
```txt
Local: http://localhost:3000
```
Đây là địa chỉ server development của Next.js. Trang mô phỏng chính của project nằm tại route:
```txt
/dnjl-simulator
```
8. Build project
Để build project cho môi trường production:
```bash
npm run build
```
Sau khi build thành công, chạy production server:
```bash
npm run start
```
Mở trình duyệt tại:
```txt
http://localhost:3000/dnjl-simulator
```
9. Mô tả thuật toán Distributed Nested Loop Join
Thuật toán Distributed Nested Loop Join trong project được mô phỏng theo các bước chính:
Khởi tạo dữ liệu
Tạo dữ liệu mẫu cho bảng `Customers`.
Tạo dữ liệu mẫu cho bảng `Orders`.
Phân tán dữ liệu
Dữ liệu được chia đều cho các node.
Mỗi node nhận một phần dữ liệu khách hàng và đơn hàng.
Join cục bộ tại từng node
Mỗi node duyệt từng customer.
Với mỗi customer, node tiếp tục duyệt từng order.
Nếu `customer.customer_id === order.customer_id`, hệ thống tạo một kết quả join.
Thu thập kết quả
Coordinator nhận kết quả từ các node.
Các kết quả join được gom lại và hiển thị trên giao diện.
Mô phỏng lỗi node
Một hoặc nhiều node có thể bị crash trong quá trình xử lý.
Khi node bị lỗi, dữ liệu nằm trên node đó được xem như bị mất.
Hệ thống cập nhật trạng thái node, log lỗi và thống kê dữ liệu bị ảnh hưởng.
10. Dữ liệu mẫu
Dữ liệu mẫu được đặt trong file:
```txt
app/(site)/dnjl-simulator/data.js
```
Ví dụ bảng `Customers`:
```js
export const DEFAULT_CUSTOMERS = [
  { customer_id: 1, name: "Nguyễn Văn An", city: "Hà Nội" },
  { customer_id: 2, name: "Trần Thị Bình", city: "TP.HCM" },
  { customer_id: 3, name: "Lê Minh Cường", city: "Đà Nẵng" },
];
```
Ví dụ bảng `Orders`:
```js
export const DEFAULT_ORDERS = [
  { order_id: 101, customer_id: 1, product: "Chanel No.5", amount: 4500000 },
  { order_id: 102, customer_id: 3, product: "Dior Sauvage", amount: 3200000 },
];
```
Có thể chỉnh sửa dữ liệu mẫu trực tiếp trong file này để thay đổi nội dung mô phỏng.
11. Các kịch bản lỗi node
Project có sẵn một số kịch bản lỗi trong file `data.js`:
Node giữa bị lỗi: node 1 bị crash sau một khoảng thời gian.
Lỗi dây chuyền: nhiều node lần lượt bị crash.
Lỗi khi thu thập: node cuối bị crash khi coordinator đang thu thập kết quả.
Các kịch bản này giúp minh họa ảnh hưởng của lỗi node trong môi trường cơ sở dữ liệu phân tán.
12. Scripts trong package.json
```json
{
  "scripts": {
    "dev": "echo Local DNJL: http://localhost:3000/dnjl-simulator && next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```
Ý nghĩa:
`npm run dev`: chạy project ở chế độ development.
`npm run build`: build project cho production.
`npm run start`: chạy project sau khi build.
`npm run lint`: kiểm tra lỗi code bằng ESLint.
13. Ghi chú cấu hình
Project đang dùng route thật:
```txt
app/(site)/dnjl-simulator/page.jsx
```
Vì vậy không bắt buộc phải dùng `basePath` trong `next.config.mjs`. Chỉ cần mở đúng URL:
```txt
http://localhost:3000/dnjl-simulator
```
Nếu thêm `basePath: '/dnjl-simulator'`, toàn bộ ứng dụng sẽ bị đặt dưới base path này và có thể gây nhầm lẫn với route thật `/dnjl-simulator`. Với project hiện tại, nên giữ cách dùng route thật để đơn giản và dễ chạy trong môi trường development.
14. Lưu ý khi đưa project lên GitHub
Không nên đưa các thư mục hoặc file sau lên GitHub:
```txt
node_modules/
.next/
.env
.env.local
```
Các mục này đã được cấu hình trong `.gitignore`. Nếu file zip hoặc repository đang có thư mục `.next`, có thể xóa thư mục này trước khi nộp hoặc push code vì đây là thư mục build/cache được Next.js tự tạo lại.
15. Tác giả
Project được thực hiện cho mục đích học tập và mô phỏng thuật toán trong môn Cơ sở dữ liệu phân tán.
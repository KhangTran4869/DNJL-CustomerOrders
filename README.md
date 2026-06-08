# Distributed Nested Loop Join Simulator

Distributed Nested Loop Join Simulator là một project mô phỏng thuật toán **Distributed Nested Loop Join (DNJL)** trên hai bảng dữ liệu mẫu `Customers` và `Orders`. Ứng dụng được xây dựng bằng **Next.js** và **React**, dùng để minh họa cách dữ liệu được phân tán lên nhiều node, cách thuật toán join xử lý theo block, cách network latency ảnh hưởng đến thời gian thực thi, và cách lỗi node ảnh hưởng đến kết quả truy vấn phân tán.

## 1. Giới thiệu

●	Name: Trần Hoàng Gia Khang
●	MSSV: N23DCCN028
●	Project Title: #13 Distributed Nested Loop Join Simulator: “Customer–Orders”

Trong cơ sở dữ liệu phân tán, dữ liệu thường không nằm tập trung tại một máy duy nhất mà được phân bố trên nhiều site/node khác nhau. Khi thực hiện phép join giữa các bảng nằm trên nhiều node, hệ thống cần quan tâm không chỉ đến chi phí xử lý cục bộ mà còn đến chi phí truyền dữ liệu qua mạng.

Truy vấn global trong hệ thống là:

```txt
Customers JOIN Orders
ON Customers.customer_id = Orders.customer_id
```

Project này mô phỏng phép join giữa hai quan hệ:

```txt
Customers(customer_id, name, city)
Orders(order_id, customer_id, product, amount)
```

Điều kiện join:

```txt
Customers.customer_id = Orders.customer_id
```

Mục tiêu chính của simulator là phân tích ảnh hưởng của:

```txt
- Block Size
- Network Latency
- Number of Nodes
- Node Failure
```

đến quá trình thực thi thuật toán Distributed Nested Loop Join.

## 2. Công nghệ sử dụng

| Thành phần           | Công nghệ                           |
| -------------------- | ----------------------------------- |
| Programming Language | JavaScript / JSX                    |
| Frontend Framework   | Next.js, React                      |
| Routing              | Next.js App Router                  |
| Algorithm Simulation | JavaScript async/await, React state |
| Visualization        | Canvas chart panel                  |
| Dataset              | Synthetic data generated at runtime |
| Deployment           | Localhost bằng npm                  |
| Quality Check        | ESLint                              |

## 3. Chức năng chính

Project hiện hỗ trợ các chức năng chính sau:

```txt
- Sinh dữ liệu mẫu Customers và Orders.
- Chọn preset dataset: nhỏ, vừa, lớn, thực tế.
- Phân tán dữ liệu lên nhiều node.
- Mô phỏng thuật toán Page-Oriented Distributed Nested Loop Join.
- Cho phép thay đổi Block Size.
- Cho phép thay đổi Network Latency từ 1ms đến 200ms.
- Hiển thị số packet/block đã truyền.
- Hiển thị network time.
- Đếm số phép so sánh.
- Đếm số kết quả join thành công.
- Ghi log từng bước trong quá trình mô phỏng.
- Hiển thị trạng thái từng node.
- Mô phỏng lỗi node.
- Hiển thị dữ liệu bị mất khi node crash.
- Vẽ biểu đồ Execution Time vs Network Latency.
- So sánh execution time theo nhiều block size khác nhau.
```

## 4. Cấu trúc thư mục

```txt
DNJL/
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
├── eslint.config.mjs
├── jsconfig.json
├── next.config.mjs
├── package.json
├── package-lock.json
└── README.md
```

Trong đó:

| File                                  | Vai trò                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/(site)/dnjl-simulator/page.jsx`  | File chính chứa giao diện và logic mô phỏng                                         |
| `app/(site)/dnjl-simulator/data.js`   | Chứa hàm sinh dataset, preset, latency range, block size options, failure scenarios |
| `app/(site)/dnjl-simulator/style.css` | CSS riêng cho trang simulator                                                       |
| `app/layout.js`                       | Layout gốc của Next.js                                                              |
| `app/globals.css`                     | CSS global                                                                          |
| `package.json`                        | Khai báo scripts và dependencies                                                    |
| `next.config.mjs`                     | Cấu hình Next.js                                                                    |

## 5. Yêu cầu cài đặt

Trước khi chạy project, cần cài đặt:

```txt
- Node.js 20 trở lên
- npm
```

Khuyến nghị sử dụng Node.js 22.

Kiểm tra phiên bản:

```bash
node -v
npm -v
```

## 6. Cài đặt project

Clone project từ GitHub:

```bash
git clone https://github.com/KhangTran4869/DNJL-CustomerOrders.git
cd DNJL
```

Cài đặt dependencies:

```bash
npm install
```

## 7. Chạy project

Chạy project ở chế độ development:

```bash
npm run dev
```

Sau đó mở trình duyệt tại:

```txt
http://localhost:3000/dnjl-simulator
```

Trong `package.json`, script `dev` đã được cấu hình để in ra đường dẫn nhanh:

```json
"dev": "echo Local DNJL: http://localhost:3000/dnjl-simulator && next dev"
```

Lưu ý: Next.js vẫn có thể hiển thị địa chỉ mặc định:

```txt
http://localhost:3000
```

Tuy nhiên, trang simulator chính nằm tại:

```txt
/dnjl-simulator
```

## 8. Scripts

Các lệnh chính trong project:

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

| Lệnh            | Mô tả                                |
| --------------- | ------------------------------------ |
| `npm run dev`   | Chạy project ở chế độ development    |
| `npm run build` | Build project cho production         |
| `npm run start` | Chạy production server sau khi build |
| `npm run lint`  | Kiểm tra chất lượng code bằng ESLint |

## 9. Dataset

Dataset được sinh tự động tại runtime, không cần database bên ngoài.

Các preset có sẵn:

| Preset   | Customers |  Orders |
| -------- | --------: | ------: |
| Nhỏ demo |         5 |       7 |
| Vừa      |        50 |     500 |
| Lớn      |       200 |   5,000 |
| Thực tế  |     1,000 | 100,000 |

Cấu trúc dữ liệu:

```js
Customers = [
  {
    customer_id: 1,
    name: "Nguyễn Văn An",
    city: "Hà Nội"
  }
]
```

```js
Orders = [
  {
    order_id: 101,
    customer_id: 1,
    product: "Chanel No.5",
    amount: 4500000
  }
]
```

Dữ liệu được sinh trong file:

```txt
app/(site)/dnjl-simulator/data.js
```

## 10. Mô tả thuật toán

Project mô phỏng thuật toán **Page-Oriented Distributed Nested Loop Join**.

Ý tưởng chính:

```txt
FOR each customer block:
  FOR each order block:
    simulate network transfer
    FOR each customer in customer block:
      FOR each order in order block:
        IF customer.customer_id == order.customer_id:
          output joined row
```

Trong project:

```txt
- Customers đóng vai trò outer relation.
- Orders đóng vai trò inner relation.
- Dữ liệu được xử lý theo block/page.
- Mỗi lần truyền block được tính như một packet.
- Network latency được cộng vào chi phí truyền dữ liệu.
```

Block Size ảnh hưởng trực tiếp đến số packet:

```txt
Block Size nhỏ  -> nhiều packet hơn -> network time cao hơn
Block Size lớn  -> ít packet hơn    -> network time thấp hơn
```

## 11. Mô hình chi phí

Simulator sử dụng công thức mô phỏng tổng quát:

```txt
Total Execution Time = Local Processing Time + Network Transfer Time
```

Trong đó:

```txt
Network Transfer Time = Number of Packets × Latency per Packet
```

Project cho phép thay đổi latency trong khoảng:

```txt
1ms, 5ms, 10ms, 25ms, 50ms, 75ms, 100ms, 150ms, 200ms
```

Các block size được hỗ trợ:

```txt
1, 5, 10, 25, 50, 100
```

## 12. Biểu đồ phân tích

Tab chart hiển thị biểu đồ:

```txt
Execution Time vs Network Latency
```

Biểu đồ dùng để phân tích:

```txt
- Khi latency tăng, execution time tăng.
- Khi block size tăng, số packet thường giảm.
- Block size có ảnh hưởng trực tiếp đến network transfer time.
- Điểm chạy thực tế sau mỗi lần simulation có thể được hiển thị trên biểu đồ.
```

## 13. Mô phỏng lỗi node

Project có hỗ trợ một số kịch bản lỗi node, ví dụ:

```txt
- Node giữa bị lỗi
- Lỗi dây chuyền
- Lỗi khi gather kết quả
```

Khi một node bị lỗi:

```txt
- Node được đánh dấu FAILED.
- Dữ liệu trên node đó được xem như bị mất.
- Kết quả join có thể trở thành partial result.
- Hệ thống ghi log lỗi và cập nhật thống kê dữ liệu bị ảnh hưởng.
```

Chức năng này giúp minh họa một vấn đề quan trọng trong cơ sở dữ liệu phân tán: khi dữ liệu nằm trên nhiều site, lỗi tại một node có thể ảnh hưởng đến tính đầy đủ của kết quả truy vấn.

## 14. Kiểm tra chất lượng code

Chạy ESLint:

```bash
npm run lint
```

Nếu kết quả chỉ có warning và không có error, project vẫn có thể chạy được.

Ví dụ warning thường gặp:

```txt
React Hook useEffect has a missing dependency
```

Warning này không làm project dừng chạy, nhưng có thể được cải thiện bằng cách thêm dependency phù hợp hoặc sử dụng `useCallback`.

Ngoài ra, thông báo sau có thể xuất hiện:

```txt
[baseline-browser-mapping] The data in this module is over two months old
```

Đây chỉ là thông báo phụ từ dependency, không phải lỗi nghiêm trọng.

Có thể cập nhật bằng lệnh:

```bash
npm i baseline-browser-mapping@latest -D
```

## 15. Hướng phát triển tương lai

Project có thể được mở rộng theo các hướng sau:

```txt
- So sánh DNJL với Hash Join hoặc Sort-Merge Join.
- Bổ sung backend riêng cho từng node.
- Lưu dữ liệu bằng JSON file, SQLite hoặc MySQL.
- Mô phỏng bandwidth, packet size và packet loss.
- Bổ sung replication và automatic failover.
- Xuất kết quả benchmark ra CSV hoặc PDF.
- Triển khai bằng Docker để mô phỏng nhiều node rõ ràng hơn.
```

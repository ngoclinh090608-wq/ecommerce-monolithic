# E-commerce Monolithic API

REST API MVP dùng Node.js, Express, Prisma và PostgreSQL. Auth, Product,
Order và Shipment chạy trong cùng một ứng dụng; PostgreSQL là dịch vụ riêng.

## Khởi tạo lần đầu bằng Docker

Cài Docker Desktop và mở terminal tại thư mục repository.

1. Sao chép `.env.example` thành `.env` (PowerShell: `Copy-Item .env.example .env`).
   Nếu đã có `.env`, giữ file hiện tại. Đặt `POSTGRES_PASSWORD` và `JWT_SECRET`
   riêng cho môi trường; cập nhật mật khẩu trong `DATABASE_URL` cho khớp.
   Không commit `.env`.
2. Chạy:

   ```powershell
   docker compose up -d --build
   docker compose exec app npm run seed
   docker compose ps
   ```

   App tự áp dụng migration trước khi khởi động. Seed tạo role `normal`, `admin`,
   membership score 10, tài khoản mẫu `admin` / `Admin@123456`, và Product X/Y.
   Tài khoản này chỉ dùng cho demo cục bộ. Seed chạy lại giữ nguyên tài khoản,
   sản phẩm và tồn kho đã có; không xóa các bản ghi trùng từ lần seed cũ.

3. Kiểm tra `GET http://127.0.0.1:3000/health/ready`:
   cần trả 200 với `status: READY` và `database: UP`.
   `docker compose ps` cần hiện app và db healthy.

Các lần mở lại chỉ cần `docker compose up -d`. Không cần seed lại.
Dữ liệu nằm trong Docker volume; `docker compose down -v` sẽ xóa dữ liệu.

## Phát triển bằng Node.js trên máy

Dừng app Docker nếu đang dùng cổng 3000: `docker compose stop app`.
Sau khi chuẩn bị `.env`:

```powershell
npm ci
npx prisma generate
docker compose up -d db
npx prisma migrate deploy
npm run seed
npm run dev
```

`DATABASE_URL` cho Node trên máy dùng hostname `localhost`.
Compose tự truyền URL dùng hostname `db` cho app container.

## Kiểm tra theo bài chấm

- `POST /api/auth/register`: JSON gồm username, fullname, password; mong đợi 201,
  role normal và score 10. Dùng username mới nếu đã thử đăng ký trước đó.
- `POST /api/auth/login`: username, password; mong đợi 200 và token.
- `GET /api/products`: lấy ID và tồn kho thực tế của X/Y.
- `POST /api/orders` không token: mong đợi 401.
- Cùng request với Authorization Bearer token: mong đợi 201. Ví dụ body:
  `{"items":[{"pid":1,"qty":2},{"pid":2,"qty":5}]}`.
  Thay ID bằng ID thực tế. Mỗi ID chỉ xuất hiện một lần; trùng trả 400.
  Thiếu tồn kho trả 409 và toàn bộ transaction được rollback.
- `GET /api/orders` với token: xem đơn và chi tiết.
- `GET /api/shipments/:id` với token: dùng **shipid** từ mảng shipments của đơn,
  mong đợi PENDING. Không có endpoint GET danh sách `/api/shipments`.
- Kiểm tra SQL trong PostgreSQL:

  ```powershell
  docker exec -it ecommerce-postgres psql -U postgres -d ecommerce_db
  ```

  ```sql
  SELECT * FROM "Order";
  SELECT * FROM "OrderDetail";
  SELECT * FROM "Product";
  SELECT * FROM "Shipment";
  ```

Seed mới tạo tồn kho 50 mỗi sản phẩm. Sau một đơn mua X=2 và Y=5,
tồn kho tương ứng là 48 và 45. Dữ liệu dùng trước đó có thể khác.

## Kiểm thử logic đặt hàng

```powershell
node tests/orders.test.js
```

Bốn test dùng database giả để kiểm tra dữ liệu đầu vào, ID trùng, thiếu sản phẩm,
thiếu tồn kho, và lệnh giữ tồn kho có điều kiện. Chúng không thay thế kiểm thử
đồng thời và rollback trên PostgreSQL thực tế.

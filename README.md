# OngVang Web

## Run on a local network

1. Start SQL Server and make sure `OngVang-Backend/.env` has the correct SQL connection settings.
2. From this project folder, run `npm.cmd start` in PowerShell (or `npm start` in Command Prompt).
3. On the server computer, open `http://localhost:3001`.
4. On another computer on the same network, open `http://<LAN-IP-of-server>:3001`. Allow inbound TCP port 3001 through the server computer's firewall if Windows blocks access.

The backend serves both the web app and API from the same address, and listens on all network interfaces. Keep the backend running while other computers use the site.

For access over the public Internet, deploy this app to a reachable server and route HTTPS traffic to the Node.js app. Public deployment also requires configuring SQL Server network access and credentials on that server.

----

```
Cải tiến 1 số thứ:
1- Thêm chức năng đăng xuất
2- Fix lại thông báo cụ thể cho voucher
3- Fix lại list các danh mục, phân trang cho gọn gàng tránh dài lê thê
4- Fix nhân viên, không được dùng các chức năng danh mục nhà hàng của admin
5- Fix thêm 1 vài lỗi vặt voucher
6- Fix nhân viên, không được dùng chức năng cài đặt web của admin
7- Fix chức năng ghi nhớ tài khoản
8- Fix form cập nhật thông tin nhân viên
```

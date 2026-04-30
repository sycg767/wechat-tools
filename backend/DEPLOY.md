# Docker 部署

## 1. 准备目录

服务器上只需要上传 `backend` 目录即可。

如果你要使用 PDF 页面管理功能，需要先把 Linux 版 `pdfcpu` 放到：

```bash
backend/tools/pdfcpu/pdfcpu
```

并确保它有可执行权限：

```bash
chmod +x backend/tools/pdfcpu/pdfcpu
```

注意：当前仓库里原有的是 Windows 版 `pdfcpu.exe`，不能直接用于 Linux 服务器。

进入 `backend` 目录后执行：

```bash
cp .env.example .env
```

然后按你的服务器实际情况填写 `.env`。

## 2. 启动服务

在 `backend` 目录执行：

```bash
docker compose up -d --build
```

启动后会运行：
- `postgres` 数据库
- `backend` 后端服务

后端默认端口为 `8080`，接口前缀为 `/api`。

## 3. 常用命令

查看服务状态：

```bash
docker compose ps
```

查看后端日志：

```bash
docker compose logs -f backend
```

停止服务：

```bash
docker compose down
```

重新构建并启动：

```bash
docker compose up -d --build
```

## 4. 持久化目录

Compose 已持久化以下数据：
- PostgreSQL 数据
- 后端 `storage`
- 后端 `logs`

## 5. 说明

- 微信小程序 `miniprogram` 不需要上传到服务器。
- 服务器只部署 `backend` 目录。
- OCR 本地能力依赖镜像内的 `tesseract`。
- PDF 页面管理能力依赖你放在 `backend/tools/pdfcpu/pdfcpu` 的 Linux 版 `pdfcpu`。
- 生产环境建议把域名反代到后端 `8080` 端口，并为小程序配置合法请求域名。

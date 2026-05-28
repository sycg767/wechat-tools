# Docker 部署文档

## 一、首次部署

### 1. 创建目录

```bash
mkdir -p /root/wechat-tools
cd /root
```

### 2. 只拉取后端目录（sparse checkout）

```bash
git clone --filter=blob:none --sparse https://github.com/sycg767/wechat-tools.git wechat-tools
cd wechat-tools
git sparse-checkout set backend
```

工作区只会出现 `backend/`，其他文件不检出。

### 3. 准备 pdfcpu（Linux 版）

将 Linux 版 `pdfcpu` 可执行文件放到：

```text
backend/tools/pdfcpu/linux/pdfcpu
```

### 4. 配置环境变量

```bash
cp backend/.env.example backend/.env
vim backend/.env
```

必须修改的值：

| 变量 | 说明 |
|------|------|
| `POSTGRES_PASSWORD` | 数据库密码 |
| `VAULT_CRYPTO_KEY` | 密码保险箱加密密钥，至少 32 位 |

可选的值（按需填写）：

| 变量 | 说明 |
|------|------|
| `APP_QR_PUBLIC_BASE_URL` | 二维码短链公网地址 |
| `BAIDU_OCR_*` | 百度 OCR 配置 |
| `TENCENT_COS_*` | 腾讯云对象存储配置 |
| `TENCENT_CI_*` | 腾讯云数据万象配置 |
| `FREE_ASTRO_*` | 星座 API 配置 |

### 5. 构建并启动

```bash
cd /root/wechat-tools/backend
docker-compose up -d --build
```

### 6. 检查是否启动成功

```bash
docker logs -f wechat-tools-backend
```

看到 `Started WechatToolsApplication` 即启动成功。

```bash
docker ps
```

确认 `wechat-tools-backend` 和 `wechat-tools-postgres` 两个容器都在运行。

---

## 二、更新代码

每次本地推送新代码到 GitHub 后，在服务器执行：

```bash
cd /root/wechat-tools
git pull
cd backend
docker-compose up -d --build
```

- `git pull` 必须在 `/root/wechat-tools`（仓库根目录）执行，不能在 `backend` 里执行。
- `--build` 会重新编译打包，确保跑的是最新代码。

---

## 三、常用命令

### 查看日志

```bash
docker logs -f wechat-tools-backend           # 实时
docker logs --tail 100 wechat-tools-backend    # 最近100行
```

### 重启容器

```bash
cd /root/wechat-tools/backend
docker-compose restart
```

### 停止容器

```bash
cd /root/wechat-tools/backend
docker-compose down
```

### 进入容器调试

```bash
docker exec -it wechat-tools-backend sh
```

### 容器内测试接口

```bash
docker exec -it wechat-tools-backend curl http://localhost:8080/api/vault/items
```

### 重建并启动（清除缓存）

```bash
cd /root/wechat-tools/backend
docker-compose build --no-cache
docker-compose up -d
```

一般不需要，只在 Docker 缓存出问题时使用。

---

## 四、目录结构

服务器上的文件布局：

```text
/root/wechat-tools/
├── .git/                          # Git 仓库数据
└── backend/                       # 检出目录（唯一可见目录）
    ├── .env                       # 环境变量（你手动创建）
    ├── .env.example               # 环境变量模板
    ├── docker-compose.yml
    ├── Dockerfile
    ├── pom.xml
    ├── src/                       # Java 源码
    ├── tools/
    │   └── pdfcpu/
    │       └── linux/
    │           └── pdfcpu          # Linux 版 pdfcpu 可执行文件
    ├── storage/                    # 文件存储（挂载卷）
    └── logs/                       # 日志（挂载卷）
```

---

## 五、故障排查

### 启动失败，查看错误

```bash
docker logs wechat-tools-backend 2>&1 | grep -i "error\|exception\|fail"
```

### 常见错误

| 错误信息 | 原因 | 解决 |
|----------|------|------|
| `未配置 vault.crypto-key` | `.env` 没设 `VAULT_CRYPTO_KEY` | 在 `.env` 添加并设至少 32 位密钥 |
| `No static resource vault/items` | Vault 加密密钥未配置 | 同上 |
| `COPY tools/pdfcpu/linux/pdfcpu` 失败 | 没放 Linux 版 pdfcpu | 将 pdfcpu 放到指定路径 |
| 数据库连接失败 | PostgreSQL 没启动或密码错误 | 检查 `docker ps`，确认 postgres 容器健康 |
| 端口被占用 | 8080 端口冲突 | 修改 `.env` 中 `BACKEND_PORT` |
| 跑的仍是旧代码 | 只用了 `docker-compose up -d` 没加 `--build` | 用 `docker-compose up -d --build` |

### 数据库密码修改

如果改了 `POSTGRES_PASSWORD`，需要删除旧数据卷重建：

```bash
cd /root/wechat-tools/backend
docker-compose down -v
docker-compose up -d --build
```

注意：`-v` 会删除数据库数据，谨慎使用。

# Mac安装Docker Desktop指南

## 📦 安装Docker Desktop

### 方式1: 使用Homebrew（推荐）

```bash
# 安装Homebrew（如果还没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装Docker Desktop
brew install --cask docker

# 启动Docker Desktop
open /Applications/Docker.app
```

### 方式2: 手动下载安装

1. 访问Docker官网: https://www.docker.com/products/docker-desktop
2. 点击"Download for Mac"
3. 根据芯片选择:
   - **Apple Silicon (M1/M2/M3)**: 下载"Mac with Apple chip"
   - **Intel**: 下载"Mac with Intel chip"
4. 下载完成后双击.dmg文件安装
5. 将Docker拖到Applications文件夹
6. 打开Docker.app，按提示完成初始化

## ⚙️ 配置Docker

### 1. 首次启动配置

启动Docker Desktop后，在顶部菜单栏会出现Docker图标。点击图标 → Settings:

**General（通用）**:
- ✅ Start Docker Desktop when you log in (开机自启)
- ✅ Use Docker Compose V2 (使用V2版本)

**Resources（资源）**:
- **CPUs**: 4核（推荐）
- **Memory**: 4GB（最低）/ 8GB（推荐）
- **Disk image size**: 60GB

**Docker Engine（引擎）**:
保持默认配置即可

### 2. 验证安装

打开终端，运行:

```bash
# 检查Docker版本
docker --version
# 输出示例: Docker version 24.0.7

# 检查Docker Compose版本
docker-compose --version
# 输出示例: Docker Compose version v2.23.0

# 运行测试容器
docker run hello-world
# 应该看到 "Hello from Docker!" 消息
```

## 🚀 安装完成后部署

Docker Desktop安装并启动后，回到项目目录部署:

```bash
cd /Users/fulingwei/.openclaw/workspace/performance-management

# 运行部署脚本
./deploy.sh

# 或手动部署
docker-compose up -d
```

## 🐛 常见问题

### 问题1: Docker启动慢

**解决**: 
- 首次启动需要初始化，等待2-3分钟
- 查看菜单栏Docker图标，确保显示为"Docker Desktop is running"

### 问题2: 权限错误

**解决**:
```bash
sudo chown -R $USER:staff ~/.docker
```

### 问题3: 网络问题

如果下载镜像慢，配置国内镜像源:

Settings → Docker Engine → 编辑配置:

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://mirror.ccs.tencentyun.com"
  ]
}
```

点击"Apply & Restart"

### 问题4: M1/M2芯片兼容性

部分镜像可能需要指定平台:

```bash
docker-compose build --platform linux/amd64
```

## 💡 资源要求

**最低配置**:
- macOS 10.15+
- 8GB内存
- 20GB可用磁盘空间

**推荐配置**:
- macOS 12+
- 16GB内存
- 50GB可用磁盘空间

## 📞 需要帮助?

- Docker官方文档: https://docs.docker.com/desktop/mac/install/
- Docker中文社区: https://docker.org.cn/

---

**准备好后告诉我，我来帮您部署！🚀**

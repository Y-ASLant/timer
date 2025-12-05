# Flatpak 打包配置

本目录包含了为计时器应用构建 Flatpak 包所需的所有配置文件。

## 📁 文件说明

### `top.aslant.countdown.yml`
Flatpak manifest 主配置文件，定义了：
- 应用 ID：`top.aslant.countdown`
- Runtime：GNOME Platform 47
- 构建步骤和依赖
- 沙盒权限配置

### `top.aslant.countdown.desktop`
桌面入口文件，符合 freedesktop.org 标准，定义了：
- 应用名称（多语言支持）
- 图标和执行命令
- 应用分类

### `top.aslant.countdown.metainfo.xml`
AppStream 元数据文件，用于软件中心显示，包含：
- 应用描述
- 功能列表
- 截图信息
- 版本更新日志

### `flathub.json`
Flathub 发布配置，指定支持的架构。

## 🔨 本地构建

```bash
# 1. 安装必要工具
sudo apt install flatpak-builder

# 2. 添加 Flathub 仓库
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# 3. 安装运行时和 SDK
flatpak install flathub org.gnome.Platform//47 org.gnome.Sdk//47
flatpak install flathub org.freedesktop.Sdk.Extension.rust-stable

# 4. 构建应用
flatpak-builder --force-clean build-dir top.aslant.countdown.yml

# 5. 测试运行
flatpak-builder --run build-dir top.aslant.countdown.yml countdown-timer

# 6. 安装到本地
flatpak-builder --user --install --force-clean build-dir top.aslant.countdown.yml

# 7. 运行已安装的应用
flatpak run top.aslant.countdown
```

## 🚀 发布到 Flathub

要将应用发布到 Flathub：

1. Fork [Flathub 仓库](https://github.com/flathub/flathub)
2. 创建新分支，添加 `top.aslant.countdown` 仓库
3. 将这些配置文件复制到新仓库
4. 提交 Pull Request
5. 等待 Flathub 团队审核

详细流程参考：https://docs.flathub.org/docs/for-app-authors/submission

## 🔧 权限说明

应用请求的沙盒权限：
- `--socket=x11/wayland`: 显示窗口
- `--device=dri`: GPU 加速
- `--socket=pulseaudio`: 音频播放
- `--share=network`: 检查更新
- `--persist=.local/share/top.aslant.countdown`: 保存数据

## 📚 相关资源

- [Flatpak 文档](https://docs.flatpak.org/)
- [Flathub 提交指南](https://docs.flathub.org/)
- [AppStream 规范](https://www.freedesktop.org/software/appstream/docs/)

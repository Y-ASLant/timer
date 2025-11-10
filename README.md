# 计时器 / Countdown Timer

一个功能强大且美观的桌面计时器应用，基于 Tauri 2.0 构建。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB.svg)

## ✨ 特性

- 🕐 **四种工作模式**：倒计时、时钟、秒表、计数器
- 📐 **灵活布局**：四宫格、左右分屏、上下分屏、全屏单个
- 🎨 **自定义外观**：12种显示颜色、可调字体大小、亮/暗主题
- ⌨️ **快捷键支持**：空格启停、F11全屏、数字键控制单个区域
- 💤 **防休眠**：计时过程中自动防止系统休眠
- 🪟 **无边框设计**：现代化自定义窗口装饰

## 🚀 快速开始

### 下载安装

前往 [Releases](https://github.com/Y-ASLant/timer/releases) 页面下载适合您系统的安装包：
- Windows: `.msi` 或 `.exe` 安装程序

### 从源码构建

**前置要求**
- [Rust](https://www.rust-lang.org/) (最新稳定版)
- [Node.js](https://nodejs.org/) (可选，仅用于开发)

**构建步骤**

```bash
# 克隆仓库
git clone https://github.com/Y-ASLant/timer.git
cd timer

# 进入 Tauri 目录
cd src-tauri

# 构建发布版本
cargo tauri build

# 或运行开发版本
cargo tauri dev
```

构建完成后，安装包位于 `src-tauri/target/release/bundle/` 目录。

## 📖 使用说明

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `空格` | 启动/暂停所有区域 |
| `F11` | 全屏切换 |
| `F12` | 重置所有区域 |
| `ESC` | 退出全屏 |
| `1-4` | 控制对应区域 |
| 点击左上角编号 | 重置该区域 |

### 工作模式

- **倒计时**：设置时间并倒数，适合番茄工作法、考试计时等
- **时钟**：显示当前系统时间
- **秒表**：正向计时，适合运动、任务计时
- **计数器**：简单的数字计数工具

## 🛠️ 技术栈

- **框架**: [Tauri 2.0](https://tauri.app/)
- **UI**: HTML5 + [TailwindCSS](https://tailwindcss.com/)
- **后端**: Rust
- **依赖**: keepawake (防休眠)

## 📦 项目结构

```
tauri-Time/
├── src-tauri/          # Rust 后端代码
│   ├── src/           # 源代码
│   ├── Cargo.toml     # Rust 依赖配置
│   └── tauri.conf.json # Tauri 配置
├── ui/                 # 前端资源
│   ├── index.html     # 主页面
│   ├── js/            # JavaScript
│   ├── css/           # 样式文件
│   └── music/         # 音频资源
└── icons/             # 应用图标
```

## 📝 开发计划

- [ ] 添加提醒音效
- [ ] 支持任务列表
- [ ] 数据统计与分析
- [ ] 跨平台支持 (macOS, Linux)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

⭐ 如果这个项目对您有帮助，请给个 Star 支持一下！

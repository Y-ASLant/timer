let appWindow, invoke;
let isFullscreen = false;
let timerInterval = null;
let currentEditingCard = null;
let themeMode = 'auto'; // 'auto', 'light', 'dark'
let currentLayout = '2x2'; // 当前布局：'2x2', '1x2', '2x1', '1x1'
let latestReleaseUrl = ''; // 最新版本的下载链接

// DOM 元素缓存
let cardElementCache = new Map(); // Map<cardId, {cardEl, displayEl, labelEl}>
let dragRegionElement = null; // 缓存拖动区域元素

// 防休眠状态
let isSleepPrevented = false;

// 鼠标自动隐藏
let mouseHideTimer = null;
const MOUSE_HIDE_DELAY = 2000; // 2秒后隐藏鼠标

// 音频元素
let startSound = null;
let endSound = null;
let tickSound = null;

// 卡片数据
let cards = [
    { id: 1, mode: 'countdown', color: '#FFFF00', hours: 2, minutes: 0, seconds: 0, fontSize: 6, span: 'normal', isRunning: false, isPaused: false, totalSeconds: 7200, remainingTime: 7200, stopwatchTime: 0, counterValue: 0 },
    { id: 2, mode: 'countdown', color: '#FFFF00', hours: 2, minutes: 0, seconds: 0, fontSize: 6, span: 'normal', isRunning: false, isPaused: false, totalSeconds: 7200, remainingTime: 7200, stopwatchTime: 0, counterValue: 0 },
    { id: 3, mode: 'countdown', color: '#FFFF00', hours: 2, minutes: 0, seconds: 0, fontSize: 6, span: 'normal', isRunning: false, isPaused: false, totalSeconds: 7200, remainingTime: 7200, stopwatchTime: 0, counterValue: 0 },
    { id: 4, mode: 'countdown', color: '#FFFF00', hours: 2, minutes: 0, seconds: 0, fontSize: 6, span: 'normal', isRunning: false, isPaused: false, totalSeconds: 7200, remainingTime: 7200, stopwatchTime: 0, counterValue: 0 }
];

// 初始化 Tauri API
window.addEventListener('DOMContentLoaded', async () => {
    // 缓存拖动区域元素
    dragRegionElement = document.querySelector('[data-tauri-drag-region]');
    
    if (window.__TAURI__) {
        const { getCurrentWindow } = window.__TAURI__.window;
        appWindow = getCurrentWindow();
        invoke = window.__TAURI__.core.invoke;

        // 绑定窗口控制按钮
        document.getElementById('titlebar-minimize')?.addEventListener('click', (e) => {
            appWindow.minimize();
            e.target.blur(); // 移除焦点
        });
        document.getElementById('titlebar-maximize')?.addEventListener('click', (e) => {
            isFullscreen = !isFullscreen;
            appWindow.setFullscreen(isFullscreen);
            e.target.blur(); // 移除焦点，避免焦点边框
            
            // 管理全屏状态
            if (isFullscreen) {
                // 进入全屏
                handleMouseMove(); // 启动鼠标隐藏计时器
                if (dragRegionElement) dragRegionElement.removeAttribute('data-tauri-drag-region'); // 禁用拖动
            } else {
                // 退出全屏
                if (mouseHideTimer) {
                    clearTimeout(mouseHideTimer);
                    mouseHideTimer = null;
                }
                document.body.classList.remove('hide-cursor');
                if (dragRegionElement) dragRegionElement.setAttribute('data-tauri-drag-region', ''); // 恢复拖动
            }
        });
        document.getElementById('titlebar-close')?.addEventListener('click', (e) => {
            e.target.blur(); // 移除焦点
            appWindow.close();
        });

        // 显示窗口
        await appWindow.show();
    }

    // 初始化音频
    initAudio();
    
    // 初始化卡片
    renderCards();
    
    // 初始化事件监听
    initEventListeners();
    
    // 初始化主题
    initTheme();
    
    // 初始化布局
    initLayout();
    
    // 启动定时器
    startTimers();
});

// 初始化音频
function initAudio() {
    try {
        // 使用相对路径加载音频文件（从 ui 文件夹）
        startSound = new Audio('music/start.wav');
        startSound.volume = 1.0; // 设置音量为100%
        startSound.load();
        
        endSound = new Audio('music/end.wav');
        endSound.volume = 1.0; // 设置音量为100%
        endSound.load();
        
        tickSound = new Audio('music/tick.wav');
        tickSound.volume = 1.0; // 设置音量为100%
        tickSound.load();
        
        console.log('音频已初始化');
    } catch (error) {
        console.error('音频初始化失败:', error);
    }
}

// 播放开始音效
function playStartSound() {
    if (startSound) {
        try {
            startSound.currentTime = 0; // 重置播放位置
            startSound.play().catch(err => {
                console.error('播放开始音效失败:', err);
            });
        } catch (error) {
            console.error('播放开始音效错误:', error);
        }
    }
}

// 播放结束音效
function playEndSound() {
    if (endSound) {
        try {
            endSound.currentTime = 0; // 重置播放位置
            endSound.play().catch(err => {
                console.error('播放结束音效失败:', err);
            });
        } catch (error) {
            console.error('播放结束音效错误:', error);
        }
    }
}

// 播放 tick 音效（每秒一次）
function playTickSound() {
    if (tickSound) {
        try {
            tickSound.currentTime = 0; // 重置播放位置
            tickSound.play().catch(err => {
                console.error('播放 tick 音效失败:', err);
            });
        } catch (error) {
            console.error('播放 tick 音效错误:', error);
        }
    }
}

// 停止 tick 音效
function stopTickSound() {
    if (tickSound && !tickSound.paused) {
        try {
            tickSound.pause();
            tickSound.currentTime = 0;
        } catch (error) {
            console.error('停止 tick 音效错误:', error);
        }
    }
}

// 初始化主题
function initTheme() {
    // 从localStorage读取用户偏好
    const savedTheme = localStorage.getItem('themeMode') || 'auto';
    themeMode = savedTheme;
    applyTheme();
    
    // 监听系统主题变化
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (themeMode === 'auto') {
                applyTheme();
            }
        });
    }
}

// 应用主题
function applyTheme() {
    const isDark = themeMode === 'dark' || 
                  (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    updateThemeIcon();
}

// 初始化布局
function initLayout() {
    // 从localStorage读取用户偏好
    const savedLayout = localStorage.getItem('layoutMode') || '2x2';
    currentLayout = savedLayout;
    applyLayout();
}

// 更新主题图标
function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    const isDark = document.body.classList.contains('dark-mode');
    
    if (themeMode === 'auto') {
        // 跟随系统图标（电脑显示器）
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>';
    } else if (isDark) {
        // 月亮图标（深色模式）
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
    } else {
        // 太阳图标（浅色模式）
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    }
}

// 切换主题
function toggleTheme() {
    // 循环切换：auto -> light -> dark -> auto
    if (themeMode === 'auto') {
        themeMode = 'light';
    } else if (themeMode === 'light') {
        themeMode = 'dark';
    } else {
        themeMode = 'auto';
    }
    
    localStorage.setItem('themeMode', themeMode);
    applyTheme();
}

// 获取卡片状态类名
function getStatusClass(card) {
    if (!card.isRunning) {
        return 'status-idle';
    } else if (card.isPaused) {
        return 'status-paused';
    } else {
        return 'status-running';
    }
}

// 渲染所有卡片
function renderCards() {
    const container = document.getElementById('main-grid');
    container.innerHTML = '';
    cardElementCache.clear(); // 清空缓存
    
    let displayIndex = 1; // 用于显示的区域编号
    
    cards.forEach(card => {
        if (card.span === 'hidden') return; // 跳过被合并的卡片
        
        const cardEl = document.createElement('div');
        const statusClass = getStatusClass(card);
        
        // 检查是否是倒计时模式且最后5秒
        const isWarning = card.mode === 'countdown' && card.isRunning && !card.isPaused && card.remainingTime <= 5 && card.remainingTime > 0;
        
        // 使用 classList 设置类名
        cardEl.classList.add('timer-card');
        if (isWarning) cardEl.classList.add('warning');
        if (card.span !== 'normal') cardEl.classList.add(`card-span-${card.span}`);
        cardEl.dataset.cardId = card.id;
        
        cardEl.innerHTML = `
            <div class="card-label ${statusClass}${isWarning ? ' warning' : ''}">区域 ${displayIndex}</div>
            <div class="card-content">
                <div class="card-display">${formatCardTime(card)}</div>
            </div>
        `;
        
        container.appendChild(cardEl);
        
        // 缓存 DOM 元素引用
        const displayEl = cardEl.querySelector('.card-display');
        const labelEl = cardEl.querySelector('.card-label');
        
        // 使用 CSS 变量设置颜色和字体大小
        displayEl.style.setProperty('--card-color', card.color);
        displayEl.style.setProperty('--card-font-size', `${card.fontSize}rem`);
        
        cardElementCache.set(card.id, { cardEl, displayEl, labelEl });
        
        displayIndex++; // 递增显示编号
    });
    
    // 初始化事件委托（只在第一次渲染时绑定）
    if (!container.hasAttribute('data-click-bound')) {
        container.addEventListener('click', handleCardClick);
        container.setAttribute('data-click-bound', 'true');
    }
}

// 格式化卡片时间显示
function formatCardTime(card) {
    switch(card.mode) {
        case 'clock':
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
            
        case 'countdown':
            return formatTime(card.remainingTime);
            
        case 'stopwatch':
            return formatTime(card.stopwatchTime);
            
        case 'counter':
            return formatTime(card.counterValue);
            
        default:
            return '00:00:00';
    }
}

// 打开配置弹窗
function openConfig(cardId) {
    currentEditingCard = cards.find(c => c.id === cardId);
    if (!currentEditingCard) return;
    
    // 加载当前配置
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === currentEditingCard.mode);
    });
    
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.color === currentEditingCard.color);
    });
    
    document.getElementById('config-hours').value = currentEditingCard.hours;
    document.getElementById('config-minutes').value = currentEditingCard.minutes;
    document.getElementById('config-seconds').value = currentEditingCard.seconds;
    
    // 加载字体大小
    const fontSize = currentEditingCard.fontSize || 6;
    document.getElementById('font-size').value = fontSize.toFixed(1);
    
    document.getElementById('config-overlay').classList.add('show');
}

// 关闭配置弹窗
function closeConfig() {
    document.getElementById('config-overlay').classList.remove('show');
    currentEditingCard = null;
}

// 打开全局设置
function openGlobalSettings() {
    // 更新当前布局的选中状态
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === currentLayout);
    });
    
    // 加载GitHub Token
    const savedToken = localStorage.getItem('githubToken') || '';
    document.getElementById('github-token').value = savedToken;
    
    document.getElementById('global-settings-overlay').classList.add('show');
}

// 关闭全局设置
function closeGlobalSettings() {
    document.getElementById('global-settings-overlay').classList.remove('show');
}

// 保存全局设置
function saveGlobalSettings() {
    // 保存布局设置
    const activeLayout = document.querySelector('.layout-btn.active');
    if (activeLayout) {
        const newLayout = activeLayout.dataset.layout;
        if (newLayout !== currentLayout) {
            currentLayout = newLayout;
            applyLayout();
            // 保存到localStorage
            localStorage.setItem('layoutMode', currentLayout);
        }
    }
    
    // 保存GitHub Token
    const githubToken = document.getElementById('github-token').value.trim();
    if (githubToken) {
        localStorage.setItem('githubToken', githubToken);
    } else {
        localStorage.removeItem('githubToken');
    }
    
    closeGlobalSettings();
}

// 应用布局
function applyLayout() {
    const grid = document.getElementById('main-grid');
    
    // 重置所有卡片为可见
    cards.forEach(card => card.span = 'normal');
    
    // 根据布局调整grid样式和卡片span
    switch(currentLayout) {
        case '2x2': // 四宫格
            grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            grid.style.gridTemplateRows = 'repeat(2, 1fr)';
            break;
        case '1x2': // 左右分屏 (区域12合并, 区域34合并)
            grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            grid.style.gridTemplateRows = '1fr';
            cards[0].span = 'merge12'; // 区域1占据左半边
            cards[1].span = 'hidden'; // 区域2隐藏
            cards[2].span = 'merge34'; // 区域3占据右半边
            cards[3].span = 'hidden'; // 区域4隐藏
            break;
        case '2x1': // 上下分屏 (区域12合并, 区域34合并)
            grid.style.gridTemplateColumns = '1fr';
            grid.style.gridTemplateRows = 'repeat(2, 1fr)';
            cards[0].span = 'merge12'; // 区域1占据上半部
            cards[1].span = 'hidden'; // 区域2隐藏
            cards[2].span = 'merge34'; // 区域3占据下半部
            cards[3].span = 'hidden'; // 区域4隐藏
            break;
        case '1x1': // 全屏单个 (区域1234合并)
            grid.style.gridTemplateColumns = '1fr';
            grid.style.gridTemplateRows = '1fr';
            cards[0].span = 'full'; // 区域1占据全屏
            cards[1].span = 'hidden';
            cards[2].span = 'hidden';
            cards[3].span = 'hidden';
            break;
    }
    
    renderCards();
}

// 只更新卡片样式，不重建 DOM
function updateCardStyle(cardId) {
    const card = cards.find(c => c.id === cardId);
    const cached = cardElementCache.get(cardId);
    if (!card || !cached) return;
    
    const { displayEl } = cached;
    
    // 使用 CSS 变量更新样式
    displayEl.style.setProperty('--card-color', card.color);
    displayEl.style.setProperty('--card-font-size', `${card.fontSize}rem`);
    
    // 更新显示内容
    displayEl.textContent = formatCardTime(card);
}

// 保存配置
function saveConfig() {
    if (!currentEditingCard) return;
    
    const cardId = currentEditingCard.id;
    
    // 获取选中的模式
    const activeMode = document.querySelector('.mode-btn.active');
    if (activeMode) {
        currentEditingCard.mode = activeMode.dataset.mode;
    }
    
    // 获取选中的颜色
    const activeColor = document.querySelector('.color-option.selected');
    if (activeColor) {
        currentEditingCard.color = activeColor.dataset.color;
    }
    
    // 获取字体大小
    currentEditingCard.fontSize = parseFloat(document.getElementById('font-size').value) || 6;
    
    // 获取时间设置
    let hours = parseInt(document.getElementById('config-hours').value) || 0;
    let minutes = parseInt(document.getElementById('config-minutes').value) || 0;
    let seconds = parseInt(document.getElementById('config-seconds').value) || 0;
    
    // 进位转换：秒->分，分->时
    if (seconds >= 60) {
        minutes += Math.floor(seconds / 60);
        seconds = seconds % 60;
    }
    if (minutes >= 60) {
        hours += Math.floor(minutes / 60);
        minutes = minutes % 60;
    }
    
    // 保存规范化后的时间
    currentEditingCard.hours = hours;
    currentEditingCard.minutes = minutes;
    currentEditingCard.seconds = seconds;
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    currentEditingCard.totalSeconds = totalSeconds;
    
    // 如果倒计时已结束（remainingTime为0）或未运行，则重置remainingTime
    if (!currentEditingCard.isRunning || currentEditingCard.remainingTime === 0 || currentEditingCard.mode !== 'countdown') {
        currentEditingCard.remainingTime = totalSeconds;
    }
    
    // 更新输入框显示为规范化后的值
    document.getElementById('config-hours').value = hours;
    document.getElementById('config-minutes').value = minutes;
    document.getElementById('config-seconds').value = seconds;
    
    // 只更新样式，避免完全重建 DOM
    updateCardStyle(cardId);
    closeConfig();
}

// 重置单个卡片
function resetCard(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    
    // 停止运行
    card.isRunning = false;
    card.isPaused = false;
    
    // 根据模式重置时间
    switch(card.mode) {
        case 'countdown':
            card.remainingTime = card.totalSeconds;
            break;
        case 'stopwatch':
            card.stopwatchTime = 0;
            break;
        case 'counter':
            card.counterValue = 0;
            break;
    }
    
    updateCardDisplays();
    manageSleepPrevention();
}

// 事件委托：处理卡片点击
function handleCardClick(e) {
    // 如果点击的是标签（区域编号），则重置
    if (e.target.classList.contains('card-label')) {
        const cardEl = e.target.closest('[data-card-id]');
        if (cardEl) {
            const cardId = parseInt(cardEl.dataset.cardId);
            resetCard(cardId);
        }
        return;
    }
    
    // 否则打开配置
    const cardEl = e.target.closest('[data-card-id]');
    if (cardEl) {
        const cardId = parseInt(cardEl.dataset.cardId);
        openConfig(cardId);
    }
}

function initEventListeners() {
    // 标题点击跳转 GitHub
    document.getElementById('app-title')?.addEventListener('click', async (e) => {
        e.stopPropagation(); // 阻止拖拽事件
        try {
            if (window.__TAURI__?.shell) {
                await window.__TAURI__.shell.open('https://github.com/Y-ASLant');
            } else {
                window.open('https://github.com/Y-ASLant', '_blank');
            }
        } catch (error) {
            console.error('打开链接失败:', error);
        }
    });
    
    // Star 按钮点击
    document.getElementById('star-button')?.addEventListener('click', async (e) => {
        e.stopPropagation(); // 阻止拖拽事件
        try {
            if (window.__TAURI__?.shell) {
                await window.__TAURI__.shell.open('https://github.com/Y-ASLant/timer');
            } else {
                window.open('https://github.com/Y-ASLant/timer', '_blank');
            }
        } catch (error) {
            console.error('打开链接失败:', error);
        }
    });
    
    // 检查更新按钮
    document.getElementById('check-update-btn')?.addEventListener('click', (e) => {
        e.target.blur(); // 移除焦点
        checkForUpdates();
    });
    
    // 全局设置按钮
    document.getElementById('global-settings-btn')?.addEventListener('click', (e) => {
        e.target.blur(); // 移除焦点
        openGlobalSettings();
    });
    
    // 布局按钮切换
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.blur(); // 移除焦点
            document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // 主题切换按钮
    document.getElementById('theme-toggle')?.addEventListener('click', (e) => {
        e.target.blur(); // 移除焦点
        toggleTheme();
    });
    
    // 模式按钮切换
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.target.blur(); // 移除焦点
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // 颜色选择
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', function(e) {
            e.target.blur(); // 移除焦点
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // 快捷键监听
    document.addEventListener('keydown', handleKeyPress);
    
    // 鼠标移动监听（用于全屏时自动隐藏）
    document.addEventListener('mousemove', handleMouseMove);
}

// 鼠标移动处理（全屏时自动隐藏）
function handleMouseMove() {
    if (!isFullscreen) return; // 只在全屏时生效
    
    // 显示鼠标
    document.body.classList.remove('hide-cursor');
    
    // 清除之前的定时器
    if (mouseHideTimer) {
        clearTimeout(mouseHideTimer);
    }
    
    // 设置新的定时器，2秒后隐藏鼠标
    mouseHideTimer = setTimeout(() => {
        if (isFullscreen) { // 再次确认仍在全屏状态
            document.body.classList.add('hide-cursor');
        }
    }, MOUSE_HIDE_DELAY);
}

// 管理防休眠状态
async function manageSleepPrevention() {
    // 检查是否有任何计时器正在运行
    const hasRunningTimer = cards.some(c => c.isRunning && !c.isPaused);
    
    if (hasRunningTimer && !isSleepPrevented) {
        // 需要阻止休眠
        if (invoke) {
            try {
                await invoke('prevent_sleep');
                isSleepPrevented = true;
                console.log('已启用防休眠模式');
            } catch (err) {
                console.error('启用防休眠失败:', err);
            }
        }
    } else if (!hasRunningTimer && isSleepPrevented) {
        // 需要允许休眠
        if (invoke) {
            try {
                await invoke('allow_sleep');
                isSleepPrevented = false;
                console.log('已关闭防休眠模式');
            } catch (err) {
                console.error('关闭防休眠失败:', err);
            }
        }
    }
}

// 启动定时器
function startTimers() {
    timerInterval = setInterval(() => {
        cards.forEach(card => {
            if (!card.isRunning || card.isPaused) return;
            
            switch(card.mode) {
                case 'countdown':
                    if (card.remainingTime > 0) {
                        card.remainingTime -= 1;
                        
                        // 减少后检查剩余时间（1-5秒播放tick，0秒播放end）
                        if (card.remainingTime >= 1 && card.remainingTime <= 5) {
                            playTickSound();
                        } else if (card.remainingTime <= 0) {
                            card.remainingTime = 0;
                            card.isRunning = false; // 倒计时结束，自动停止
                            stopTickSound(); // 停止 tick 音效
                            playEndSound(); // 播放结束音效
                        }
                    }
                    break;
                case 'stopwatch':
                    card.stopwatchTime += 1;
                    break;
                case 'counter':
                    card.counterValue += 1;
                    break;
            }
        });
        
        updateCardDisplays();
        manageSleepPrevention(); // 每秒检查防休眠状态
    }, 1000);
}

// 更新卡片显示
function updateCardDisplays() {
    cards.forEach(card => {
        if (card.span === 'hidden') return;
        
        // 从缓存中获取 DOM 元素
        const cached = cardElementCache.get(card.id);
        if (!cached) return;
        
        const { cardEl, displayEl, labelEl } = cached;
        
        // 更新时间显示
        if (displayEl) {
            displayEl.textContent = formatCardTime(card);
        }
        
        // 检查是否是倒计时模式且最后5秒
        const isWarning = card.mode === 'countdown' && card.isRunning && !card.isPaused && card.remainingTime <= 5 && card.remainingTime > 0;
        const statusClass = getStatusClass(card);
        
        // 使用 classList 更新卡片样式
        cardEl.classList.toggle('warning', isWarning);
        
        // 使用 classList 更新标签状态
        if (labelEl) {
            // 移除所有状态类
            labelEl.classList.remove('status-idle', 'status-running', 'status-paused');
            // 添加当前状态类
            labelEl.classList.add(statusClass);
            // 切换警告类
            labelEl.classList.toggle('warning', isWarning);
        }
    });
}

// 根据当前布局获取按键对应的卡片索引
function getCardIndexByKey(keyNumber) {
    switch(currentLayout) {
        case '2x2': // 四宫格：1234对应cards[0,1,2,3]
            return keyNumber - 1;
        case '1x2': // 左右分屏：1对应cards[0](左)，2对应cards[2](右)
            if (keyNumber === 1) return 0;
            if (keyNumber === 2) return 2;
            return null;
        case '2x1': // 上下分屏：1对应cards[0](上)，2对应cards[2](下)
            if (keyNumber === 1) return 0;
            if (keyNumber === 2) return 2;
            return null;
        case '1x1': // 全屏单个：只有1对应cards[0]
            return keyNumber === 1 ? 0 : null;
        default:
            return keyNumber - 1;
    }
}

// 快捷键处理
function handleKeyPress(e) {
    // 阻止刷新快捷键
    if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        return;
    }
    
    // 如果配置弹窗或全局设置弹窗打开，不处理1-4快捷键（允许输入）
    const configOpen = document.getElementById('config-overlay').classList.contains('show');
    const globalSettingsOpen = document.getElementById('global-settings-overlay').classList.contains('show');
    
    switch(e.key) {
        case 'Escape':
            e.preventDefault();
            
            // 优先关闭弹窗
            if (configOpen) {
                closeConfig();
            } else if (globalSettingsOpen) {
                closeGlobalSettings();
            } else if (isFullscreen && appWindow) {
                // 没有弹窗时才退出全屏
                isFullscreen = false;
                appWindow.setFullscreen(false);
                
                // 退出全屏，恢复所有状态
                if (mouseHideTimer) {
                    clearTimeout(mouseHideTimer);
                    mouseHideTimer = null;
                }
                document.body.classList.remove('hide-cursor');
                
                // 恢复拖动功能
                if (dragRegionElement) dragRegionElement.setAttribute('data-tauri-drag-region', '');
            }
            break;
        case '1':
        case '2':
        case '3':
        case '4':
            // 如果弹窗打开，允许正常输入，不触发快捷键
            if (configOpen || globalSettingsOpen) {
                return;
            }
            
            // 1-4键：切换对应区域的启动/暂停
            e.preventDefault();
            const keyNumber = parseInt(e.key);
            const cardIndex = getCardIndexByKey(keyNumber);
            
            if (cardIndex !== null) {
                const card = cards[cardIndex];
                if (card) {
                    if (!card.isRunning) {
                        // 如果未运行，则启动
                        card.isRunning = true;
                        card.isPaused = false;
                        playStartSound(); // 播放开始音效
                    } else {
                        // 如果正在运行，则切换暂停状态
                        card.isPaused = !card.isPaused;
                    }
                    manageSleepPrevention(); // 立即更新防休眠状态
                }
            }
            break;
        case ' ':
            // 空格键：全部启动/暂停（智能切换）
            // 如果弹窗打开，不处理
            if (configOpen || globalSettingsOpen) {
                return;
            }
            
            e.preventDefault();
            // 智能切换：如果有任何运行中的，则全部暂停；否则全部启动
            const anyRunning = cards.some(c => c.isRunning && !c.isPaused);
            if (anyRunning) {
                cards.forEach(c => {
                    if (c.isRunning) {
                        c.isPaused = true;
                    }
                });
            } else {
                cards.forEach(c => {
                    c.isRunning = true;
                    c.isPaused = false;
                });
                playStartSound(); // 播放开始音效
            }
            manageSleepPrevention(); // 立即更新防休眠状态
            break;
        case 'F11':
            e.preventDefault();
            if (appWindow) {
                isFullscreen = !isFullscreen;
                appWindow.setFullscreen(isFullscreen);
                
                // 管理全屏状态
                if (isFullscreen) {
                    // 进入全屏
                    handleMouseMove(); // 启动鼠标隐藏计时器
                    if (dragRegionElement) dragRegionElement.removeAttribute('data-tauri-drag-region'); // 禁用拖动
                } else {
                    // 退出全屏
                    if (mouseHideTimer) {
                        clearTimeout(mouseHideTimer);
                        mouseHideTimer = null;
                    }
                    document.body.classList.remove('hide-cursor');
                    if (dragRegionElement) dragRegionElement.setAttribute('data-tauri-drag-region', ''); // 恢复拖动
                }
            }
            break;
        case 'F12':
            e.preventDefault();
            cards.forEach(c => {
                // 只重置未运行或暂停的计时器
                if (!c.isRunning || c.isPaused) {
                    c.isRunning = false;
                    c.isPaused = false;
                    c.remainingTime = c.totalSeconds;
                    c.stopwatchTime = 0;
                    c.counterValue = 0;
                }
            });
            manageSleepPrevention(); // 立即更新防休眠状态
            break;
    }
}

// 格式化时间
function formatTime(totalSeconds, precision = 0) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');
    
    return `${h}:${m}:${s}`;
}

// 时钟模式已由 startTimers() 中的定时器处理，无需重复定时器

// 检查更新相关函数
async function checkForUpdates() {
    // 打开更新对话框
    const updateOverlay = document.getElementById('update-overlay');
    const downloadBtn = document.getElementById('download-update-btn');
    updateOverlay.classList.add('show');
    
    // 重置UI状态
    document.getElementById('latest-version').textContent = '检查中...';
    document.getElementById('update-message').textContent = '正在检查更新...';
    document.getElementById('update-message').className = 'text-sm text-gray-700 p-3 rounded-lg bg-blue-50 border border-blue-200';
    downloadBtn.textContent = '立即下载'; // 重置按钮文本
    downloadBtn.classList.add('hidden');
    document.getElementById('update-notes-container').classList.add('hidden');
    latestReleaseUrl = ''; // 重置链接
    
    try {
        if (!invoke) {
            throw new Error('Tauri invoke 不可用');
        }
        
        // 获取GitHub Token（如果有）
        const githubToken = localStorage.getItem('githubToken') || '';
        
        // 调用后端API检查更新
        const result = await invoke('check_github_update', { githubToken });
        
        // 显示当前版本和最新版本
        document.getElementById('current-version').textContent = result.current_version;
        document.getElementById('latest-version').textContent = result.latest_version;
        
        if (result.has_update) {
            // 有新版本
            document.getElementById('update-message').textContent = '发现新版本！';
            document.getElementById('update-message').className = 'text-sm text-gray-700 p-3 rounded-lg bg-green-50 border border-green-200';
            downloadBtn.classList.remove('hidden');
            latestReleaseUrl = result.download_url;
            
            // 显示更新说明
            if (result.release_notes) {
                document.getElementById('update-notes-container').classList.remove('hidden');
                document.getElementById('update-notes').innerHTML = result.release_notes.replace(/\n/g, '<br>');
            }
        } else {
            // 已是最新版本
            document.getElementById('update-message').textContent = '已是最新版本';
            document.getElementById('update-message').className = 'text-sm text-gray-700 p-3 rounded-lg bg-gray-50 border border-gray-200';
        }
    } catch (error) {
        console.error('检查更新失败:', error);
        document.getElementById('current-version').textContent = '未知';
        document.getElementById('latest-version').textContent = '检查失败';
        
        // 改进错误信息显示
        const errorMsg = typeof error === 'string' ? error : error.toString();
        document.getElementById('update-message').innerHTML = errorMsg;
        document.getElementById('update-message').className = 'text-sm text-gray-700 p-3 rounded-lg bg-red-50 border border-red-200';
        
        // 如果是403错误，仍然尝试下载（可能可以直接下载文件）
        if (errorMsg.includes('403') || errorMsg.includes('访问受限')) {
            downloadBtn.textContent = '尝试下载';
            downloadBtn.classList.remove('hidden');
            // 保持原有的下载URL，不改为releases页面
        }
    }
}

// 关闭更新对话框
function closeUpdateDialog() {
    document.getElementById('update-overlay').classList.remove('show');
}

// 下载更新
async function downloadUpdate() {
    if (!latestReleaseUrl) {
        return;
    }
    
    const downloadBtn = document.getElementById('download-update-btn');
    const updateMessage = document.getElementById('update-message');
    
    try {
        // 禁用按钮并显示下载中状态（添加加载动画）
        downloadBtn.disabled = true;
        downloadBtn.textContent = '下载中';
        downloadBtn.classList.add('downloading');
        updateMessage.textContent = '正在下载更新文件，请稍候';
        updateMessage.className = 'text-sm text-gray-700 p-3 rounded-lg bg-blue-50 border border-blue-200 downloading-message';
        
        if (!invoke) {
            throw new Error('Tauri invoke 不可用');
        }
        
        // 调用后端下载文件（包括403错误情况也在应用内处理）
        const filePath = await invoke('download_update_file', { downloadUrl: latestReleaseUrl });
        
        // 下载成功，安装程序已自动启动
        downloadBtn.classList.remove('downloading');
        updateMessage.textContent = `下载完成！\n安装程序已自动启动\n\n请按照安装向导完成更新`;
        updateMessage.className = 'text-sm text-gray-700 p-3 rounded-lg bg-green-50 border border-green-200';
        downloadBtn.textContent = '打开文件位置';
        downloadBtn.disabled = false;
        
        // 更新按钮功能：点击打开文件夹
        downloadBtn.onclick = async function() {
            try {
                if (window.__TAURI__?.shell) {
                    // 提取文件夹路径
                    const folderPath = filePath.substring(0, filePath.lastIndexOf('\\'));
                    await window.__TAURI__.shell.open(folderPath);
                }
            } catch (err) {
                console.error('打开文件夹失败:', err);
                alert('无法打开文件夹，文件路径：\n' + filePath);
            }
        };
        
    } catch (error) {
        console.error('下载失败:', error);
        downloadBtn.classList.remove('downloading');
        const errorMsg = typeof error === 'string' ? error : error.toString();
        updateMessage.textContent = `下载失败: ${errorMsg}\n\n请检查网络连接后重试`;
        updateMessage.className = 'text-sm text-gray-700 p-3 rounded-lg bg-red-50 border border-red-200';
        downloadBtn.disabled = false;
        downloadBtn.textContent = '重试下载';
        // 恢复按钮原始功能
        downloadBtn.onclick = downloadUpdate;
    }
}

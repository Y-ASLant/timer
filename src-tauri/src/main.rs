// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use keepawake::{Builder, KeepAwake};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use reqwest::blocking::Client;
use semver::Version;
use std::fs::File;
use tauri::Manager;

// 常量定义
const GITHUB_REPO_URL: &str = "https://api.github.com/repos/Y-ASLant/timer/releases/latest";
const USER_AGENT: &str = "countdown-timer";
const REQUEST_TIMEOUT_SECS: u64 = 10;
const DOWNLOAD_TIMEOUT_SECS: u64 = 300;
const FILE_RELEASE_DELAY_MS: u64 = 500;

// 全局状态管理防休眠实例
struct AppState {
    keep_awake: Mutex<Option<KeepAwake>>,
}

// 阻止系统休眠
#[tauri::command]
fn prevent_sleep(state: tauri::State<AppState>) -> Result<(), String> {
    let mut keep_awake = state.keep_awake.lock().unwrap();

    if keep_awake.is_some() {
        return Ok(());
    }

    let ka = Builder::default()
        .display(true)
        .idle(true)
        .sleep(true)
        .reason("倒计时运行中")
        .app_name("计时器")
        .create()
        .map_err(|e| format!("无法阻止休眠: {:?}", e))?;
    
    *keep_awake = Some(ka);
    Ok(())
}

// 允许系统休眠
#[tauri::command]
fn allow_sleep(state: tauri::State<AppState>) -> Result<(), String> {
    *state.keep_awake.lock().unwrap() = None;
    Ok(())
}

// GitHub Release API响应结构
#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    html_url: String,
    body: Option<String>,
    assets: Vec<ReleaseAsset>,
}

#[derive(Debug, Deserialize)]
struct ReleaseAsset {
    name: String,
    browser_download_url: String,
}

// 更新检查响应
#[derive(Debug, Serialize)]
struct UpdateCheckResult {
    has_update: bool,
    current_version: String,
    latest_version: String,
    download_url: String,
    release_notes: Option<String>,
}

// 创建HTTP客户端
fn create_http_client(timeout_secs: u64) -> Result<Client, String> {
    Client::builder()
        .user_agent(USER_AGENT)
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))
}

// 检查GitHub更新
#[tauri::command]
fn check_github_update(github_token: String) -> Result<UpdateCheckResult, String> {
    let client = create_http_client(REQUEST_TIMEOUT_SECS)?;
    let mut request = client.get(GITHUB_REPO_URL);
    
    if !github_token.is_empty() {
        request = request.header("Authorization", format!("token {}", github_token));
    }
    
    // 请求最新版本信息
    let response = request
        .send()
        .map_err(|e| format!("网络请求失败，请检查网络连接: {}", e))?;
    
    // 详细处理不同的HTTP状态码
    let status = response.status();
    if !status.is_success() {
        return match status.as_u16() {
            403 => {
                if github_token.is_empty() {
                    Err("GitHub API访问受限<br><br>解决方案：<br>1. 在全局设置中配置GitHub Token（推荐）<br>2. 关闭VPN后重试<br>3. 访问 <a href='https://github.com/Y-ASLant/timer/releases' target='_blank'>GitHub Releases</a>".to_string())
                } else {
                    Err("GitHub Token可能无效或已过期<br><br>请在全局设置中重新配置Token".to_string())
                }
            },
            404 => Err("未找到版本信息，仓库可能不存在或尚无发布版本".to_string()),
            _ => Err(format!("GitHub API返回错误 ({}): 请稍后再试", status)),
        };
    }
    
    let release: GitHubRelease = response
        .json()
        .map_err(|e| format!("解析版本信息失败: {}", e))?;
    
    let latest_version_str = release.tag_name.trim_start_matches('v');
    let current = Version::parse(env!("CARGO_PKG_VERSION"))
        .map_err(|e| format!("解析当前版本失败: {}", e))?;
    let latest = Version::parse(latest_version_str)
        .map_err(|e| format!("解析最新版本号失败: {}，可能版本格式不标准", e))?;
    
    let has_update = latest > current;
    
    let download_url = find_installer_url(&release.assets)
        .unwrap_or(release.html_url);
    
    Ok(UpdateCheckResult {
        has_update,
        current_version: env!("CARGO_PKG_VERSION").to_string(),
        latest_version: latest_version_str.to_string(),
        download_url,
        release_notes: release.body,
    })
}

// 查找安装包URL（优先级：setup.exe > .msi）
fn find_installer_url(assets: &[ReleaseAsset]) -> Option<String> {
    assets.iter()
        .find(|asset| {
            let name = asset.name.to_lowercase();
            name.contains("setup") && name.ends_with(".exe")
        })
        .or_else(|| assets.iter().find(|asset| asset.name.to_lowercase().ends_with(".msi")))
        .map(|asset| asset.browser_download_url.clone())
}

// 下载更新文件（异步）
#[tauri::command]
async fn download_update_file(download_url: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    // 在后台线程中执行下载，避免阻塞UI
    let result = tauri::async_runtime::spawn_blocking(move || {
        // 获取应用数据目录
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
        
        // 创建 update 子目录
        let update_dir = app_data_dir.join("update");
        std::fs::create_dir_all(&update_dir)
            .map_err(|e| format!("创建更新目录失败: {}", e))?;
        
        // 清理旧的更新文件
        if let Ok(entries) = std::fs::read_dir(&update_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let _ = std::fs::remove_file(path);
                }
            }
        }
        
        // 从URL中提取文件名
        let file_name = download_url
            .split('/')
            .last()
            .ok_or_else(|| "无法解析文件名".to_string())?;
        
        let file_path = update_dir.join(file_name);
        
        let client = create_http_client(DOWNLOAD_TIMEOUT_SECS)?;
        
        // 下载文件
        let mut response = client.get(&download_url)
            .send()
            .map_err(|e| format!("下载请求失败: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("下载失败，HTTP状态码: {}", response.status()));
        }
        
        // 创建文件
        let mut file = File::create(&file_path)
            .map_err(|e| format!("创建文件失败: {}", e))?;
        
        // 写入文件
        std::io::copy(&mut response, &mut file)
            .map_err(|e| format!("写入文件失败: {}", e))?;
        
        // 刷新文件确保写入完成
        file.sync_all()
            .map_err(|e| format!("文件同步失败: {}", e))?;
        
        drop(file);
        let file_path_str = file_path.to_string_lossy().to_string();
        std::thread::sleep(std::time::Duration::from_millis(FILE_RELEASE_DELAY_MS));
        
        #[cfg(target_os = "windows")]
        launch_installer(&file_path)?;
        
        Ok::<String, String>(file_path_str)
    })
    .await
    .map_err(|e| format!("下载任务执行失败: {}", e))??;
    
    Ok(result)
}

// 启动安装程序
#[cfg(target_os = "windows")]
fn launch_installer(file_path: &std::path::PathBuf) -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/c", "start", "", &file_path.to_string_lossy()])
        .spawn()
        .map_err(|e| format!("启动安装程序失败: {}", e))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            keep_awake: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![prevent_sleep, allow_sleep, check_github_update, download_update_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

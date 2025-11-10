// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use keepawake::{Builder, KeepAwake};

// 全局状态管理防休眠实例
struct AppState {
    keep_awake: Mutex<Option<KeepAwake>>,
}

// 阻止系统休眠
#[tauri::command]
fn prevent_sleep(state: tauri::State<AppState>) -> Result<(), String> {
    let mut keep_awake = state.keep_awake.lock().unwrap();
    
    // 如果已经在防休眠状态，直接返回
    if keep_awake.is_some() {
        return Ok(());
    }
    
    // 创建防休眠实例（阻止屏幕和系统休眠）
    match Builder::default()
        .display(true)  // 阻止屏幕休眠
        .idle(true)     // 阻止系统空闲休眠
        .sleep(true)    // 阻止系统睡眠
        .reason("倒计时运行中")
        .app_name("计时器")
        .create()
    {
        Ok(ka) => {
            *keep_awake = Some(ka);
            Ok(())
        }
        Err(e) => Err(format!("无法阻止休眠: {:?}", e)),
    }
}

// 允许系统休眠
#[tauri::command]
fn allow_sleep(state: tauri::State<AppState>) -> Result<(), String> {
    let mut keep_awake = state.keep_awake.lock().unwrap();
    *keep_awake = None; // 释放防休眠实例
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            keep_awake: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![prevent_sleep, allow_sleep])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

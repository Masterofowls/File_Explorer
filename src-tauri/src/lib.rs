mod clipboard;
mod commands;
mod watcher;

use clipboard::*;
use commands::*;
use watcher::*;

use serde::{Deserialize, Serialize};
use tauri::{
    image::Image,
    menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct WindowState {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    maximized: bool,
}

const STORE_FILENAME: &str = "app_state.json";

fn create_tray_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let show = MenuItemBuilder::with_id("show", "Show Window").build(app)?;
    let new_window = MenuItemBuilder::with_id("new_window", "New Window").build(app)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    MenuBuilder::new(app)
        .items(&[&show, &new_window, &separator, &quit])
        .build()
}

fn setup_system_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let menu = create_tray_menu(app)?;
    let icon = Image::from_bytes(include_bytes!("../icons/icon.png"))
        .expect("Failed to load tray icon");

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Fluent File Explorer")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.unminimize();
                }
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.unminimize();
                }
            }
            "new_window" => {
                // Emit event to frontend to handle new window
                let _ = app.emit("new-window-requested", ());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus the existing window when trying to open another instance
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Setup system tray
            setup_system_tray(app.handle())?;

            // Initialize store and restore window state
            let app_handle = app.handle().clone();
            if let Some(window) = app.get_webview_window("main") {
                // Restore window state
                if let Ok(store) = app_handle.store(STORE_FILENAME) {
                    if let Some(state) = store.get("window_state") {
                        if let Ok(ws) = serde_json::from_value::<WindowState>(state) {
                            let _ = window.set_position(tauri::Position::Physical(
                                tauri::PhysicalPosition::new(ws.x, ws.y)
                            ));
                            let _ = window.set_size(tauri::Size::Physical(
                                tauri::PhysicalSize::new(ws.width, ws.height)
                            ));
                            if ws.maximized {
                                let _ = window.maximize();
                            }
                        }
                    }
                }
                
                // Setup window close handler with state persistence
                let app_handle_clone = app_handle.clone();
                window.on_window_event(move |event| {
                    match event {
                        WindowEvent::CloseRequested { api, .. } => {
                            // Save window state before hiding
                            if let Some(win) = app_handle_clone.get_webview_window("main") {
                                save_window_state(&app_handle_clone, &win);
                                let _ = win.hide();
                            }
                            api.prevent_close();
                        }
                        _ => {}
                    }
                });
            }

            // Setup global shortcuts
            setup_global_shortcuts(&app_handle)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_directory,
            get_home_directory,
            get_quick_access_paths,
            create_directory,
            create_file,
            create_file_with_content,
            delete_items,
            rename_item,
            copy_items,
            move_items,
            open_file,
            search_files,
            get_file_details,
            read_file_text,
            read_file_base64,
            calculate_dir_size,
            clipboard_write_files,
            clipboard_read_files,
            clipboard_has_files,
            get_os_type,
            get_system_drives,
            get_system_paths,
            show_in_explorer,
            open_in_terminal,
            copy_path_to_clipboard,
            get_file_properties,
            watch_directory,
            unwatch_directory,
            quit_app,
            toggle_autostart,
            get_autostart_state,
            check_for_updates,
            send_notification,
            compress_items,
            extract_archive,
            list_recycle_bin,
            restore_from_recycle_bin,
            empty_recycle_bin,
            detect_usb_drives,
            duplicate_item,
            create_shortcut,
            batch_rename,
            get_drive_space,
            get_open_with_apps,
            open_with_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
async fn toggle_autostart(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let autostart_manager = app.autolaunch();
    if enable {
        autostart_manager.enable().map_err(|e| e.to_string())?;
    } else {
        autostart_manager.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_autostart_state(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    let autostart_manager = app.autolaunch();
    autostart_manager.is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;
    match app.updater() {
        Ok(updater) => {
            match updater.check().await {
                Ok(Some(update)) => Ok(Some(update.version)),
                Ok(None) => Ok(None),
                Err(e) => Err(format!("Failed to check for updates: {}", e)),
            }
        }
        Err(e) => Err(format!("Updater not available: {}", e)),
    }
}

// Helper function to save window state
fn save_window_state(app: &tauri::AppHandle, window: &tauri::WebviewWindow) {
    if let Ok(store) = app.store(STORE_FILENAME) {
        let maximized = window.is_maximized().unwrap_or(false);
        
        // Only save position/size when not maximized
        if maximized {
            // Keep previous non-maximized dimensions, just update maximized state
            if let Some(existing) = store.get("window_state") {
                if let Ok(mut ws) = serde_json::from_value::<WindowState>(existing) {
                    ws.maximized = true;
                    let _ = store.set("window_state", serde_json::to_value(&ws).unwrap_or_default());
                    let _ = store.save();
                }
            }
        } else if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
            let state = WindowState {
                x: pos.x,
                y: pos.y,
                width: size.width,
                height: size.height,
                maximized: false,
            };
            let _ = store.set("window_state", serde_json::to_value(&state).unwrap_or_default());
            let _ = store.save();
        }
    }
}

// Setup global shortcuts
fn setup_global_shortcuts(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Ctrl+Shift+E - Open File Explorer (show/focus window)
    let show_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyE);
    
    let app_handle = app.clone();
    app.global_shortcut().on_shortcut(show_shortcut, move |_app, _shortcut, _event| {
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
            let _ = window.unminimize();
        }
    })?;

    // Ctrl+Shift+N - New Window request  
    let new_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyN);
    
    let app_handle2 = app.clone();
    app.global_shortcut().on_shortcut(new_shortcut, move |_app, _shortcut, _event| {
        let _ = app_handle2.emit("new-window-requested", ());
    })?;

    Ok(())
}

// Notification command
#[tauri::command]
async fn send_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// Compression commands
#[tauri::command]
async fn compress_items(paths: Vec<String>, output_path: String) -> Result<String, String> {
    use std::fs::File;
    use std::io::{Read, Write};
    use walkdir::WalkDir;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;
    
    tauri::async_runtime::spawn_blocking(move || {
        let file = File::create(&output_path).map_err(|e| e.to_string())?;
        let mut zip = ZipWriter::new(file);
        let options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o755);

        for path_str in paths {
            let path = std::path::Path::new(&path_str);
            if path.is_dir() {
                // Walk directory recursively
                for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
                    let entry_path = entry.path();
                    let relative_path = entry_path.strip_prefix(path.parent().unwrap_or(path))
                        .unwrap_or(entry_path);
                    
                    if entry_path.is_file() {
                        zip.start_file(relative_path.to_string_lossy(), options)
                            .map_err(|e| e.to_string())?;
                        let mut f = File::open(entry_path).map_err(|e| e.to_string())?;
                        let mut buffer = Vec::new();
                        f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
                        zip.write_all(&buffer).map_err(|e| e.to_string())?;
                    } else if entry_path.is_dir() && entry_path != path {
                        zip.add_directory(relative_path.to_string_lossy(), options)
                            .map_err(|e| e.to_string())?;
                    }
                }
            } else if path.is_file() {
                let file_name = path.file_name().unwrap_or_default().to_string_lossy();
                zip.start_file(file_name.to_string(), options)
                    .map_err(|e| e.to_string())?;
                let mut f = File::open(path).map_err(|e| e.to_string())?;
                let mut buffer = Vec::new();
                f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
                zip.write_all(&buffer).map_err(|e| e.to_string())?;
            }
        }

        zip.finish().map_err(|e| e.to_string())?;
        Ok(output_path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn extract_archive(archive_path: String, output_dir: String) -> Result<String, String> {
    use std::fs::{self, File};
    use zip::ZipArchive;
    
    tauri::async_runtime::spawn_blocking(move || {
        let file = File::open(&archive_path).map_err(|e| e.to_string())?;
        let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
        
        fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
        
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let outpath = std::path::Path::new(&output_dir).join(file.mangled_name());
            
            if file.is_dir() {
                fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
            }

            // Set permissions on Unix
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = file.unix_mode() {
                    fs::set_permissions(&outpath, fs::Permissions::from_mode(mode)).ok();
                }
            }
        }
        
        Ok(output_dir)
    })
    .await
    .map_err(|e| e.to_string())?
}

// Recycle Bin commands
#[derive(Debug, Serialize, Deserialize, Clone)]
struct RecycleBinItem {
    name: String,
    original_path: String,
    deleted_time: String,
    size: u64,
    is_dir: bool,
}

#[tauri::command]
async fn list_recycle_bin() -> Result<Vec<RecycleBinItem>, String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        
        tauri::async_runtime::spawn_blocking(move || {
            // Use PowerShell to list recycle bin contents
            let output = Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-Command",
                    r#"
                    $shell = New-Object -ComObject Shell.Application
                    $recycleBin = $shell.NameSpace(10)
                    $items = @()
                    foreach ($item in $recycleBin.Items()) {
                        $items += [PSCustomObject]@{
                            Name = $item.Name
                            Path = $item.Path
                            Size = $item.Size
                            ModifyDate = $item.ModifyDate.ToString('yyyy-MM-dd HH:mm:ss')
                            IsFolder = $item.IsFolder
                        }
                    }
                    $items | ConvertTo-Json -Compress
                    "#,
                ])
                .output()
                .map_err(|e| e.to_string())?;

            let output_str = String::from_utf8_lossy(&output.stdout);
            
            if output_str.trim().is_empty() {
                return Ok(vec![]);
            }
            
            // Parse JSON output
            let items: Vec<serde_json::Value> = serde_json::from_str(&output_str)
                .unwrap_or_else(|_| {
                    // Single item case
                    serde_json::from_str(&format!("[{}]", output_str))
                        .unwrap_or_default()
                });
            
            let result: Vec<RecycleBinItem> = items
                .into_iter()
                .map(|item| RecycleBinItem {
                    name: item["Name"].as_str().unwrap_or("").to_string(),
                    original_path: item["Path"].as_str().unwrap_or("").to_string(),
                    deleted_time: item["ModifyDate"].as_str().unwrap_or("").to_string(),
                    size: item["Size"].as_u64().unwrap_or(0),
                    is_dir: item["IsFolder"].as_bool().unwrap_or(false),
                })
                .collect();
            
            Ok(result)
        })
        .await
        .map_err(|e| e.to_string())?
    }
    
    #[cfg(not(windows))]
    {
        Ok(vec![])
    }
}

#[tauri::command]
async fn restore_from_recycle_bin(item_name: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        tauri::async_runtime::spawn_blocking(move || {
            use std::process::Command;
            
            let script = format!(
                r#"
                $shell = New-Object -ComObject Shell.Application
                $recycleBin = $shell.NameSpace(10)
                foreach ($item in $recycleBin.Items()) {{
                    if ($item.Name -eq '{}') {{
                        $item.InvokeVerb('restore')
                        break
                    }}
                }}
                "#,
                item_name.replace("'", "''")
            );
            
            Command::new("powershell")
                .args(["-NoProfile", "-Command", &script])
                .output()
                .map_err(|e| e.to_string())?;
            
            Ok(())
        })
        .await
        .map_err(|e| e.to_string())?
    }
    
    #[cfg(not(windows))]
    {
        Err("Not supported on this platform".to_string())
    }
}

#[tauri::command]
async fn empty_recycle_bin() -> Result<(), String> {
    #[cfg(windows)]
    {
        tauri::async_runtime::spawn_blocking(|| {
            use std::process::Command;
            
            Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-Command",
                    "Clear-RecycleBin -Force -ErrorAction SilentlyContinue",
                ])
                .output()
                .map_err(|e| e.to_string())?;
            
            Ok(())
        })
        .await
        .map_err(|e| e.to_string())?
    }
    
    #[cfg(not(windows))]
    {
        Err("Not supported on this platform".to_string())
    }
}

// USB Drive Detection
#[derive(Debug, Serialize, Deserialize, Clone)]
struct UsbDrive {
    name: String,
    path: String,
    total_space: u64,
    free_space: u64,
    drive_type: String,
}

#[tauri::command]
async fn detect_usb_drives() -> Result<Vec<UsbDrive>, String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        
        tauri::async_runtime::spawn_blocking(|| {
            let output = Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-Command",
                    r#"
                    Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 } | 
                    ForEach-Object {
                        [PSCustomObject]@{
                            Name = $_.VolumeName
                            Path = $_.DeviceID + '\'
                            TotalSpace = $_.Size
                            FreeSpace = $_.FreeSpace
                            DriveType = 'Removable'
                        }
                    } | ConvertTo-Json -Compress
                    "#,
                ])
                .output()
                .map_err(|e| e.to_string())?;

            let output_str = String::from_utf8_lossy(&output.stdout);
            
            if output_str.trim().is_empty() {
                return Ok(vec![]);
            }
            
            let items: Vec<serde_json::Value> = serde_json::from_str(&output_str)
                .unwrap_or_else(|_| {
                    serde_json::from_str(&format!("[{}]", output_str))
                        .unwrap_or_default()
                });
            
            let result: Vec<UsbDrive> = items
                .into_iter()
                .map(|item| UsbDrive {
                    name: item["Name"].as_str().unwrap_or("USB Drive").to_string(),
                    path: item["Path"].as_str().unwrap_or("").to_string(),
                    total_space: item["TotalSpace"].as_u64().unwrap_or(0),
                    free_space: item["FreeSpace"].as_u64().unwrap_or(0),
                    drive_type: "Removable".to_string(),
                })
                .collect();
            
            Ok(result)
        })
        .await
        .map_err(|e| e.to_string())?
    }
    
    #[cfg(not(windows))]
    {
        Ok(vec![])
    }
}


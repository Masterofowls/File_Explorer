use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use base64::Engine;
use std::process::Command;
use tauri::async_runtime;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_hidden: bool,
    pub size: u64,
    pub modified: String,
    pub extension: String,
    pub is_symlink: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirContents {
    pub path: String,
    pub entries: Vec<FileEntry>,
    pub parent: Option<String>,
}

fn is_hidden(name: &str, _path: &Path) -> bool {
    name.starts_with('.')
}

fn format_timestamp(secs: u64) -> String {
    let dt = chrono::DateTime::from_timestamp(secs as i64, 0);
    match dt {
        Some(d) => d.format("%Y-%m-%d %H:%M:%S").to_string(),
        None => String::new(),
    }
}

fn build_file_entry(path: &Path) -> Result<FileEntry, String> {
    let metadata = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let is_symlink = metadata.is_symlink();
    let real_metadata = if is_symlink {
        fs::metadata(path).unwrap_or(metadata.clone())
    } else {
        metadata.clone()
    };
    let is_dir = real_metadata.is_dir();
    let size = if is_dir { 0 } else { real_metadata.len() };
    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| format_timestamp(d.as_secs()))
        .unwrap_or_default();
    let extension = if is_dir {
        String::new()
    } else {
        path.extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default()
    };

    Ok(FileEntry {
        name: name.clone(),
        path: path.to_string_lossy().to_string(),
        is_dir,
        is_hidden: is_hidden(&name, path),
        size,
        modified,
        extension,
        is_symlink,
    })
}

#[tauri::command]
pub fn list_directory(path: String, show_hidden: bool) -> Result<DirContents, String> {
    let dir_path = PathBuf::from(&path);
    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let read_dir = fs::read_dir(&dir_path).map_err(|e| e.to_string())?;
    let mut entries: Vec<FileEntry> = Vec::new();

    for entry in read_dir {
        if let Ok(entry) = entry {
            if let Ok(file_entry) = build_file_entry(&entry.path()) {
                if show_hidden || !file_entry.is_hidden {
                    entries.push(file_entry);
                }
            }
        }
    }

    // Sort: directories first, then alphabetical
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    let parent = dir_path.parent().map(|p| p.to_string_lossy().to_string());

    Ok(DirContents {
        path: dir_path.to_string_lossy().to_string(),
        entries,
        parent,
    })
}

#[tauri::command]
pub fn get_home_directory() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine home directory".to_string())
}

#[tauri::command]
pub fn get_quick_access_paths() -> Result<Vec<(String, String)>, String> {
    let mut paths: Vec<(String, String)> = Vec::new();

    if let Some(home) = dirs::home_dir() {
        paths.push(("Home".into(), home.to_string_lossy().to_string()));
    }
    if let Some(desktop) = dirs::desktop_dir() {
        paths.push(("Desktop".into(), desktop.to_string_lossy().to_string()));
    }
    if let Some(docs) = dirs::document_dir() {
        paths.push(("Documents".into(), docs.to_string_lossy().to_string()));
    }
    if let Some(downloads) = dirs::download_dir() {
        paths.push(("Downloads".into(), downloads.to_string_lossy().to_string()));
    }
    if let Some(pictures) = dirs::picture_dir() {
        paths.push(("Pictures".into(), pictures.to_string_lossy().to_string()));
    }
    if let Some(music) = dirs::audio_dir() {
        paths.push(("Music".into(), music.to_string_lossy().to_string()));
    }
    if let Some(videos) = dirs::video_dir() {
        paths.push(("Videos".into(), videos.to_string_lossy().to_string()));
    }

    Ok(paths)
}

#[tauri::command]
pub fn create_directory(path: String, name: String) -> Result<String, String> {
    let new_path = PathBuf::from(&path).join(&name);
    fs::create_dir_all(&new_path).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_file(path: String, name: String) -> Result<String, String> {
    let new_path = PathBuf::from(&path).join(&name);
    fs::File::create(&new_path).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_items(paths: Vec<String>, use_trash: bool) -> Result<(), String> {
    async_runtime::spawn_blocking(move || {
        for path_str in &paths {
            let path = PathBuf::from(path_str);
            if !path.exists() {
                continue;
            }
            if use_trash {
                trash::delete(&path).map_err(|e| e.to_string())?;
            } else if path.is_dir() {
                fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
            } else {
                fs::remove_file(&path).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub fn rename_item(old_path: String, new_name: String) -> Result<String, String> {
    let old = PathBuf::from(&old_path);
    let parent = old.parent().ok_or("No parent directory")?;
    let new_path = parent.join(&new_name);
    fs::rename(&old, &new_path).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn copy_items(sources: Vec<String>, destination: String) -> Result<(), String> {
    async_runtime::spawn_blocking(move || {
        let dest = PathBuf::from(&destination);
        
        // Ensure destination exists and is a directory
        if !dest.exists() {
            return Err(format!("Destination does not exist: {}", destination));
        }
        if !dest.is_dir() {
            return Err(format!("Destination is not a directory: {}", destination));
        }

        for source_str in &sources {
            let source = PathBuf::from(source_str);
            if !source.exists() {
                return Err(format!("Source does not exist: {}", source_str));
            }

            let file_name = source
                .file_name()
                .ok_or("Invalid file name")?
                .to_string_lossy()
                .to_string();
            let target = dest.join(&file_name);
            
            // Skip if source and target are the same
            if source.canonicalize().ok() == target.canonicalize().ok() {
                continue;
            }

            if source.is_dir() {
                // Remove target if it exists
                if target.exists() {
                    fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
                }
                copy_dir_recursive(&source, &target)?;
            } else {
                copy_with_retry(&source, &target)?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

fn copy_with_retry(src: &Path, dst: &Path) -> Result<(), String> {
    const MAX_RETRIES: u32 = 3;
    const RETRY_DELAY_MS: u64 = 100;

    for attempt in 0..MAX_RETRIES {
        match fs::copy(src, dst) {
            Ok(_) => return Ok(()),
            Err(e) => {
                if attempt < MAX_RETRIES - 1 {
                    std::thread::sleep(std::time::Duration::from_millis(RETRY_DELAY_MS));
                } else {
                    return Err(format!("Failed to copy after {} attempts: {}", MAX_RETRIES, e));
                }
            }
        }
    }
    Err("Copy failed".to_string())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            copy_with_retry(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn move_items(sources: Vec<String>, destination: String) -> Result<(), String> {
    async_runtime::spawn_blocking(move || {
        let dest = PathBuf::from(&destination);
        
        // Ensure destination exists and is a directory
        if !dest.exists() {
            return Err(format!("Destination does not exist: {}", destination));
        }
        if !dest.is_dir() {
            return Err(format!("Destination is not a directory: {}", destination));
        }

        for source_str in &sources {
            let source = PathBuf::from(source_str);
            if !source.exists() {
                return Err(format!("Source does not exist: {}", source_str));
            }

            let file_name = source
                .file_name()
                .ok_or("Invalid file name")?
                .to_string_lossy()
                .to_string();
            let target = dest.join(&file_name);
            
            // Skip if source and target are the same
            if let (Ok(src_canon), Ok(dst_canon)) = (source.canonicalize(), target.canonicalize()) {
                if src_canon == dst_canon {
                    continue;
                }
            }

            move_with_retry(&source, &target)?;
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

fn move_with_retry(src: &Path, dst: &Path) -> Result<(), String> {
    const MAX_RETRIES: u32 = 3;
    const RETRY_DELAY_MS: u64 = 100;

    for attempt in 0..MAX_RETRIES {
        match fs::rename(src, dst) {
            Ok(_) => return Ok(()),
            Err(e) => {
                // If target exists, try to remove it first and retry
                if dst.exists() && attempt == 0 {
                    if let Err(rm_err) = fs::remove_file(dst) {
                        // Can't remove, continue with next attempt
                        eprintln!("Warning: Could not remove existing target: {}", rm_err);
                    } else {
                        // Successfully removed, retry immediately
                        match fs::rename(src, dst) {
                            Ok(_) => return Ok(()),
                            Err(_) => {}
                        }
                    }
                }

                if attempt < MAX_RETRIES - 1 {
                    std::thread::sleep(std::time::Duration::from_millis(RETRY_DELAY_MS));
                } else {
                    return Err(format!("Failed to move after {} attempts: {}", MAX_RETRIES, e));
                }
            }
        }
    }
    Err("Move failed".to_string())
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_files(dir: String, query: String, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    async_runtime::spawn_blocking(move || {
        let query_lower = query.to_lowercase();
        let mut results: Vec<FileEntry> = Vec::new();
        search_recursive(&PathBuf::from(&dir), &query_lower, show_hidden, &mut results, 0, 5)?;
        Ok(results)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

fn search_recursive(
    dir: &Path,
    query: &str,
    show_hidden: bool,
    results: &mut Vec<FileEntry>,
    depth: usize,
    max_depth: usize,
) -> Result<(), String> {
    if depth > max_depth || results.len() >= 200 {
        return Ok(());
    }
    let read_dir = match fs::read_dir(dir) {
        Ok(rd) => rd,
        Err(_) => return Ok(()),
    };
    for entry in read_dir {
        if results.len() >= 200 {
            break;
        }
        if let Ok(entry) = entry {
            if let Ok(file_entry) = build_file_entry(&entry.path()) {
                if !show_hidden && file_entry.is_hidden {
                    continue;
                }
                if file_entry.name.to_lowercase().contains(query) {
                    results.push(file_entry.clone());
                }
                if file_entry.is_dir {
                    search_recursive(&entry.path(), query, show_hidden, results, depth + 1, max_depth)?;
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_file_details(path: String) -> Result<FileEntry, String> {
    build_file_entry(&PathBuf::from(&path))
}

/// Read text file content (UTF-8, with size limit)
#[tauri::command]
pub fn read_file_text(path: String, max_bytes: Option<usize>) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }
    let limit = max_bytes.unwrap_or(2 * 1024 * 1024); // default 2 MB
    let meta = fs::metadata(&p).map_err(|e| e.to_string())?;
    let size = meta.len() as usize;

    if size <= limit {
        fs::read_to_string(&p).map_err(|e| e.to_string())
    } else {
        let mut file = fs::File::open(&p).map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; limit];
        file.read_exact(&mut buf).map_err(|e| e.to_string())?;
        Ok(String::from_utf8_lossy(&buf).to_string())
    }
}

/// Read binary file as base64 (with size limit)
#[tauri::command]
pub fn read_file_base64(path: String, max_bytes: Option<usize>) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }
    let limit = max_bytes.unwrap_or(50 * 1024 * 1024); // default 50 MB
    let meta = fs::metadata(&p).map_err(|e| e.to_string())?;
    let size = meta.len() as usize;

    let read_size = size.min(limit);
    let mut file = fs::File::open(&p).map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; read_size];
    file.read_exact(&mut buf).map_err(|e| e.to_string())?;

    Ok(base64::engine::general_purpose::STANDARD.encode(&buf))
}


/// Calculate total size of a directory recursively (async, non-blocking)
#[tauri::command]
pub async fn calculate_dir_size(path: String) -> Result<u64, String> {
    let dir_path = std::path::PathBuf::from(&path);
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    // Run blocking I/O on a separate thread
    async_runtime::spawn_blocking(move || dir_size_recursive(&dir_path))
        .await
        .map_err(|e| format!("Task failed: {}", e))
}

fn dir_size_recursive(path: &std::path::Path) -> u64 {
    let mut total: u64 = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                total += dir_size_recursive(&p);
            } else if let Ok(meta) = p.metadata() {
                total += meta.len();
            }
        }
    }
    total
}

/// Create a file with initial content (for templates)
#[tauri::command]
pub fn create_file_with_content(path: String, name: String, content: String) -> Result<String, String> {
    let new_path = std::path::PathBuf::from(&path).join(&name);
    std::fs::write(&new_path, content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

/// Show file/folder in the native file manager
#[tauri::command]
pub fn show_in_explorer(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        // Try xdg-open on parent, or dbus for nautilus select
        let parent = p.parent().unwrap_or(&p);
        Command::new("xdg-open")
            .arg(parent.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Open a terminal at the given directory
#[tauri::command]
pub fn open_in_terminal(path: String) -> Result<(), String> {
    let dir = PathBuf::from(&path);
    let target_dir = if dir.is_dir() {
        dir
    } else {
        dir.parent().map(|p| p.to_path_buf()).unwrap_or(dir)
    };
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "cmd", "/k", &format!("cd /d {}", target_dir.to_string_lossy())])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        // Try common terminals in order
        let terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"];
        let mut launched = false;
        for term in &terminals {
            let result = if *term == "gnome-terminal" {
                Command::new(term)
                    .arg("--working-directory")
                    .arg(target_dir.to_string_lossy().to_string())
                    .spawn()
            } else {
                Command::new(term)
                    .arg("--workdir")
                    .arg(target_dir.to_string_lossy().to_string())
                    .spawn()
            };
            if result.is_ok() {
                launched = true;
                break;
            }
        }
        if !launched {
            return Err("No supported terminal emulator found".to_string());
        }
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-a", "Terminal", &target_dir.to_string_lossy()])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Copy path string to system clipboard
#[tauri::command]
pub fn copy_path_to_clipboard(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use clipboard_win::{formats::Unicode, Clipboard, Setter};
        let _clip = Clipboard::new_attempts(10)
            .map_err(|e| format!("Failed to open clipboard: {}", e))?;
        clipboard_win::empty()
            .map_err(|e| format!("Failed to clear clipboard: {}", e))?;
        Unicode.write_clipboard(&path)
            .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        let mut child = Command::new("xclip")
            .args(["-selection", "clipboard"])
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to run xclip: {}", e))?;
        if let Some(ref mut stdin) = child.stdin {
            stdin.write_all(path.as_bytes()).map_err(|e| e.to_string())?;
        }
        child.wait().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        use std::io::Write;
        let mut child = Command::new("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;
        if let Some(ref mut stdin) = child.stdin {
            stdin.write_all(path.as_bytes()).map_err(|e| e.to_string())?;
        }
        child.wait().map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// Get detailed file properties
#[derive(Debug, Serialize)]
pub struct FileProperties {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub size_on_disk: u64,
    pub modified: String,
    pub created: String,
    pub accessed: String,
    pub is_readonly: bool,
    pub is_hidden: bool,
    pub is_symlink: bool,
    pub extension: String,
    pub item_count: Option<u64>,
}

#[tauri::command]
pub fn get_file_properties(path: String) -> Result<FileProperties, String> {
    let p = PathBuf::from(&path);
    let meta = fs::symlink_metadata(&p).map_err(|e| e.to_string())?;
    let real_meta = if meta.is_symlink() {
        fs::metadata(&p).unwrap_or(meta.clone())
    } else {
        meta.clone()
    };
    let name = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let is_dir = real_meta.is_dir();
    let size = if is_dir { dir_size_recursive(&p) } else { real_meta.len() };
    let modified = meta.modified().ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| format_timestamp(d.as_secs())).unwrap_or_default();
    let created = meta.created().ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| format_timestamp(d.as_secs())).unwrap_or_default();
    let accessed = meta.accessed().ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| format_timestamp(d.as_secs())).unwrap_or_default();
    let is_readonly = meta.permissions().readonly();
    let is_hidden_val = is_hidden(&name, &p);
    let extension = if is_dir { String::new() } else {
        p.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default()
    };
    let item_count = if is_dir {
        fs::read_dir(&p).ok().map(|rd| rd.count() as u64)
    } else {
        None
    };
    Ok(FileProperties {
        name,
        path: p.to_string_lossy().to_string(),
        is_dir,
        size,
        size_on_disk: size,
        modified,
        created,
        accessed,
        is_readonly,
        is_hidden: is_hidden_val,
        is_symlink: meta.is_symlink(),
        extension,
        item_count,
    })
}

/// Return the OS type: "windows", "linux", or "macos"
#[tauri::command]
pub fn get_os_type() -> String {
    if cfg!(target_os = "windows") {
        "windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macos".to_string()
    } else {
        "linux".to_string()
    }
}

/// List available drives / mount points
#[tauri::command]
pub fn get_system_drives() -> Result<Vec<(String, String)>, String> {
    let mut drives: Vec<(String, String)> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        // Check drive letters A-Z
        for letter in b'A'..=b'Z' {
            let drive = format!("{}:\\", letter as char);
            let path = PathBuf::from(&drive);
            if path.exists() {
                let label = format!("Local Disk ({}:)", letter as char);
                drives.push((label, drive));
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Root filesystem
        drives.push(("Root (/)".to_string(), "/".to_string()));

        // /tmp
        if PathBuf::from("/tmp").exists() {
            drives.push(("Temp (/tmp)".to_string(), "/tmp".to_string()));
        }

        // Mounted volumes in /media and /mnt
        for mount_dir in &["/media", "/mnt"] {
            if let Ok(entries) = fs::read_dir(mount_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_dir() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        // /media/<user>/<device> structure
                        if *mount_dir == "/media" {
                            if let Ok(sub_entries) = fs::read_dir(&p) {
                                for sub in sub_entries.flatten() {
                                    let sp = sub.path();
                                    if sp.is_dir() {
                                        let sname = sub.file_name().to_string_lossy().to_string();
                                        drives.push((sname, sp.to_string_lossy().to_string()));
                                    }
                                }
                            }
                        } else {
                            drives.push((name, p.to_string_lossy().to_string()));
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        drives.push(("Macintosh HD".to_string(), "/".to_string()));
        if let Ok(entries) = fs::read_dir("/Volumes") {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name != "Macintosh HD" {
                        drives.push((name, p.to_string_lossy().to_string()));
                    }
                }
            }
        }
    }

    Ok(drives)
}

/// Get system-specific special paths
#[tauri::command]
pub fn get_system_paths() -> Vec<(String, String, String)> {
    let mut paths: Vec<(String, String, String)> = Vec::new();

    // Quick access paths from dirs crate
    if let Some(home) = dirs::home_dir() {
        paths.push(("Home".into(), home.to_string_lossy().to_string(), "home".into()));
    }
    if let Some(desktop) = dirs::desktop_dir() {
        paths.push(("Desktop".into(), desktop.to_string_lossy().to_string(), "desktop".into()));
    }
    if let Some(docs) = dirs::document_dir() {
        paths.push(("Documents".into(), docs.to_string_lossy().to_string(), "documents".into()));
    }
    if let Some(downloads) = dirs::download_dir() {
        paths.push(("Downloads".into(), downloads.to_string_lossy().to_string(), "downloads".into()));
    }
    if let Some(pictures) = dirs::picture_dir() {
        paths.push(("Pictures".into(), pictures.to_string_lossy().to_string(), "pictures".into()));
    }
    if let Some(music) = dirs::audio_dir() {
        paths.push(("Music".into(), music.to_string_lossy().to_string(), "music".into()));
    }
    if let Some(videos) = dirs::video_dir() {
        paths.push(("Videos".into(), videos.to_string_lossy().to_string(), "videos".into()));
    }

    paths
}

/// Duplicate a file or folder
#[tauri::command]
pub async fn duplicate_item(path: String) -> Result<String, String> {
    async_runtime::spawn_blocking(move || {
        let source = PathBuf::from(&path);
        if !source.exists() {
            return Err(format!("Source does not exist: {}", path));
        }

        let parent = source.parent().ok_or("Cannot get parent directory")?;
        let stem = source.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let ext = source.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
        
        // Find available copy name
        let mut counter = 1;
        let dest = loop {
            let copy_name = if counter == 1 {
                format!("{} - Copy{}", stem, ext)
            } else {
                format!("{} - Copy ({}){}", stem, counter, ext)
            };
            let dest_path = parent.join(&copy_name);
            if !dest_path.exists() {
                break dest_path;
            }
            counter += 1;
        };

        if source.is_dir() {
            copy_dir_recursive(&source, &dest)?;
        } else {
            fs::copy(&source, &dest).map_err(|e| e.to_string())?;
        }

        Ok(dest.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Create a symbolic link (shortcut)
#[tauri::command]
pub async fn create_shortcut(source: String, link_path: String) -> Result<(), String> {
    async_runtime::spawn_blocking(move || {
        let _src = PathBuf::from(&source);
        
        #[cfg(windows)]
        {
            // Use PowerShell to create Windows shortcut (.lnk)
            let lnk_path = if link_path.ends_with(".lnk") {
                link_path.clone()
            } else {
                format!("{}.lnk", link_path)
            };
            
            let script = format!(
                r#"
                $WshShell = New-Object -ComObject WScript.Shell
                $Shortcut = $WshShell.CreateShortcut("{}")
                $Shortcut.TargetPath = "{}"
                $Shortcut.Save()
                "#,
                lnk_path.replace("\\", "\\\\"),
                source.replace("\\", "\\\\")
            );
            
            Command::new("powershell")
                .args(["-NoProfile", "-Command", &script])
                .output()
                .map_err(|e| e.to_string())?;
            
            Ok(())
        }
        
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&src, &link_path).map_err(|e| e.to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Batch rename files with pattern
#[tauri::command]
pub async fn batch_rename(
    paths: Vec<String>,
    pattern: String,
    replace_with: String,
    use_regex: bool,
) -> Result<Vec<(String, String)>, String> {
    async_runtime::spawn_blocking(move || {
        let mut results: Vec<(String, String)> = Vec::new();
        
        for path_str in paths {
            let path = PathBuf::from(&path_str);
            if let Some(filename) = path.file_name() {
                let name = filename.to_string_lossy().to_string();
                let new_name = if use_regex {
                    match regex::Regex::new(&pattern) {
                        Ok(re) => re.replace_all(&name, replace_with.as_str()).to_string(),
                        Err(e) => return Err(format!("Invalid regex: {}", e)),
                    }
                } else {
                    name.replace(&pattern, &replace_with)
                };
                
                if new_name != name {
                    if let Some(parent) = path.parent() {
                        let new_path = parent.join(&new_name);
                        if !new_path.exists() {
                            fs::rename(&path, &new_path).map_err(|e| e.to_string())?;
                            results.push((path_str, new_path.to_string_lossy().to_string()));
                        }
                    }
                }
            }
        }
        
        Ok(results)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Get drive space info
#[derive(Debug, Serialize, Deserialize)]
pub struct DriveSpaceInfo {
    pub path: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub percent_used: f64,
}

#[tauri::command]
pub fn get_drive_space(path: String) -> Result<DriveSpaceInfo, String> {
    #[cfg(windows)]
    {
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                &format!(
                    r#"
                    $drive = Get-WmiObject Win32_LogicalDisk | Where-Object {{ $_.DeviceID -eq '{}' }}
                    if ($drive) {{
                        [PSCustomObject]@{{
                            Total = $drive.Size
                            Free = $drive.FreeSpace
                        }} | ConvertTo-Json -Compress
                    }}
                    "#,
                    path.trim_end_matches('\\')
                ),
            ])
            .output()
            .map_err(|e| e.to_string())?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        if output_str.trim().is_empty() {
            return Err("Drive not found".to_string());
        }
        
        let json: serde_json::Value = serde_json::from_str(&output_str)
            .map_err(|e| e.to_string())?;
        
        let total = json["Total"].as_u64().unwrap_or(0);
        let free = json["Free"].as_u64().unwrap_or(0);
        let used = total.saturating_sub(free);
        let percent_used = if total > 0 { (used as f64 / total as f64) * 100.0 } else { 0.0 };
        
        Ok(DriveSpaceInfo {
            path,
            total_bytes: total,
            free_bytes: free,
            used_bytes: used,
            percent_used,
        })
    }
    
    #[cfg(not(windows))]
    {
        // For Unix, use statvfs
        Err("Not implemented for this platform".to_string())
    }
}

/// Get available applications to open a file with
#[tauri::command]
pub fn get_open_with_apps(path: String) -> Result<Vec<(String, String)>, String> {
    #[cfg(windows)]
    {
        let ext = PathBuf::from(&path)
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();
        
        if ext.is_empty() {
            return Ok(vec![]);
        }
        
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                &format!(
                    r#"
                    $ext = '{}'
                    $apps = @()
                    
                    # Get default association
                    $assoc = (cmd /c "assoc $ext" 2>$null) -replace ".*=", ""
                    if ($assoc) {{
                        $ftype = (cmd /c "ftype $assoc" 2>$null) -replace '.*="?([^"]+)"?.*', '$1'
                        if ($ftype) {{
                            $apps += [PSCustomObject]@{{ Name = $assoc; Path = $ftype }}
                        }}
                    }}
                    
                    # Common apps
                    $common = @(
                        @{{ Name = "Notepad"; Path = "notepad.exe" }},
                        @{{ Name = "VS Code"; Path = "code" }},
                        @{{ Name = "WordPad"; Path = "wordpad.exe" }}
                    )
                    
                    foreach ($app in $common) {{
                        $apps += [PSCustomObject]$app
                    }}
                    
                    $apps | ConvertTo-Json -Compress
                    "#,
                    ext
                ),
            ])
            .output()
            .map_err(|e| e.to_string())?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        if output_str.trim().is_empty() {
            return Ok(vec![]);
        }
        
        let items: Vec<serde_json::Value> = serde_json::from_str(&output_str)
            .unwrap_or_else(|_| serde_json::from_str(&format!("[{}]", output_str)).unwrap_or_default());
        
        let apps: Vec<(String, String)> = items
            .into_iter()
            .map(|item| {
                (
                    item["Name"].as_str().unwrap_or("").to_string(),
                    item["Path"].as_str().unwrap_or("").to_string(),
                )
            })
            .filter(|(name, _)| !name.is_empty())
            .collect();
        
        Ok(apps)
    }
    
    #[cfg(not(windows))]
    {
        Ok(vec![
            ("xdg-open".to_string(), "xdg-open".to_string()),
            ("vim".to_string(), "vim".to_string()),
            ("nano".to_string(), "nano".to_string()),
        ])
    }
}

/// Open file with specific application
#[tauri::command]
pub fn open_with_app(file_path: String, app_path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        Command::new(&app_path)
            .arg(&file_path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    
    #[cfg(not(windows))]
    {
        Command::new(&app_path)
            .arg(&file_path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}


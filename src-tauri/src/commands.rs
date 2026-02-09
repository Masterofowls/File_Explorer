use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use base64::Engine;

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
pub fn delete_items(paths: Vec<String>, use_trash: bool) -> Result<(), String> {
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
pub fn copy_items(sources: Vec<String>, destination: String) -> Result<(), String> {
    let dest = PathBuf::from(&destination);
    for source_str in &sources {
        let source = PathBuf::from(source_str);
        let file_name = source
            .file_name()
            .ok_or("Invalid file name")?
            .to_string_lossy()
            .to_string();
        let target = dest.join(&file_name);
        if source.is_dir() {
            copy_dir_recursive(&source, &target)?;
        } else {
            fs::copy(&source, &target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
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
            fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn move_items(sources: Vec<String>, destination: String) -> Result<(), String> {
    let dest = PathBuf::from(&destination);
    for source_str in &sources {
        let source = PathBuf::from(source_str);
        let file_name = source
            .file_name()
            .ok_or("Invalid file name")?
            .to_string_lossy()
            .to_string();
        let target = dest.join(&file_name);
        fs::rename(&source, &target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_files(dir: String, query: String, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    let query_lower = query.to_lowercase();
    let mut results: Vec<FileEntry> = Vec::new();
    search_recursive(&PathBuf::from(&dir), &query_lower, show_hidden, &mut results, 0, 5)?;
    Ok(results)
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


/// Calculate total size of a directory recursively
#[tauri::command]
pub fn calculate_dir_size(path: String) -> Result<u64, String> {
    let dir_path = std::path::PathBuf::from(&path);
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    Ok(dir_size_recursive(&dir_path))
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

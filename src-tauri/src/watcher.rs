use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

struct WatcherState {
    watcher: Option<RecommendedWatcher>,
    watched_path: Option<String>,
}

fn state() -> &'static Arc<Mutex<WatcherState>> {
    static STATE: OnceLock<Arc<Mutex<WatcherState>>> = OnceLock::new();
    STATE.get_or_init(|| {
        Arc::new(Mutex::new(WatcherState {
            watcher: None,
            watched_path: None,
        }))
    })
}

#[tauri::command]
pub fn watch_directory(app: AppHandle, path: String) -> Result<(), String> {
    let mut st = state().lock().map_err(|e| e.to_string())?;

    // If already watching this exact path, skip
    if st.watched_path.as_deref() == Some(&path) && st.watcher.is_some() {
        return Ok(());
    }

    // Drop previous watcher
    st.watcher = None;
    st.watched_path = None;

    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let app_handle = app.clone();
    let watched = path.clone();

    let watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            match res {
                Ok(_event) => {
                    // Emit a simple "fs-changed" event to the frontend
                    let _ = app_handle.emit("fs-changed", &watched);
                }
                Err(e) => {
                    eprintln!("Watch error: {}", e);
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    // We create it, then watch (RecommendedWatcher needs &mut)
    st.watcher = Some(watcher);
    if let Some(ref mut w) = st.watcher {
        w.watch(&dir, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch directory: {}", e))?;
    }
    st.watched_path = Some(path);

    Ok(())
}

#[tauri::command]
pub fn unwatch_directory() -> Result<(), String> {
    let mut st = state().lock().map_err(|e| e.to_string())?;
    st.watcher = None;
    st.watched_path = None;
    Ok(())
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipboardFiles {
    pub paths: Vec<String>,
    pub is_cut: bool,
}

// ─── Windows implementation using clipboard-win (CF_HDROP) ───

#[cfg(target_os = "windows")]
mod platform {
    use clipboard_win::{formats::FileList, raw, Clipboard, Getter, Setter};

    pub fn write_files(paths: &[String], cut: bool) -> Result<(), String> {
        let _clip = Clipboard::new_attempts(10)
            .map_err(|e| format!("Failed to open clipboard: {}", e))?;

        clipboard_win::empty()
            .map_err(|e| format!("Failed to clear clipboard: {}", e))?;

        FileList
            .write_clipboard(paths)
            .map_err(|e| format!("Failed to write files to clipboard: {}", e))?;

        // Set Preferred DropEffect (DROPEFFECT_COPY=1, DROPEFFECT_MOVE=2)
        if let Some(format) = raw::register_format("Preferred DropEffect") {
            let effect: u32 = if cut { 2 } else { 1 };
            let _ = raw::set_without_clear(format.get(), &effect.to_le_bytes());
        }

        Ok(())
    }

    pub fn read_files() -> Result<super::ClipboardFiles, String> {
        let _clip = Clipboard::new_attempts(10)
            .map_err(|e| format!("Failed to open clipboard: {}", e))?;

        let mut paths: Vec<String> = Vec::new();
        FileList
            .read_clipboard(&mut paths)
            .map_err(|e| format!("No files in clipboard: {}", e))?;

        if paths.is_empty() {
            return Err("No files in clipboard".to_string());
        }

        // Read Preferred DropEffect to determine copy vs cut
        let is_cut =
            if let Some(format) = raw::register_format("Preferred DropEffect") {
                let mut buf = [0u8; 4];
                match raw::get(format.get(), &mut buf) {
                    Ok(_) => u32::from_le_bytes(buf) == 2, // DROPEFFECT_MOVE
                    Err(_) => false,
                }
            } else {
                false
            };

        Ok(super::ClipboardFiles { paths, is_cut })
    }

    pub fn has_files() -> bool {
        if let Ok(_clip) = Clipboard::new_attempts(10) {
            clipboard_win::is_format_avail(15) // CF_HDROP = 15
        } else {
            false
        }
    }
}

// ─── Linux implementation using xclip (x-special/gnome-copied-files) ───

#[cfg(target_os = "linux")]
mod platform {
    use std::process::{Command, Stdio};
    use std::io::Write;

    pub fn write_files(paths: &[String], cut: bool) -> Result<(), String> {
        let operation = if cut { "cut" } else { "copy" };
        let uris: Vec<String> = paths
            .iter()
            .map(|p| format!("file://{}", p))
            .collect();
        let content = format!("{}\n{}", operation, uris.join("\n"));

        let mut child = Command::new("xclip")
            .args([
                "-selection",
                "clipboard",
                "-t",
                "x-special/gnome-copied-files",
            ])
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to run xclip: {}. Is xclip installed?", e))?;

        if let Some(ref mut stdin) = child.stdin {
            stdin
                .write_all(content.as_bytes())
                .map_err(|e| format!("Failed to write to xclip: {}", e))?;
        }

        let status = child.wait().map_err(|e| e.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err("xclip exited with error".to_string())
        }
    }

    pub fn read_files() -> Result<super::ClipboardFiles, String> {
        let output = Command::new("xclip")
            .args([
                "-selection",
                "clipboard",
                "-t",
                "x-special/gnome-copied-files",
                "-o",
            ])
            .output()
            .map_err(|e| format!("Failed to read clipboard: {}", e))?;

        if !output.status.success() {
            return Err("No files in clipboard".to_string());
        }

        let content = String::from_utf8_lossy(&output.stdout);
        let mut lines = content.lines();
        let first_line = lines.next().unwrap_or("");
        let is_cut = first_line == "cut";

        let paths: Vec<String> = lines
            .filter(|l| l.starts_with("file://"))
            .map(|l| {
                urlencoding::decode(l.strip_prefix("file://").unwrap_or(l))
                    .unwrap_or_else(|_| l.strip_prefix("file://").unwrap_or(l).into())
                    .to_string()
            })
            .collect();

        if paths.is_empty() {
            Err("No files in clipboard".to_string())
        } else {
            Ok(super::ClipboardFiles { paths, is_cut })
        }
    }

    pub fn has_files() -> bool {
        Command::new("xclip")
            .args([
                "-selection",
                "clipboard",
                "-t",
                "x-special/gnome-copied-files",
                "-o",
            ])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

// ─── macOS fallback (in-memory) ───

#[cfg(target_os = "macos")]
mod platform {
    use std::sync::{Mutex, OnceLock};

    fn store() -> &'static Mutex<Option<(Vec<String>, bool)>> {
        static CLIPBOARD: OnceLock<Mutex<Option<(Vec<String>, bool)>>> = OnceLock::new();
        CLIPBOARD.get_or_init(|| Mutex::new(None))
    }

    pub fn write_files(paths: &[String], cut: bool) -> Result<(), String> {
        let mut clip = store().lock().map_err(|e| e.to_string())?;
        *clip = Some((paths.to_vec(), cut));
        Ok(())
    }

    pub fn read_files() -> Result<super::ClipboardFiles, String> {
        let clip = store().lock().map_err(|e| e.to_string())?;
        match clip.as_ref() {
            Some((paths, is_cut)) => Ok(super::ClipboardFiles {
                paths: paths.clone(),
                is_cut: *is_cut,
            }),
            None => Err("No files in clipboard".to_string()),
        }
    }

    pub fn has_files() -> bool {
        store().lock().map(|c| c.is_some()).unwrap_or(false)
    }
}

// ─── Tauri commands ───

#[tauri::command]
pub fn clipboard_write_files(paths: Vec<String>, cut: bool) -> Result<(), String> {
    platform::write_files(&paths, cut)
}

#[tauri::command]
pub fn clipboard_read_files() -> Result<ClipboardFiles, String> {
    platform::read_files()
}

#[tauri::command]
pub fn clipboard_has_files() -> bool {
    platform::has_files()
}

mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

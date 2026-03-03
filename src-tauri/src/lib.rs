use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Manager, State, Window};

const NOTE_COLORS: [&str; 6] = ["#fff9c4", "#c8e6c9", "#bbdefb", "#f8bbd0", "#e1bee7", "#ffe0b2"];
const DEFAULT_NOTE_OPACITY: f64 = 0.92;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum StickyNoteStatus {
    Active,
    Trash,
}

impl Default for StickyNoteStatus {
    fn default() -> Self {
        Self::Active
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StickyNote {
    id: String,
    content: String,
    color: String,
    opacity: f64,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    pinned: bool,
    #[serde(default)]
    status: StickyNoteStatus,
    #[serde(default)]
    deleted_at: Option<i64>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CalendarMark {
    date: String,
    label: String,
    color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CalendarAppearance {
    color: String,
    opacity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateCheckResponse {
    ok: bool,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartupLaunchStatus {
    supported: bool,
    enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NoteUpdate {
    id: String,
    content: Option<String>,
    color: Option<String>,
    opacity: Option<f64>,
    x: Option<i32>,
    y: Option<i32>,
    width: Option<i32>,
    height: Option<i32>,
    pinned: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppearanceUpdate {
    color: Option<String>,
    opacity: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedStore {
    notes: Vec<StickyNote>,
    marks: Vec<CalendarMark>,
    calendar_appearance: CalendarAppearance,
}

struct AppState {
    store_path: PathBuf,
    store: Mutex<PersistedStore>,
}

fn now_ts() -> i64 {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    now.as_secs() as i64
}

fn clamp_opacity(value: f64) -> f64 {
    value.clamp(0.2, 1.0)
}

fn is_trash_note(note: &StickyNote) -> bool {
    note.status == StickyNoteStatus::Trash
}

fn default_store() -> PersistedStore {
    PersistedStore {
        notes: Vec::new(),
        marks: Vec::new(),
        calendar_appearance: CalendarAppearance {
            color: "#ffffff".to_string(),
            opacity: 0.94,
        },
    }
}

fn load_store(path: &PathBuf) -> PersistedStore {
    match fs::read_to_string(path) {
        Ok(content) => serde_json::from_str::<PersistedStore>(&content).unwrap_or_else(|_| default_store()),
        Err(_) => default_store(),
    }
}

fn save_store(path: &PathBuf, store: &PersistedStore) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_notes(state: State<'_, AppState>) -> Result<Vec<StickyNote>, String> {
    let store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    Ok(store
        .notes
        .iter()
        .filter(|note| !is_trash_note(note))
        .cloned()
        .collect())
}

#[tauri::command]
fn get_trash_notes(state: State<'_, AppState>) -> Result<Vec<StickyNote>, String> {
    let store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    Ok(store
        .notes
        .iter()
        .filter(|note| is_trash_note(note))
        .cloned()
        .collect())
}

#[tauri::command]
fn create_note(state: State<'_, AppState>) -> Result<StickyNote, String> {
    let mut store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    let index = store.notes.len() % NOTE_COLORS.len();
    let ts = now_ts();
    let note = StickyNote {
        id: format!("note_{}_{}", ts, store.notes.len() + 1),
        content: String::new(),
        color: NOTE_COLORS[index].to_string(),
        opacity: DEFAULT_NOTE_OPACITY,
        x: 100,
        y: 100,
        width: 260,
        height: 280,
        pinned: false,
        status: StickyNoteStatus::Active,
        deleted_at: None,
        created_at: ts,
        updated_at: ts,
    };

    store.notes.push(note.clone());
    save_store(&state.store_path, &store)?;
    Ok(note)
}

#[tauri::command]
fn save_note(state: State<'_, AppState>, note: NoteUpdate) -> Result<bool, String> {
    let mut store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    if let Some(existing) = store.notes.iter_mut().find(|n| n.id == note.id) {
        if let Some(content) = note.content {
            existing.content = content;
        }
        if let Some(color) = note.color {
            existing.color = color;
        }
        if let Some(opacity) = note.opacity {
            existing.opacity = clamp_opacity(opacity);
        }
        if let Some(x) = note.x {
            existing.x = x;
        }
        if let Some(y) = note.y {
            existing.y = y;
        }
        if let Some(width) = note.width {
            existing.width = width;
        }
        if let Some(height) = note.height {
            existing.height = height;
        }
        if let Some(pinned) = note.pinned {
            existing.pinned = pinned;
        }
        existing.updated_at = now_ts();
        save_store(&state.store_path, &store)?;
    }
    Ok(true)
}

#[tauri::command]
fn delete_note(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let mut store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    if let Some(existing) = store.notes.iter_mut().find(|note| note.id == id) {
        if !is_trash_note(existing) {
            let ts = now_ts();
            existing.status = StickyNoteStatus::Trash;
            existing.deleted_at = Some(ts);
            existing.updated_at = ts;
            save_store(&state.store_path, &store)?;
        }
        return Ok(true);
    }

    Ok(false)
}

#[tauri::command]
fn restore_note(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let mut store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    if let Some(existing) = store
        .notes
        .iter_mut()
        .find(|note| note.id == id && is_trash_note(note))
    {
        existing.status = StickyNoteStatus::Active;
        existing.deleted_at = None;
        existing.updated_at = now_ts();
        save_store(&state.store_path, &store)?;
        return Ok(true);
    }

    Ok(false)
}

#[tauri::command]
fn permanently_delete_note(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let mut store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    if let Some(existing) = store.notes.iter().find(|note| note.id == id) {
        if !is_trash_note(existing) {
            return Ok(false);
        }
    } else {
        return Ok(false);
    }

    store.notes.retain(|note| note.id != id);
    save_store(&state.store_path, &store)?;
    Ok(true)
}

#[tauri::command]
fn get_marks(state: State<'_, AppState>) -> Result<Vec<CalendarMark>, String> {
    let store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    Ok(store.marks.clone())
}

#[tauri::command]
fn save_mark(state: State<'_, AppState>, mark: CalendarMark) -> Result<bool, String> {
    let mut store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    if let Some(existing) = store.marks.iter_mut().find(|m| m.date == mark.date) {
        *existing = mark;
    } else {
        store.marks.push(mark);
    }
    save_store(&state.store_path, &store)?;
    Ok(true)
}

#[tauri::command]
fn delete_mark(state: State<'_, AppState>, date: String) -> Result<bool, String> {
    let mut store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    store.marks.retain(|mark| mark.date != date);
    save_store(&state.store_path, &store)?;
    Ok(true)
}

#[tauri::command]
fn get_calendar_appearance(state: State<'_, AppState>) -> Result<CalendarAppearance, String> {
    let store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;
    Ok(store.calendar_appearance.clone())
}

#[tauri::command]
fn save_calendar_appearance(
    state: State<'_, AppState>,
    appearance: AppearanceUpdate,
) -> Result<CalendarAppearance, String> {
    let mut store = state.store.lock().map_err(|_| "store lock poisoned".to_string())?;

    if let Some(color) = appearance.color {
        store.calendar_appearance.color = color;
    }
    if let Some(opacity) = appearance.opacity {
        store.calendar_appearance.opacity = clamp_opacity(opacity);
    }

    let current = store.calendar_appearance.clone();
    save_store(&state.store_path, &store)?;
    Ok(current)
}

#[tauri::command]
fn pin_window(window: Window, pinned: bool) -> Result<bool, String> {
    window
        .set_always_on_top(pinned)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn close_window(window: Window) -> Result<bool, String> {
    window.close().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn open_note() -> bool {
    true
}

#[tauri::command]
fn open_calendar() -> bool {
    true
}

#[tauri::command]
fn check_for_updates() -> UpdateCheckResponse {
    UpdateCheckResponse {
        ok: true,
        message: "Tauri 迁移阶段暂未启用内置更新。".to_string(),
    }
}

#[tauri::command]
fn get_startup_launch_status() -> StartupLaunchStatus {
    StartupLaunchStatus {
        supported: false,
        enabled: false,
    }
}

#[tauri::command]
fn set_startup_launch_enabled(_enabled: bool) -> StartupLaunchStatus {
    StartupLaunchStatus {
        supported: false,
        enabled: false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let store_path = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("store.json");
            let store = load_store(&store_path);
            app.manage(AppState {
                store_path,
                store: Mutex::new(store),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_notes,
            get_trash_notes,
            create_note,
            save_note,
            delete_note,
            restore_note,
            permanently_delete_note,
            get_marks,
            save_mark,
            delete_mark,
            get_calendar_appearance,
            save_calendar_appearance,
            pin_window,
            close_window,
            open_note,
            open_calendar,
            check_for_updates,
            get_startup_launch_status,
            set_startup_launch_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

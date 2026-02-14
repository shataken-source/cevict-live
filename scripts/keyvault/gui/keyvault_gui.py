"""
KeyVault GUI — System tray application for managing cevict-live secrets.
Wraps the PowerShell KeyVault module and scripts with a modern dark UI.
Lives in the Windows system tray for quick access.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

from PyQt6.QtCore import Qt, QThread, pyqtSignal, QSize, QTimer
from PyQt6.QtGui import (
    QAction, QColor, QFont, QIcon, QPainter, QPen, QPixmap, QBrush,
    QLinearGradient, QPalette,
)
from PyQt6.QtWidgets import (
    QApplication, QComboBox, QDialog, QFileDialog, QFormLayout,
    QGroupBox, QHBoxLayout, QHeaderView, QLabel, QLineEdit,
    QMainWindow, QMenu, QMessageBox, QPlainTextEdit, QPushButton,
    QSplitter, QStatusBar, QSystemTrayIcon, QTableWidget,
    QTableWidgetItem, QTabWidget, QToolBar, QVBoxLayout, QWidget,
    QCheckBox, QStyle,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent.parent  # scripts/keyvault
REPO_ROOT = SCRIPT_DIR.parent.parent  # cevict-live

STORE_CANDIDATES = [
    Path(r"C:\Cevict_Vault\env-store.json"),
    Path(r"C:\Cevict_Vault\env-store.json.txt"),
    Path(r"C:\Cevict_Vault\vault\secrets\env-store.json"),
    Path(r"C:\Cevict_Vault\secrets\env-store.json"),
    REPO_ROOT / "vault" / "secrets" / "env-store.json",
]


def find_store_path() -> Path:
    override = os.environ.get("KEYVAULT_STORE_PATH")
    if override:
        return Path(override)
    for p in STORE_CANDIDATES:
        if p.exists():
            return p
    return REPO_ROOT / "vault" / "secrets" / "env-store.json"


# ---------------------------------------------------------------------------
# Store I/O  (pure Python, no PowerShell needed for basic CRUD)
# ---------------------------------------------------------------------------
class KeyVaultStore:
    def __init__(self):
        self.path = find_store_path()
        self._data: dict = {}
        self.load()

    def load(self):
        if self.path.exists():
            try:
                self._data = json.loads(self.path.read_text("utf-8"))
            except Exception:
                self._data = {"version": 1, "secrets": {}}
        else:
            self._data = {"version": 1, "secrets": {}}
        if "secrets" not in self._data:
            self._data["secrets"] = {}

    def save(self):
        from datetime import datetime, timezone
        self._data["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._data, indent=2) + "\n", "utf-8")

    @property
    def secrets(self) -> dict:
        return self._data.get("secrets", {})

    def get(self, name: str) -> Optional[str]:
        return self.secrets.get(name)

    def set(self, name: str, value: str):
        self._data["secrets"][name] = value
        self.save()

    def delete(self, name: str):
        self._data["secrets"].pop(name, None)
        self.save()

    def count(self) -> int:
        return len(self.secrets)


# ---------------------------------------------------------------------------
# PowerShell runner thread
# ---------------------------------------------------------------------------
class PsRunner(QThread):
    output = pyqtSignal(str)
    finished_signal = pyqtSignal(int)

    def __init__(self, script: str, args: list[str] | None = None, cwd: str | None = None):
        super().__init__()
        self.script = script
        self.args = args or []
        self.cwd = cwd or str(SCRIPT_DIR)

    def run(self):
        cmd = ["pwsh", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", self.script] + self.args
        try:
            proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, cwd=self.cwd,
            )
            for line in proc.stdout:
                self.output.emit(line.rstrip("\n"))
            proc.wait()
            self.finished_signal.emit(proc.returncode)
        except Exception as e:
            self.output.emit(f"ERROR: {e}")
            self.finished_signal.emit(1)


# ---------------------------------------------------------------------------
# Dark palette
# ---------------------------------------------------------------------------
DARK_BG = "#0f1117"
PANEL_BG = "#1a1d27"
BORDER = "#2a2d3a"
ACCENT = "#fbbf24"
GREEN = "#34d399"
RED = "#fb7185"
BLUE = "#7dd3fc"
TEXT = "#e2e8f0"
TEXT_DIM = "#9ca3af"

STYLESHEET = f"""
QMainWindow, QDialog, QWidget {{
    background-color: {DARK_BG};
    color: {TEXT};
    font-family: 'Segoe UI', 'Consolas', sans-serif;
    font-size: 13px;
}}
QTabWidget::pane {{
    border: 1px solid {BORDER};
    background: {PANEL_BG};
    border-radius: 6px;
}}
QTabBar::tab {{
    background: {DARK_BG};
    color: {TEXT_DIM};
    padding: 8px 18px;
    border: 1px solid {BORDER};
    border-bottom: none;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    margin-right: 2px;
}}
QTabBar::tab:selected {{
    background: {PANEL_BG};
    color: {ACCENT};
    border-bottom: 2px solid {ACCENT};
}}
QTableWidget {{
    background: {PANEL_BG};
    border: 1px solid {BORDER};
    gridline-color: {BORDER};
    color: {TEXT};
    selection-background-color: #2a2d3a;
    font-family: 'Consolas', 'Cascadia Code', monospace;
    font-size: 12px;
}}
QTableWidget::item {{
    padding: 4px 8px;
}}
QHeaderView::section {{
    background: {DARK_BG};
    color: {ACCENT};
    border: 1px solid {BORDER};
    padding: 6px 10px;
    font-weight: bold;
    font-size: 11px;
    text-transform: uppercase;
}}
QLineEdit, QPlainTextEdit, QComboBox {{
    background: {DARK_BG};
    border: 1px solid {BORDER};
    border-radius: 4px;
    padding: 6px 10px;
    color: {TEXT};
    font-family: 'Consolas', monospace;
}}
QLineEdit:focus, QPlainTextEdit:focus {{
    border-color: {ACCENT};
}}
QPushButton {{
    background: {PANEL_BG};
    border: 1px solid {BORDER};
    border-radius: 4px;
    padding: 7px 16px;
    color: {TEXT};
    font-weight: 600;
}}
QPushButton:hover {{
    border-color: {ACCENT};
    color: {ACCENT};
}}
QPushButton:pressed {{
    background: {BORDER};
}}
QPushButton#btnDanger {{
    border-color: {RED};
    color: {RED};
}}
QPushButton#btnDanger:hover {{
    background: #3b1525;
}}
QPushButton#btnSuccess {{
    border-color: {GREEN};
    color: {GREEN};
}}
QPushButton#btnSuccess:hover {{
    background: #0f2922;
}}
QPushButton#btnAccent {{
    border-color: {ACCENT};
    color: {ACCENT};
}}
QGroupBox {{
    border: 1px solid {BORDER};
    border-radius: 6px;
    margin-top: 14px;
    padding-top: 18px;
    color: {TEXT_DIM};
    font-weight: bold;
}}
QGroupBox::title {{
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 6px;
    color: {ACCENT};
}}
QStatusBar {{
    background: {DARK_BG};
    color: {TEXT_DIM};
    border-top: 1px solid {BORDER};
}}
QSplitter::handle {{
    background: {BORDER};
}}
QCheckBox {{
    color: {TEXT};
    spacing: 6px;
}}
QCheckBox::indicator {{
    width: 16px;
    height: 16px;
    border: 1px solid {BORDER};
    border-radius: 3px;
    background: {DARK_BG};
}}
QCheckBox::indicator:checked {{
    background: {ACCENT};
    border-color: {ACCENT};
}}
QMenu {{
    background: {PANEL_BG};
    border: 1px solid {BORDER};
    color: {TEXT};
    padding: 4px;
}}
QMenu::item:selected {{
    background: {BORDER};
    color: {ACCENT};
}}
QLabel#heading {{
    font-size: 16px;
    font-weight: bold;
    color: {ACCENT};
}}
QLabel#subheading {{
    font-size: 11px;
    color: {TEXT_DIM};
}}
"""


# ---------------------------------------------------------------------------
# Tray icon (generated programmatically — no external file needed)
# ---------------------------------------------------------------------------
def make_tray_icon() -> QIcon:
    px = QPixmap(64, 64)
    px.fill(QColor(0, 0, 0, 0))
    p = QPainter(px)
    p.setRenderHint(QPainter.RenderHint.Antialiasing)
    # Background circle
    grad = QLinearGradient(0, 0, 64, 64)
    grad.setColorAt(0, QColor(ACCENT))
    grad.setColorAt(1, QColor("#f59e0b"))
    p.setBrush(QBrush(grad))
    p.setPen(Qt.PenStyle.NoPen)
    p.drawRoundedRect(4, 4, 56, 56, 14, 14)
    # Key symbol
    p.setPen(QPen(QColor(DARK_BG), 4))
    p.setBrush(Qt.BrushStyle.NoBrush)
    p.drawEllipse(18, 14, 20, 20)
    p.setPen(QPen(QColor(DARK_BG), 5))
    p.drawLine(28, 34, 28, 52)
    p.drawLine(28, 42, 36, 42)
    p.drawLine(28, 48, 34, 48)
    p.end()
    return QIcon(px)


# ---------------------------------------------------------------------------
# Output console dialog (reusable)
# ---------------------------------------------------------------------------
class OutputConsole(QDialog):
    def __init__(self, title: str, parent=None):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.resize(700, 450)
        layout = QVBoxLayout(self)
        self.text = QPlainTextEdit()
        self.text.setReadOnly(True)
        self.text.setFont(QFont("Consolas", 11))
        layout.addWidget(self.text)
        btn_row = QHBoxLayout()
        self.btn_close = QPushButton("Close")
        self.btn_close.clicked.connect(self.close)
        btn_row.addStretch()
        btn_row.addWidget(self.btn_close)
        layout.addLayout(btn_row)
        self._runner: Optional[PsRunner] = None

    def run_script(self, script: str, args: list[str] | None = None):
        self.text.clear()
        self.text.appendPlainText(f"Running: {Path(script).name} {' '.join(args or [])}\n")
        self.btn_close.setEnabled(False)
        self._runner = PsRunner(script, args)
        self._runner.output.connect(self._on_output)
        self._runner.finished_signal.connect(self._on_done)
        self._runner.start()

    def _on_output(self, line: str):
        self.text.appendPlainText(line)

    def _on_done(self, code: int):
        self.text.appendPlainText(f"\n{'=' * 40}")
        self.text.appendPlainText(f"Exit code: {code}")
        self.btn_close.setEnabled(True)


# ---------------------------------------------------------------------------
# Add / Edit secret dialog
# ---------------------------------------------------------------------------
class SecretDialog(QDialog):
    def __init__(self, parent=None, name: str = "", value: str = "", edit_mode: bool = False):
        super().__init__(parent)
        self.setWindowTitle("Edit Secret" if edit_mode else "Add Secret")
        self.resize(500, 200)
        layout = QFormLayout(self)

        self.name_input = QLineEdit(name)
        if edit_mode:
            self.name_input.setReadOnly(True)
        layout.addRow("Key:", self.name_input)

        self.value_input = QLineEdit(value)
        self.value_input.setEchoMode(QLineEdit.EchoMode.Normal)
        layout.addRow("Value:", self.value_input)

        self.show_cb = QCheckBox("Show value")
        self.show_cb.setChecked(True)
        self.show_cb.toggled.connect(self._toggle_echo)
        layout.addRow("", self.show_cb)

        btn_row = QHBoxLayout()
        self.btn_save = QPushButton("Save")
        self.btn_save.setObjectName("btnSuccess")
        self.btn_save.clicked.connect(self.accept)
        self.btn_cancel = QPushButton("Cancel")
        self.btn_cancel.clicked.connect(self.reject)
        btn_row.addStretch()
        btn_row.addWidget(self.btn_cancel)
        btn_row.addWidget(self.btn_save)
        layout.addRow(btn_row)

    def _toggle_echo(self, checked: bool):
        self.value_input.setEchoMode(
            QLineEdit.EchoMode.Normal if checked else QLineEdit.EchoMode.Password
        )

    def get_data(self) -> tuple[str, str]:
        return self.name_input.text().strip(), self.value_input.text()


# ---------------------------------------------------------------------------
# Main window
# ---------------------------------------------------------------------------
class KeyVaultWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("KeyVault Manager")
        self.setMinimumSize(950, 650)
        self.store = KeyVaultStore()

        # Central widget
        central = QWidget()
        self.setCentralWidget(central)
        root_layout = QVBoxLayout(central)
        root_layout.setContentsMargins(12, 12, 12, 12)

        # Header
        header = QHBoxLayout()
        title = QLabel("KeyVault Manager")
        title.setObjectName("heading")
        header.addWidget(title)
        header.addStretch()
        store_label = QLabel(f"Store: {self.store.path}")
        store_label.setObjectName("subheading")
        header.addWidget(store_label)
        root_layout.addLayout(header)

        # Tabs
        self.tabs = QTabWidget()
        root_layout.addWidget(self.tabs)

        # --- Secrets tab ---
        self.secrets_tab = self._build_secrets_tab()
        self.tabs.addTab(self.secrets_tab, "Secrets")

        # --- Operations tab ---
        self.ops_tab = self._build_ops_tab()
        self.tabs.addTab(self.ops_tab, "Operations")

        # --- Vercel Push tab ---
        self.vercel_tab = self._build_vercel_tab()
        self.tabs.addTab(self.vercel_tab, "Vercel Push")

        # --- Diagnostics tab ---
        self.diag_tab = self._build_diag_tab()
        self.tabs.addTab(self.diag_tab, "Diagnostics")

        # Status bar
        self.status = QStatusBar()
        self.setStatusBar(self.status)
        self._update_status()

        # Load data
        self._refresh_table()

    # ---- Secrets Tab ----
    def _build_secrets_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        # Toolbar
        toolbar = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search keys...")
        self.search_input.textChanged.connect(self._filter_table)
        toolbar.addWidget(self.search_input, 1)

        btn_add = QPushButton("+ Add Secret")
        btn_add.setObjectName("btnSuccess")
        btn_add.clicked.connect(self._add_secret)
        toolbar.addWidget(btn_add)

        btn_refresh = QPushButton("Refresh")
        btn_refresh.clicked.connect(self._refresh_table)
        toolbar.addWidget(btn_refresh)

        layout.addLayout(toolbar)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(3)
        self.table.setHorizontalHeaderLabels(["Key", "Value (masked)", "Actions"])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Fixed)
        self.table.setColumnWidth(2, 230)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.verticalHeader().setVisible(False)
        self.table.setAlternatingRowColors(True)
        layout.addWidget(self.table)

        # Bottom stats
        self.lbl_count = QLabel()
        layout.addWidget(self.lbl_count)

        return w

    def _refresh_table(self):
        self.store.load()
        secrets = self.store.secrets
        self.table.setRowCount(0)
        for key in sorted(secrets.keys(), key=str.lower):
            self._add_table_row(key, secrets[key])
        self._update_status()
        self._filter_table(self.search_input.text())

    def _add_table_row(self, key: str, value: str):
        row = self.table.rowCount()
        self.table.insertRow(row)

        key_item = QTableWidgetItem(key)
        key_item.setFlags(key_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
        self.table.setItem(row, 0, key_item)

        masked = self._mask_value(value)
        val_item = QTableWidgetItem(masked)
        val_item.setFlags(val_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
        val_item.setData(Qt.ItemDataRole.UserRole, value)  # store real value
        self.table.setItem(row, 1, val_item)

        # Action buttons
        actions = QWidget()
        btn_layout = QHBoxLayout(actions)
        btn_layout.setContentsMargins(4, 2, 4, 2)
        btn_layout.setSpacing(4)

        btn_reveal = QPushButton("👁 Reveal")
        btn_reveal.setToolTip("Show / hide the secret value")
        btn_reveal.setFixedWidth(75)
        btn_reveal.clicked.connect(lambda _, r=row: self._toggle_reveal(r))
        btn_layout.addWidget(btn_reveal)

        btn_edit = QPushButton("✏ Edit")
        btn_edit.setToolTip("Edit this secret's value")
        btn_edit.setObjectName("btnAccent")
        btn_edit.setFixedWidth(65)
        btn_edit.clicked.connect(lambda _, k=key, v=value: self._edit_secret(k, v))
        btn_layout.addWidget(btn_edit)

        btn_del = QPushButton("🗑 Del")
        btn_del.setToolTip("Delete this secret from the store")
        btn_del.setObjectName("btnDanger")
        btn_del.setFixedWidth(60)
        btn_del.clicked.connect(lambda _, k=key: self._delete_secret(k))
        btn_layout.addWidget(btn_del)

        self.table.setCellWidget(row, 2, actions)

    @staticmethod
    def _mask_value(value: str) -> str:
        if not value:
            return "(empty)"
        if len(value) <= 8:
            return "*" * len(value)
        return value[:4] + "*" * min(len(value) - 8, 20) + value[-4:]

    def _toggle_reveal(self, row: int):
        item = self.table.item(row, 1)
        if not item:
            return
        real = item.data(Qt.ItemDataRole.UserRole)
        if item.text() == real:
            item.setText(self._mask_value(real))
        else:
            item.setText(real)

    def _filter_table(self, text: str):
        text = text.lower()
        visible = 0
        for row in range(self.table.rowCount()):
            key_item = self.table.item(row, 0)
            match = text in key_item.text().lower() if key_item else True
            self.table.setRowHidden(row, not match)
            if match:
                visible += 1
        self.lbl_count.setText(f"{visible} / {self.store.count()} secrets shown")

    def _add_secret(self):
        dlg = SecretDialog(self)
        if dlg.exec() == QDialog.DialogCode.Accepted:
            name, value = dlg.get_data()
            if not name:
                QMessageBox.warning(self, "Error", "Key name cannot be empty.")
                return
            self.store.set(name, value)
            self._refresh_table()
            self.status.showMessage(f"Added: {name}", 3000)

    def _edit_secret(self, key: str, value: str):
        dlg = SecretDialog(self, name=key, value=value, edit_mode=True)
        if dlg.exec() == QDialog.DialogCode.Accepted:
            _, new_value = dlg.get_data()
            self.store.set(key, new_value)
            self._refresh_table()
            self.status.showMessage(f"Updated: {key}", 3000)

    def _delete_secret(self, key: str):
        reply = QMessageBox.question(
            self, "Delete Secret",
            f"Delete '{key}' from the store?\n\nThis cannot be undone.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            self.store.delete(key)
            self._refresh_table()
            self.status.showMessage(f"Deleted: {key}", 3000)

    # ---- Operations Tab ----
    def _build_ops_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        # Sync env
        sync_group = QGroupBox("Sync .env.local from Store")
        sg_layout = QVBoxLayout(sync_group)
        sg_row = QHBoxLayout()
        sg_row.addWidget(QLabel("App:"))
        self.sync_app_combo = QComboBox()
        self._populate_app_combo(self.sync_app_combo)
        sg_row.addWidget(self.sync_app_combo, 1)
        self.sync_dry = QCheckBox("Dry Run")
        sg_row.addWidget(self.sync_dry)
        btn_sync = QPushButton("Sync")
        btn_sync.setObjectName("btnSuccess")
        btn_sync.clicked.connect(self._run_sync)
        sg_row.addWidget(btn_sync)
        btn_sync_all = QPushButton("Sync All")
        btn_sync_all.clicked.connect(self._run_sync_all)
        sg_row.addWidget(btn_sync_all)
        sg_layout.addLayout(sg_row)
        layout.addWidget(sync_group)

        # Import from .env
        import_group = QGroupBox("Import from .env Files")
        ig_layout = QVBoxLayout(import_group)
        ig_row = QHBoxLayout()
        self.import_overwrite = QCheckBox("Overwrite existing")
        ig_row.addWidget(self.import_overwrite)
        self.import_dry = QCheckBox("Dry Run")
        ig_row.addWidget(self.import_dry)
        btn_import = QPushButton("Import (defaults)")
        btn_import.clicked.connect(self._run_import)
        ig_row.addWidget(btn_import)
        btn_import_file = QPushButton("Import from file...")
        btn_import_file.clicked.connect(self._run_import_file)
        ig_row.addWidget(btn_import_file)
        ig_layout.addLayout(ig_row)
        layout.addWidget(import_group)

        # Find placeholders
        ph_group = QGroupBox("Find Placeholders")
        ph_layout = QHBoxLayout(ph_group)
        btn_ph = QPushButton("Find Placeholders")
        btn_ph.clicked.connect(self._run_find_placeholders)
        ph_layout.addWidget(btn_ph)
        btn_ph_all = QPushButton("List All Keys")
        btn_ph_all.clicked.connect(self._run_find_placeholders_all)
        ph_layout.addWidget(btn_ph_all)
        ph_layout.addStretch()
        layout.addWidget(ph_group)

        # Scan env files
        scan_group = QGroupBox("Scan Repo for .env Files")
        scan_layout = QHBoxLayout(scan_group)
        btn_scan = QPushButton("Scan")
        btn_scan.clicked.connect(self._run_scan)
        scan_layout.addWidget(btn_scan)
        self.scan_placeholders = QCheckBox("Report placeholders in store")
        scan_layout.addWidget(self.scan_placeholders)
        scan_layout.addStretch()
        layout.addWidget(scan_group)

        layout.addStretch()
        return w

    # ---- Vercel Push Tab ----
    def _build_vercel_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        form = QFormLayout()
        self.vercel_app = QComboBox()
        self.vercel_app.setEditable(True)
        self._populate_vercel_apps()
        form.addRow("App name:", self.vercel_app)

        self.vercel_env = QComboBox()
        self.vercel_env.addItems(["development", "preview", "production"])
        form.addRow("Environment:", self.vercel_env)

        self.vercel_dry = QCheckBox("Dry Run")
        form.addRow("", self.vercel_dry)

        layout.addLayout(form)

        btn_push = QPushButton("Push to Vercel")
        btn_push.setObjectName("btnAccent")
        btn_push.clicked.connect(self._run_push_vercel)
        layout.addWidget(btn_push)

        layout.addStretch()
        return w

    # ---- Diagnostics Tab ----
    def _build_diag_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        # Doctor
        doc_group = QGroupBox("Doctor (check required keys)")
        dg_layout = QHBoxLayout(doc_group)
        dg_layout.addWidget(QLabel("App:"))
        self.doctor_app_combo = QComboBox()
        self._populate_app_combo(self.doctor_app_combo)
        dg_layout.addWidget(self.doctor_app_combo, 1)
        btn_doctor = QPushButton("Run Doctor")
        btn_doctor.setObjectName("btnAccent")
        btn_doctor.clicked.connect(self._run_doctor)
        dg_layout.addWidget(btn_doctor)
        layout.addWidget(doc_group)

        # List missing keys
        miss_group = QGroupBox("List Missing Keys")
        mg_layout = QHBoxLayout(miss_group)
        mg_layout.addWidget(QLabel("App (optional):"))
        self.missing_app_combo = QComboBox()
        self.missing_app_combo.addItem("(all defaults)")
        self._populate_app_combo(self.missing_app_combo, include_blank=False)
        mg_layout.addWidget(self.missing_app_combo, 1)
        self.missing_show_values = QCheckBox("Show values")
        mg_layout.addWidget(self.missing_show_values)
        btn_missing = QPushButton("List Missing")
        btn_missing.clicked.connect(self._run_list_missing)
        mg_layout.addWidget(btn_missing)
        layout.addWidget(miss_group)

        # Store info
        info_group = QGroupBox("Store Info")
        ig_layout = QVBoxLayout(info_group)
        ig_layout.addWidget(QLabel(f"Path: {self.store.path}"))
        ig_layout.addWidget(QLabel(f"Exists: {self.store.path.exists()}"))
        ig_layout.addWidget(QLabel(f"Keys: {self.store.count()}"))
        updated = self.store._data.get("updated_at", "unknown")
        ig_layout.addWidget(QLabel(f"Last updated: {updated}"))
        layout.addWidget(info_group)

        layout.addStretch()
        return w

    # ---- Helpers ----
    def _populate_app_combo(self, combo: QComboBox, include_blank: bool = False):
        apps_dir = REPO_ROOT / "apps"
        if not apps_dir.exists():
            return
        for d in sorted(apps_dir.iterdir()):
            manifest = d / "env.manifest.json"
            if d.is_dir() and manifest.exists():
                combo.addItem(d.name)

    def _populate_vercel_apps(self):
        targets_file = REPO_ROOT / "config" / "keyvault.targets.json"
        if not targets_file.exists():
            targets_file = REPO_ROOT / "config" / "keyvault.targets.example.json"
        if targets_file.exists():
            try:
                data = json.loads(targets_file.read_text("utf-8"))
                apps = data.get("apps", {})
                for name in sorted(apps.keys()):
                    self.vercel_app.addItem(name)
            except Exception:
                pass

    def _app_path(self, combo: QComboBox) -> str:
        return str(REPO_ROOT / "apps" / combo.currentText())

    def _open_console(self, title: str, script_name: str, args: list[str] | None = None):
        script = str(SCRIPT_DIR / script_name)
        console = OutputConsole(title, self)
        console.run_script(script, args)
        console.exec()
        # Refresh secrets table after operations
        self._refresh_table()

    # ---- Script runners ----
    def _run_sync(self):
        args = ["-AppPath", self._app_path(self.sync_app_combo)]
        if self.sync_dry.isChecked():
            args.append("-DryRun")
        self._open_console("Sync Env", "sync-env.ps1", args)

    def _run_sync_all(self):
        args = ["-All"]
        if self.sync_dry.isChecked():
            args.append("-DryRun")
        self._open_console("Sync All Apps", "sync-env.ps1", args)

    def _run_import(self):
        args = []
        if self.import_overwrite.isChecked():
            args.append("-Overwrite")
        if self.import_dry.isChecked():
            args.append("-DryRun")
        self._open_console("Import from .env", "import-from-env.ps1", args)

    def _run_import_file(self):
        path, _ = QFileDialog.getOpenFileName(self, "Select .env file", str(REPO_ROOT), "Env files (*.env *.local *.env.local);;All files (*)")
        if not path:
            return
        args = ["-Paths", path]
        if self.import_overwrite.isChecked():
            args.append("-Overwrite")
        if self.import_dry.isChecked():
            args.append("-DryRun")
        self._open_console("Import from File", "import-from-env.ps1", args)

    def _run_find_placeholders(self):
        self._open_console("Find Placeholders", "find-placeholders.ps1")

    def _run_find_placeholders_all(self):
        self._open_console("All Keys", "find-placeholders.ps1", ["-ListAll"])

    def _run_scan(self):
        args = []
        if self.scan_placeholders.isChecked():
            args.append("-ReportPlaceholdersInStore")
        self._open_console("Scan Env Files", "scan-env-files.ps1", args)

    def _run_push_vercel(self):
        app = self.vercel_app.currentText().strip()
        if not app:
            QMessageBox.warning(self, "Error", "Enter an app name.")
            return
        args = ["-App", app, "-Env", self.vercel_env.currentText()]
        if self.vercel_dry.isChecked():
            args.append("-DryRun")
        self._open_console("Push to Vercel", "push-vercel.ps1", args)

    def _run_doctor(self):
        args = ["-AppPath", self._app_path(self.doctor_app_combo)]
        self._open_console("Doctor", "doctor.ps1", args)

    def _run_list_missing(self):
        args = []
        sel = self.missing_app_combo.currentText()
        if sel != "(all defaults)":
            args += ["-AppPath", str(REPO_ROOT / "apps" / sel)]
        if self.missing_show_values.isChecked():
            args.append("-ShowValues")
        self._open_console("Missing Keys", "list-missing-keys.ps1", args)

    def _update_status(self):
        self.status.showMessage(f"Store: {self.store.path}  |  {self.store.count()} secrets")

    # ---- Window behavior ----
    def closeEvent(self, event):
        # Minimize to tray instead of closing
        event.ignore()
        self.hide()


# ---------------------------------------------------------------------------
# Application entry point
# ---------------------------------------------------------------------------
def main():
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    app.setStyleSheet(STYLESHEET)

    icon = make_tray_icon()
    app.setWindowIcon(icon)

    window = KeyVaultWindow()

    # System tray
    tray = QSystemTrayIcon(icon, app)
    tray.setToolTip("KeyVault Manager")

    menu = QMenu()
    action_show = QAction("Open KeyVault", menu)
    action_show.triggered.connect(lambda: (window.show(), window.raise_(), window.activateWindow()))
    menu.addAction(action_show)

    action_refresh = QAction("Refresh Store", menu)
    action_refresh.triggered.connect(window._refresh_table)
    menu.addAction(action_refresh)

    menu.addSeparator()

    action_sync_all = QAction("Sync All Apps", menu)
    action_sync_all.triggered.connect(lambda: window._run_sync_all() if window.isVisible() else (window.show(), QTimer.singleShot(200, window._run_sync_all)))
    menu.addAction(action_sync_all)

    menu.addSeparator()

    action_quit = QAction("Quit", menu)
    action_quit.triggered.connect(app.quit)
    menu.addAction(action_quit)

    tray.setContextMenu(menu)
    tray.activated.connect(lambda reason: (window.show(), window.raise_(), window.activateWindow()) if reason == QSystemTrayIcon.ActivationReason.DoubleClick else None)
    tray.show()

    # Show window on first launch
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()

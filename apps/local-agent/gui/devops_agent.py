"""
DevOps Agent — System tray command center for cevict-live.
Git commit/push, Vercel deploy, project audit, folder organization,
disk usage, port checker, and more. Lives in the Windows system tray.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QSortFilterProxyModel
from PyQt6.QtGui import (
    QAction, QColor, QFont, QIcon, QPainter, QPen, QPixmap, QBrush,
    QLinearGradient, QStandardItem, QStandardItemModel,
)
from PyQt6.QtWidgets import (
    QApplication, QCheckBox, QComboBox, QDialog, QFileDialog,
    QFormLayout, QGroupBox, QHBoxLayout, QHeaderView, QLabel,
    QLineEdit, QMainWindow, QMenu, QMessageBox, QPlainTextEdit,
    QPushButton, QSplitter, QStatusBar, QSystemTrayIcon,
    QTableWidget, QTableWidgetItem, QTabWidget, QToolBar,
    QTreeWidget, QTreeWidgetItem, QVBoxLayout, QWidget,
    QProgressBar, QSpinBox,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT = Path(r"C:\cevict-live")
APPS_DIR = REPO_ROOT / "apps"
SCRIPTS_DIR = REPO_ROOT / "scripts"

# ---------------------------------------------------------------------------
# Dark palette (matches KeyVault)
# ---------------------------------------------------------------------------
DARK_BG = "#0f1117"
PANEL_BG = "#1a1d27"
BORDER = "#2a2d3a"
ACCENT = "#7dd3fc"  # blue for devops
GREEN = "#34d399"
RED = "#fb7185"
AMBER = "#fbbf24"
PURPLE = "#a78bfa"
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
QTableWidget, QTreeWidget {{
    background: {PANEL_BG};
    border: 1px solid {BORDER};
    gridline-color: {BORDER};
    color: {TEXT};
    selection-background-color: #2a2d3a;
    font-family: 'Consolas', 'Cascadia Code', monospace;
    font-size: 12px;
}}
QTableWidget::item, QTreeWidget::item {{
    padding: 4px 8px;
}}
QHeaderView::section {{
    background: {DARK_BG};
    color: {ACCENT};
    border: 1px solid {BORDER};
    padding: 6px 10px;
    font-weight: bold;
    font-size: 11px;
}}
QLineEdit, QPlainTextEdit, QComboBox, QSpinBox {{
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
QPushButton#btnAmber {{
    border-color: {AMBER};
    color: {AMBER};
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
    width: 16px; height: 16px;
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
QProgressBar {{
    border: 1px solid {BORDER};
    border-radius: 4px;
    background: {DARK_BG};
    text-align: center;
    color: {TEXT};
    font-size: 11px;
}}
QProgressBar::chunk {{
    background: {ACCENT};
    border-radius: 3px;
}}
QToolTip {{
    background: {PANEL_BG};
    color: {TEXT};
    border: 1px solid {ACCENT};
    padding: 4px 8px;
    font-size: 12px;
}}
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def run_cmd(cmd: list[str], cwd: str | None = None, timeout: int = 30) -> tuple[int, str]:
    try:
        r = subprocess.run(
            cmd, capture_output=True, text=True,
            cwd=cwd or str(REPO_ROOT), timeout=timeout,
        )
        return r.returncode, (r.stdout + r.stderr).strip()
    except subprocess.TimeoutExpired:
        return 1, "Command timed out"
    except Exception as e:
        return 1, str(e)


def git(*args, cwd: str | None = None) -> tuple[int, str]:
    return run_cmd(["git"] + list(args), cwd=cwd)


def get_apps() -> list[str]:
    if not APPS_DIR.exists():
        return []
    return sorted([
        d.name for d in APPS_DIR.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    ])


def get_vercel_apps() -> list[str]:
    """Apps that have a package.json with a next/vercel setup."""
    apps = []
    for d in APPS_DIR.iterdir():
        if d.is_dir() and (d / "package.json").exists():
            try:
                pkg = json.loads((d / "package.json").read_text("utf-8"))
                deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                if "next" in deps or "vercel" in pkg.get("scripts", {}):
                    apps.append(d.name)
            except Exception:
                pass
    return sorted(apps)


def format_size(size_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


# ---------------------------------------------------------------------------
# Background command runner
# ---------------------------------------------------------------------------
class CmdRunner(QThread):
    output = pyqtSignal(str)
    finished_signal = pyqtSignal(int)

    def __init__(self, cmd: list[str], cwd: str | None = None):
        super().__init__()
        self.cmd = cmd
        self.cwd = cwd or str(REPO_ROOT)

    def run(self):
        try:
            proc = subprocess.Popen(
                self.cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
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
# Output console (reusable)
# ---------------------------------------------------------------------------
class OutputConsole(QDialog):
    def __init__(self, title: str, parent=None):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.resize(750, 500)
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
        self._runner: Optional[CmdRunner] = None

    def run_cmd(self, cmd: list[str], cwd: str | None = None):
        self.text.clear()
        self.text.appendPlainText(f"$ {' '.join(cmd)}\n")
        self.btn_close.setEnabled(False)
        self._runner = CmdRunner(cmd, cwd)
        self._runner.output.connect(lambda line: self.text.appendPlainText(line))
        self._runner.finished_signal.connect(self._on_done)
        self._runner.start()

    def _on_done(self, code: int):
        self.text.appendPlainText(f"\n{'=' * 40}\nExit code: {code}")
        self.btn_close.setEnabled(True)


# ---------------------------------------------------------------------------
# Tray icon
# ---------------------------------------------------------------------------
def make_tray_icon() -> QIcon:
    px = QPixmap(64, 64)
    px.fill(QColor(0, 0, 0, 0))
    p = QPainter(px)
    p.setRenderHint(QPainter.RenderHint.Antialiasing)
    grad = QLinearGradient(0, 0, 64, 64)
    grad.setColorAt(0, QColor(ACCENT))
    grad.setColorAt(1, QColor("#38bdf8"))
    p.setBrush(QBrush(grad))
    p.setPen(Qt.PenStyle.NoPen)
    p.drawRoundedRect(4, 4, 56, 56, 14, 14)
    # Gear symbol
    p.setPen(QPen(QColor(DARK_BG), 3))
    p.setBrush(Qt.BrushStyle.NoBrush)
    p.drawEllipse(20, 20, 24, 24)
    p.setBrush(QBrush(QColor(DARK_BG)))
    p.drawEllipse(27, 27, 10, 10)
    # Spokes
    import math
    cx, cy = 32, 32
    for i in range(6):
        angle = math.radians(i * 60)
        x1 = cx + 10 * math.cos(angle)
        y1 = cy + 10 * math.sin(angle)
        x2 = cx + 16 * math.cos(angle)
        y2 = cy + 16 * math.sin(angle)
        p.drawLine(int(x1), int(y1), int(x2), int(y2))
    p.end()
    return QIcon(px)


# ---------------------------------------------------------------------------
# Main Window
# ---------------------------------------------------------------------------
class DevOpsWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("DevOps Agent — cevict-live")
        self.setMinimumSize(1050, 700)

        central = QWidget()
        self.setCentralWidget(central)
        root = QVBoxLayout(central)
        root.setContentsMargins(12, 12, 12, 12)

        # Header
        header = QHBoxLayout()
        title = QLabel("DevOps Agent")
        title.setObjectName("heading")
        header.addWidget(title)
        header.addStretch()
        repo_label = QLabel(f"Repo: {REPO_ROOT}")
        repo_label.setObjectName("subheading")
        header.addWidget(repo_label)
        root.addLayout(header)

        # Tabs
        self.tabs = QTabWidget()
        root.addWidget(self.tabs)

        self.tabs.addTab(self._build_git_tab(), "⎇ Git")
        self.tabs.addTab(self._build_vercel_tab(), "▲ Vercel")
        self.tabs.addTab(self._build_audit_tab(), "🔍 Audit")
        self.tabs.addTab(self._build_organize_tab(), "📁 Organize")
        self.tabs.addTab(self._build_tools_tab(), "🛠 Tools")
        self.tabs.addTab(self._build_cochran_tab(), "🤖 Cochran")

        self.status = QStatusBar()
        self.setStatusBar(self.status)
        self._refresh_git_status()

    # ==================================================================
    # GIT TAB
    # ==================================================================
    def _build_git_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        # Status section
        status_group = QGroupBox("Repository Status")
        sg = QVBoxLayout(status_group)

        info_row = QHBoxLayout()
        self.git_branch_label = QLabel("Branch: —")
        self.git_branch_label.setFont(QFont("Consolas", 12, QFont.Weight.Bold))
        info_row.addWidget(self.git_branch_label)
        info_row.addStretch()
        btn_refresh = QPushButton("🔄 Refresh")
        btn_refresh.setToolTip("Refresh git status")
        btn_refresh.clicked.connect(self._refresh_git_status)
        info_row.addWidget(btn_refresh)
        sg.addLayout(info_row)

        self.git_status_text = QPlainTextEdit()
        self.git_status_text.setReadOnly(True)
        self.git_status_text.setMaximumHeight(200)
        self.git_status_text.setFont(QFont("Consolas", 11))
        sg.addWidget(self.git_status_text)
        layout.addWidget(status_group)

        # Commit section
        commit_group = QGroupBox("Commit & Push")
        cg = QVBoxLayout(commit_group)

        msg_row = QHBoxLayout()
        msg_row.addWidget(QLabel("Message:"))
        self.commit_msg = QLineEdit()
        self.commit_msg.setPlaceholderText("feat: describe your changes...")
        msg_row.addWidget(self.commit_msg, 1)
        cg.addLayout(msg_row)

        btn_row = QHBoxLayout()
        self.stage_all_cb = QCheckBox("Stage all changes")
        self.stage_all_cb.setChecked(True)
        btn_row.addWidget(self.stage_all_cb)
        btn_row.addStretch()

        btn_commit = QPushButton("📝 Commit")
        btn_commit.setToolTip("Commit staged changes with the message above")
        btn_commit.setObjectName("btnSuccess")
        btn_commit.clicked.connect(self._git_commit)
        btn_row.addWidget(btn_commit)

        btn_push = QPushButton("🚀 Push")
        btn_push.setToolTip("Push commits to remote (origin)")
        btn_push.setObjectName("btnAccent")
        btn_push.clicked.connect(self._git_push)
        btn_row.addWidget(btn_push)

        btn_commit_push = QPushButton("📝🚀 Commit & Push")
        btn_commit_push.setToolTip("Stage, commit, and push in one step")
        btn_commit_push.setObjectName("btnAmber")
        btn_commit_push.clicked.connect(self._git_commit_and_push)
        btn_row.addWidget(btn_commit_push)

        cg.addLayout(btn_row)
        layout.addWidget(commit_group)

        # Log section
        log_group = QGroupBox("Recent Commits")
        lg = QVBoxLayout(log_group)
        log_toolbar = QHBoxLayout()
        self.log_count = QSpinBox()
        self.log_count.setRange(5, 50)
        self.log_count.setValue(15)
        log_toolbar.addWidget(QLabel("Show:"))
        log_toolbar.addWidget(self.log_count)
        btn_log = QPushButton("📜 Load Log")
        btn_log.setToolTip("Show recent git commits")
        btn_log.clicked.connect(self._load_git_log)
        log_toolbar.addWidget(btn_log)
        log_toolbar.addStretch()
        lg.addLayout(log_toolbar)

        self.git_log_text = QPlainTextEdit()
        self.git_log_text.setReadOnly(True)
        self.git_log_text.setFont(QFont("Consolas", 10))
        lg.addWidget(self.git_log_text)
        layout.addWidget(log_group)

        return w

    def _refresh_git_status(self):
        code, branch = git("branch", "--show-current")
        self.git_branch_label.setText(f"Branch: {branch}" if code == 0 else "Branch: unknown")

        code, status = git("status", "--short")
        if code == 0:
            lines = status.strip().split("\n") if status.strip() else []
            self.git_status_text.setPlainText(
                status if status else "✅ Working tree clean — nothing to commit"
            )
            changed = len([l for l in lines if l.strip()])
            self.status.showMessage(f"Git: {branch} | {changed} changed file(s)")
        else:
            self.git_status_text.setPlainText(f"Error: {status}")

    def _git_commit(self):
        msg = self.commit_msg.text().strip()
        if not msg:
            QMessageBox.warning(self, "Error", "Enter a commit message.")
            return
        if self.stage_all_cb.isChecked():
            code, out = git("add", "-A")
            if code != 0:
                QMessageBox.warning(self, "Stage Error", out)
                return
        code, out = git("commit", "-m", msg)
        if code == 0:
            self.status.showMessage(f"Committed: {msg}", 5000)
            self.commit_msg.clear()
        else:
            self.status.showMessage(f"Commit failed", 5000)
            QMessageBox.warning(self, "Commit Error", out)
        self._refresh_git_status()

    def _git_push(self):
        console = OutputConsole("Git Push", self)
        console.run_cmd(["git", "push"], str(REPO_ROOT))
        console.exec()
        self._refresh_git_status()

    def _git_commit_and_push(self):
        msg = self.commit_msg.text().strip()
        if not msg:
            QMessageBox.warning(self, "Error", "Enter a commit message.")
            return
        if self.stage_all_cb.isChecked():
            code, out = git("add", "-A")
            if code != 0:
                QMessageBox.warning(self, "Stage Error", out)
                return
        code, out = git("commit", "-m", msg)
        if code != 0:
            QMessageBox.warning(self, "Commit Error", out)
            return
        self.commit_msg.clear()
        console = OutputConsole("Git Push", self)
        console.run_cmd(["git", "push"], str(REPO_ROOT))
        console.exec()
        self._refresh_git_status()

    def _load_git_log(self):
        n = self.log_count.value()
        code, out = git("log", f"-{n}", "--oneline", "--decorate", "--graph")
        self.git_log_text.setPlainText(out if code == 0 else f"Error: {out}")

    # ==================================================================
    # VERCEL TAB
    # ==================================================================
    def _build_vercel_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        deploy_group = QGroupBox("Deploy to Vercel")
        dg = QVBoxLayout(deploy_group)

        form = QFormLayout()
        self.vercel_app = QComboBox()
        for app_name in get_vercel_apps():
            self.vercel_app.addItem(app_name)
        form.addRow("App:", self.vercel_app)

        self.vercel_prod = QCheckBox("Production deploy (--prod)")
        form.addRow("", self.vercel_prod)
        dg.addLayout(form)

        btn_row = QHBoxLayout()
        btn_deploy = QPushButton("▲ Deploy")
        btn_deploy.setToolTip("Deploy selected app to Vercel")
        btn_deploy.setObjectName("btnAccent")
        btn_deploy.clicked.connect(self._vercel_deploy)
        btn_row.addWidget(btn_deploy)

        btn_build = QPushButton("🔨 Build Only")
        btn_build.setToolTip("Run next build without deploying")
        btn_build.clicked.connect(self._vercel_build)
        btn_row.addWidget(btn_build)

        btn_row.addStretch()
        dg.addLayout(btn_row)
        layout.addWidget(deploy_group)

        # Push env
        env_group = QGroupBox("Push Secrets to Vercel (via KeyVault)")
        eg = QVBoxLayout(env_group)
        env_row = QHBoxLayout()
        env_row.addWidget(QLabel("App:"))
        self.vercel_env_app = QComboBox()
        self.vercel_env_app.setEditable(True)
        for app_name in get_vercel_apps():
            self.vercel_env_app.addItem(app_name)
        env_row.addWidget(self.vercel_env_app, 1)
        env_row.addWidget(QLabel("Env:"))
        self.vercel_env_target = QComboBox()
        self.vercel_env_target.addItems(["development", "preview", "production"])
        env_row.addWidget(self.vercel_env_target)
        self.vercel_env_dry = QCheckBox("Dry Run")
        env_row.addWidget(self.vercel_env_dry)
        btn_push_env = QPushButton("🔑 Push Env")
        btn_push_env.setToolTip("Push KeyVault secrets to Vercel environment variables")
        btn_push_env.clicked.connect(self._vercel_push_env)
        env_row.addWidget(btn_push_env)
        eg.addLayout(env_row)
        layout.addWidget(env_group)

        layout.addStretch()
        return w

    def _vercel_deploy(self):
        app_name = self.vercel_app.currentText()
        if not app_name:
            return
        app_path = str(APPS_DIR / app_name)
        cmd = ["npx", "vercel", "--yes"]
        if self.vercel_prod.isChecked():
            cmd.append("--prod")
        console = OutputConsole(f"Deploy {app_name}", self)
        console.run_cmd(cmd, app_path)
        console.exec()

    def _vercel_build(self):
        app_name = self.vercel_app.currentText()
        if not app_name:
            return
        app_path = str(APPS_DIR / app_name)
        console = OutputConsole(f"Build {app_name}", self)
        console.run_cmd(["npx", "next", "build"], app_path)
        console.exec()

    def _vercel_push_env(self):
        app_name = self.vercel_env_app.currentText().strip()
        if not app_name:
            return
        script = str(SCRIPTS_DIR / "keyvault" / "push-vercel.ps1")
        cmd = ["pwsh", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
               "-App", app_name, "-Env", self.vercel_env_target.currentText()]
        if self.vercel_env_dry.isChecked():
            cmd.append("-DryRun")
        console = OutputConsole(f"Push Env: {app_name}", self)
        console.run_cmd(cmd, str(SCRIPTS_DIR / "keyvault"))
        console.exec()

    # ==================================================================
    # AUDIT TAB
    # ==================================================================
    def _build_audit_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        # App selector
        sel_row = QHBoxLayout()
        sel_row.addWidget(QLabel("Audit app:"))
        self.audit_app = QComboBox()
        self.audit_app.addItem("(entire repo)")
        for a in get_apps():
            self.audit_app.addItem(a)
        sel_row.addWidget(self.audit_app, 1)
        layout.addLayout(sel_row)

        # Audit actions
        btn_row = QHBoxLayout()

        btn_large = QPushButton("📦 Find Large Files (>1MB)")
        btn_large.setToolTip("Scan for files over 1MB that might be removable")
        btn_large.clicked.connect(self._audit_large_files)
        btn_row.addWidget(btn_large)

        btn_node = QPushButton("📁 Find node_modules")
        btn_node.setToolTip("Find all node_modules directories and their sizes")
        btn_node.clicked.connect(self._audit_node_modules)
        btn_row.addWidget(btn_node)

        btn_dead = QPushButton("🗑 Safe to Remove")
        btn_dead.setToolTip("Find files/folders that are typically safe to remove (build artifacts, caches, logs)")
        btn_dead.clicked.connect(self._audit_safe_remove)
        btn_row.addWidget(btn_dead)

        btn_deps = QPushButton("📋 Unused Deps")
        btn_deps.setToolTip("Check for potentially unused npm dependencies")
        btn_deps.clicked.connect(self._audit_unused_deps)
        btn_row.addWidget(btn_deps)

        layout.addLayout(btn_row)

        # Results
        self.audit_results = QPlainTextEdit()
        self.audit_results.setReadOnly(True)
        self.audit_results.setFont(QFont("Consolas", 11))
        layout.addWidget(self.audit_results)

        return w

    def _audit_target(self) -> Path:
        sel = self.audit_app.currentText()
        if sel == "(entire repo)":
            return REPO_ROOT
        return APPS_DIR / sel

    def _audit_large_files(self):
        target = self._audit_target()
        self.audit_results.setPlainText(f"Scanning {target} for files > 1MB...\n")
        QApplication.processEvents()
        large = []
        try:
            for f in target.rglob("*"):
                if f.is_file() and "node_modules" not in f.parts and ".git" not in f.parts:
                    try:
                        size = f.stat().st_size
                        if size > 1_000_000:
                            large.append((size, f))
                    except OSError:
                        pass
        except Exception as e:
            self.audit_results.appendPlainText(f"Error: {e}")
            return

        large.sort(reverse=True)
        lines = [f"Found {len(large)} file(s) > 1MB:\n"]
        for size, f in large[:100]:
            rel = f.relative_to(REPO_ROOT) if f.is_relative_to(REPO_ROOT) else f
            lines.append(f"  {format_size(size):>10}  {rel}")
        total = sum(s for s, _ in large)
        lines.append(f"\nTotal: {format_size(total)}")
        self.audit_results.setPlainText("\n".join(lines))

    def _audit_node_modules(self):
        self.audit_results.setPlainText(f"Scanning for node_modules...\n")
        QApplication.processEvents()
        found = []
        for d in REPO_ROOT.rglob("node_modules"):
            if d.is_dir():
                try:
                    size = sum(f.stat().st_size for f in d.rglob("*") if f.is_file())
                    found.append((size, d))
                except Exception:
                    found.append((0, d))

        found.sort(reverse=True)
        lines = [f"Found {len(found)} node_modules:\n"]
        total = 0
        for size, d in found:
            rel = d.relative_to(REPO_ROOT) if d.is_relative_to(REPO_ROOT) else d
            lines.append(f"  {format_size(size):>10}  {rel}")
            total += size
        lines.append(f"\nTotal: {format_size(total)}")
        lines.append(f"\nTo clean all: run 'pnpm store prune' or delete individual folders.")
        self.audit_results.setPlainText("\n".join(lines))

    def _audit_safe_remove(self):
        target = self._audit_target()
        self.audit_results.setPlainText(f"Scanning {target} for safely removable items...\n")
        QApplication.processEvents()

        removable_patterns = [
            ".next", "dist", ".turbo", ".cache", ".parcel-cache",
            "__pycache__", ".pytest_cache", ".mypy_cache",
            "*.log", ".DS_Store", "Thumbs.db",
            ".vercel", ".netlify",
            "coverage", ".nyc_output",
            "*.tsbuildinfo",
        ]

        found = []
        for pattern in removable_patterns:
            if "*" in pattern:
                for f in target.rglob(pattern):
                    if "node_modules" not in f.parts and ".git" not in f.parts:
                        try:
                            size = f.stat().st_size if f.is_file() else 0
                            found.append((pattern, size, f))
                        except OSError:
                            pass
            else:
                for f in target.rglob(pattern):
                    if "node_modules" not in f.parts and ".git" not in f.parts:
                        try:
                            if f.is_dir():
                                size = sum(x.stat().st_size for x in f.rglob("*") if x.is_file())
                            else:
                                size = f.stat().st_size
                            found.append((pattern, size, f))
                        except OSError:
                            pass

        found.sort(key=lambda x: x[1], reverse=True)
        lines = [f"Found {len(found)} safely removable item(s):\n"]
        lines.append(f"{'Type':<20} {'Size':>10}  Path")
        lines.append("-" * 80)
        total = 0
        for pattern, size, f in found[:200]:
            rel = f.relative_to(REPO_ROOT) if f.is_relative_to(REPO_ROOT) else f
            lines.append(f"  {pattern:<18} {format_size(size):>10}  {rel}")
            total += size
        lines.append(f"\nTotal reclaimable: {format_size(total)}")
        lines.append("\n⚠️  Review before deleting! Build artifacts will be regenerated on next build.")
        self.audit_results.setPlainText("\n".join(lines))

    def _audit_unused_deps(self):
        app_name = self.audit_app.currentText()
        if app_name == "(entire repo)":
            QMessageBox.information(self, "Select App", "Select a specific app to check unused deps.")
            return
        app_path = APPS_DIR / app_name
        pkg_file = app_path / "package.json"
        if not pkg_file.exists():
            self.audit_results.setPlainText(f"No package.json in {app_name}")
            return

        self.audit_results.setPlainText(f"Checking {app_name} for unused dependencies...\n")
        QApplication.processEvents()

        try:
            pkg = json.loads(pkg_file.read_text("utf-8"))
        except Exception as e:
            self.audit_results.appendPlainText(f"Error reading package.json: {e}")
            return

        deps = list(pkg.get("dependencies", {}).keys())
        dev_deps = list(pkg.get("devDependencies", {}).keys())

        # Scan source files for imports
        imported = set()
        src_extensions = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
        for f in app_path.rglob("*"):
            if f.suffix in src_extensions and "node_modules" not in f.parts:
                try:
                    content = f.read_text("utf-8", errors="ignore")
                    # Match import/require statements
                    for m in re.finditer(r'''(?:import\s+.*?from\s+['"]|require\s*\(\s*['"])([^'"./][^'"]*?)['"]''', content):
                        pkg_name = m.group(1)
                        # Handle scoped packages
                        if pkg_name.startswith("@"):
                            parts = pkg_name.split("/")
                            if len(parts) >= 2:
                                pkg_name = "/".join(parts[:2])
                        else:
                            pkg_name = pkg_name.split("/")[0]
                        imported.add(pkg_name)
                except Exception:
                    pass

        unused_deps = [d for d in deps if d not in imported]
        unused_dev = [d for d in dev_deps if d not in imported]

        lines = [f"Dependencies in {app_name}:\n"]
        lines.append(f"  Production: {len(deps)} total, {len(unused_deps)} potentially unused")
        lines.append(f"  Dev:        {len(dev_deps)} total, {len(unused_dev)} potentially unused\n")

        if unused_deps:
            lines.append("⚠️  Potentially unused production deps:")
            for d in sorted(unused_deps):
                lines.append(f"    {d}")

        if unused_dev:
            lines.append("\n⚠️  Potentially unused dev deps:")
            for d in sorted(unused_dev):
                lines.append(f"    {d}")

        if not unused_deps and not unused_dev:
            lines.append("✅ All dependencies appear to be used!")

        lines.append("\n⚠️  Note: Some deps are used indirectly (plugins, configs, CLI tools).")
        lines.append("    Review carefully before removing.")
        self.audit_results.setPlainText("\n".join(lines))

    # ==================================================================
    # ORGANIZE TAB
    # ==================================================================
    def _build_organize_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        # Folder tree
        tree_group = QGroupBox("Project Structure")
        tg = QVBoxLayout(tree_group)

        tree_toolbar = QHBoxLayout()
        btn_load_tree = QPushButton("📂 Load Tree")
        btn_load_tree.setToolTip("Load the apps/ folder structure")
        btn_load_tree.clicked.connect(self._load_folder_tree)
        tree_toolbar.addWidget(btn_load_tree)

        btn_disk = QPushButton("💾 Disk Usage by App")
        btn_disk.setToolTip("Calculate disk usage for each app")
        btn_disk.clicked.connect(self._disk_usage_by_app)
        tree_toolbar.addWidget(btn_disk)

        btn_empty = QPushButton("🕳 Find Empty Dirs")
        btn_empty.setToolTip("Find empty directories in the repo")
        btn_empty.clicked.connect(self._find_empty_dirs)
        tree_toolbar.addWidget(btn_empty)

        btn_dupes = QPushButton("👯 Find Duplicate Files")
        btn_dupes.setToolTip("Find files with identical names across apps")
        btn_dupes.clicked.connect(self._find_duplicate_names)
        tree_toolbar.addWidget(btn_dupes)

        tree_toolbar.addStretch()
        tg.addLayout(tree_toolbar)

        self.folder_tree = QTreeWidget()
        self.folder_tree.setHeaderLabels(["Name", "Size", "Type"])
        self.folder_tree.setColumnWidth(0, 400)
        self.folder_tree.setColumnWidth(1, 100)
        tg.addWidget(self.folder_tree)
        layout.addWidget(tree_group)

        # Output area
        self.organize_output = QPlainTextEdit()
        self.organize_output.setReadOnly(True)
        self.organize_output.setFont(QFont("Consolas", 11))
        self.organize_output.setMaximumHeight(200)
        layout.addWidget(self.organize_output)

        return w

    def _load_folder_tree(self):
        self.folder_tree.clear()
        root_item = QTreeWidgetItem(["apps/", "", "directory"])
        self.folder_tree.addTopLevelItem(root_item)

        for app_dir in sorted(APPS_DIR.iterdir()):
            if not app_dir.is_dir() or app_dir.name.startswith("."):
                continue
            app_item = QTreeWidgetItem([app_dir.name, "", "app"])
            root_item.addChild(app_item)

            # Key files
            for f in sorted(app_dir.iterdir()):
                if f.name in ("node_modules", ".next", "dist", ".git", "__pycache__", ".turbo"):
                    continue
                if f.is_dir():
                    child = QTreeWidgetItem([f.name + "/", "", "dir"])
                    app_item.addChild(child)
                elif f.is_file():
                    try:
                        size = format_size(f.stat().st_size)
                    except OSError:
                        size = "?"
                    child = QTreeWidgetItem([f.name, size, f.suffix or "file"])
                    app_item.addChild(child)

        root_item.setExpanded(True)

    def _disk_usage_by_app(self):
        self.organize_output.setPlainText("Calculating disk usage per app...\n")
        QApplication.processEvents()
        results = []
        for app_dir in sorted(APPS_DIR.iterdir()):
            if not app_dir.is_dir() or app_dir.name.startswith("."):
                continue
            total = 0
            nm_size = 0
            try:
                for f in app_dir.rglob("*"):
                    if f.is_file():
                        s = f.stat().st_size
                        total += s
                        if "node_modules" in f.parts:
                            nm_size += s
            except Exception:
                pass
            results.append((total, nm_size, app_dir.name))

        results.sort(reverse=True)
        lines = [f"{'App':<30} {'Total':>12} {'node_modules':>14} {'Source':>12}"]
        lines.append("-" * 70)
        grand_total = 0
        for total, nm, name in results:
            src = total - nm
            lines.append(f"  {name:<28} {format_size(total):>12} {format_size(nm):>14} {format_size(src):>12}")
            grand_total += total
        lines.append("-" * 70)
        lines.append(f"  {'TOTAL':<28} {format_size(grand_total):>12}")
        self.organize_output.setPlainText("\n".join(lines))

    def _find_empty_dirs(self):
        self.organize_output.setPlainText("Scanning for empty directories...\n")
        QApplication.processEvents()
        empty = []
        for d in REPO_ROOT.rglob("*"):
            if d.is_dir() and "node_modules" not in d.parts and ".git" not in d.parts:
                try:
                    if not any(d.iterdir()):
                        rel = d.relative_to(REPO_ROOT)
                        empty.append(str(rel))
                except (OSError, PermissionError):
                    pass

        if empty:
            lines = [f"Found {len(empty)} empty directories:\n"]
            for e in sorted(empty):
                lines.append(f"  {e}")
            lines.append(f"\nThese can safely be deleted if not needed.")
        else:
            lines = ["✅ No empty directories found."]
        self.organize_output.setPlainText("\n".join(lines))

    def _find_duplicate_names(self):
        self.organize_output.setPlainText("Scanning for duplicate file names across apps...\n")
        QApplication.processEvents()
        name_map: dict[str, list[str]] = {}
        for f in APPS_DIR.rglob("*"):
            if f.is_file() and "node_modules" not in f.parts and ".git" not in f.parts:
                name = f.name
                if name in ("package.json", "tsconfig.json", ".env.local", ".gitignore",
                            "README.md", "next.config.ts", "next.config.js"):
                    continue  # expected duplicates
                rel = str(f.relative_to(REPO_ROOT))
                name_map.setdefault(name, []).append(rel)

        dupes = {k: v for k, v in name_map.items() if len(v) > 1}
        if dupes:
            lines = [f"Found {len(dupes)} file names appearing in multiple apps:\n"]
            for name in sorted(dupes.keys())[:50]:
                lines.append(f"  {name}:")
                for path in dupes[name]:
                    lines.append(f"    {path}")
            if len(dupes) > 50:
                lines.append(f"\n  ... and {len(dupes) - 50} more")
        else:
            lines = ["✅ No unexpected duplicate file names found."]
        self.organize_output.setPlainText("\n".join(lines))

    # ==================================================================
    # TOOLS TAB
    # ==================================================================
    def _build_tools_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        # Port checker
        port_group = QGroupBox("Port Checker")
        pg = QHBoxLayout(port_group)
        pg.addWidget(QLabel("Port:"))
        self.port_input = QSpinBox()
        self.port_input.setRange(1, 65535)
        self.port_input.setValue(3000)
        pg.addWidget(self.port_input)
        btn_check = QPushButton("🔍 Check")
        btn_check.setToolTip("Check what process is using this port")
        btn_check.clicked.connect(self._check_port)
        pg.addWidget(btn_check)
        btn_kill = QPushButton("💀 Kill")
        btn_kill.setToolTip("Kill the process using this port")
        btn_kill.setObjectName("btnDanger")
        btn_kill.clicked.connect(self._kill_port)
        pg.addWidget(btn_kill)
        self.port_result = QLabel("")
        pg.addWidget(self.port_result, 1)
        layout.addWidget(port_group)

        # Common ports quick check
        quick_group = QGroupBox("Quick Port Status")
        qg = QVBoxLayout(quick_group)
        btn_scan = QPushButton("🔍 Scan Common Dev Ports")
        btn_scan.setToolTip("Check ports 3000-3010, 3847, 4000, 5173, 8080")
        btn_scan.clicked.connect(self._scan_common_ports)
        qg.addWidget(btn_scan)
        self.ports_table = QTableWidget()
        self.ports_table.setColumnCount(4)
        self.ports_table.setHorizontalHeaderLabels(["Port", "Status", "PID", "Process"])
        self.ports_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.ports_table.verticalHeader().setVisible(False)
        qg.addWidget(self.ports_table)
        layout.addWidget(quick_group)

        # Process cleanup
        cleanup_group = QGroupBox("Process Cleanup")
        cg = QHBoxLayout(cleanup_group)
        btn_node = QPushButton("Kill all node.exe")
        btn_node.setToolTip("Kill all running node.exe processes")
        btn_node.setObjectName("btnDanger")
        btn_node.clicked.connect(lambda: self._kill_process("node"))
        cg.addWidget(btn_node)
        btn_next = QPushButton("Kill all next-server")
        btn_next.setToolTip("Kill next-server processes (stuck dev servers)")
        btn_next.setObjectName("btnDanger")
        btn_next.clicked.connect(lambda: self._kill_process("next-server"))
        cg.addWidget(btn_next)
        btn_electron = QPushButton("Kill Electron")
        btn_electron.setToolTip("Kill Electron processes")
        btn_electron.setObjectName("btnDanger")
        btn_electron.clicked.connect(lambda: self._kill_process("electron"))
        cg.addWidget(btn_electron)
        cg.addStretch()
        layout.addWidget(cleanup_group)

        # Quick commands
        cmd_group = QGroupBox("Quick Commands")
        cmdg = QHBoxLayout(cmd_group)
        btn_prune = QPushButton("pnpm store prune")
        btn_prune.setToolTip("Clean up the pnpm store to free disk space")
        btn_prune.clicked.connect(lambda: self._run_quick_cmd(["pnpm", "store", "prune"]))
        cmdg.addWidget(btn_prune)
        btn_gc = QPushButton("git gc")
        btn_gc.setToolTip("Run git garbage collection to optimize the repo")
        btn_gc.clicked.connect(lambda: self._run_quick_cmd(["git", "gc", "--aggressive"]))
        cmdg.addWidget(btn_gc)
        btn_cache = QPushButton("npm cache clean")
        btn_cache.setToolTip("Clear npm cache")
        btn_cache.clicked.connect(lambda: self._run_quick_cmd(["npm", "cache", "clean", "--force"]))
        cmdg.addWidget(btn_cache)
        cmdg.addStretch()
        layout.addWidget(cmd_group)

        layout.addStretch()
        return w

    def _check_port(self):
        port = self.port_input.value()
        code, out = run_cmd(
            ["pwsh", "-NoProfile", "-Command",
             f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | "
             f"Select-Object -First 1 -Property OwningProcess | "
             f"ForEach-Object {{ $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; "
             f"if($p) {{ \"PID: $($p.Id) — $($p.ProcessName)\" }} else {{ 'In use (unknown process)' }} }}"],
            timeout=10,
        )
        if code == 0 and out.strip():
            self.port_result.setText(f"Port {port}: {out.strip()}")
            self.port_result.setStyleSheet(f"color: {AMBER};")
        else:
            self.port_result.setText(f"Port {port}: Free ✅")
            self.port_result.setStyleSheet(f"color: {GREEN};")

    def _kill_port(self):
        port = self.port_input.value()
        reply = QMessageBox.question(
            self, "Kill Port",
            f"Kill the process on port {port}?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            run_cmd(["pwsh", "-NoProfile", "-Command",
                     f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | "
                     f"ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}"])
            self.port_result.setText(f"Port {port}: Killed")
            self.port_result.setStyleSheet(f"color: {RED};")

    def _scan_common_ports(self):
        ports = [3000, 3001, 3002, 3003, 3004, 3005, 3847, 4000, 5173, 8080, 8888]
        self.ports_table.setRowCount(0)
        for port in ports:
            row = self.ports_table.rowCount()
            self.ports_table.insertRow(row)
            self.ports_table.setItem(row, 0, QTableWidgetItem(str(port)))

            code, out = run_cmd(
                ["pwsh", "-NoProfile", "-Command",
                 f"$c = Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -First 1; "
                 f"if($c) {{ $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; "
                 f"\"$($c.OwningProcess)|$($p.ProcessName)\" }} else {{ 'free|' }}"],
                timeout=5,
            )
            parts = out.strip().split("|") if out.strip() else ["free", ""]
            pid = parts[0] if len(parts) > 0 else ""
            proc_name = parts[1] if len(parts) > 1 else ""

            if pid == "free":
                status_item = QTableWidgetItem("Free")
                status_item.setForeground(QColor(GREEN))
                self.ports_table.setItem(row, 1, status_item)
                self.ports_table.setItem(row, 2, QTableWidgetItem("—"))
                self.ports_table.setItem(row, 3, QTableWidgetItem("—"))
            else:
                status_item = QTableWidgetItem("In Use")
                status_item.setForeground(QColor(AMBER))
                self.ports_table.setItem(row, 1, status_item)
                self.ports_table.setItem(row, 2, QTableWidgetItem(pid))
                self.ports_table.setItem(row, 3, QTableWidgetItem(proc_name))

    def _kill_process(self, name: str):
        reply = QMessageBox.question(
            self, "Kill Processes",
            f"Kill all '{name}' processes?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            run_cmd(["pwsh", "-NoProfile", "-Command",
                     f"Get-Process -Name '{name}' -ErrorAction SilentlyContinue | Stop-Process -Force"])
            self.status.showMessage(f"Killed all {name} processes", 3000)

    def _run_quick_cmd(self, cmd: list[str]):
        console = OutputConsole(" ".join(cmd), self)
        console.run_cmd(cmd)
        console.exec()

    # ==================================================================
    # COCHRAN TAB
    # ==================================================================
    def _build_cochran_tab(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        # Status
        status_group = QGroupBox("Cochran AI Status")
        sg = QHBoxLayout(status_group)
        self.cochran_status = QLabel("Checking...")
        self.cochran_status.setFont(QFont("Consolas", 12, QFont.Weight.Bold))
        sg.addWidget(self.cochran_status)
        sg.addStretch()
        btn_check = QPushButton("🔍 Check")
        btn_check.setToolTip("Check if Cochran AI is running on port 3847")
        btn_check.clicked.connect(self._check_cochran)
        sg.addWidget(btn_check)
        btn_start = QPushButton("▶ Start")
        btn_start.setToolTip("Start Cochran AI learner server")
        btn_start.setObjectName("btnSuccess")
        btn_start.clicked.connect(self._start_cochran)
        sg.addWidget(btn_start)
        btn_stop = QPushButton("⏹ Stop")
        btn_stop.setToolTip("Stop Cochran AI")
        btn_stop.setObjectName("btnDanger")
        btn_stop.clicked.connect(self._stop_cochran)
        sg.addWidget(btn_stop)
        layout.addWidget(status_group)

        # Actions
        actions_group = QGroupBox("Cochran Actions")
        ag = QVBoxLayout(actions_group)

        row1 = QHBoxLayout()
        btn_refresher = QPushButton("📋 Get Refresher (last 5)")
        btn_refresher.setToolTip("Get the last 5 session summaries from Cochran")
        btn_refresher.clicked.connect(self._cochran_refresher)
        row1.addWidget(btn_refresher)
        btn_knowledge = QPushButton("🧠 Rebuild Knowledge")
        btn_knowledge.setToolTip("Rebuild Cochran's knowledge index of the repo")
        btn_knowledge.clicked.connect(self._cochran_rebuild_knowledge)
        row1.addWidget(btn_knowledge)
        btn_tasks = QPushButton("📝 Run Pending Tasks")
        btn_tasks.setToolTip("Run any pending tasks from COCHRAN_TASKS.json")
        btn_tasks.clicked.connect(self._cochran_run_tasks)
        row1.addWidget(btn_tasks)
        row1.addStretch()
        ag.addLayout(row1)

        row2 = QHBoxLayout()
        btn_vector = QPushButton("🔎 Vector Search Status")
        btn_vector.setToolTip("Check if semantic vector search is available")
        btn_vector.clicked.connect(self._cochran_vector_status)
        row2.addWidget(btn_vector)
        btn_rebuild_vec = QPushButton("🔄 Rebuild Vector Index")
        btn_rebuild_vec.setToolTip("Re-index all sessions for semantic search")
        btn_rebuild_vec.clicked.connect(self._cochran_rebuild_vector)
        row2.addWidget(btn_rebuild_vec)
        row2.addStretch()
        ag.addLayout(row2)
        layout.addWidget(actions_group)

        # Output
        self.cochran_output = QPlainTextEdit()
        self.cochran_output.setReadOnly(True)
        self.cochran_output.setFont(QFont("Consolas", 11))
        layout.addWidget(self.cochran_output)

        # Auto-check on load
        QTimer.singleShot(500, self._check_cochran)

        return w

    def _cochran_api(self, method: str, path: str, body: dict | None = None) -> tuple[int, str]:
        import urllib.request
        import urllib.error
        url = f"http://localhost:3847{path}"
        try:
            data = json.dumps(body).encode() if body else None
            req = urllib.request.Request(url, data=data, method=method)
            if data:
                req.add_header("Content-Type", "application/json")
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status, resp.read().decode()
        except urllib.error.URLError as e:
            return 0, str(e.reason)
        except Exception as e:
            return 0, str(e)

    def _check_cochran(self):
        code, body = self._cochran_api("GET", "/health")
        if code == 200:
            self.cochran_status.setText("● Running")
            self.cochran_status.setStyleSheet(f"color: {GREEN};")
            try:
                data = json.loads(body)
                self.cochran_output.setPlainText(json.dumps(data, indent=2))
            except Exception:
                self.cochran_output.setPlainText(body)
        else:
            self.cochran_status.setText("○ Not Running")
            self.cochran_status.setStyleSheet(f"color: {RED};")
            self.cochran_output.setPlainText(f"Cannot reach Cochran AI on port 3847\n{body}")

    def _start_cochran(self):
        script = str(APPS_DIR / "local-agent" / "start-agent.ps1")
        subprocess.Popen(
            ["pwsh", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
            cwd=str(APPS_DIR / "local-agent"),
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        self.cochran_status.setText("Starting...")
        self.cochran_status.setStyleSheet(f"color: {AMBER};")
        QTimer.singleShot(4000, self._check_cochran)

    def _stop_cochran(self):
        run_cmd(["pwsh", "-NoProfile", "-Command",
                 "Get-NetTCPConnection -LocalPort 3847 -ErrorAction SilentlyContinue | "
                 "ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"])
        self.cochran_status.setText("○ Stopped")
        self.cochran_status.setStyleSheet(f"color: {RED};")

    def _cochran_refresher(self):
        code, body = self._cochran_api("GET", "/refresher?last=5")
        if code == 200:
            try:
                data = json.loads(body)
                self.cochran_output.setPlainText(json.dumps(data, indent=2))
            except Exception:
                self.cochran_output.setPlainText(body)
        else:
            self.cochran_output.setPlainText(f"Error: {body}")

    def _cochran_rebuild_knowledge(self):
        code, body = self._cochran_api("POST", "/knowledge/rebuild")
        self.cochran_output.setPlainText(f"Status: {code}\n{body}")

    def _cochran_run_tasks(self):
        code, body = self._cochran_api("POST", "/tasks/run")
        self.cochran_output.setPlainText(f"Status: {code}\n{body}")

    def _cochran_vector_status(self):
        code, body = self._cochran_api("GET", "/search/status")
        self.cochran_output.setPlainText(f"Status: {code}\n{body}")

    def _cochran_rebuild_vector(self):
        code, body = self._cochran_api("POST", "/search/rebuild")
        self.cochran_output.setPlainText(f"Status: {code}\n{body}")

    def _show_todays_picks(self):
        """Show today's picks from progno picks-response.json"""
        picks_file = APPS_DIR / "progno" / "picks-response.json"

        dialog = QDialog(self)
        dialog.setWindowTitle("📊 Today's Picks - Progno")
        dialog.setMinimumSize(600, 400)
        layout = QVBoxLayout(dialog)

        if not picks_file.exists():
            label = QLabel("No picks file found. Run progno analysis first.")
            label.setStyleSheet(f"color: {RED}; font-size: 14px;")
            layout.addWidget(label)
        else:
            try:
                data = json.loads(picks_file.read_text('utf-8'))

                # Header
                header = QLabel(f"<h2>🎯 Progno Picks - {datetime.now().strftime('%B %d, %Y')}</h2>")
                layout.addWidget(header)

                # Summary
                count = data.get('count', 0)
                total = data.get('total_games', 0)
                premium = data.get('premium_count', 0)
                value = data.get('value_bets_count', 0)

                summary = QLabel(f"""
                <table style='font-size: 13px;'>
                <tr><td><b>Games Analyzed:</b></td><td>{total}</td></tr>
                <tr><td><b>Picks Found:</b></td><td><span style='color: {GREEN};'>{count}</span></td></tr>
                <tr><td><b>Premium Picks:</b></td><td><span style='color: {AMBER};'>{premium}</span></td></tr>
                <tr><td><b>Value Bets:</b></td><td><span style='color: {PURPLE};'>{value}</span></td></tr>
                </table>
                """)
                layout.addWidget(summary)

                # Message if no picks
                if count == 0:
                    msg = QLabel(f"<p style='color: {TEXT_DIM}; font-style: italic;'>{data.get('message', 'No games found today')}</p>")
                    layout.addWidget(msg)

                # Picks list
                picks = data.get('picks', [])
                if picks:
                    picks_label = QLabel("<h3>📋 Selected Picks:</h3>")
                    layout.addWidget(picks_label)

                    picks_text = QPlainTextEdit()
                    picks_text.setReadOnly(True)
                    picks_text.setMaximumHeight(200)

                    picks_list = []
                    for i, pick in enumerate(picks[:10], 1):
                        sport = pick.get('sport', 'Unknown')
                        matchup = pick.get('matchup', 'Unknown')
                        pick_type = pick.get('pick', 'N/A')
                        confidence = pick.get('confidence', 0)
                        picks_list.append(f"{i}. [{sport}] {matchup} → {pick_type} (Confidence: {confidence}%)")

                    picks_text.setPlainText("\n".join(picks_list))
                    layout.addWidget(picks_text)

                # Technology used
                tech = data.get('technology', {})
                if tech:
                    tech_label = QLabel("<h3>🧠 Technology:</h3>")
                    layout.addWidget(tech_label)

                    tech_text = QPlainTextEdit()
                    tech_text.setReadOnly(True)
                    tech_text.setMaximumHeight(100)
                    tech_lines = [f"• {k.replace('_', ' ').title()}: {v}" for k, v in tech.items()]
                    tech_text.setPlainText("\n".join(tech_lines))
                    layout.addWidget(tech_text)

            except Exception as e:
                error = QLabel(f"Error reading picks: {e}")
                error.setStyleSheet(f"color: {RED};")
                layout.addWidget(error)

        # Close button
        btn = QPushButton("Close")
        btn.clicked.connect(dialog.accept)
        layout.addWidget(btn)

        dialog.exec()

    def _send_message_to_ai(self):
        """Open dialog to send a message to the AI assistant's inbox."""
        dialog = QDialog(self)
        dialog.setWindowTitle("Send Message to AI")
        dialog.setMinimumSize(400, 250)
        layout = QVBoxLayout(dialog)

        # Priority selection
        priority_label = QLabel("Priority:")
        layout.addWidget(priority_label)

        priority_combo = QComboBox()
        priority_combo.addItems(["low", "normal", "high", "urgent"])
        priority_combo.setCurrentText("normal")
        layout.addWidget(priority_combo)

        # Category selection
        category_label = QLabel("Category:")
        layout.addWidget(category_label)

        category_combo = QComboBox()
        category_combo.addItems(["general", "command", "info", "question", "alert"])
        category_combo.setCurrentText("info")
        layout.addWidget(category_combo)

        # Message text
        message_label = QLabel("Message:")
        layout.addWidget(message_label)

        message_input = QPlainTextEdit()
        message_input.setPlaceholderText("Enter your message for the AI...")
        message_input.setMaximumHeight(100)
        layout.addWidget(message_input)

        # Status label
        status_label = QLabel("")
        status_label.setStyleSheet(f"color: {GREEN};")
        layout.addWidget(status_label)

        # Send button
        def send_message():
            message = message_input.toPlainText().strip()
            if not message:
                status_label.setText("Please enter a message")
                status_label.setStyleSheet(f"color: {RED};")
                return

            import json
            import urllib.request

            data = {
                "message": message,
                "priority": priority_combo.currentText(),
                "category": category_combo.currentText()
            }

            try:
                req = urllib.request.Request(
                    "http://localhost:8471/inbox/send",
                    data=json.dumps(data).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )

                with urllib.request.urlopen(req, timeout=5) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    if result.get('success'):
                        status_label.setText(f"✅ Message sent! (ID: {result.get('message_id', 'unknown')})")
                        status_label.setStyleSheet(f"color: {GREEN};")
                        message_input.clear()
                    else:
                        status_label.setText(f"❌ Error: {result.get('error', 'Unknown error')}")
                        status_label.setStyleSheet(f"color: {RED};")
            except Exception as e:
                status_label.setText(f"❌ Failed to send: {str(e)}")
                status_label.setStyleSheet(f"color: {RED};")

        send_btn = QPushButton("Send Message")
        send_btn.clicked.connect(send_message)
        layout.addWidget(send_btn)

        # Close button
        close_btn = QPushButton("Close")
        close_btn.clicked.connect(dialog.accept)
        layout.addWidget(close_btn)

        # PowerShell one-liner info
        ps_label = QLabel("<small>PowerShell:<br>irm http://localhost:8471/inbox/send -Method POST -Body '{\"message\":\"Your message\",\"priority\":\"normal\",\"category\":\"info\"}' -ContentType 'application/json'</small>")
        ps_label.setWordWrap(True)
        ps_label.setStyleSheet("color: #9ca3af;")
        layout.addWidget(ps_label)

        dialog.exec()

    def _check_ai_status(self):
        """Check AI health status and show alerts."""
        dialog = QDialog(self)
        dialog.setWindowTitle("AI Health Status")
        dialog.setMinimumSize(450, 300)
        layout = QVBoxLayout(dialog)

        try:
            import urllib.request
            import json

            # Fetch AI status
            with urllib.request.urlopen("http://localhost:8471/ai/status", timeout=5) as response:
                status = json.loads(response.read().decode('utf-8'))

            health = status.get('health', {})
            ai_status = status.get('ai_status', {})

            # Status header
            status_color = GREEN if health.get('healthy') else (AMBER if health.get('status') == 'idle' else RED)
            status_text = health.get('status', 'unknown').upper()

            header = QLabel(f"<h2 style='color: {status_color}'>AI Status: {status_text}</h2>")
            layout.addWidget(header)

            # Current task
            if health.get('current_task'):
                task_label = QLabel(f"<b>Current Task:</b> {health['current_task']}")
                layout.addWidget(task_label)

            if health.get('last_activity'):
                activity_label = QLabel(f"<b>Last Activity:</b> {health['last_activity']}")
                layout.addWidget(activity_label)

            # Idle time
            if health.get('idle_minutes') is not None:
                idle_label = QLabel(f"<b>Idle Time:</b> {health['idle_minutes']} minutes")
                idle_label.setStyleSheet(f"color: {AMBER if health['idle_minutes'] > 2 else 'white'};")
                layout.addWidget(idle_label)

            # Warnings
            if health.get('warning'):
                warning_box = QLabel(f"<div style='background-color: {RED}22; padding: 10px; border-radius: 5px;'><b>⚠️ Warning:</b> {health['warning']}</div>")
                warning_box.setWordWrap(True)
                layout.addWidget(warning_box)

            # Stuck detection
            stuck = ai_status.get('stuck_detection', {})
            if stuck.get('loop_detected'):
                loop_box = QLabel(f"<div style='background-color: {RED}22; padding: 10px; border-radius: 5px;'><b>🔄 Loop Detected!</b><br>Same output repeated {stuck.get('same_output_count', 0)} times. You may be stuck in an infinite loop.</div>")
                loop_box.setWordWrap(True)
                layout.addWidget(loop_box)

            # Check for alerts in inbox
            with urllib.request.urlopen("http://localhost:8471/inbox", timeout=5) as response:
                inbox = json.loads(response.read().decode('utf-8'))

            unread = inbox.get('unread_count', 0)
            if unread > 0:
                alerts_box = QLabel(f"<div style='background-color: {AMBER}22; padding: 10px; border-radius: 5px;'><b>📬 {unread} unread alert(s) in inbox</b><br>Call irm http://localhost:8471/inbox to read them</div>")
                alerts_box.setWordWrap(True)
                layout.addWidget(alerts_box)

            # Heartbeat info
            if health.get('last_heartbeat'):
                heartbeat_label = QLabel(f"<small>Last heartbeat: {health['last_heartbeat'][:19]}</small>")
                heartbeat_label.setStyleSheet("color: #9ca3af;")
                layout.addWidget(heartbeat_label)

            # Actions
            layout.addSpacing(10)
            actions_label = QLabel("<b>Quick Actions:</b>")
            layout.addWidget(actions_label)

            button_layout = QHBoxLayout()

            def send_ping():
                try:
                    data = json.dumps({"status": "active", "task": "manual check", "activity": "user ping"}).encode('utf-8')
                    req = urllib.request.Request(
                        "http://localhost:8471/ai/heartbeat",
                        data=data,
                        headers={'Content-Type': 'application/json'},
                        method='POST'
                    )
                    with urllib.request.urlopen(req, timeout=5) as response:
                        result = json.loads(response.read().decode('utf-8'))
                        QMessageBox.information(dialog, "Ping Sent", f"AI heartbeat updated!\nStatus: {result.get('status', 'unknown')}")
                except Exception as e:
                    QMessageBox.critical(dialog, "Error", f"Failed to ping: {str(e)}")

            ping_btn = QPushButton("📡 Ping AI (I'm Active)")
            ping_btn.clicked.connect(send_ping)
            button_layout.addWidget(ping_btn)

            def check_health():
                try:
                    with urllib.request.urlopen("http://localhost:8471/ai/check", timeout=5) as response:
                        check = json.loads(response.read().decode('utf-8'))
                        issues = check.get('issues', [])
                        if issues:
                            QMessageBox.warning(dialog, "Health Check", "Issues found:\n\n• " + "\n• ".join(issues))
                        else:
                            QMessageBox.information(dialog, "Health Check", "✅ AI is healthy - no issues detected")
                except Exception as e:
                    QMessageBox.critical(dialog, "Error", f"Health check failed: {str(e)}")

            health_btn = QPushButton("🏥 Health Check")
            health_btn.clicked.connect(check_health)
            button_layout.addWidget(health_btn)

            layout.addLayout(button_layout)

        except Exception as e:
            error_label = QLabel(f"<div style='color: {RED};'>❌ Error checking AI status: {str(e)}</div>")
            error_label.setWordWrap(True)
            layout.addWidget(error_label)

        # Close button
        close_btn = QPushButton("Close")
        close_btn.clicked.connect(dialog.accept)
        layout.addWidget(close_btn)

        dialog.exec()

    # ---- Window behavior ----
    def closeEvent(self, event):
        event.ignore()
        self.hide()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    # Start API server in background thread
    api_script = Path(__file__).parent / "devops_agent_api.py"
    if api_script.exists():
        import subprocess
        subprocess.Popen(
            [sys.executable, str(api_script)],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0,
        )

    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    app.setStyleSheet(STYLESHEET)

    icon = make_tray_icon()
    app.setWindowIcon(icon)

    window = DevOpsWindow()

    # System tray
    tray = QSystemTrayIcon(icon, app)
    tray.setToolTip("DevOps Agent — cevict-live")

    menu = QMenu()

    action_show = QAction("Open DevOps Agent", menu)
    action_show.triggered.connect(lambda: (window.show(), window.raise_(), window.activateWindow()))
    menu.addAction(action_show)

    menu.addSeparator()

    # Quick actions in tray
    action_git_status = QAction("Git Status", menu)
    action_git_status.triggered.connect(lambda: (window.show(), window.tabs.setCurrentIndex(0), window._refresh_git_status()))
    menu.addAction(action_git_status)

    action_deploy = QAction("Deploy...", menu)
    action_deploy.triggered.connect(lambda: (window.show(), window.tabs.setCurrentIndex(1)))
    menu.addAction(action_deploy)

    action_audit = QAction("Audit...", menu)
    action_audit.triggered.connect(lambda: (window.show(), window.tabs.setCurrentIndex(2)))
    menu.addAction(action_audit)

    menu.addSeparator()

    action_cochran = QAction("Cochran AI Status", menu)
    action_cochran.triggered.connect(lambda: (window.show(), window.tabs.setCurrentIndex(5), window._check_cochran()))
    menu.addAction(action_cochran)

    action_picks = QAction("📊 Today's Picks (Progno)", menu)
    action_picks.triggered.connect(window._show_todays_picks)
    menu.addAction(action_picks)

    action_send_msg = QAction("✉️ Send Message to AI", menu)
    action_send_msg.triggered.connect(window._send_message_to_ai)
    menu.addAction(action_send_msg)

    action_ai_status = QAction("🤖 Check AI Status", menu)
    action_ai_status.triggered.connect(window._check_ai_status)
    menu.addAction(action_ai_status)

    menu.addSeparator()

    action_quit = QAction("Quit", menu)
    action_quit.triggered.connect(app.quit)
    menu.addAction(action_quit)

    tray.setContextMenu(menu)
    tray.activated.connect(
        lambda reason: (window.show(), window.raise_(), window.activateWindow())
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick else None
    )
    tray.show()

    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()

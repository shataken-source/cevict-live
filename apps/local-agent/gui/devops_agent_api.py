"""
DevOps Agent API Server
HTTP API for remote operations — Git, Vercel, Audit, Tools, Cochran.
Runs alongside the GUI or standalone (headless mode).

Port: 8471 (configurable via DEVOPS_AGENT_PORT env var)
"""

import json
import os
import re
import subprocess
import sys
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

# Try to use Flask if available, otherwise use built-in http.server
try:
    from flask import Flask, jsonify, request
    HAS_FLASK = True
except ImportError:
    HAS_FLASK = False
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import urllib.parse

# Paths
REPO_ROOT = Path(r"C:\cevict-live")
APPS_DIR = REPO_ROOT / "apps"
SCRIPTS_DIR = REPO_ROOT / "scripts"

# Config
API_PORT = int(os.environ.get("DEVOPS_AGENT_PORT", "8471"))
COCHRAN_PORT = int(os.environ.get("COCHRAN_PORT", "3847"))


def run_cmd(cmd: list[str], cwd: str | None = None, timeout: int = 120) -> tuple[int, str]:
    """Run a command and return (exit_code, output)."""
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


def format_size(size_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


# =============================================================================
# Flask implementation (preferred)
# =============================================================================
if HAS_FLASK:
    app = Flask(__name__)

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({
            "status": "running",
            "service": "devops-agent",
            "version": "1.0.0",
            "port": API_PORT,
            "time": datetime.now().isoformat(),
        })

    # -------------------------------------------------------------------------
    # Git endpoints
    # -------------------------------------------------------------------------
    @app.route('/git/status', methods=['GET'])
    def git_status():
        code, branch = git("branch", "--show-current")
        code2, status = git("status", "--short")
        files = [l for l in status.strip().split("\n") if l.strip()] if status else []
        return jsonify({
            "success": True,
            "branch": branch if code == 0 else None,
            "clean": len(files) == 0,
            "changed_files": len(files),
            "files": files,
            "raw_status": status,
        })

    @app.route('/git/log', methods=['GET'])
    def git_log():
        limit = request.args.get('limit', 10, type=int)
        code, out = git("log", f"-{limit}", "--oneline", "--decorate", "--graph")
        commits = []
        for line in out.strip().split("\n"):
            if line.strip():
                # Parse "* abc1234 message" or "abc1234 message"
                parts = line.split()
                if len(parts) >= 2:
                    commits.append({
                        "hash": parts[1] if parts[0] in ['*', '|', '\\', '/'] else parts[0],
                        "message": " ".join(parts[2:] if parts[0] in ['*', '|', '\\', '/'] else parts[1:]),
                        "raw": line,
                    })
        return jsonify({"success": code == 0, "commits": commits, "raw": out})

    @app.route('/git/commit', methods=['POST'])
    def git_commit():
        data = request.get_json() or {}
        message = data.get('message', '').strip()
        stage_all = data.get('stage_all', True)
        if not message:
            return jsonify({"success": False, "error": "Message required"}), 400
        if stage_all:
            git("add", "-A")
        code, out = git("commit", "-m", message)
        # Extract commit hash from output
        h = ""
        if code == 0:
            m = re.search(r'\[.+? ([a-f0-9]+)\]', out)
            if m:
                h = m.group(1)
        return jsonify({"success": code == 0, "commit_hash": h, "output": out})

    @app.route('/git/push', methods=['POST'])
    def git_push():
        code, out = git("push")
        return jsonify({"success": code == 0, "output": out})

    @app.route('/git/commit-and-push', methods=['POST'])
    def git_commit_and_push():
        data = request.get_json() or {}
        message = data.get('message', '').strip()
        stage_all = data.get('stage_all', True)
        if not message:
            return jsonify({"success": False, "error": "Message required"}), 400
        if stage_all:
            git("add", "-A")
        code, out = git("commit", "-m", message)
        if code != 0 and "nothing to commit" not in out.lower():
            return jsonify({"success": False, "error": out}), 500
        code2, out2 = git("push")
        return jsonify({
            "success": code2 == 0,
            "commit_output": out,
            "push_output": out2,
        })

    # -------------------------------------------------------------------------
    # Vercel endpoints
    # -------------------------------------------------------------------------
    @app.route('/vercel/deploy', methods=['POST'])
    def vercel_deploy():
        data = request.get_json() or {}
        app_name = data.get('app', '').strip()
        production = data.get('production', False)
        if not app_name:
            return jsonify({"success": False, "error": "App name required"}), 400
        app_path = str(APPS_DIR / app_name)
        cmd = ["npx", "vercel", "--yes"]
        if production:
            cmd.append("--prod")
        code, out = run_cmd(cmd, cwd=app_path, timeout=300)
        # Extract deployment URL
        url = ""
        for line in out.split("\n"):
            if "https://" in line and ".vercel.app" in line:
                url = line.strip().split()[-1]
                break
        return jsonify({"success": code == 0, "deployment_url": url, "output": out})

    @app.route('/vercel/build', methods=['POST'])
    def vercel_build():
        data = request.get_json() or {}
        app_name = data.get('app', '').strip()
        if not app_name:
            return jsonify({"success": False, "error": "App name required"}), 400
        app_path = str(APPS_DIR / app_name)
        code, out = run_cmd(["npx", "next", "build"], cwd=app_path, timeout=300)
        return jsonify({"success": code == 0, "output": out})

    @app.route('/vercel/push-env', methods=['POST'])
    def vercel_push_env():
        data = request.get_json() or {}
        app_name = data.get('app', '').strip()
        env = data.get('environment', 'development')
        dry_run = data.get('dry_run', False)
        if not app_name:
            return jsonify({"success": False, "error": "App name required"}), 400
        script = str(SCRIPTS_DIR / "keyvault" / "push-vercel.ps1")
        cmd = ["pwsh", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
               "-App", app_name, "-Env", env]
        if dry_run:
            cmd.append("-DryRun")
        code, out = run_cmd(cmd, cwd=str(SCRIPTS_DIR / "keyvault"), timeout=120)
        return jsonify({"success": code == 0, "output": out})

    # -------------------------------------------------------------------------
    # Audit endpoints
    # -------------------------------------------------------------------------
    @app.route('/audit/large-files', methods=['GET'])
    def audit_large_files():
        app_name = request.args.get('app', '')
        threshold_mb = request.args.get('threshold_mb', 1, type=int)
        threshold = threshold_mb * 1_000_000
        target = APPS_DIR / app_name if app_name else REPO_ROOT
        large = []
        try:
            for f in target.rglob("*"):
                if f.is_file() and "node_modules" not in f.parts and ".git" not in f.parts:
                    try:
                        size = f.stat().st_size
                        if size > threshold:
                            rel = str(f.relative_to(REPO_ROOT)) if f.is_relative_to(REPO_ROOT) else str(f)
                            large.append({"path": rel, "size": size, "size_formatted": format_size(size)})
                    except OSError:
                        pass
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        large.sort(key=lambda x: x["size"], reverse=True)
        total = sum(f["size"] for f in large)
        return jsonify({
            "success": True,
            "threshold_bytes": threshold,
            "files": large[:200],
            "count": len(large),
            "total_size": total,
            "total_formatted": format_size(total),
        })

    @app.route('/audit/node-modules', methods=['GET'])
    def audit_node_modules():
        locations = []
        total = 0
        try:
            for d in REPO_ROOT.rglob("node_modules"):
                if d.is_dir():
                    try:
                        size = sum(f.stat().st_size for f in d.rglob("*") if f.is_file())
                        rel = str(d.relative_to(REPO_ROOT)) if d.is_relative_to(REPO_ROOT) else str(d)
                        locations.append({"path": rel, "size": size, "size_formatted": format_size(size)})
                        total += size
                    except Exception:
                        pass
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        locations.sort(key=lambda x: x["size"], reverse=True)
        return jsonify({
            "success": True,
            "locations": locations,
            "count": len(locations),
            "total_size": total,
            "total_formatted": format_size(total),
        })

    @app.route('/audit/safe-to-remove', methods=['GET'])
    def audit_safe_to_remove():
        app_name = request.args.get('app', '')
        target = APPS_DIR / app_name if app_name else REPO_ROOT
        patterns = [".next", "dist", ".turbo", ".cache", ".parcel-cache", "__pycache__", ".pytest_cache",
                    ".mypy_cache", ".vercel", ".netlify", "coverage", ".nyc_output"]
        items = []
        total = 0
        try:
            for pattern in patterns:
                for f in target.rglob(pattern):
                    if "node_modules" in f.parts or ".git" in f.parts:
                        continue
                    try:
                        if f.is_dir():
                            size = sum(x.stat().st_size for x in f.rglob("*") if x.is_file())
                        else:
                            size = f.stat().st_size
                        rel = str(f.relative_to(REPO_ROOT)) if f.is_relative_to(REPO_ROOT) else str(f)
                        items.append({"type": pattern, "path": rel, "size": size, "size_formatted": format_size(size)})
                        total += size
                    except OSError:
                        pass
            # Also check .log files
            for f in target.rglob("*.log"):
                if "node_modules" in f.parts or ".git" in f.parts:
                    continue
                try:
                    size = f.stat().st_size
                    rel = str(f.relative_to(REPO_ROOT)) if f.is_relative_to(REPO_ROOT) else str(f)
                    items.append({"type": "*.log", "path": rel, "size": size, "size_formatted": format_size(size)})
                    total += size
                except OSError:
                    pass
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        items.sort(key=lambda x: x["size"], reverse=True)
        return jsonify({
            "success": True,
            "items": items[:200],
            "count": len(items),
            "total_size": total,
            "total_formatted": format_size(total),
        })

    @app.route('/audit/unused-deps', methods=['GET'])
    def audit_unused_deps():
        app_name = request.args.get('app', '').strip()
        if not app_name:
            return jsonify({"success": False, "error": "App name required"}), 400
        app_path = APPS_DIR / app_name
        pkg_file = app_path / "package.json"
        if not pkg_file.exists():
            return jsonify({"success": False, "error": "No package.json found"}), 404
        try:
            pkg = json.loads(pkg_file.read_text("utf-8"))
        except Exception as e:
            return jsonify({"success": False, "error": f"Error reading package.json: {e}"}), 500

        deps = list(pkg.get("dependencies", {}).keys())
        dev_deps = list(pkg.get("devDependencies", {}).keys())
        imported = set()
        src_ext = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
        for f in app_path.rglob("*"):
            if f.suffix in src_ext and "node_modules" not in f.parts:
                try:
                    content = f.read_text("utf-8", errors="ignore")
                    for m in re.finditer(r'''(?:import\s+.*?from\s+['"]|require\s*\(\s*['"])([^'"./][^'"]*?)['"]''', content):
                        pkg_name = m.group(1)
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
        return jsonify({
            "success": True,
            "production": {"total": len(deps), "unused": unused_deps, "used_count": len(deps) - len(unused_deps)},
            "dev": {"total": len(dev_deps), "unused": unused_dev, "used_count": len(dev_deps) - len(unused_dev)},
            "note": "Some deps may be used indirectly (CLI tools, configs). Review before removing."
        })

    # -------------------------------------------------------------------------
    # Organize endpoints
    # -------------------------------------------------------------------------
    @app.route('/organize/disk-usage', methods=['GET'])
    def organize_disk_usage():
        apps = []
        grand_total = 0
        try:
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
                src = total - nm_size
                apps.append({
                    "name": app_dir.name,
                    "total": total,
                    "total_formatted": format_size(total),
                    "node_modules": nm_size,
                    "node_modules_formatted": format_size(nm_size),
                    "source": src,
                    "source_formatted": format_size(src),
                })
                grand_total += total
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        apps.sort(key=lambda x: x["total"], reverse=True)
        return jsonify({
            "success": True,
            "apps": apps,
            "grand_total": grand_total,
            "grand_total_formatted": format_size(grand_total),
        })

    @app.route('/organize/empty-dirs', methods=['GET'])
    def organize_empty_dirs():
        empty = []
        try:
            for d in REPO_ROOT.rglob("*"):
                if d.is_dir() and "node_modules" not in d.parts and ".git" not in d.parts:
                    try:
                        if not any(d.iterdir()):
                            rel = str(d.relative_to(REPO_ROOT))
                            empty.append(rel)
                    except (OSError, PermissionError):
                        pass
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        return jsonify({"success": True, "empty_directories": sorted(empty)})

    @app.route('/organize/duplicate-names', methods=['GET'])
    def organize_duplicate_names():
        name_map: dict[str, list[str]] = {}
        try:
            for f in APPS_DIR.rglob("*"):
                if f.is_file() and "node_modules" not in f.parts and ".git" not in f.parts:
                    name = f.name
                    if name in ("package.json", "tsconfig.json", ".env.local", ".gitignore", "README.md"):
                        continue
                    rel = str(f.relative_to(REPO_ROOT))
                    name_map.setdefault(name, []).append(rel)
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
        dupes = {k: v for k, v in name_map.items() if len(v) > 1}
        return jsonify({"success": True, "duplicates": dupes, "count": len(dupes)})

    # -------------------------------------------------------------------------
    # Tools endpoints
    # -------------------------------------------------------------------------
    @app.route('/tools/port/<int:port>', methods=['GET'])
    def tools_check_port(port):
        # Use simple CSV format to avoid JSON escaping hell in PowerShell
        code, out = run_cmd(
            ["pwsh", "-NoProfile", "-Command",
             f"$c = Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -First 1; "
             f"if($c) {{ $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; "
             f"Write-Output \"pid=$($c.OwningProcess),process=$($p.ProcessName),inuse=1\" }} "
             f"else {{ Write-Output \"pid=,process=,inuse=0\" }}"],
            timeout=10,
        )
        try:
            # Parse CSV format: pid=1234,process=node,inuse=1
            parts = dict(p.split('=', 1) for p in out.strip().split(',') if '=' in p)
            if parts.get('inuse') == '1':
                return jsonify({
                    "port": port,
                    "in_use": True,
                    "pid": parts.get('pid') or None,
                    "process": parts.get('process') or None
                })
            return jsonify({"port": port, "in_use": False, "pid": None, "process": None})
        except Exception:
            return jsonify({"port": port, "in_use": False, "pid": None, "process": None, "raw": out})

    @app.route('/tools/ports-scan', methods=['GET'])
    def tools_ports_scan():
        ports = [3000, 3001, 3002, 3003, 3004, 3005, 3847, 4000, 5173, 8080, 8888]
        results = []
        for port in ports:
            r = tools_check_port(port)
            results.append(r.get_json())
        return jsonify({"ports": results})

    @app.route('/tools/port/<int:port>/kill', methods=['POST'])
    def tools_kill_port(port):
        code, out = run_cmd(
            ["pwsh", "-NoProfile", "-Command",
             f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | "
             f"ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}"],
            timeout=10,
        )
        return jsonify({"success": code == 0, "port": port, "output": out})

    @app.route('/tools/kill-process', methods=['POST'])
    def tools_kill_process():
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        if not name:
            return jsonify({"success": False, "error": "Process name required"}), 400
        code, out = run_cmd(
            ["pwsh", "-NoProfile", "-Command",
             f"Get-Process -Name '{name}' -ErrorAction SilentlyContinue | Stop-Process -Force"],
            timeout=10,
        )
        return jsonify({"success": code == 0, "name": name, "output": out})

    @app.route('/tools/command', methods=['POST'])
    def tools_command():
        data = request.get_json() or {}
        cmd = data.get('command', [])
        cwd = data.get('cwd')
        if not cmd:
            return jsonify({"success": False, "error": "Command list required"}), 400
        code, out = run_cmd(cmd, cwd=cwd, timeout=180)
        return jsonify({"success": code == 0, "output": out})

    # -------------------------------------------------------------------------
    # Cochran endpoints
    # -------------------------------------------------------------------------
    @app.route('/cochran/status', methods=['GET'])
    def cochran_status():
        try:
            import urllib.request
            req = urllib.request.Request(f"http://localhost:{COCHRAN_PORT}/health", method='GET')
            with urllib.request.urlopen(req, timeout=5) as resp:
                body = json.loads(resp.read().decode())
                return jsonify({"running": True, **body})
        except Exception as e:
            return jsonify({"running": False, "error": str(e)})

    @app.route('/cochran/start', methods=['POST'])
    def cochran_start():
        script = str(APPS_DIR / "local-agent" / "start-agent.ps1")
        subprocess.Popen(
            ["pwsh", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
            cwd=str(APPS_DIR / "local-agent"),
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0,
        )
        return jsonify({"success": True, "message": "Cochran AI starting..."})

    @app.route('/cochran/stop', methods=['POST'])
    def cochran_stop():
        code, out = run_cmd(
            ["pwsh", "-NoProfile", "-Command",
             f"Get-NetTCPConnection -LocalPort {COCHRAN_PORT} -ErrorAction SilentlyContinue | "
             f"ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}"],
            timeout=10,
        )
        return jsonify({"success": True, "output": out})

    @app.route('/cochran/refresher', methods=['GET'])
    def cochran_refresher():
        try:
            import urllib.request
            last = request.args.get('last', 5, type=int)
            req = urllib.request.Request(f"http://localhost:{COCHRAN_PORT}/refresher?last={last}", method='GET')
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = json.loads(resp.read().decode())
                return jsonify({"success": True, **body})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)})

    @app.route('/cochran/knowledge/rebuild', methods=['POST'])
    def cochran_knowledge_rebuild():
        try:
            import urllib.request
            req = urllib.request.Request(f"http://localhost:{COCHRAN_PORT}/knowledge/rebuild", method='POST')
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = json.loads(resp.read().decode())
                return jsonify({"success": True, **body})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)})

    @app.route('/cochran/tasks/run', methods=['POST'])
    def cochran_tasks_run():
        try:
            import urllib.request
            req = urllib.request.Request(f"http://localhost:{COCHRAN_PORT}/tasks/run", method='POST')
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = json.loads(resp.read().decode())
                return jsonify({"success": True, **body})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)})

    @app.route('/cochran/vector/status', methods=['GET'])
    def cochran_vector_status():
        try:
            import urllib.request
            req = urllib.request.Request(f"http://localhost:{COCHRAN_PORT}/search/status", method='GET')
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = json.loads(resp.read().decode())
                return jsonify({"success": True, **body})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)})

    @app.route('/cochran/vector/rebuild', methods=['POST'])
    def cochran_vector_rebuild():
        try:
            import urllib.request
            req = urllib.request.Request(f"http://localhost:{COCHRAN_PORT}/search/rebuild", method='POST')
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = json.loads(resp.read().decode())
                return jsonify({"success": True, **body})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)})

    # -------------------------------------------------------------------------
    # Cascade Coordination Endpoints (Multi-Instance Memory)
    # -------------------------------------------------------------------------

    # In-memory store for active Cascade instances
    cascade_instances: dict[str, dict] = {}

    @app.route('/cascade/heartbeat', methods=['POST'])
    def cascade_heartbeat():
        """Cascade instances ping this to register their activity"""
        data = request.get_json() or {}
        instance_id = data.get('instance_id', 'unknown')
        current_work = data.get('current_work', {})

        cascade_instances[instance_id] = {
            "last_seen": datetime.now().isoformat(),
            "current_work": current_work,
            "branch": current_work.get('branch'),
            "files": current_work.get('files', []),
            "operation": current_work.get('operation'),
        }

        # Clean up stale instances (>5 minutes old)
        now = datetime.now()
        stale = []
        for iid, info in cascade_instances.items():
            last = datetime.fromisoformat(info['last_seen'])
            if (now - last).seconds > 300:
                stale.append(iid)
        for iid in stale:
            del cascade_instances[iid]

        return jsonify({
            "success": True,
            "active_instances": len(cascade_instances),
            "other_work": {k: v for k, v in cascade_instances.items() if k != instance_id}
        })

    @app.route('/cascade/active', methods=['GET'])
    def cascade_active():
        """Get all currently active Cascade instances and what they're doing"""
        return jsonify({
            "success": True,
            "instances": cascade_instances,
            "count": len(cascade_instances),
            "timestamp": datetime.now().isoformat(),
        })

    @app.route('/cascade/check-collision', methods=['POST'])
    def cascade_check_collision():
        """Check if another instance is working on same branch/files"""
        data = request.get_json() or {}
        my_branch = data.get('branch')
        my_files = data.get('files', [])
        my_instance = data.get('instance_id', 'unknown')

        collisions = []
        for iid, info in cascade_instances.items():
            if iid == my_instance:
                continue
            # Check branch collision
            if my_branch and info.get('branch') == my_branch:
                collisions.append({
                    "instance": iid,
                    "type": "branch",
                    "detail": f"Also working on branch: {my_branch}"
                })
            # Check file collision
            their_files = info.get('files', [])
            for f in my_files:
                if f in their_files:
                    collisions.append({
                        "instance": iid,
                        "type": "file",
                        "detail": f"Also editing: {f}"
                    })

        return jsonify({
            "success": True,
            "collision_detected": len(collisions) > 0,
            "collisions": collisions,
            "safe_to_proceed": len(collisions) == 0,
        })

    @app.route('/cascade/context', methods=['POST'])
    def cascade_save_context():
        """Save context about current work for later retrieval"""
        data = request.get_json() or {}
        context_key = data.get('key', 'default')
        context_data = data.get('context', {})

        # Save to a JSON file for persistence across restarts
        context_dir = Path(os.environ.get('DEVOPS_DATA_DIR', r'C:\Cevict_Vault\devops-agent')) / 'contexts'
        context_dir.mkdir(parents=True, exist_ok=True)

        context_file = context_dir / f"{context_key}.json"
        context_file.write_text(json.dumps({
            "saved_at": datetime.now().isoformat(),
            "context": context_data,
        }, indent=2))

        return jsonify({"success": True, "key": context_key, "saved": True})

    @app.route('/cascade/context/<key>', methods=['GET'])
    def cascade_get_context(key):
        """Retrieve saved context"""
        context_dir = Path(os.environ.get('DEVOPS_DATA_DIR', r'C:\Cevict_Vault\devops-agent')) / 'contexts'
        context_file = context_dir / f"{key}.json"

        if not context_file.exists():
            return jsonify({"success": False, "error": "Context not found"}), 404

        try:
            data = json.loads(context_file.read_text())
            return jsonify({"success": True, **data})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/cascade/work-summary', methods=['GET'])
    def cascade_work_summary():
        """Get summary of recent work across all instances"""
        # Query Cochran for recent sessions
        try:
            import urllib.request
            req = urllib.request.Request(f"http://localhost:{COCHRAN_PORT}/refresher?last=10", method='GET')
            with urllib.request.urlopen(req, timeout=10) as resp:
                cochran_data = json.loads(resp.read().decode())
        except Exception:
            cochran_data = {"sessions": []}

        # Combine with active instances
        active_work = []
        for iid, info in cascade_instances.items():
            if info.get('current_work'):
                active_work.append({
                    "instance": iid,
                    "work": info['current_work'],
                    "since": info['last_seen'],
                })

        return jsonify({
            "success": True,
            "recent_sessions": cochran_data.get('sessions', []),
            "active_work": active_work,
            "total_active_instances": len(cascade_instances),
        })

    # -------------------------------------------------------------------------
    # KeyVault Integration (Secrets Retrieval)
    # -------------------------------------------------------------------------
    KEYVAULT_STORE_PATH = Path(os.environ.get('KEYVAULT_STORE_PATH', r'C:\Cevict_Vault\env-store.json'))

    def _get_keyvault_store() -> dict:
        """Load the KeyVault store JSON."""
        if not KEYVAULT_STORE_PATH.exists():
            # Try alternative locations
            alternatives = [
                Path(r'C:\Cevict_Vault\vault\secrets\env-store.json'),
                REPO_ROOT / 'vault' / 'secrets' / 'env-store.json',
            ]
            for alt in alternatives:
                if alt.exists():
                    return json.loads(alt.read_text('utf-8'))
            return {}
        return json.loads(KEYVAULT_STORE_PATH.read_text('utf-8'))

    @app.route('/keyvault/secret/<name>', methods=['GET'])
    def keyvault_get_secret(name):
        """Get a secret value from KeyVault (masked by default)."""
        try:
            store = _get_keyvault_store()
            secret = store.get(name)
            if secret is None:
                return jsonify({"success": False, "error": "Secret not found"}), 404

            # Mask the value: show first/last 4 chars only
            value = str(secret)
            if len(value) > 8:
                masked = value[:4] + '*' * (len(value) - 8) + value[-4:]
            else:
                masked = '*' * len(value)

            reveal = request.args.get('reveal', 'false').lower() == 'true'
            return jsonify({
                "success": True,
                "name": name,
                "value": value if reveal else masked,
                "masked": not reveal,
                "length": len(value),
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/keyvault/secrets', methods=['GET'])
    def keyvault_list_secrets():
        """List all secret names (not values)."""
        try:
            store = _get_keyvault_store()
            return jsonify({
                "success": True,
                "secrets": list(store.keys()),
                "count": len(store),
                "store_path": str(KEYVAULT_STORE_PATH),
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    # -------------------------------------------------------------------------
    # File/Code Search (Grep/File Find)
    # -------------------------------------------------------------------------
    @app.route('/search/files', methods=['POST'])
    def search_files():
        """Search for files matching pattern."""
        data = request.get_json() or {}
        pattern = data.get('pattern', '*')
        directory = data.get('directory', str(REPO_ROOT))
        max_depth = data.get('max_depth', 10)

        try:
            target = Path(directory)
            matches = []
            for i, f in enumerate(target.rglob(pattern)):
                if i > 1000:  # Limit results
                    break
                if 'node_modules' in f.parts or '.git' in f.parts:
                    continue
                if len(f.relative_to(target).parts) > max_depth:
                    continue
                matches.append(str(f.relative_to(REPO_ROOT)) if f.is_relative_to(REPO_ROOT) else str(f))

            return jsonify({
                "success": True,
                "pattern": pattern,
                "matches": matches[:200],
                "total_found": len(matches),
                "truncated": len(matches) > 200,
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/search/grep', methods=['POST'])
    def search_grep():
        """Search file contents for pattern (rg-style)."""
        data = request.get_json() or {}
        query = data.get('query', '')
        directory = data.get('directory', str(REPO_ROOT))
        extensions = data.get('extensions', ['.ts', '.tsx', '.js', '.jsx', '.py', '.json'])

        if not query:
            return jsonify({"success": False, "error": "Query required"}), 400

        results = []
        try:
            target = Path(directory)
            for f in target.rglob('*'):
                if f.suffix not in extensions:
                    continue
                if 'node_modules' in f.parts or '.git' in f.parts:
                    continue
                try:
                    content = f.read_text('utf-8', errors='ignore')
                    lines = content.split('\n')
                    for i, line in enumerate(lines, 1):
                        if query in line:
                            results.append({
                                "file": str(f.relative_to(REPO_ROOT)) if f.is_relative_to(REPO_ROOT) else str(f),
                                "line": i,
                                "text": line[:200],  # Truncate long lines
                            })
                            if len(results) >= 100:
                                break
                    if len(results) >= 100:
                        break
                except Exception:
                    continue

            return jsonify({
                "success": True,
                "query": query,
                "results": results,
                "total": len(results),
                "truncated": len(results) >= 100,
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    # -------------------------------------------------------------------------
    # Background Task Execution
    # -------------------------------------------------------------------------
    background_tasks: dict[str, dict] = {}

    @app.route('/tasks/run', methods=['POST'])
    def tasks_run():
        """Run a command in the background and get a task ID."""
        data = request.get_json() or {}
        command = data.get('command', [])
        cwd = data.get('cwd', str(REPO_ROOT))
        timeout = data.get('timeout', 300)

        if not command:
            return jsonify({"success": False, "error": "Command required"}), 400

        import uuid
        import threading

        task_id = str(uuid.uuid4())[:8]

        def run_task():
            try:
                proc = subprocess.Popen(
                    command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    cwd=cwd, text=True,
                )
                background_tasks[task_id]['pid'] = proc.pid
                output, _ = proc.communicate(timeout=timeout)
                background_tasks[task_id].update({
                    'status': 'completed' if proc.returncode == 0 else 'failed',
                    'exit_code': proc.returncode,
                    'output': output,
                    'completed_at': datetime.now().isoformat(),
                })
            except subprocess.TimeoutExpired:
                proc.kill()
                background_tasks[task_id].update({
                    'status': 'timeout',
                    'output': 'Command timed out',
                    'completed_at': datetime.now().isoformat(),
                })
            except Exception as e:
                background_tasks[task_id].update({
                    'status': 'error',
                    'output': str(e),
                    'completed_at': datetime.now().isoformat(),
                })

        background_tasks[task_id] = {
            'id': task_id,
            'command': ' '.join(command),
            'status': 'running',
            'started_at': datetime.now().isoformat(),
            'pid': None,
        }

        thread = threading.Thread(target=run_task)
        thread.daemon = True
        thread.start()

        return jsonify({
            "success": True,
            "task_id": task_id,
            "status": "running",
            "poll_url": f"/tasks/status/{task_id}",
        })

    @app.route('/tasks/status/<task_id>', methods=['GET'])
    def tasks_status(task_id):
        """Check status of a background task."""
        task = background_tasks.get(task_id)
        if not task:
            return jsonify({"success": False, "error": "Task not found"}), 404
        return jsonify({"success": True, **task})

    @app.route('/tasks/list', methods=['GET'])
    def tasks_list():
        """List all background tasks."""
        return jsonify({
            "success": True,
            "tasks": list(background_tasks.values()),
            "count": len(background_tasks),
        })

    # -------------------------------------------------------------------------
    # System Monitoring (Disk, Memory, Processes)
    # -------------------------------------------------------------------------
    @app.route('/system/disk', methods=['GET'])
    def system_disk():
        """Get disk usage information."""
        try:
            import shutil
            usage = shutil.disk_usage('C:\\')
            return jsonify({
                "success": True,
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "total_formatted": format_size(usage.total),
                "used_formatted": format_size(usage.used),
                "free_formatted": format_size(usage.free),
                "percent_used": round((usage.used / usage.total) * 100, 1),
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/system/memory', methods=['GET'])
    def system_memory():
        """Get memory usage information."""
        try:
            code, out = run_cmd(['wmic', 'computersystem', 'get', 'totalphysicalmemory,availablephysicalmemory', '/value'], timeout=10)
            return jsonify({
                "success": code == 0,
                "raw": out,
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/system/processes', methods=['GET'])
    def system_processes():
        """Get list of running processes (summary)."""
        name_filter = request.args.get('filter', '')
        try:
            if name_filter:
                code, out = run_cmd(['pwsh', '-Command', f'Get-Process | Where-Object {{ $_.ProcessName -like "*{name_filter}*" }} | Select-Object Id, ProcessName, CPU, WorkingSet | ConvertTo-Json'], timeout=15)
            else:
                code, out = run_cmd(['pwsh', '-Command', 'Get-Process | Select-Object -First 50 Id, ProcessName, CPU, WorkingSet | ConvertTo-Json'], timeout=15)
            return jsonify({
                "success": code == 0,
                "processes": json.loads(out) if code == 0 else [],
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route('/system/uptime', methods=['GET'])
    def system_uptime():
        """Get system uptime."""
        try:
            code, out = run_cmd(['pwsh', '-Command', '(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime | Select-Object Days, Hours, Minutes | ConvertTo-Json'], timeout=10)
            return jsonify({
                "success": code == 0,
                "uptime": json.loads(out) if code == 0 else out,
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    # -------------------------------------------------------------------------
    # Scheduled Tasks / Cron-like Jobs
    # -------------------------------------------------------------------------
    scheduled_jobs: dict[str, dict] = {}

    @app.route('/schedule/add', methods=['POST'])
    def schedule_add():
        """Add a scheduled job (simple interval-based for now)."""
        data = request.get_json() or {}
        name = data.get('name', 'job')
        interval_minutes = data.get('interval_minutes', 60)
        command = data.get('command', [])

        if not command:
            return jsonify({"success": False, "error": "Command required"}), 400

        job_id = f"{name}_{datetime.now().strftime('%H%M%S')}"
        scheduled_jobs[job_id] = {
            'id': job_id,
            'name': name,
            'interval_minutes': interval_minutes,
            'command': command,
            'last_run': None,
            'run_count': 0,
            'created_at': datetime.now().isoformat(),
        }

        return jsonify({
            "success": True,
            "job_id": job_id,
            "next_run": "Not implemented yet - use Windows Task Scheduler for now",
        })

    @app.route('/schedule/list', methods=['GET'])
    def schedule_list():
        """List scheduled jobs."""
        return jsonify({
            "success": True,
            "jobs": list(scheduled_jobs.values()),
        })

    # -------------------------------------------------------------------------
    # Notifications / Webhooks (Async Callbacks)
    # -------------------------------------------------------------------------
    @app.route('/notify/webhook', methods=['POST'])
    def notify_webhook():
        """Register a webhook for notifications."""
        data = request.get_json() or {}
        url = data.get('url', '')
        events = data.get('events', ['task_complete', 'deploy_complete'])

        # Store webhook config
        webhook_file = Path(os.environ.get('DEVOPS_DATA_DIR', r'C:\Cevict_Vault\devops-agent')) / 'webhooks.json'
        webhooks = json.loads(webhook_file.read_text()) if webhook_file.exists() else []
        webhooks.append({'url': url, 'events': events, 'registered': datetime.now().isoformat()})
        webhook_file.write_text(json.dumps(webhooks, indent=2))

        return jsonify({
            "success": True,
            "webhook_count": len(webhooks),
            "events": events,
        })

    def run_api():
        print(f"DevOps Agent API running on http://localhost:{API_PORT}")
        app.run(host='127.0.0.1', port=API_PORT, debug=False, threaded=True)

# =============================================================================
# Fallback: Built-in HTTP server (if Flask not available)
# =============================================================================
else:
    class APIHandler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            pass  # Suppress default logging

        def _send_json(self, data: dict, status: int = 200):
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data, indent=2).encode())

        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            params = urllib.parse.parse_qs(parsed.query)

            if path == '/health':
                self._send_json({
                    "status": "running",
                    "service": "devops-agent",
                    "version": "1.0.0 (basic)",
                    "port": API_PORT,
                    "time": datetime.now().isoformat(),
                    "note": "Install Flask for full API features",
                })
            elif path == '/git/status':
                code, branch = git("branch", "--show-current")
                code2, status = git("status", "--short")
                files = [l for l in status.strip().split("\n") if l.strip()] if status else []
                self._send_json({
                    "success": True,
                    "branch": branch if code == 0 else None,
                    "clean": len(files) == 0,
                    "changed_files": len(files),
                    "files": files,
                })
            elif path == '/cochran/status':
                try:
                    import urllib.request
                    req = urllib.request.Request(f"http://localhost:{COCHRAN_PORT}/health", method='GET')
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        body = json.loads(resp.read().decode())
                        self._send_json({"running": True, **body})
                except Exception as e:
                    self._send_json({"running": False, "error": str(e)})
            else:
                self._send_json({"error": "Not found (install Flask for full API)"}, 404)

        def do_POST(self):
            self._send_json({"error": "POST requires Flask. Install: pip install flask"}, 501)

    def run_api():
        print(f"DevOps Agent API (basic mode) on http://localhost:{API_PORT}")
        print("Install Flask for full API: pip install flask")
        server = HTTPServer(('127.0.0.1', API_PORT), APIHandler)
        server.serve_forever()


# =============================================================================
# Main entry point
# =============================================================================
if __name__ == '__main__':
    run_api()

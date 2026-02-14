import os

# Folders to ignore to keep the summary clean and small
IGNORE_DIRS = {'node_modules', '.git', 'venv', '__pycache__', 'dist', 'build', 'images', 'assets'}
# File types that help define architecture
ARCH_FILES = {'.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.html', '.css'}

def analyze_structure(startpath):
    summary = ["### PopThePopcorn Architecture Summary\n"]
    
    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * level
        summary.append(f"{indent}{os.path.basename(root)}/")
        
        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            if any(f.endswith(ext) for ext in ARCH_FILES):
                summary.append(f"{sub_indent}{f}")
                
                # Snag snippets of config files, but safely
                if f in ['package.json', 'requirements.txt', 'docker-compose.yml', 'next.config.js']:
                    try:
                        # Force utf-8 and ignore errors to prevent the crash you saw
                        with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as content:
                            lines = [content.readline().strip() for _ in range(15)]
                            summary.append(f"{sub_indent}--- Snippet: {lines}")
                    except:
                        pass

    # The fix: explicitly use utf-8 for the output file
    with open("ptp_summary.txt", "w", encoding="utf-8") as out:
        out.write("\n".join(summary))
    print("Analysis complete! Please paste the contents of 'ptp_summary.txt' in our chat.")

if __name__ == "__main__":
    # If running from C:\cevict-live but you only want the app, 
    # use "." if you are inside the app folder, or specify the path.
    analyze_structure(".")
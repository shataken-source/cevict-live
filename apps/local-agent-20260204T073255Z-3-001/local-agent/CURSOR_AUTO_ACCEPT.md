# 🎯 Cursor IDE Auto-Accept Configuration

## Quick Command

**Give this command to Local Agent:**

```
"Configure Cursor IDE to auto-accept AI suggestions and hide the accept button"
```

Or via API:
```bash
POST http://localhost:3847/cursor-settings/auto-accept
```

## What It Does

This command will:
1. ✅ Open Cursor IDE settings
2. ✅ Enable auto-accept for AI suggestions
3. ✅ Hide the accept button (or auto-press it)
4. ✅ Configure auto-apply
5. ✅ Save settings

## Settings Configured

The following settings will be added to Cursor's `settings.json`:

```json
{
  "cursor.ai.autoAccept": true,
  "cursor.ai.autoApply": true,
  "cursor.ai.showAcceptButton": false,
  "cursor.ai.autoAcceptDelay": 0,
  "cursor.ai.confirmBeforeAccept": false
}
```

## Settings File Location

**Windows:**
```
%APPDATA%\Cursor\User\settings.json
C:\Users\YourName\AppData\Roaming\Cursor\User\settings.json
```

**Linux:**
```
~/.config/Cursor/User/settings.json
```

**macOS:**
```
~/Library/Application Support/Cursor/User/settings.json
```

## Commands Available

### 1. Auto-Accept (Recommended)
```bash
POST http://localhost:3847/cursor-settings/auto-accept
```

Or tell Local Agent:
```
"Configure Cursor to auto-accept suggestions"
```

### 2. Disable Accept Button
```bash
POST http://localhost:3847/cursor-settings/disable-button
```

Or tell Local Agent:
```
"Hide the accept button in Cursor IDE"
```

### 3. Check Current Settings
```bash
GET http://localhost:3847/cursor-settings/current
```

### 4. Reset to Default
```bash
POST http://localhost:3847/cursor-settings/reset
```

Or tell Local Agent:
```
"Reset Cursor settings to default"
```

## After Configuration

1. **Restart Cursor IDE** - Settings take effect after restart
2. **Test it** - AI suggestions should auto-apply
3. **No more accept button** - Suggestions apply automatically

## Manual Configuration (If Needed)

If the automatic configuration doesn't work:

1. Open Cursor IDE
2. Press `Ctrl+,` (or `Cmd+,` on Mac) to open Settings
3. Search for "auto accept" or "cursor ai"
4. Enable:
   - `cursor.ai.autoAccept`
   - `cursor.ai.autoApply`
   - Set `cursor.ai.showAcceptButton` to `false`

## Troubleshooting

### Settings file not found
- Make sure Cursor IDE is installed
- Run Cursor IDE at least once to create settings file
- Check the path matches your OS

### Settings not applying
- Restart Cursor IDE
- Check if settings file was created
- Verify JSON syntax is valid

### Still seeing accept button
- Some Cursor versions may use different setting names
- Check Cursor version and update settings accordingly
- Try manual configuration

---

**Now you can give Local Agent the command and it will configure Cursor IDE automatically!** 🎯✨


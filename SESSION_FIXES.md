# Session & State Management Fixes

## Issues Fixed

### 1. Conversation History Not Persisting on Reload ✅

**Problem**: When disconnecting/reconnecting or reloading the app, conversation history was lost.

**Root Cause**: While backend session was restored, the frontend wasn't saving/restoring the conversation UI state to/from localStorage.

**Solution**:
- Updated `saveTabData()` to extract and save all conversation messages from the DOM to localStorage
- Updated `restoreTabData()` to restore conversation messages back to the UI from localStorage
- Added filtering to skip loading/temporary messages (those with 🔄 or "Executing")
- Conversation history now persists across page reloads for up to 24 hours

**Files Modified**:
- `web/index.html`: Enhanced saveTabData() and restoreTabData() functions

### 2. "Generate CV" Showing Error Despite Success ✅

**Problem**: Clicking "Generate CV" displayed "CV generated successfully!" in conversation but showed error in preview: "❌ Please approve customizations first"

**Root Cause**: 
- Frontend stored customizations in `window.pendingRecommendations` 
- Backend checked `state['customizations']` before generating CV
- User decisions from table review were stored in `state['experience_decisions']` and `state['skill_decisions']`
- These weren't being recognized as valid customizations

**Solution**:
- Updated backend `generate_cv` action to:
  1. Check for customizations OR user decisions
  2. If decisions exist but no customizations, auto-generate customizations and apply user overrides
  3. Handle emphasized/included/de-emphasized/excluded items appropriately
- Enhanced error message to be more specific: "Please generate customizations first (click 'Recommend Customizations')"

**Files Modified**:
- `scripts/utils/conversation_manager.py`: Enhanced generate_cv logic (lines 318-368)
- `web/index.html`: Updated generate button to acknowledge review decisions

### 3. Session File Location Clarification ✅

**Problem**: User uncertain where session files were being saved - config shows `~/CV/files/sessions` but sessions have old dates.

**Investigation Results**:
- Sessions ARE being saved to correct location: `~/CV/files/sessions/`
- Structure: `~/CV/files/sessions/{position_name}/session_{timestamp}/session.json`
- Old sessions from Jan 6 are from previous runs
- No sessions yet for current position (data_science_lead) because none have been saved yet
- Sessions are auto-created when position_name is set and state changes

**How It Works**:
1. When job file loaded: position_name extracted (e.g., "data_science_lead")
2. Session directory created: `~/CV/files/sessions/data_science_lead/session_20260115_HHMMSS/`
3. Session auto-saved on state changes (after each action)
4. On server restart: loads most recent session for that position

**To Verify**:
```bash
# Check all sessions
ls -la ~/CV/files/sessions/

# Check sessions for specific position
ls -la ~/CV/files/sessions/data_science_lead*/

# View latest session
cat ~/CV/files/sessions/data_science_lead*/session_*/session.json | jq .
```

## Technical Details

### Session Storage Hierarchy

```
~/CV/files/sessions/
├── data_science_lead/
│   ├── session_20260115_143022/
│   │   └── session.json
│   └── session_20260115_151500/
│       └── session.json
├── jackson_lab_ai_ml/
│   └── session_20260115_160000/
│       └── session.json
└── session_20260106_205316/  # Old sessions before position naming
    └── session.json
```

### Session JSON Structure

```json
{
  "timestamp": "2026-01-15T14:30:22.123456",
  "state": {
    "phase": "generation",
    "position_name": "data_science_lead",
    "job_description": "...",
    "job_analysis": {...},
    "customizations": {...},
    "experience_decisions": {
      "exp_001": "emphasize",
      "exp_002": "include",
      "exp_003": "exclude"
    },
    "skill_decisions": {
      "Python": "emphasize",
      "JavaScript": "include"
    },
    "generated_files": null
  },
  "conversation_history": [
    {"role": "user", "content": "analyze job"},
    {"role": "assistant", "content": "..."}
  ]
}
```

### LocalStorage Structure

Stored in browser's localStorage with key `cv-builder-tab-data`:

```json
{
  "tabData": {
    "job": null,
    "analysis": {...},
    "customizations": {...},
    "cv": {...}
  },
  "currentTab": "cv",
  "pendingRecommendations": {...},
  "interactiveState": {...},
  "conversationHistory": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "timestamp": 1705334422000
}
```

## Testing Checklist

- [x] Backend saves sessions to correct location
- [x] Position name extracted from job filename
- [x] Session directory created with position name
- [x] Conversation saved to localStorage
- [x] Conversation restored from localStorage on reload
- [x] Generate CV works with table review decisions
- [x] Generate CV works with customizations
- [x] Generate CV shows proper error if neither exist
- [x] Session auto-loads on server restart
- [x] Config paths honored (~/CV/files/sessions, ~/CV/logs)

## User Workflow

1. **Load Job Description** → position_name set to "data_science_lead"
2. **Analyze Job** → Session created at `~/CV/files/sessions/data_science_lead/session_{timestamp}/`
3. **Generate Customizations** → state['customizations'] saved
4. **Review with Tables** → state['experience_decisions'] and state['skill_decisions'] saved
5. **Generate CV** → Uses decisions to create CV
6. **Reload Page** → Conversation restored from localStorage
7. **Restart Server** → Session restored from JSON file

## Configuration Reference

From `config.yaml`:

```yaml
session:
  auto_save: true
  session_dir: "~/CV/files/sessions"  # Sessions saved here
  history_file: "~/CV/files/input_history"  # Command history

logging:
  log_dir: "~/CV/logs"  # Application logs
```

All paths support ~ expansion and are properly resolved to absolute paths.

## Next Steps

1. ✅ Conversation history persists across reloads
2. ✅ CV generation works with review decisions
3. ✅ Session files saved to correct location
4. 🔄 Test full workflow: analyze → review → generate → reload → verify all state restored
5. 🔄 Add session list view in UI to browse previous sessions
6. 🔄 Add "export session" feature to download session JSON
7. 🔄 Add session comparison feature (diff two sessions)

## Known Limitations

1. LocalStorage limited to 24 hours - older data automatically cleared
2. LocalStorage limited to ~5-10MB depending on browser
3. Backend session files grow unbounded - consider adding cleanup cron
4. No session encryption - sensitive data stored in plain text
5. No concurrent session handling - overwrites on each save

## Debugging Commands

```bash
# View all positions with sessions
ls ~/CV/files/sessions/

# Count sessions per position
find ~/CV/files/sessions -name "session.json" | xargs dirname | xargs dirname | sort | uniq -c

# View latest session for position
cat ~/CV/files/sessions/data_science_lead/$(ls -t ~/CV/files/sessions/data_science_lead/ | head -1)/session.json | jq .

# Check localStorage in browser console
localStorage.getItem('cv-builder-tab-data')

# Clear old sessions (older than 30 days)
find ~/CV/files/sessions -name "session.json" -mtime +30 -delete
```

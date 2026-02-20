# Table-Based Review UI Implementation

## Overview
Replaced the conversational one-at-a-time review with a professional DataTables-based interface that displays all experiences and skills in interactive tables with action buttons.

## Changes Made

### Frontend (web/index.html)

#### 1. Added Dependencies
- jQuery 3.7.1 CDN (prerequisite for DataTables)
- DataTables 1.13.7 CDN (CSS and JS)

#### 2. Added CSS Styles
- `.review-section`: Container for each table section
- `.review-table`: DataTable styling
- `.action-btns`: Button container styling
- `.icon-btn`: Action button styling with hover effects
- `.confidence-badge`: Color-coded badges (high=green, medium=yellow, low=red)
- `.nav-buttons`: Navigation button container
- `.submit-btn`: Blue submit button styling
- `.back-btn`: Gray back button styling

#### 3. New Functions

**`showTableBasedReview()`**
- Replaces conversational review
- Hides conversation UI, shows table view
- Calls both table builders

**`createReviewSection()`**
- Creates HTML structure for review tables
- Includes submit buttons and navigation
- Inserts after conversation div

**`buildExperienceReviewTable()`**
- Fetches all experience IDs from backend
- Gets details for each experience
- Creates DataTable with columns:
  - Experience (title, company, duration)
  - Recommendation (badge with confidence)
  - Actions (4 icon buttons)
- Initializes DataTable with sorting, pagination, filtering

**`buildSkillsReviewTable()`**
- Creates DataTable for recommended skills
- Similar structure to experience table
- Includes same action buttons

**`handleActionClick(itemId, action, type)`**
- Handles button clicks
- Implements radio button behavior (only one action per row)
- Stores user selections in `userSelections` object
- Visual feedback with 'active' class (blue highlight)

**`submitExperienceDecisions()`**
- Collects all experience decisions
- POSTs to `/api/review-decisions`
- Shows success/error feedback

**`submitSkillDecisions()`**
- Collects all skill decisions
- POSTs to `/api/review-decisions`
- Returns to conversation when both submitted
- Shows success/error feedback

**`backToConversation()`**
- Hides table view
- Shows conversation UI
- Allows user to return to chat

#### 4. Updated Triggers
- `'review recommendations'` command → calls `showTableBasedReview()`
- `'proceed'` command → calls `showTableBasedReview()` when recommendations exist

### Backend (scripts/web_app.py)

#### 1. New Endpoint: `/api/review-decisions`
- Accepts POST with `{type: 'experiences'|'skills', decisions: {...}}`
- Stores decisions in conversation state:
  - `state['experience_decisions']` for experiences
  - `state['skill_decisions']` for skills
- Saves session automatically
- Returns success message with count

## User Interaction Flow

1. **Analyze Job** → User uploads/pastes job description
2. **Generate Customizations** → LLM analyzes and recommends experiences/skills
3. **Review Tables** → User types `proceed` or `review`
   - Tables appear with all experiences and skills
   - User clicks action buttons for each item:
     - ⬆️ **Emphasize**: Highlight prominently in CV
     - ✓ **Include**: Include normally
     - ⬇️ **De-emphasize**: Mention briefly
     - ✗ **Exclude**: Remove from CV
4. **Submit Decisions** → Click submit buttons to save
5. **Generate CV** → Decisions are applied to final document

## Action Button Icons & Meanings

| Icon | Action | Meaning |
|------|--------|---------|
| ⬆️ | Emphasize | Feature prominently, add detail |
| ✓ | Include | Include with normal emphasis |
| ⬇️ | De-emphasize | Mention briefly, reduce detail |
| ✗ | Exclude | Remove completely from CV |

## DataTables Features

- **Sorting**: Click column headers to sort
- **Pagination**: 10 items per page (configurable)
- **Filtering**: Search box to filter by any text
- **Responsive**: Adapts to screen size

## Technical Details

### Data Structure
```javascript
userSelections = {
  experiences: {
    'exp_001': 'emphasize',
    'exp_002': 'include',
    'exp_003': 'exclude'
  },
  skills: {
    'Python': 'emphasize',
    'JavaScript': 'include'
  }
}
```

### API Payload
```json
{
  "type": "experiences",
  "decisions": {
    "exp_001": "emphasize",
    "exp_002": "include",
    "exp_003": "exclude"
  }
}
```

### Backend Storage
Decisions stored in `conversation.state`:
- `state['experience_decisions']`
- `state['skill_decisions']`

These are persisted in session JSON files.

## Benefits Over Conversational Review

1. **Efficiency**: See all items at once instead of one-at-a-time
2. **Overview**: Compare experiences side-by-side
3. **Flexibility**: Filter and sort to find specific items
4. **Speed**: Make all decisions then submit once
5. **Visibility**: Clear visual feedback on selections
6. **Navigation**: Easy to go back and change decisions

## Next Steps

1. **CV Generation Integration**: Use stored decisions when generating CV
   - Emphasize: Expand details, add more achievements
   - Include: Normal treatment
   - De-emphasize: Reduce to one-liner
   - Exclude: Skip completely

2. **Enhanced Tooltips**: Add more detailed help text

3. **Bulk Actions**: Add "select all recommended" buttons

4. **Preview**: Show CV preview with decisions applied

5. **Export Decisions**: Allow downloading decisions as JSON

## Testing

1. Start server: `python scripts/web_app.py --job-file sample_jobs/data_science_lead.txt --port 3012`
2. Open browser: `http://127.0.0.1:3012`
3. Analyze job description
4. Generate customizations
5. Type `proceed` to see tables
6. Click action buttons
7. Submit decisions
8. Check console for saved data

## Files Modified

- `web/index.html`: Added 300+ lines for table UI
- `scripts/web_app.py`: Added `/api/review-decisions` endpoint

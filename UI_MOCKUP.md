# CV Generator Web UI Redesign Mockup

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            LLM-Driven CV Generator — Web UI                            │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Position: Jackson Lab AI/ML                                        📁 Open File        │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│  📋 Job Loaded  →  🔍 Analysis  →  ⚙️ Customizations  →  📄 Generated  →  ✅ Complete  │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┬───────────────────────────────────────────────────┐
│          INTERACTION AREA           │                VIEWER AREA                        │
│                                     │                                                   │
│ ┌─────────────────────────────────┐ │ ┌───────────────────────────────────────────────┐ │
│ │        Conversation             │ │ │ [Job Description] [Analysis] [Customizations] │ │
│ │                                 │ │ │ [Generated CV] [Download]                     │ │
│ │ System: Position set to...      │ │ └───────────────────────────────────────────────┘ │
│ │                                 │ │                                                   │
│ │ User: Analyze job               │ │ ┌───────────────────────────────────────────────┐ │
│ │                                 │ │ │                                               │ │
│ │ AI: 📋 Job Analysis Complete    │ │ │         DOCUMENT VIEWER                       │ │
│ │     🎯 Required Skills:         │ │ │                                               │ │
│ │     • Python                    │ │ │     [Current tab content displayed            │ │
│ │     • Deep learning             │ │ │      in standard document format]             │ │
│ │     ✅ Must-Have Requirements:  │ │ │                                               │ │
│ │     • Ph.D. in relevant field   │ │ │     - Job description full text               │ │
│ │     ⭐ Preferred Skills:        │ │ │     - Analysis results formatted              │ │
│ │     • R programming             │ │ │     - Customizations list                     │ │
│ │                                 │ │ │     - Generated CV preview                    │ │
│ │                                 │ │ │                                               │ │
│ │                                 │ │ │                                               │ │
│ │                                 │ │ │                                               │ │
│ │                                 │ │ │                                               │ │
│ │                                 │ │ │          (Standard page size)                 │ │
│ │                                 │ │ │                                               │ │
│ └─────────────────────────────────┘ │ │                                               │ │
│                                     │ │                                               │ │
│ ┌─────────────────────────────────┐ │ │                                               │ │
│ │ Type message (e.g. "generate")  │ │ │                                               │ │
│ └─────────────────────────────────┘ │ │                                               │ │
│                                     │ │                                               │ │
│ [Analyze Job] [Recommend] [Generate]│ │                                               │ │
│ [Save Session] [Reset]              │ │                                               │ │
│                                     │ └───────────────────────────────────────────────┘ │
└─────────────────────────────────────┴───────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                               📁 FILE BROWSER MODAL                        │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │  Recent Sessions:                                                      │ │
│ │  • Jackson Lab AI/ML (2026-01-14)                                      │ │
│ │  • BioTech Innovations Senior Data Scientist (2026-01-07)              │ │
│ │                                                                        │ │
│ │  Available Job Files:                                                  │ │
│ │  • jackson_lab_associate_computational_scientist_2026-01-14.txt        │ │
│ │  • data_science_lead.txt                                               │ │
│ │                                                                        │ │
│ │                                               [Cancel] [Open Selected] │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

## Design Elements

### 1. **Header Bar**
- Clean title bar with application name
- Consistent branding across the top

### 2. **Position Bar** 
- Large, prominent display of current position name
- **📁 Open File** button on the right to access file browser modal
- Acts as the main title/context for the current session

### 3. **Workflow Steps**
- Horizontal progress indicator showing current phase in the process
- Visual feedback of where the user is in the CV generation workflow
- Steps: Job Loaded → Analysis → Customizations → Generated → Complete

### 4. **Split Layout (40% / 60%)**

#### **Left Panel - Interaction Area (40%)**
- **Conversation Window**: Scrollable chat interface
  - Clear visual distinction between User, AI, and System messages
  - Formatted AI responses (not raw JSON)
  - Loading indicators during processing
- **Message Input**: Single-line prompt field
- **Action Buttons**: Primary actions below the input field
  - Analyze Job, Recommend, Generate, Save Session, Reset

#### **Right Panel - Viewer Area (60%)**
- **Tab Navigation**: Switch between different document types
  - Job Description, Analysis, Customizations, Generated CV, Download
- **Document Viewer**: 
  - Sized for standard page viewing (8.5" x 11" aspect ratio)
  - Clean, readable formatting
  - Scrollable for long documents
  - Print-ready preview of generated CVs

### 5. **File Browser Modal**
- **Recent Sessions**: Quick access to previous work
- **Available Job Files**: Browse job description files
- **Actions**: Cancel or Open Selected

## Key Improvements

1. **Better Information Architecture**: Clear separation of interaction vs. content viewing
2. **Document-Centric**: Right panel prioritizes document viewing and generation
3. **Professional Layout**: Suitable for business/professional CV generation
4. **Improved UX**: 
   - No raw JSON displayed to users
   - Loading indicators
   - Clear progress tracking
   - Easy file management
5. **Scalable Design**: Can easily add more tabs and document types
6. **Mobile-Friendly Foundation**: Responsive design principles applied

## Implementation Notes

- Conversation area keeps the full job description out of the chat (only shows placeholder)
- Document viewer displays full job description in a readable format when needed
- Tabs allow quick switching between different stages of the CV generation process
- File browser provides easy access to previous sessions and job files
- Standard document sizing ensures generated CVs are properly formatted for printing/PDF
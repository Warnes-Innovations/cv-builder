// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

/**
 * web/master-cv.js
 * Master CV management tab: fetch, render, and CRUD for personal info,
 * experiences, skills, education, awards, achievements, summaries.
 *
 * Dependencies (resolved through globalThis at runtime):
 *   escapeHtml, showToast, showAlertModal, confirmDialog,
 *   appendLoadingMessage, removeLoadingMessage,
 *   setLoading, switchTab, appendMessage
 */

let _masterChangeNotice = '';

function _setMasterChangeNotice(section, action) {
  const cleanSection = String(section || 'Master CV').trim();
  const cleanAction = String(action || 'updated').trim();
  _masterChangeNotice = `${cleanSection} ${cleanAction}.`;
}

function _renderMasterChangeNotice() {
  if (!_masterChangeNotice) return '';
  return `
    <div style="margin:12px 0 18px;padding:10px 12px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:8px;color:#14532d;">
      <strong>Last saved change:</strong> ${escapeHtml(_masterChangeNotice)}
    </div>
  `;
}

async function populateMasterTab() {
  const content = document.getElementById('document-content');
  content.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p style="margin-top:12px;color:#64748b;">Loading master CV data…</p></div>';

  let overview = {};
  let fullData  = {};

  try {
    const [ovRes, fdRes] = await Promise.all([
      fetch('/api/master-data/overview'),
      fetch('/api/master-data/full'),
    ]);
    overview = (await ovRes.json()) || {};
    fullData  = (await fdRes.json()) || {};
  } catch (err) {
    content.innerHTML = '<p style="color:#ef4444;padding:20px;">Failed to load master CV data.</p>';
    return;
  }

  const personalInfo = fullData.personal_info || {};
  const experiences  = fullData.experience || [];
  window._masterExperienceOptions = experiences
    .map((exp) => ({
      id: exp.id || '',
      label: `${exp.title || 'Role'} @ ${exp.company || 'Company'}`,
    }))
    .filter((x) => x.id);
  const skills       = fullData.skills || [];
  const education    = fullData.education || [];
  const awards       = fullData.awards || [];
  const achievements = fullData.selected_achievements || [];
  const summaries    = fullData.professional_summaries || {};

  content.innerHTML = `
    <h1>📚 Master CV Profile</h1>
    <p style="color:#6b7280;margin-bottom:20px;">
      This is your persistent master CV profile. Changes here update
      <code>Master_CV_Data.json</code> directly and persist across all sessions.
    </p>

    ${_renderMasterChangeNotice()}

    <!-- Profile overview card -->
    <div class="master-profile-card">
      <div class="master-profile-name">${escapeHtml(overview.name || 'Your Profile')}</div>
      ${overview.headline ? `<div class="master-profile-headline">${escapeHtml(overview.headline)}</div>` : ''}
      ${overview.email    ? `<div class="master-profile-email">✉️ ${escapeHtml(overview.email)}</div>` : ''}
      <div class="master-stats">
        <div class="master-stat"><span class="master-stat-value">${overview.experience_count ?? '—'}</span><span class="master-stat-label">Experiences</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.skill_count ?? '—'}</span><span class="master-stat-label">Skills</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.achievement_count ?? '—'}</span><span class="master-stat-label">Achievements</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.summary_count ?? '—'}</span><span class="master-stat-label">Summaries</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.education_count ?? '—'}</span><span class="master-stat-label">Education</span></div>
        <div class="master-stat"><span class="master-stat-value">${overview.publication_count ?? '—'}</span><span class="master-stat-label">Publications</span></div>
      </div>
    </div>

    <!-- Personal Info section -->
    <div class="master-section">
      <div class="master-section-header">
        <h2>👤 Personal Information</h2>
        <button class="action-btn" onclick="showEditPersonalInfoModal()" aria-label="Edit personal information">
          ✏️ Edit
        </button>
      </div>
      <div id="master-personal-info-container">
        ${_renderPersonalInfoCard(personalInfo)}
      </div>
    </div>

    <!-- Experiences section -->
    <div class="master-section">
      <div class="master-section-header">
        <h2>💼 Work Experience</h2>
        <button class="action-btn" onclick="showAddExperienceModal()" aria-label="Add new work experience">
          + Add Experience
        </button>
      </div>
      <div id="master-experiences-container">
        ${_renderExperiencesList(experiences)}
      </div>
    </div>

    <!-- Skills section -->
    <div class="master-section">
      <div class="master-section-header">
        <h2>🛠️ Skills</h2>
        ${Array.isArray(skills) ? `<button class="action-btn" onclick="showAddSkillModal('', true)" aria-label="Add new skill">+ Add Skill</button>` : ''}
      </div>
      <div id="master-skills-container">
        ${_renderSkillsSection(skills)}
      </div>
    </div>

    <!-- Education section -->
    <div class="master-section">
      <div class="master-section-header">
        <h2>🎓 Education</h2>
        <button class="action-btn" onclick="showAddEducationModal()" aria-label="Add education entry">
          + Add Education
        </button>
      </div>
      <div id="master-education-container">
        ${_renderEducationList(education)}
      </div>
    </div>

    <!-- Publications section -->
    <div class="master-section" id="master-publications-section">
      <div class="master-section-header">
        <h2>📖 Publications</h2>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="action-btn secondary" id="master-pub-import-btn"
              onclick="showImportPublicationsModal()"
              aria-label="Import BibTeX publications">
            ⬆️ Import BibTeX
          </button>
          <button class="action-btn secondary" id="master-pub-convert-btn"
              onclick="showConvertPublicationsModal()"
              aria-label="Convert citation text to BibTeX">
            🪄 Convert Text
          </button>
          <button class="action-btn secondary" id="master-pub-toggle-btn"
              onclick="togglePublicationsView()"
              aria-label="Toggle between structured CRUD view and raw BibTeX editor">
            ✏️ Raw BibTeX
          </button>
          <button class="action-btn" id="master-pub-add-btn"
              onclick="showAddPublicationModal()"
              aria-label="Add publication">
            + Add Publication
          </button>
        </div>
      </div>
      <!-- CRUD structured view (default) -->
      <div id="master-pub-crud-view">
        <div id="master-pub-crud-container">
          <p style="color:#6b7280;padding:12px 0;">Loading publications…</p>
        </div>
      </div>
      <!-- Raw BibTeX editor (hidden by default) -->
      <div id="master-pub-raw-view" style="display:none;">
        <p style="color:#6b7280;font-size:0.9em;margin-bottom:10px;">
          Edit your BibTeX bibliography file directly. Changes are saved to
          <code>publications.bib</code> and a timestamped backup is created
          automatically. Content is validated before writing.
        </p>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span id="master-pub-count" style="color:#6b7280;font-size:0.9em;"></span>
          <span style="flex:1;"></span>
          <button class="action-btn secondary" onclick="validatePublicationsBib()"
              aria-label="Validate BibTeX without saving">🔍 Validate</button>
          <button class="action-btn secondary" onclick="loadPublicationsBib()"
              aria-label="Reload publications.bib from disk">🔄 Reload</button>
          <button class="action-btn primary" id="master-pub-save-btn"
              onclick="savePublicationsBib()"
              aria-label="Save BibTeX to disk">💾 Save</button>
        </div>
        <textarea id="master-pub-textarea"
          class="edit-input"
          rows="20"
          style="width:100%;font-family:monospace;font-size:0.85em;resize:vertical;"
          placeholder="Loading…"
          aria-label="BibTeX bibliography content"
          spellcheck="false"
        ></textarea>
        <div id="master-pub-status"
            style="margin-top:6px;font-size:0.85em;color:#6b7280;"
            aria-live="polite"></div>
      </div>
    </div>

    <!-- Awards section -->
    <div class="master-section">
      <div class="master-section-header">
        <h2>🏅 Awards &amp; Honours</h2>
        <button class="action-btn" onclick="showAddAwardModal()" aria-label="Add award">
          + Add Award
        </button>
      </div>
      <div id="master-awards-container">
        ${_renderAwardsList(awards)}
      </div>
    </div>

    <!-- Selected Achievements section -->
    <div class="master-section">
      <div class="master-section-header">
        <h2>🏆 Selected Achievements</h2>
        <button class="action-btn" onclick="showAddAchievementModal()" aria-label="Add new achievement to master CV">
          + Add Achievement
        </button>
      </div>
      <p style="color:#6b7280;font-size:0.9em;margin-bottom:12px;">
        These are cross-role highlights shown in the Achievements review during customisation.
        The Harvest feature (Finalise tab) can add new ones from your current session.
      </p>
      <div id="master-achievements-container">
        ${_renderMasterAchievementsTable(achievements)}
      </div>
    </div>

    <!-- Professional Summaries section -->
    <div class="master-section">
      <div class="master-section-header">
        <h2>📝 Professional Summaries</h2>
        <button class="action-btn" onclick="showAddSummaryModal()" aria-label="Add new professional summary variant">
          + Add Summary
        </button>
      </div>
      <p style="color:#6b7280;font-size:0.9em;margin-bottom:12px;">
        Named summary variants let you tailor your professional statement for different role types
        without regenerating from scratch. The AI will recommend the most relevant variant
        during the Summary Focus step.
      </p>
      <div id="master-summaries-container">
        ${_renderSummariesList(summaries)}
      </div>
    </div>

    <!-- Publication add/edit modal -->
    <div id="master-pub-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-pub-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closePublicationModal()">
      <div class="modal" style="max-width:580px;">
        <div class="modal-header">
          <h2 id="master-pub-modal-title-heading" id="pub-modal-title-heading">Add Publication</h2>
          <button onclick="closePublicationModal()" aria-label="Close publication editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="margin-bottom:12px;">
            <label for="pub-modal-key" style="display:block;font-weight:600;margin-bottom:4px;">Cite Key <span aria-hidden="true">*</span></label>
            <input type="text" id="pub-modal-key" class="edit-input" style="width:100%;" aria-required="true"
                placeholder="e.g. smith2024ml" />
          </div>
          <div style="margin-bottom:12px;">
            <label for="pub-modal-type" style="display:block;font-weight:600;margin-bottom:4px;">Entry Type <span aria-hidden="true">*</span></label>
            <select id="pub-modal-type" class="edit-input" style="width:100%;">
              <option value="article">article</option>
              <option value="inproceedings">inproceedings</option>
              <option value="book">book</option>
              <option value="incollection">incollection</option>
              <option value="techreport">techreport</option>
              <option value="phdthesis">phdthesis</option>
              <option value="mastersthesis">mastersthesis</option>
              <option value="misc">misc</option>
            </select>
          </div>
          <div style="margin-bottom:12px;">
            <label for="pub-modal-author" style="display:block;font-weight:600;margin-bottom:4px;">Author / Editor <span aria-hidden="true">*</span></label>
            <input type="text" id="pub-modal-author" class="edit-input" style="width:100%;"
                placeholder="Last, First and Last2, First2" />
          </div>
          <div style="margin-bottom:12px;">
            <label for="pub-modal-title" style="display:block;font-weight:600;margin-bottom:4px;">Title <span aria-hidden="true">*</span></label>
            <input type="text" id="pub-modal-title" class="edit-input" style="width:100%;" aria-required="true" />
          </div>
          <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="flex:0 0 100px;">
              <label for="pub-modal-year" style="display:block;font-weight:600;margin-bottom:4px;">Year <span aria-hidden="true">*</span></label>
              <input type="number" id="pub-modal-year" class="edit-input" style="width:100px;"
                  min="1900" max="2100" aria-required="true" />
            </div>
            <div style="flex:1;">
              <label for="pub-modal-journal" style="display:block;font-weight:600;margin-bottom:4px;">Journal / Booktitle</label>
              <input type="text" id="pub-modal-journal" class="edit-input" style="width:100%;" />
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <label for="pub-modal-doi" style="display:block;font-weight:600;margin-bottom:4px;">DOI / URL</label>
            <input type="text" id="pub-modal-doi" class="edit-input" style="width:100%;"
                placeholder="10.xxxx/xxxxx" />
          </div>
          <div style="margin-bottom:4px;">
            <label for="pub-modal-extra" style="display:block;font-weight:600;margin-bottom:4px;">Extra fields <span style="font-weight:400;color:#6b7280;">(key=value, one per line)</span></label>
            <textarea id="pub-modal-extra" class="edit-input" rows="3" style="width:100%;resize:vertical;font-family:monospace;font-size:0.85em;"
                placeholder="volume=12&#10;pages=1--20"></textarea>
          </div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;padding:16px 20px;">
          <button class="action-btn" onclick="closePublicationModal()">Cancel</button>
          <button class="action-btn primary" onclick="saveMasterPublication()">Save</button>
        </div>
      </div>
    </div>

    <div id="master-pub-import-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-pub-import-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeImportPublicationsModal()">
      <div class="modal" style="max-width:680px;">
        <div class="modal-header">
          <h2 id="master-pub-import-modal-title">Import BibTeX Publications</h2>
          <button onclick="closeImportPublicationsModal()" aria-label="Close BibTeX import dialog"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <p style="color:#6b7280;font-size:0.9em;margin:0 0 12px;">
            Paste one or more BibTeX entries to merge them into <code>publications.bib</code>.
          </p>
          <textarea id="master-pub-import-textarea"
              class="edit-input"
              rows="12"
              style="width:100%;font-family:monospace;font-size:0.85em;resize:vertical;"
              placeholder="@article{smith2025,...}"
              aria-label="BibTeX import content"
              spellcheck="false"></textarea>
          <label style="display:flex;align-items:center;gap:8px;margin-top:12px;color:#334155;">
            <input type="checkbox" id="master-pub-import-overwrite" />
            Overwrite existing entries when cite keys already exist
          </label>
          <div id="master-pub-import-status"
              style="margin-top:10px;font-size:0.85em;color:#6b7280;"
              aria-live="polite"></div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;padding:16px 20px;">
          <button class="action-btn" onclick="closeImportPublicationsModal()">Cancel</button>
          <button class="action-btn primary" id="master-pub-import-submit-btn"
              onclick="importPublicationsBib()">Import</button>
        </div>
      </div>
    </div>

    <div id="master-pub-convert-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-pub-convert-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeConvertPublicationsModal()">
      <div class="modal" style="max-width:760px;">
        <div class="modal-header">
          <h2 id="master-pub-convert-modal-title">Convert Citation Text to BibTeX</h2>
          <button onclick="closeConvertPublicationsModal()" aria-label="Close citation conversion dialog"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <p style="color:#6b7280;font-size:0.9em;margin:0 0 12px;">
            Paste free-form citation text, review the generated BibTeX, then import it when it looks correct.
          </p>
          <div style="display:grid;grid-template-columns:1fr;gap:14px;">
            <div>
              <label for="master-pub-convert-input" style="display:block;font-weight:600;margin-bottom:4px;">Citation Text</label>
              <textarea id="master-pub-convert-input"
                  class="edit-input"
                  rows="7"
                  style="width:100%;resize:vertical;"
                  placeholder="Doe, J. (2025). Article title. Journal Name, 12(3), 1-10."
                  aria-label="Citation text to convert"></textarea>
            </div>
            <div>
              <label for="master-pub-convert-output" style="display:block;font-weight:600;margin-bottom:4px;">Generated BibTeX Preview</label>
              <textarea id="master-pub-convert-output"
                  class="edit-input"
                  rows="10"
                  style="width:100%;font-family:monospace;font-size:0.85em;resize:vertical;"
                  placeholder="Converted BibTeX will appear here"
                  aria-label="Generated BibTeX preview"
                  spellcheck="false"></textarea>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-top:12px;color:#334155;">
            <input type="checkbox" id="master-pub-convert-overwrite" />
            Overwrite existing entries when importing the generated BibTeX
          </label>
          <div id="master-pub-convert-status"
              style="margin-top:10px;font-size:0.85em;color:#6b7280;"
              aria-live="polite"></div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;padding:16px 20px;">
          <button class="action-btn" onclick="closeConvertPublicationsModal()">Close</button>
          <button class="action-btn secondary" id="master-pub-convert-submit-btn"
              onclick="convertPublicationText()">Generate BibTeX</button>
          <button class="action-btn primary" id="master-pub-convert-import-btn"
              onclick="importConvertedPublicationText()">Import Preview</button>
        </div>
      </div>
    </div>

    <!-- Personal Info modal -->
    <div id="master-pi-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-pi-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closePersonalInfoModal()">
      <div class="modal" style="max-width:620px;">
        <div class="modal-header">
          <h2 id="master-pi-modal-title">Edit Personal Information</h2>
          <button onclick="closePersonalInfoModal()" aria-label="Close personal info editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div style="grid-column:1/-1;">
              <label for="pi-name-input" style="display:block;font-weight:600;margin-bottom:4px;">Full Name</label>
              <input type="text" id="pi-name-input" class="edit-input" style="width:100%;" placeholder="e.g. Jane Smith, Ph.D." />
            </div>
            <div style="grid-column:1/-1;">
              <label for="pi-title-input" style="display:block;font-weight:600;margin-bottom:4px;">Professional Title / Headline</label>
              <input type="text" id="pi-title-input" class="edit-input" style="width:100%;" placeholder="e.g. Senior Data Scientist" />
            </div>
            <div>
              <label for="pi-email-input" style="display:block;font-weight:600;margin-bottom:4px;">Email</label>
              <input type="email" id="pi-email-input" class="edit-input" style="width:100%;" placeholder="you@example.com" />
            </div>
            <div>
              <label for="pi-phone-input" style="display:block;font-weight:600;margin-bottom:4px;">Phone</label>
              <input type="tel" id="pi-phone-input" class="edit-input" style="width:100%;" placeholder="555-123-4567" />
            </div>
            <div>
              <label for="pi-linkedin-input" style="display:block;font-weight:600;margin-bottom:4px;">LinkedIn URL</label>
              <input type="url" id="pi-linkedin-input" class="edit-input" style="width:100%;" placeholder="https://linkedin.com/in/you" />
            </div>
            <div>
              <label for="pi-website-input" style="display:block;font-weight:600;margin-bottom:4px;">Website</label>
              <input type="url" id="pi-website-input" class="edit-input" style="width:100%;" placeholder="https://yoursite.com" />
            </div>
            <div>
              <label for="pi-city-input" style="display:block;font-weight:600;margin-bottom:4px;">City</label>
              <input type="text" id="pi-city-input" class="edit-input" style="width:100%;" placeholder="Rochester" />
            </div>
            <div>
              <label for="pi-state-input" style="display:block;font-weight:600;margin-bottom:4px;">State / Region</label>
              <input type="text" id="pi-state-input" class="edit-input" style="width:100%;" placeholder="NY" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" onclick="closePersonalInfoModal()">Cancel</button>
          <button class="action-btn primary" onclick="savePersonalInfo()">Save</button>
        </div>
      </div>
    </div>

    <!-- Experience modal -->
    <div id="master-exp-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-exp-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeExperienceModal()">
      <div class="modal" style="max-width:640px;">
        <div class="modal-header">
          <h2 id="master-exp-modal-title">Work Experience</h2>
          <button onclick="closeExperienceModal()" aria-label="Close experience editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <input type="hidden" id="exp-modal-id" />
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div style="grid-column:1/-1;">
              <label for="exp-title-input" style="display:block;font-weight:600;margin-bottom:4px;">Job Title <span aria-hidden="true">*</span></label>
              <input type="text" id="exp-title-input" class="edit-input" style="width:100%;" aria-required="true"
                  placeholder="e.g. Senior Data Scientist" />
            </div>
            <div style="grid-column:1/-1;">
              <label for="exp-company-input" style="display:block;font-weight:600;margin-bottom:4px;">Company <span aria-hidden="true">*</span></label>
              <input type="text" id="exp-company-input" class="edit-input" style="width:100%;" aria-required="true"
                  placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <label for="exp-city-input" style="display:block;font-weight:600;margin-bottom:4px;">City</label>
              <input type="text" id="exp-city-input" class="edit-input" style="width:100%;" placeholder="Boston" />
            </div>
            <div>
              <label for="exp-state-input" style="display:block;font-weight:600;margin-bottom:4px;">State / Region</label>
              <input type="text" id="exp-state-input" class="edit-input" style="width:100%;" placeholder="MA" />
            </div>
            <div>
              <label for="exp-start-input" style="display:block;font-weight:600;margin-bottom:4px;">Start Date</label>
              <input type="text" id="exp-start-input" class="edit-input" style="width:100%;" placeholder="2020-01" />
            </div>
            <div>
              <label for="exp-end-input" style="display:block;font-weight:600;margin-bottom:4px;">End Date (blank = present)</label>
              <input type="text" id="exp-end-input" class="edit-input" style="width:100%;" placeholder="2024-06 or leave blank" />
            </div>
            <div>
              <label for="exp-type-input" style="display:block;font-weight:600;margin-bottom:4px;">Employment Type</label>
              <select id="exp-type-input" class="edit-input" style="width:100%;">
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="consulting">Consulting</option>
                <option value="internship">Internship</option>
                <option value="self_employed">Self-employed</option>
              </select>
            </div>
            <div>
              <label for="exp-importance-input" style="display:block;font-weight:600;margin-bottom:4px;">Importance (1–10)</label>
              <input type="number" id="exp-importance-input" class="edit-input" style="width:80px;"
                  min="1" max="10" value="5" />
            </div>
            <div style="grid-column:1/-1;">
              <label for="exp-tags-input" style="display:block;font-weight:600;margin-bottom:4px;">Tags (comma-separated)</label>
              <input type="text" id="exp-tags-input" class="edit-input" style="width:100%;"
                  placeholder="e.g. ml, leadership, python" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" onclick="closeExperienceModal()">Cancel</button>
          <button class="action-btn primary" onclick="saveMasterExperience()">Save</button>
        </div>
      </div>
    </div>

    <!-- Skill add modal -->
    <div id="master-skill-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-skill-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeSkillModal()">
      <div class="modal" style="max-width:480px;">
        <div class="modal-header">
          <h2 id="master-skill-modal-title">Add Skill</h2>
          <button onclick="closeSkillModal()" aria-label="Close skill editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <input type="hidden" id="skill-modal-category" />
          <input type="hidden" id="skill-modal-is-flat" />
          <input type="hidden" id="skill-modal-original-name" />
          <div style="margin-bottom:14px;" id="skill-category-row">
            <label for="skill-category-display" style="display:block;font-weight:600;margin-bottom:4px;">Category</label>
            <span id="skill-category-display" style="font-weight:500;color:#334155;"></span>
          </div>
          <div style="margin-bottom:14px;">
            <label for="skill-name-input" style="display:block;font-weight:600;margin-bottom:4px;">Skill Name <span aria-hidden="true">*</span></label>
            <input type="text" id="skill-name-input" class="edit-input" style="width:100%;" aria-required="true"
                placeholder="e.g. Python" />
          </div>
          <div style="margin-bottom:14px;">
            <label for="skill-experiences-input" style="display:block;font-weight:600;margin-bottom:4px;">Associated Experience IDs (optional)</label>
            <input type="text" id="skill-experiences-input" class="edit-input" style="width:100%;"
                placeholder="e.g. exp_123, exp_456" />
            <small style="display:block;margin-top:4px;color:#64748b;">Comma-separated IDs. A skill can be linked to multiple experiences.</small>
            <div id="skill-experience-hints" style="margin-top:6px;font-size:0.8em;color:#94a3b8;"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" onclick="closeSkillModal()">Cancel</button>
          <button class="action-btn primary" id="master-skill-save-btn" onclick="saveMasterSkill()">Add Skill</button>
        </div>
      </div>
    </div>

    <!-- Education modal -->
    <div id="master-edu-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-edu-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeEducationModal()">
      <div class="modal" style="max-width:580px;">
        <div class="modal-header">
          <h2 id="master-edu-modal-title">Education</h2>
          <button onclick="closeEducationModal()" aria-label="Close education editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <input type="hidden" id="edu-modal-idx" value="-1" />
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div>
              <label for="edu-degree-input" style="display:block;font-weight:600;margin-bottom:4px;">Degree <span aria-hidden="true">*</span></label>
              <input type="text" id="edu-degree-input" class="edit-input" style="width:100%;" aria-required="true"
                  placeholder="e.g. Ph.D." />
            </div>
            <div>
              <label for="edu-field-input" style="display:block;font-weight:600;margin-bottom:4px;">Field of Study</label>
              <input type="text" id="edu-field-input" class="edit-input" style="width:100%;"
                  placeholder="e.g. Biostatistics" />
            </div>
            <div style="grid-column:1/-1;">
              <label for="edu-institution-input" style="display:block;font-weight:600;margin-bottom:4px;">Institution <span aria-hidden="true">*</span></label>
              <input type="text" id="edu-institution-input" class="edit-input" style="width:100%;" aria-required="true"
                  placeholder="e.g. University of Washington" />
            </div>
            <div>
              <label for="edu-city-input" style="display:block;font-weight:600;margin-bottom:4px;">City</label>
              <input type="text" id="edu-city-input" class="edit-input" style="width:100%;" placeholder="Seattle" />
            </div>
            <div>
              <label for="edu-state-input" style="display:block;font-weight:600;margin-bottom:4px;">State</label>
              <input type="text" id="edu-state-input" class="edit-input" style="width:100%;" placeholder="WA" />
            </div>
            <div>
              <label for="edu-start-year-input" style="display:block;font-weight:600;margin-bottom:4px;">Start Year</label>
              <input type="number" id="edu-start-year-input" class="edit-input" style="width:100%;"
                  min="1950" max="2099" placeholder="1995" />
            </div>
            <div>
              <label for="edu-end-year-input" style="display:block;font-weight:600;margin-bottom:4px;">End Year</label>
              <input type="number" id="edu-end-year-input" class="edit-input" style="width:100%;"
                  min="1950" max="2099" placeholder="2000" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" onclick="closeEducationModal()">Cancel</button>
          <button class="action-btn primary" onclick="saveMasterEducation()">Save</button>
        </div>
      </div>
    </div>

    <!-- Award modal -->
    <div id="master-award-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-award-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeAwardModal()">
      <div class="modal" style="max-width:580px;">
        <div class="modal-header">
          <h2 id="master-award-modal-title">Award / Honour</h2>
          <button onclick="closeAwardModal()" aria-label="Close award editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <input type="hidden" id="award-modal-idx" value="-1" />
          <div style="margin-bottom:14px;">
            <label for="award-title-input" style="display:block;font-weight:600;margin-bottom:4px;">Title <span aria-hidden="true">*</span></label>
            <input type="text" id="award-title-input" class="edit-input" style="width:100%;" aria-required="true"
                placeholder="e.g. Employee of the Year" />
          </div>
          <div style="margin-bottom:14px;">
            <label for="award-year-input" style="display:block;font-weight:600;margin-bottom:4px;">Year</label>
            <input type="number" id="award-year-input" class="edit-input" style="width:100px;"
                min="1950" max="2099" placeholder="2022" />
          </div>
          <div style="margin-bottom:14px;">
            <label for="award-desc-input" style="display:block;font-weight:600;margin-bottom:4px;">Description</label>
            <textarea id="award-desc-input" class="edit-input" rows="3" style="width:100%;resize:vertical;"
                placeholder="Brief context or achievement description"></textarea>
          </div>
          <div style="margin-bottom:14px;">
            <label for="award-relevant-input" style="display:block;font-weight:600;margin-bottom:4px;">Relevant for (comma-separated)</label>
            <input type="text" id="award-relevant-input" class="edit-input" style="width:100%;"
                placeholder="e.g. leadership, pharma" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" onclick="closeAwardModal()">Cancel</button>
          <button class="action-btn primary" onclick="saveMasterAward()">Save</button>
        </div>
      </div>
    </div>

    <!-- Achievement edit modal -->
    <div id="master-ach-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-ach-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeMasterAchModal()">
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h2 id="master-ach-modal-title">Achievement</h2>
          <button onclick="closeMasterAchModal()" aria-label="Close achievement editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <input type="hidden" id="ach-modal-id" />
          <div style="margin-bottom:14px;">
            <label for="ach-modal-title-input" style="display:block;font-weight:600;margin-bottom:4px;">Title <span aria-hidden="true">*</span></label>
            <input type="text" id="ach-modal-title-input" class="edit-input" style="width:100%;" aria-required="true"
                placeholder="e.g. Led 3× revenue growth initiative" />
          </div>
          <div style="margin-bottom:14px;">
            <label for="ach-modal-desc-input" style="display:block;font-weight:600;margin-bottom:4px;">Description</label>
            <textarea id="ach-modal-desc-input" class="edit-input" rows="3" style="width:100%;resize:vertical;"
                placeholder="Optional detail or metric"></textarea>
          </div>
          <div style="margin-bottom:14px;">
            <label for="ach-modal-relevant-input" style="display:block;font-weight:600;margin-bottom:4px;">Relevant for (comma-separated roles/domains)</label>
            <input type="text" id="ach-modal-relevant-input" class="edit-input" style="width:100%;"
                placeholder="e.g. leadership, ML engineering, data science" />
          </div>
          <div style="margin-bottom:14px;">
            <label for="ach-modal-importance-input" style="display:block;font-weight:600;margin-bottom:4px;">Importance (1–10)</label>
            <input type="number" id="ach-modal-importance-input" class="edit-input" style="width:80px;"
                min="1" max="10" value="7" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" onclick="closeMasterAchModal()">Cancel</button>
          <button class="action-btn primary" onclick="saveMasterAchievement()">Save</button>
        </div>
      </div>
    </div>

    <!-- Summary edit modal -->
    <div id="master-sum-modal-overlay" style="display:none;" role="dialog" aria-modal="true"
        aria-labelledby="master-sum-modal-title" class="modal-overlay"
        onclick="if(event.target===this)closeMasterSumModal()">
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h2 id="master-sum-modal-title">Professional Summary</h2>
          <button onclick="closeMasterSumModal()" aria-label="Close summary editor"
              style="background:none;border:none;font-size:1.4em;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="margin-bottom:14px;">
            <label for="sum-modal-key-input" style="display:block;font-weight:600;margin-bottom:4px;">Key/name <span aria-hidden="true">*</span></label>
            <input type="text" id="sum-modal-key-input" class="edit-input" style="width:100%;" aria-required="true"
                placeholder="e.g. ml_engineering or leadership" />
            <p style="font-size:0.82em;color:#6b7280;margin:4px 0 0;">Use lowercase_underscore — this is the key used internally and shown in the Summary Focus step.</p>
          </div>
          <div style="margin-bottom:14px;">
            <label for="sum-modal-text-input" style="display:block;font-weight:600;margin-bottom:4px;">Summary text <span aria-hidden="true">*</span></label>
            <textarea id="sum-modal-text-input" class="edit-input" rows="5" style="width:100%;resize:vertical;" aria-required="true"
                placeholder="Write your professional summary variant here…"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn" onclick="closeMasterSumModal()">Cancel</button>
          <button class="action-btn primary" onclick="saveMasterSummary()">Save</button>
        </div>
      </div>
    </div>
  `;
  // Load publications asynchronously after the DOM is ready.
  loadPublications();
}

function _renderPersonalInfoCard(pi) {
  const contact = pi.contact || {};
  const address = contact.address || {};
  const rows = [
    ['Name',      pi.name || ''],
    ['Title',     pi.title || pi.headline || ''],
    ['Email',     contact.email || pi.email || ''],
    ['Phone',     contact.phone || ''],
    ['LinkedIn',  contact.linkedin || ''],
    ['Website',   contact.website || ''],
    ['Location',  [address.city, address.state].filter(Boolean).join(', ')],
  ].filter(([, v]) => v);
  if (!rows.length) {
    return '<p style="color:#6b7280;padding:12px 0;">No personal information on file. Click "✏️ Edit" above to add your details.</p>';
  }
  return `<dl class="master-info-grid">${rows.map(([label, value]) =>
    `<div class="master-info-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
  ).join('')}</dl>`;
}

function _renderExperiencesList(experiences) {
  if (!experiences.length) {
    return '<p style="color:#6b7280;padding:12px 0;">No experience entries yet. Click "+ Add Experience" above.</p>';
  }
  const rows = experiences.map((exp, idx) => {
    const title   = escapeHtml(exp.title || '');
    const company = escapeHtml(exp.company || '');
    const loc     = exp.location || {};
    const location = escapeHtml([loc.city, loc.state].filter(Boolean).join(', '));
    const dates   = escapeHtml([exp.start_date, exp.end_date || 'Present'].filter(Boolean).join(' – '));
    const achCount = (exp.achievements || []).length;
    const expJson = escapeHtml(JSON.stringify({
      id: exp.id || '', title: exp.title || '', company: exp.company || '',
      city: loc.city || '', state: loc.state || '',
      start_date: exp.start_date || '', end_date: exp.end_date || '',
      employment_type: exp.employment_type || 'full_time',
      importance: exp.importance || 5,
      tags: (exp.tags || []).join(', '),
    }));
    return `
      <tr>
        <td>
          <strong>${title}</strong><br>
          <span style="color:#475569;">${company}</span>
          ${location ? `<span style="color:#94a3b8;font-size:0.85em;"> · ${location}</span>` : ''}
        </td>
        <td style="font-size:0.85em;color:#475569;white-space:nowrap;">${dates}</td>
        <td style="text-align:center;color:#94a3b8;font-size:0.85em;">${achCount}</td>
        <td class="action-btns">
          <button class="icon-btn" onclick="editMasterExperience(${expJson})"
              aria-label="Edit experience: ${title}" title="Edit">✏️</button>
          <button class="icon-btn" onclick="deleteMasterExperience('${escapeHtml(exp.id || '')}', '${title}')"
              aria-label="Delete experience: ${title}" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');
  return `
    <table class="review-table" style="width:100%;">
      <thead>
        <tr>
          <th>Role / Company</th>
          <th>Dates</th>
          <th style="text-align:center;width:60px;">Bullets</th>
          <th style="width:80px;">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function _renderSkillsSection(skills) {
  const normalizeSkill = (s) => {
    if (typeof s === 'string') {
      return { name: s, experiences: [] };
    }
    if (s && typeof s === 'object') {
      return {
        name: s.name || '',
        experiences: Array.isArray(s.experiences) ? s.experiences : [],
      };
    }
    return { name: String(s || ''), experiences: [] };
  };

  if (Array.isArray(skills)) {
    if (!skills.length) {
      return '<p style="color:#6b7280;padding:12px 0;">No skills on file. Click "+ Add Skill" above.</p>';
    }
    const chips = skills.map(s => {
      const normalized = normalizeSkill(s);
      const name = escapeHtml(normalized.name);
      const raw = escapeHtml(normalized.name);
      const badge = normalized.experiences.length
        ? `<small style="color:#64748b;margin-left:6px;">(${normalized.experiences.length} exp)</small>`
        : '';
      const skillJson = escapeHtml(JSON.stringify({ name: normalized.name, experiences: normalized.experiences }));
      return `<span class="skill-chip">${name}${badge}<button class="skill-chip-del" onclick="editMasterSkill(${skillJson}, '', true)" aria-label="Edit skill ${name}" title="Edit">✏️</button><button class="skill-chip-del" onclick="deleteMasterSkill('${raw}', '', true)" aria-label="Remove skill ${name}" title="Remove">×</button></span>`;
    }).join('');
    return `<div class="skill-chips-container">${chips}</div>`;
  }
  if (typeof skills === 'object' && skills !== null) {
    const keys = Object.keys(skills);
    if (!keys.length) {
      return '<p style="color:#6b7280;padding:12px 0;">No skill categories on file.</p>';
    }
    return keys.map(catKey => {
      const catVal  = skills[catKey];
      const catName  = typeof catVal === 'object' && catVal.category ? catVal.category : catKey;
      const catList  = Array.isArray(catVal) ? catVal
                     : Array.isArray(catVal?.skills) ? catVal.skills : [];
      const chips   = catList.map(s => {
        const normalized = normalizeSkill(s);
        const name = escapeHtml(normalized.name);
        const badge = normalized.experiences.length
          ? `<small style="color:#64748b;margin-left:6px;">(${normalized.experiences.length} exp)</small>`
          : '';
        const skillJson = escapeHtml(JSON.stringify({ name: normalized.name, experiences: normalized.experiences }));
        return `<span class="skill-chip">${name}${badge}<button class="skill-chip-del" onclick="editMasterSkill(${skillJson}, '${escapeHtml(catKey)}', false)" aria-label="Edit ${name}" title="Edit">✏️</button><button class="skill-chip-del" onclick="deleteMasterSkill('${name}', '${escapeHtml(catKey)}', false)" aria-label="Remove ${name}" title="Remove">×</button></span>`;
      }).join('');
      const catKeyEsc  = escapeHtml(catKey);
      const catNameEsc = escapeHtml(catName);
      return `
        <div class="master-skill-category">
          <div class="master-skill-cat-header">
            <span class="master-skill-cat-name">${catNameEsc}</span>
            <button class="action-btn-sm" onclick="showAddSkillModal('${catKeyEsc}', false)"
                aria-label="Add skill to ${catNameEsc}">+ Add</button>
          </div>
          <div class="skill-chips-container">${chips || '<span style="color:#94a3b8;font-size:0.85em;">No skills in this category</span>'}</div>
        </div>`;
    }).join('');
  }
  return '<p style="color:#6b7280;">Skills data format not recognised.</p>';
}

function _renderEducationList(education) {
  if (!education.length) {
    return '<p style="color:#6b7280;padding:12px 0;">No education entries yet. Click "+ Add Education" above.</p>';
  }
  const rows = education.map((edu, idx) => {
    const degree      = escapeHtml(edu.degree || '');
    const field       = escapeHtml(edu.field || '');
    const institution = escapeHtml(edu.institution || '');
    const loc         = edu.location || {};
    const location    = escapeHtml([loc.city, loc.state].filter(Boolean).join(', '));
    const years       = [edu.start_year, edu.end_year].filter(Boolean).join('–');
    const eduJson = escapeHtml(JSON.stringify({
      degree: edu.degree || '', field: edu.field || '', institution: edu.institution || '',
      city: loc.city || '', state: loc.state || '',
      start_year: edu.start_year || '', end_year: edu.end_year || '',
    }));
    return `
      <tr>
        <td>
          <strong>${degree}${field ? `, ${field}` : ''}</strong><br>
          <span style="color:#475569;">${institution}</span>
          ${location ? `<span style="color:#94a3b8;font-size:0.85em;"> · ${location}</span>` : ''}
        </td>
        <td style="font-size:0.85em;color:#475569;white-space:nowrap;">${years || '—'}</td>
        <td class="action-btns">
          <button class="icon-btn" onclick="editMasterEducation(${eduJson}, ${idx})"
              aria-label="Edit education: ${institution}" title="Edit">✏️</button>
          <button class="icon-btn" onclick="deleteMasterEducation(${idx}, '${institution}')"
              aria-label="Delete education: ${institution}" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');
  return `
    <table class="review-table" style="width:100%;">
      <thead>
        <tr>
          <th>Degree / Institution</th>
          <th style="width:100px;">Years</th>
          <th style="width:80px;">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// Publications — CRUD + raw BibTeX toggle
// ---------------------------------------------------------------------------

/** Current view mode: 'crud' | 'raw' */
let _pubViewMode = 'crud';
let _pubSortMode = 'year_desc';
let _pubGroupMode = 'none';

function togglePublicationsView() {
  _pubViewMode = _pubViewMode === 'crud' ? 'raw' : 'crud';
  document.getElementById('master-pub-crud-view').style.display = _pubViewMode === 'crud' ? '' : 'none';
  document.getElementById('master-pub-raw-view').style.display  = _pubViewMode === 'raw'  ? '' : 'none';
  document.getElementById('master-pub-add-btn').style.display   = _pubViewMode === 'crud' ? '' : 'none';
  const btn = document.getElementById('master-pub-toggle-btn');
  if (btn) btn.textContent = _pubViewMode === 'crud' ? '✏️ Raw BibTeX' : '📋 Structured View';
  if (_pubViewMode === 'raw') loadPublicationsBib();
}

/** Load both structured list and raw content from a single API call. */
async function loadPublications() {
  try {
    const res  = await fetch('/api/master-data/publications');
    const data = await res.json();
    if (data.ok) {
      _renderPublicationsCrudList(data.publications || []);
      const ta = document.getElementById('master-pub-textarea');
      if (ta) ta.value = data.content || '';
      _updatePubCount(data.count ?? 0);
    } else {
      document.getElementById('master-pub-crud-container').innerHTML =
        `<p style="color:#ef4444;padding:12px 0;">⚠️ ${escapeHtml(data.error || 'Failed to load')}</p>`;
    }
  } catch (err) {
    document.getElementById('master-pub-crud-container').innerHTML =
      `<p style="color:#ef4444;padding:12px 0;">⚠️ Failed to load: ${escapeHtml(err.message)}</p>`;
  }
}

/** Reload only the raw textarea content (called when switching to raw view). */
async function loadPublicationsBib() {
  const ta     = document.getElementById('master-pub-textarea');
  const status = document.getElementById('master-pub-status');
  if (!ta) return;
  ta.disabled    = true;
  ta.placeholder = 'Loading…';
  if (status) status.textContent = '';
  try {
    const res  = await fetch('/api/master-data/publications');
    const data = await res.json();
    if (data.ok) {
      ta.value = data.content || '';
      _updatePubCount(data.count ?? 0);
    } else {
      if (status) status.textContent = '⚠️ ' + (data.error || 'Failed to load');
    }
  } catch (err) {
    if (status) status.textContent = '⚠️ Failed to load: ' + err.message;
  } finally {
    ta.disabled    = false;
    ta.placeholder = '';
  }
}

function _updatePubCount(n) {
  const el = document.getElementById('master-pub-count');
  if (el) el.textContent = `${n} publication${n !== 1 ? 's' : ''} on file`;
}

function _setPublicationStatus(elementId, text, color = '#6b7280') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

function setPublicationSortMode(mode) {
  _pubSortMode = mode || 'year_desc';
  void loadPublications();
}

function setPublicationGroupMode(mode) {
  _pubGroupMode = mode || 'none';
  void loadPublications();
}

function _getPublicationYear(pub) {
  const rawYear = pub?.fields?.year ?? pub?.year ?? '';
  const match = String(rawYear).match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function _comparePublications(left, right) {
  const leftYear = _getPublicationYear(left) ?? -Infinity;
  const rightYear = _getPublicationYear(right) ?? -Infinity;
  const leftType = String(left?.type || '').toLowerCase();
  const rightType = String(right?.type || '').toLowerCase();
  const leftKey = String(left?.key || '').toLowerCase();
  const rightKey = String(right?.key || '').toLowerCase();

  switch (_pubSortMode) {
    case 'year_asc':
      return (leftYear - rightYear) || leftType.localeCompare(rightType) || leftKey.localeCompare(rightKey);
    case 'type_asc':
      return leftType.localeCompare(rightType) || (rightYear - leftYear) || leftKey.localeCompare(rightKey);
    case 'type_desc':
      return rightType.localeCompare(leftType) || (rightYear - leftYear) || leftKey.localeCompare(rightKey);
    case 'year_desc':
    default:
      return (rightYear - leftYear) || leftType.localeCompare(rightType) || leftKey.localeCompare(rightKey);
  }
}

function _groupPublicationLabel(pub) {
  if (_pubGroupMode === 'year') {
    return String(_getPublicationYear(pub) ?? 'Unknown year');
  }
  if (_pubGroupMode === 'type') {
    return pub?.type ? String(pub.type) : 'Unknown type';
  }
  return 'Publications';
}

function _renderPublicationsCrudList(pubs) {
  const container = document.getElementById('master-pub-crud-container');
  if (!container) return;
  const controlsHtml = `
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:12px;">
      <label style="display:flex;align-items:center;gap:6px;color:#475569;font-size:0.9em;">
        Sort
        <select id="master-pub-sort-select" class="edit-input" style="width:auto;min-width:150px;" onchange="setPublicationSortMode(this.value)">
          <option value="year_desc" ${_pubSortMode === 'year_desc' ? 'selected' : ''}>Year newest first</option>
          <option value="year_asc" ${_pubSortMode === 'year_asc' ? 'selected' : ''}>Year oldest first</option>
          <option value="type_asc" ${_pubSortMode === 'type_asc' ? 'selected' : ''}>Type A–Z</option>
          <option value="type_desc" ${_pubSortMode === 'type_desc' ? 'selected' : ''}>Type Z–A</option>
        </select>
      </label>
      <label style="display:flex;align-items:center;gap:6px;color:#475569;font-size:0.9em;">
        Group
        <select id="master-pub-group-select" class="edit-input" style="width:auto;min-width:140px;" onchange="setPublicationGroupMode(this.value)">
          <option value="none" ${_pubGroupMode === 'none' ? 'selected' : ''}>No grouping</option>
          <option value="year" ${_pubGroupMode === 'year' ? 'selected' : ''}>By year</option>
          <option value="type" ${_pubGroupMode === 'type' ? 'selected' : ''}>By type</option>
        </select>
      </label>
    </div>`;
  if (!pubs.length) {
    container.innerHTML = `${controlsHtml}<p style="color:#6b7280;padding:12px 0;">No publications on file. Click "+ Add Publication" above, or switch to Raw BibTeX to paste/import entries.</p>`;
    return;
  }
  const sorted = [...pubs].sort(_comparePublications);
  const groups = [];
  for (const pub of sorted) {
    const label = _groupPublicationLabel(pub);
    let group = groups.find((entry) => entry.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(pub);
  }
  const sectionHtml = groups.map(({ label, items }) => {
    const headingHtml = _pubGroupMode === 'none'
      ? ''
      : `<div style="margin:16px 0 8px;font-size:0.9em;font-weight:700;color:#334155;">${escapeHtml(label)}</div>`;
    const rows = items.map(pub => {
    const key      = escapeHtml(pub.key || '');
    const type     = escapeHtml(pub.type || '');
    const citation = escapeHtml((pub.formatted_citation || '').slice(0, 160));
    const full     = pub.formatted_citation || '';
    const pubJson  = escapeHtml(JSON.stringify(pub));
    return `
      <tr>
        <td>
          <code style="font-size:0.8em;color:#475569;">${key}</code>
          ${citation ? `<br><small style="color:#6b7280;">${citation}${full.length > 160 ? '…' : ''}</small>` : ''}
        </td>
        <td style="text-align:center;color:#475569;font-size:0.85em;">${type}</td>
        <td class="action-btns">
          <button class="icon-btn" onclick="editMasterPublication(${pubJson})"
              aria-label="Edit publication: ${key}" title="Edit">✏️</button>
          <button class="icon-btn" onclick="deleteMasterPublication('${key}')"
              aria-label="Delete publication: ${key}" title="Delete">🗑️</button>
        </td>
      </tr>`;
    }).join('');
    return `${headingHtml}
    <table class="review-table" style="width:100%;">
      <thead>
        <tr>
          <th>Publication</th>
          <th style="width:110px;text-align:center;">Type</th>
          <th style="width:80px;">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }).join('');
  container.innerHTML = `${controlsHtml}${sectionHtml}`;
}

/** Validate BibTeX in the textarea without saving. */
async function validatePublicationsBib() {
  const ta     = document.getElementById('master-pub-textarea');
  const status = document.getElementById('master-pub-status');
  if (!ta || !status) return;
  const text = ta.value;
  if (!text.trim()) {
    status.textContent = 'ℹ️ Empty — nothing to validate.';
    status.style.color = '#6b7280';
    return;
  }
  status.textContent = '🔍 Validating…';
  status.style.color = '#6b7280';
  try {
    const res  = await fetch('/api/master-data/publications/validate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bibtex_text: text }),
    });
    const data = await res.json();
    if (data.ok) {
      const n = data.count ?? 0;
      status.textContent = `✅ Valid — ${n} entr${n !== 1 ? 'ies' : 'y'} found.`;
      status.style.color = '#15803d';
    } else {
      status.textContent = '❌ ' + (data.error || 'Validation failed');
      status.style.color = '#dc2626';
    }
  } catch (err) {
    status.textContent = '❌ ' + err.message;
    status.style.color = '#dc2626';
  }
}

/** Save raw BibTeX (validates server-side before writing). */
async function savePublicationsBib() {
  const ta     = document.getElementById('master-pub-textarea');
  const status = document.getElementById('master-pub-status');
  const btn    = document.getElementById('master-pub-save-btn');
  if (!ta) return;
  const content = ta.value;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }
  if (status) { status.textContent = ''; status.style.color = '#6b7280'; }
  try {
    const res  = await fetch('/api/master-data/publications', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content }),
    });
    const data = await res.json();
    if (data.ok) {
      const n = data.count ?? 0;
      if (status) {
        status.textContent = `✅ Saved — ${n} entr${n !== 1 ? 'ies' : 'y'} parsed.`;
        status.style.color = '#15803d';
      }
      _updatePubCount(n);
      _setMasterChangeNotice('Publications', 'updated');
      // Refresh CRUD list to stay in sync
      await loadPublications();
    } else {
      if (status) {
        status.textContent = '❌ ' + (data.error || 'Save failed');
        status.style.color = '#dc2626';
      }
    }
  } catch (err) {
    if (status) {
      status.textContent = '❌ ' + err.message;
      status.style.color = '#dc2626';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save'; }
  }
}

function showImportPublicationsModal() {
  document.getElementById('master-pub-import-textarea').value = '';
  document.getElementById('master-pub-import-overwrite').checked = false;
  _setPublicationStatus('master-pub-import-status', '');
  document.getElementById('master-pub-import-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-pub-import-modal-overlay');
  trapFocus('master-pub-import-modal-overlay');
}

function closeImportPublicationsModal() {
  document.getElementById('master-pub-import-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function importPublicationsBib() {
  const textarea = document.getElementById('master-pub-import-textarea');
  const overwrite = document.getElementById('master-pub-import-overwrite');
  const button = document.getElementById('master-pub-import-submit-btn');
  if (!textarea) return;
  const bibtexText = textarea.value.trim();
  if (!bibtexText) {
    _setPublicationStatus('master-pub-import-status', '⚠️ Paste BibTeX entries to import.', '#dc2626');
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = '⏳ Importing…';
  }
  _setPublicationStatus('master-pub-import-status', 'Importing BibTeX…');
  try {
    const res = await fetch('/api/master-data/publications/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bibtex_text: bibtexText,
        overwrite: Boolean(overwrite?.checked),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      const parts = [
        `${data.added || 0} added`,
        `${data.updated || 0} updated`,
        `${data.skipped || 0} skipped`,
      ];
      _setPublicationStatus('master-pub-import-status', `✅ Imported: ${parts.join(', ')}.`, '#15803d');
      _setMasterChangeNotice('Publications', 'imported');
      await loadPublications();
      showAlertModal('✅ Imported', `Imported BibTeX entries: ${parts.join(', ')}.`);
      closeImportPublicationsModal();
    } else {
      _setPublicationStatus('master-pub-import-status', `❌ ${data.error || 'Import failed'}`, '#dc2626');
    }
  } catch (err) {
    _setPublicationStatus('master-pub-import-status', `❌ ${err.message}`, '#dc2626');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Import';
    }
  }
}

function showConvertPublicationsModal() {
  document.getElementById('master-pub-convert-input').value = '';
  document.getElementById('master-pub-convert-output').value = '';
  document.getElementById('master-pub-convert-overwrite').checked = false;
  _setPublicationStatus('master-pub-convert-status', '');
  document.getElementById('master-pub-convert-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-pub-convert-modal-overlay');
  trapFocus('master-pub-convert-modal-overlay');
}

function closeConvertPublicationsModal() {
  document.getElementById('master-pub-convert-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function convertPublicationText() {
  const input = document.getElementById('master-pub-convert-input');
  const output = document.getElementById('master-pub-convert-output');
  const button = document.getElementById('master-pub-convert-submit-btn');
  if (!input || !output) return;
  const text = input.value.trim();
  if (!text) {
    _setPublicationStatus('master-pub-convert-status', '⚠️ Paste citation text to convert.', '#dc2626');
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = '⏳ Generating…';
  }
  _setPublicationStatus('master-pub-convert-status', 'Generating BibTeX preview…');
  try {
    const res = await fetch('/api/master-data/publications/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (data.ok) {
      output.value = data.bibtex || '';
      _setPublicationStatus('master-pub-convert-status', '✅ Review the generated BibTeX, then import it if it looks correct.', '#15803d');
    } else {
      _setPublicationStatus('master-pub-convert-status', `❌ ${data.error || 'Conversion failed'}`, '#dc2626');
    }
  } catch (err) {
    _setPublicationStatus('master-pub-convert-status', `❌ ${err.message}`, '#dc2626');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Generate BibTeX';
    }
  }
}

async function importConvertedPublicationText() {
  const output = document.getElementById('master-pub-convert-output');
  const overwrite = document.getElementById('master-pub-convert-overwrite');
  const button = document.getElementById('master-pub-convert-import-btn');
  if (!output) return;
  const bibtexText = output.value.trim();
  if (!bibtexText) {
    _setPublicationStatus('master-pub-convert-status', '⚠️ Generate or edit BibTeX before importing.', '#dc2626');
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = '⏳ Importing…';
  }
  _setPublicationStatus('master-pub-convert-status', 'Importing reviewed BibTeX…');
  try {
    const res = await fetch('/api/master-data/publications/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bibtex_text: bibtexText,
        overwrite: Boolean(overwrite?.checked),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      const parts = [
        `${data.added || 0} added`,
        `${data.updated || 0} updated`,
        `${data.skipped || 0} skipped`,
      ];
      _setPublicationStatus('master-pub-convert-status', `✅ Imported preview: ${parts.join(', ')}.`, '#15803d');
      _setMasterChangeNotice('Publications', 'imported');
      await loadPublications();
      showAlertModal('✅ Imported', `Imported generated BibTeX: ${parts.join(', ')}.`);
      closeConvertPublicationsModal();
    } else {
      _setPublicationStatus('master-pub-convert-status', `❌ ${data.error || 'Import failed'}`, '#dc2626');
    }
  } catch (err) {
    _setPublicationStatus('master-pub-convert-status', `❌ ${err.message}`, '#dc2626');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Import Preview';
    }
  }
}

// ---- Publication add/edit modal ----

function showAddPublicationModal() {
  document.getElementById('pub-modal-key').value    = '';
  document.getElementById('pub-modal-type').value   = 'article';
  document.getElementById('pub-modal-author').value = '';
  document.getElementById('pub-modal-title').value  = '';
  document.getElementById('pub-modal-year').value   = '';
  document.getElementById('pub-modal-journal').value = '';
  document.getElementById('pub-modal-doi').value    = '';
  document.getElementById('pub-modal-extra').value  = '';
  document.getElementById('pub-modal-key').disabled = false;
  document.getElementById('pub-modal-title-heading').textContent = 'Add Publication';
  document.getElementById('master-pub-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-pub-modal-overlay');
  trapFocus('master-pub-modal-overlay');
}

function editMasterPublication(pub) {
  const fields = pub.fields || {};
  document.getElementById('pub-modal-key').value     = pub.key || '';
  document.getElementById('pub-modal-type').value    = pub.type || 'article';
  document.getElementById('pub-modal-author').value  = fields.author || fields.editor || '';
  document.getElementById('pub-modal-title').value   = fields.title || '';
  document.getElementById('pub-modal-year').value    = fields.year || '';
  document.getElementById('pub-modal-journal').value = fields.journal || fields.booktitle || '';
  document.getElementById('pub-modal-doi').value     = fields.doi || '';
  // Extra: remaining non-standard fields as key=value lines
  const known = new Set(['author','editor','title','year','journal','booktitle','doi']);
  const extra = Object.entries(fields)
    .filter(([k]) => !known.has(k))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  document.getElementById('pub-modal-extra').value   = extra;
  document.getElementById('pub-modal-key').disabled  = true;  // key is immutable on edit
  document.getElementById('pub-modal-title-heading').textContent = 'Edit Publication';
  document.getElementById('master-pub-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-pub-modal-overlay');
  trapFocus('master-pub-modal-overlay');
}

function closePublicationModal() {
  document.getElementById('master-pub-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function saveMasterPublication() {
  const keyEl  = document.getElementById('pub-modal-key');
  const key    = keyEl.value.trim();
  const action = keyEl.disabled ? 'update' : 'add';
  if (!key) { showAlertModal('⚠️ Validation', 'Cite key is required.'); return; }
  const type   = document.getElementById('pub-modal-type').value.trim() || 'article';
  const author = document.getElementById('pub-modal-author').value.trim();
  const title  = document.getElementById('pub-modal-title').value.trim();
  const year   = document.getElementById('pub-modal-year').value.trim();
  if (!title)  { showAlertModal('⚠️ Validation', 'Title is required.'); return; }
  if (!year)   { showAlertModal('⚠️ Validation', 'Year is required.'); return; }
  if (!author) { showAlertModal('⚠️ Validation', 'Author or editor is required.'); return; }
  const fields = { author, title, year };
  const journal = document.getElementById('pub-modal-journal').value.trim();
  if (journal) {
    fields[type === 'inproceedings' ? 'booktitle' : 'journal'] = journal;
  }
  const doi = document.getElementById('pub-modal-doi').value.trim();
  if (doi) fields.doi = doi;
  // Parse extra fields (key=value per line)
  const extra = document.getElementById('pub-modal-extra').value;
  for (const line of extra.split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (k && v) fields[k] = v;
    }
  }
  const body = { action, key, type, fields };
  try {
    const res  = await fetch('/api/master-data/publication', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      closePublicationModal();
      _setMasterChangeNotice('Publications', data.action || 'updated');
      showAlertModal('✅ Saved', `Publication "${key}" ${data.action}.`);
      await loadPublications();
    } else {
      showAlertModal('❌ Error', data.error || 'Save failed');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save publication');
  }
}

async function deleteMasterPublication(key) {
  showConfirmModal(
    '🗑️ Delete Publication',
    `Delete "${key}"? This cannot be undone.`,
    async () => {
      try {
        const res  = await fetch('/api/master-data/publication', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', key }),
        });
        const data = await res.json();
        if (data.ok) {
          _setMasterChangeNotice('Publications', 'deleted');
          showAlertModal('✅ Deleted', `Publication "${key}" removed.`);
          await loadPublications();
        } else {
          showAlertModal('❌ Error', data.error || 'Delete failed');
        }
      } catch (e) {
        showAlertModal('❌ Error', 'Failed to delete publication');
      }
    }
  );
}

function _renderAwardsList(awards) {
  if (!awards.length) {
    return '<p style="color:#6b7280;padding:12px 0;">No awards on file. Click "+ Add Award" above.</p>';
  }
  const rows = awards.map((award, idx) => {
    const title = escapeHtml(award.title || '');
    const year  = award.year ? String(award.year) : '—';
    const desc  = escapeHtml((award.description || '').slice(0, 100));
    const awardJson = escapeHtml(JSON.stringify({
      title: award.title || '', year: award.year || '',
      description: award.description || '',
      relevant_for: (award.relevant_for || []).join(', '),
    }));
    return `
      <tr>
        <td>
          <strong>${title}</strong>
          ${desc ? `<br><small style="color:#6b7280;">${desc}${(award.description||'').length > 100 ? '…' : ''}</small>` : ''}
        </td>
        <td style="text-align:center;color:#475569;">${year}</td>
        <td class="action-btns">
          <button class="icon-btn" onclick="editMasterAward(${awardJson}, ${idx})"
              aria-label="Edit award: ${title}" title="Edit">✏️</button>
          <button class="icon-btn" onclick="deleteMasterAward(${idx}, '${title}')"
              aria-label="Delete award: ${title}" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');
  return `
    <table class="review-table" style="width:100%;">
      <thead>
        <tr>
          <th>Award</th>
          <th style="width:70px;text-align:center;">Year</th>
          <th style="width:80px;">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}


function _renderMasterAchievementsTable(achievements) {
  if (!achievements.length) {
    return '<p style="color:#6b7280;padding:12px 0;">No selected achievements yet. Use the Harvest feature to add achievements from a completed session, or click "+ Add Achievement" above.</p>';
  }
  let rows = achievements.map(ach => {
    const id      = escapeHtml(ach.id || '');
    const title   = escapeHtml(ach.title || '');
    const desc    = escapeHtml((ach.description || '').slice(0, 100));
    const imp     = ach.importance ?? '—';
    const relFor  = escapeHtml((ach.relevant_for || []).join(', '));
    return `
      <tr>
        <td><strong>${title}</strong>${desc ? `<br><small style="color:#6b7280;">${desc}${(ach.description||'').length > 100 ? '…' : ''}</small>` : ''}</td>
        <td style="text-align:center;">${imp}</td>
        <td style="font-size:0.85em;color:#475569;">${relFor || '—'}</td>
        <td class="action-btns">
          <button class="icon-btn" onclick="editMasterAchievement(${escapeHtml(JSON.stringify({id: ach.id||'', title: ach.title||'', description: ach.description||'', relevant_for: ach.relevant_for||[], importance: ach.importance||7}))})"
              aria-label="Edit achievement: ${title}" title="Edit">✏️</button>
          <button class="icon-btn" onclick="deleteMasterAchievement('${id}', '${title}')"
              aria-label="Delete achievement: ${title}" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');
  return `
    <table class="review-table" style="width:100%;">
      <thead>
        <tr>
          <th>Achievement</th>
          <th style="width:60px;text-align:center;">Importance</th>
          <th>Relevant for</th>
          <th style="width:80px;">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function _renderSummariesList(summaries) {
  const keys = Object.keys(summaries);
  if (!keys.length) {
    return '<p style="color:#6b7280;padding:12px 0;">No professional summary variants yet. Click "+ Add Summary" above to create your first one.</p>';
  }
  return keys.map(key => {
    const text    = typeof summaries[key] === 'string' ? summaries[key] : JSON.stringify(summaries[key]);
    const preview = escapeHtml(text.slice(0, 200));
    const keyEsc  = escapeHtml(key);
    return `
      <div class="master-summary-card">
        <div class="master-summary-header">
          <span class="master-summary-key">${keyEsc}</span>
          <div class="action-btns" style="gap:4px;">
            <button class="icon-btn" onclick="editMasterSummary(${escapeHtml(JSON.stringify({key, text}))})"
                aria-label="Edit summary: ${keyEsc}" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteMasterSummary('${keyEsc}')"
                aria-label="Delete summary: ${keyEsc}" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="master-summary-preview">${preview}${text.length > 200 ? '…' : ''}</div>
      </div>`;
  }).join('');
}

function showAddAchievementModal() {
  document.getElementById('ach-modal-id').value            = '';
  document.getElementById('ach-modal-title-input').value   = '';
  document.getElementById('ach-modal-desc-input').value    = '';
  document.getElementById('ach-modal-relevant-input').value = '';
  document.getElementById('ach-modal-importance-input').value = '7';
  document.getElementById('master-ach-modal-title').textContent = 'Add Achievement';
  document.getElementById('master-ach-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-ach-modal-overlay');
  trapFocus('master-ach-modal-overlay');
  document.getElementById('ach-modal-title-input').focus();
}

function editMasterAchievement(ach) {
  document.getElementById('ach-modal-id').value              = ach.id || '';
  document.getElementById('ach-modal-title-input').value     = ach.title || '';
  document.getElementById('ach-modal-desc-input').value      = ach.description || '';
  document.getElementById('ach-modal-relevant-input').value  = (ach.relevant_for || []).join(', ');
  document.getElementById('ach-modal-importance-input').value = ach.importance || 7;
  document.getElementById('master-ach-modal-title').textContent = 'Edit Achievement';
  document.getElementById('master-ach-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-ach-modal-overlay');
  trapFocus('master-ach-modal-overlay');
}

function closeMasterAchModal() {
  document.getElementById('master-ach-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function saveMasterAchievement() {
  const id = document.getElementById('ach-modal-id').value.trim() ||
             'sa_' + Date.now();
  const title       = document.getElementById('ach-modal-title-input').value.trim();
  const description = document.getElementById('ach-modal-desc-input').value.trim();
  const relevantRaw = document.getElementById('ach-modal-relevant-input').value;
  const importance  = parseInt(document.getElementById('ach-modal-importance-input').value, 10) || 7;

  if (!title) {
    showAlertModal('⚠️ Validation', 'Title is required.');
    return;
  }
  const relevant_for = relevantRaw.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const res = await fetch('/api/master-data/update-achievement', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, title, description, relevant_for, importance }),
    });
    const data = await res.json();
    if (data.ok) {
      closeMasterAchModal();
      _setMasterChangeNotice('Selected Achievements', data.action || 'updated');
      showAlertModal('✅ Saved', `Achievement "${title}" ${data.action}.`);
      await populateMasterTab();  // refresh
    } else {
      showAlertModal('❌ Error', data.error || 'Save failed');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save achievement');
  }
}

function showAddSummaryModal() {
  document.getElementById('sum-modal-key-input').value  = '';
  document.getElementById('sum-modal-text-input').value = '';
  document.getElementById('master-sum-modal-title').textContent = 'Add Professional Summary';
  document.getElementById('master-sum-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-sum-modal-overlay');
  trapFocus('master-sum-modal-overlay');
}

function editMasterSummary(obj) {
  document.getElementById('sum-modal-key-input').value  = obj.key  || '';
  document.getElementById('sum-modal-text-input').value = obj.text || '';
  document.getElementById('master-sum-modal-title').textContent = 'Edit Professional Summary';
  document.getElementById('master-sum-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-sum-modal-overlay');
  trapFocus('master-sum-modal-overlay');
}

function closeMasterSumModal() {
  document.getElementById('master-sum-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function saveMasterSummary() {
  const key  = document.getElementById('sum-modal-key-input').value.trim();
  const text = document.getElementById('sum-modal-text-input').value.trim();
  if (!key || !text) {
    showAlertModal('⚠️ Validation', 'Both Key and Summary text are required.');
    return;
  }
  try {
    const res = await fetch('/api/master-data/update-summary', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, text }),
    });
    const data = await res.json();
    if (data.ok) {
      closeMasterSumModal();
      _setMasterChangeNotice('Professional Summaries', data.action || 'updated');
      showAlertModal('✅ Saved', `Summary "${key}" ${data.action}.`);
      await populateMasterTab();  // refresh
    } else {
      showAlertModal('❌ Error', data.error || 'Save failed');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save summary');
  }
}

// ---- Personal Info modal handlers ----

function showEditPersonalInfoModal() {
  fetch('/api/master-data/full')
    .then(r => r.json())
    .then(data => {
      const pi      = data.personal_info || {};
      const contact = pi.contact || {};
      const address = contact.address || {};
      document.getElementById('pi-name-input').value    = pi.name || '';
      document.getElementById('pi-title-input').value   = pi.title || pi.headline || '';
      document.getElementById('pi-email-input').value   = contact.email || pi.email || '';
      document.getElementById('pi-phone-input').value   = contact.phone || '';
      document.getElementById('pi-linkedin-input').value = contact.linkedin || '';
      document.getElementById('pi-website-input').value  = contact.website || '';
      document.getElementById('pi-city-input').value    = address.city || '';
      document.getElementById('pi-state-input').value   = address.state || '';
      document.getElementById('master-pi-modal-overlay').style.display = 'flex';
      _focusedElementBeforeModal = document.activeElement;
      setInitialFocus('master-pi-modal-overlay');
      trapFocus('master-pi-modal-overlay');
    })
    .catch(() => showAlertModal('❌ Error', 'Could not load personal info'));
}

function closePersonalInfoModal() {
  document.getElementById('master-pi-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function savePersonalInfo() {
  const body = {
    name:     document.getElementById('pi-name-input').value.trim(),
    title:    document.getElementById('pi-title-input').value.trim(),
    email:    document.getElementById('pi-email-input').value.trim(),
    phone:    document.getElementById('pi-phone-input').value.trim(),
    linkedin: document.getElementById('pi-linkedin-input').value.trim(),
    website:  document.getElementById('pi-website-input').value.trim(),
    city:     document.getElementById('pi-city-input').value.trim(),
    state:    document.getElementById('pi-state-input').value.trim(),
  };
  try {
    const res  = await fetch('/api/master-data/personal-info', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      closePersonalInfoModal();
      _setMasterChangeNotice('Personal Information', 'updated');
      showAlertModal('✅ Saved', 'Personal information updated.');
      await populateMasterTab();
    } else {
      showAlertModal('❌ Error', data.error || 'Save failed');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save personal info');
  }
}

// ---- Experience modal handlers ----

function showAddExperienceModal() {
  document.getElementById('exp-modal-id').value        = '';
  document.getElementById('exp-title-input').value     = '';
  document.getElementById('exp-company-input').value   = '';
  document.getElementById('exp-city-input').value      = '';
  document.getElementById('exp-state-input').value     = '';
  document.getElementById('exp-start-input').value     = '';
  document.getElementById('exp-end-input').value       = '';
  document.getElementById('exp-type-input').value      = 'full_time';
  document.getElementById('exp-importance-input').value = '5';
  document.getElementById('exp-tags-input').value      = '';
  document.getElementById('master-exp-modal-title').textContent = 'Add Work Experience';
  document.getElementById('master-exp-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-exp-modal-overlay');
  trapFocus('master-exp-modal-overlay');
}

function editMasterExperience(exp) {
  document.getElementById('exp-modal-id').value         = exp.id || '';
  document.getElementById('exp-title-input').value      = exp.title || '';
  document.getElementById('exp-company-input').value    = exp.company || '';
  document.getElementById('exp-city-input').value       = exp.city || '';
  document.getElementById('exp-state-input').value      = exp.state || '';
  document.getElementById('exp-start-input').value      = exp.start_date || '';
  document.getElementById('exp-end-input').value        = exp.end_date || '';
  document.getElementById('exp-type-input').value       = exp.employment_type || 'full_time';
  document.getElementById('exp-importance-input').value  = exp.importance || 5;
  document.getElementById('exp-tags-input').value       = typeof exp.tags === 'string' ? exp.tags
                                                         : (exp.tags || []).join(', ');
  document.getElementById('master-exp-modal-title').textContent = 'Edit Work Experience';
  document.getElementById('master-exp-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-exp-modal-overlay');
  trapFocus('master-exp-modal-overlay');
}

function closeExperienceModal() {
  document.getElementById('master-exp-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function saveMasterExperience() {
  const id     = document.getElementById('exp-modal-id').value.trim();
  const title  = document.getElementById('exp-title-input').value.trim();
  const company = document.getElementById('exp-company-input').value.trim();
  if (!title || !company) {
    showAlertModal('⚠️ Validation', 'Job title and company are required.');
    return;
  }
  const tagsRaw = document.getElementById('exp-tags-input').value;
  const expData = {
    title, company,
    city:            document.getElementById('exp-city-input').value.trim(),
    state:           document.getElementById('exp-state-input').value.trim(),
    start_date:      document.getElementById('exp-start-input').value.trim(),
    end_date:        document.getElementById('exp-end-input').value.trim(),
    employment_type: document.getElementById('exp-type-input').value,
    importance:      parseInt(document.getElementById('exp-importance-input').value, 10) || 5,
    tags:            tagsRaw.split(',').map(s => s.trim()).filter(Boolean),
  };
  const action = id ? 'update' : 'add';
  const body   = action === 'update' ? { action, id, experience: expData } : { action, experience: expData };
  try {
    const res  = await fetch('/api/master-data/experience', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      closeExperienceModal();
      _setMasterChangeNotice('Work Experience', data.action || 'updated');
      showAlertModal('✅ Saved', `Experience "${title}" ${data.action}.`);
      await populateMasterTab();
    } else {
      showAlertModal('❌ Error', data.error || 'Save failed');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save experience');
  }
}

async function deleteMasterExperience(id, title) {
  showConfirmModal(
    '🗑️ Delete Experience',
    `Delete "${title}"? This cannot be undone.`,
    async () => {
      try {
        const res  = await fetch('/api/master-data/experience', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        });
        const data = await res.json();
        if (data.ok) {
          _setMasterChangeNotice('Work Experience', data.action || 'deleted');
          showAlertModal('✅ Deleted', `Experience "${title}" removed.`);
          await populateMasterTab();
        } else {
          showAlertModal('❌ Error', data.error || 'Delete failed');
        }
      } catch (e) {
        showAlertModal('❌ Error', 'Failed to delete experience');
      }
    }
  );
}

// ---- Skill modal handlers ----

function showAddSkillModal(categoryKey, isFlat) {
  document.getElementById('skill-modal-category').value = categoryKey || '';
  document.getElementById('skill-modal-is-flat').value  = isFlat ? '1' : '0';
  document.getElementById('skill-modal-original-name').value = '';
  document.getElementById('skill-name-input').value     = '';
  document.getElementById('skill-experiences-input').value = '';
  document.getElementById('master-skill-modal-title').textContent = 'Add Skill';
  document.getElementById('master-skill-save-btn').textContent = 'Add Skill';
  const hints = (window._masterExperienceOptions || [])
    .slice(0, 8)
    .map((x) => `${x.id} (${x.label})`)
    .join(' · ');
  document.getElementById('skill-experience-hints').textContent = hints ? `Available: ${hints}` : '';
  const catRow = document.getElementById('skill-category-row');
  if (categoryKey) {
    document.getElementById('skill-category-display').textContent = categoryKey;
    catRow.style.display = '';
  } else {
    catRow.style.display = 'none';
  }
  document.getElementById('master-skill-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-skill-modal-overlay');
  trapFocus('master-skill-modal-overlay');
  document.getElementById('skill-name-input').focus();
}

function editMasterSkill(skillObj, categoryKey, isFlat) {
  const name = typeof skillObj === 'string' ? skillObj : (skillObj?.name || '');
  const experiences = Array.isArray(skillObj?.experiences) ? skillObj.experiences : [];

  document.getElementById('skill-modal-category').value = categoryKey || '';
  document.getElementById('skill-modal-is-flat').value  = isFlat ? '1' : '0';
  document.getElementById('skill-modal-original-name').value = name;
  document.getElementById('skill-name-input').value = name;
  document.getElementById('skill-experiences-input').value = experiences.join(', ');
  document.getElementById('master-skill-modal-title').textContent = 'Edit Skill';
  document.getElementById('master-skill-save-btn').textContent = 'Save Skill';

  const hints = (window._masterExperienceOptions || [])
    .slice(0, 8)
    .map((x) => `${x.id} (${x.label})`)
    .join(' · ');
  document.getElementById('skill-experience-hints').textContent = hints ? `Available: ${hints}` : '';

  const catRow = document.getElementById('skill-category-row');
  if (categoryKey) {
    document.getElementById('skill-category-display').textContent = categoryKey;
    catRow.style.display = '';
  } else {
    catRow.style.display = 'none';
  }

  document.getElementById('master-skill-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-skill-modal-overlay');
  trapFocus('master-skill-modal-overlay');
  document.getElementById('skill-name-input').focus();
}

function closeSkillModal() {
  document.getElementById('master-skill-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function saveMasterSkill() {
  const skill    = document.getElementById('skill-name-input').value.trim();
  const category = document.getElementById('skill-modal-category').value.trim();
  const isFlat   = document.getElementById('skill-modal-is-flat').value === '1';
  const original = document.getElementById('skill-modal-original-name').value.trim();
  const experiences = document.getElementById('skill-experiences-input').value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!skill) {
    showAlertModal('⚠️ Validation', 'Skill name is required.');
    return;
  }
  const isUpdate = Boolean(original);
  const baseBody = {
    action: isUpdate ? 'update' : 'add',
    skill: isUpdate ? original : skill,
    ...(isUpdate ? { skill_new: skill } : {}),
    experiences,
  };
  const body = isFlat ? baseBody : { ...baseBody, category };
  try {
    const res  = await fetch('/api/master-data/skill', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      closeSkillModal();
      _setMasterChangeNotice('Skills', data.action || 'updated');
      await populateMasterTab();
    } else {
      showAlertModal('❌ Error', data.error || 'Could not add skill');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to add skill');
  }
}

async function deleteMasterSkill(skill, category, isFlat) {
  const body = isFlat ? { action: 'delete', skill } : { action: 'delete', skill, category };
  const scope = isFlat ? 'Skills' : `Skills → ${category}`;
  showConfirmModal(
    '🗑️ Delete Skill',
    `Delete skill "${skill}" from ${scope}? This cannot be undone.`,
    async () => {
      try {
        const res  = await fetch('/api/master-data/skill', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.ok) {
          _setMasterChangeNotice('Skills', data.action || 'updated');
          await populateMasterTab();
        } else {
          showAlertModal('❌ Error', data.error || 'Could not remove skill');
        }
      } catch (e) {
        showAlertModal('❌ Error', 'Failed to remove skill');
      }
    }
  );
}

// ---- Education modal handlers ----

function showAddEducationModal() {
  document.getElementById('edu-modal-idx').value            = '-1';
  document.getElementById('edu-degree-input').value         = '';
  document.getElementById('edu-field-input').value          = '';
  document.getElementById('edu-institution-input').value    = '';
  document.getElementById('edu-city-input').value           = '';
  document.getElementById('edu-state-input').value          = '';
  document.getElementById('edu-start-year-input').value     = '';
  document.getElementById('edu-end-year-input').value       = '';
  document.getElementById('master-edu-modal-title').textContent = 'Add Education';
  document.getElementById('master-edu-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-edu-modal-overlay');
  trapFocus('master-edu-modal-overlay');
}

function editMasterEducation(edu, idx) {
  document.getElementById('edu-modal-idx').value         = idx;
  document.getElementById('edu-degree-input').value      = edu.degree || '';
  document.getElementById('edu-field-input').value       = edu.field || '';
  document.getElementById('edu-institution-input').value = edu.institution || '';
  document.getElementById('edu-city-input').value        = edu.city || '';
  document.getElementById('edu-state-input').value       = edu.state || '';
  document.getElementById('edu-start-year-input').value  = edu.start_year || '';
  document.getElementById('edu-end-year-input').value    = edu.end_year || '';
  document.getElementById('master-edu-modal-title').textContent = 'Edit Education';
  document.getElementById('master-edu-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-edu-modal-overlay');
  trapFocus('master-edu-modal-overlay');
}

function closeEducationModal() {
  document.getElementById('master-edu-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function saveMasterEducation() {
  const idx     = parseInt(document.getElementById('edu-modal-idx').value, 10);
  const degree  = document.getElementById('edu-degree-input').value.trim();
  const institution = document.getElementById('edu-institution-input').value.trim();
  if (!degree || !institution) {
    showAlertModal('⚠️ Validation', 'Degree and institution are required.');
    return;
  }
  const action = idx >= 0 ? 'update' : 'add';
  const body = {
    action,
    degree,
    field:       document.getElementById('edu-field-input').value.trim(),
    institution,
    city:        document.getElementById('edu-city-input').value.trim(),
    state:       document.getElementById('edu-state-input').value.trim(),
    start_year:  parseInt(document.getElementById('edu-start-year-input').value, 10) || null,
    end_year:    parseInt(document.getElementById('edu-end-year-input').value, 10) || null,
    ...(action === 'update' ? { idx } : {}),
  };
  try {
    const res  = await fetch('/api/master-data/education', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      closeEducationModal();
      _setMasterChangeNotice('Education', data.action || 'updated');
      showAlertModal('✅ Saved', `Education "${degree} – ${institution}" ${data.action}.`);
      await populateMasterTab();
    } else {
      showAlertModal('❌ Error', data.error || 'Save failed');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save education');
  }
}

async function deleteMasterEducation(idx, institution) {
  showConfirmModal(
    '🗑️ Delete Education',
    `Delete "${institution}"? This cannot be undone.`,
    async () => {
      try {
        const res  = await fetch('/api/master-data/education', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', idx }),
        });
        const data = await res.json();
        if (data.ok) {
          _setMasterChangeNotice('Education', data.action || 'deleted');
          showAlertModal('✅ Deleted', `Education entry removed.`);
          await populateMasterTab();
        } else {
          showAlertModal('❌ Error', data.error || 'Delete failed');
        }
      } catch (e) {
        showAlertModal('❌ Error', 'Failed to delete education entry');
      }
    }
  );
}

// ---- Award modal handlers ----

function showAddAwardModal() {
  document.getElementById('award-modal-idx').value    = '-1';
  document.getElementById('award-title-input').value  = '';
  document.getElementById('award-year-input').value   = '';
  document.getElementById('award-desc-input').value   = '';
  document.getElementById('award-relevant-input').value = '';
  document.getElementById('master-award-modal-title').textContent = 'Add Award / Honour';
  document.getElementById('master-award-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-award-modal-overlay');
  trapFocus('master-award-modal-overlay');
}

function editMasterAward(award, idx) {
  document.getElementById('award-modal-idx').value     = idx;
  document.getElementById('award-title-input').value   = award.title || '';
  document.getElementById('award-year-input').value    = award.year || '';
  document.getElementById('award-desc-input').value    = award.description || '';
  document.getElementById('award-relevant-input').value = typeof award.relevant_for === 'string'
    ? award.relevant_for : (award.relevant_for || []).join(', ');
  document.getElementById('master-award-modal-title').textContent = 'Edit Award / Honour';
  document.getElementById('master-award-modal-overlay').style.display = 'flex';
  _focusedElementBeforeModal = document.activeElement;
  setInitialFocus('master-award-modal-overlay');
  trapFocus('master-award-modal-overlay');
}

function closeAwardModal() {
  document.getElementById('master-award-modal-overlay').style.display = 'none';
  restoreFocus();
}

async function saveMasterAward() {
  const idx   = parseInt(document.getElementById('award-modal-idx').value, 10);
  const title = document.getElementById('award-title-input').value.trim();
  if (!title) {
    showAlertModal('⚠️ Validation', 'Award title is required.');
    return;
  }
  const action = idx >= 0 ? 'update' : 'add';
  const relevantRaw = document.getElementById('award-relevant-input').value;
  const body = {
    action, title,
    year:         parseInt(document.getElementById('award-year-input').value, 10) || null,
    description:  document.getElementById('award-desc-input').value.trim(),
    relevant_for: relevantRaw.split(',').map(s => s.trim()).filter(Boolean),
    ...(action === 'update' ? { idx } : {}),
  };
  try {
    const res  = await fetch('/api/master-data/award', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      closeAwardModal();
      _setMasterChangeNotice('Awards & Honours', data.action || 'updated');
      showAlertModal('✅ Saved', `Award "${title}" ${data.action}.`);
      await populateMasterTab();
    } else {
      showAlertModal('❌ Error', data.error || 'Save failed');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to save award');
  }
}

async function deleteMasterAward(idx, title) {
  showConfirmModal(
    '🗑️ Delete Award',
    `Delete "${title}"? This cannot be undone.`,
    async () => {
      try {
        const res  = await fetch('/api/master-data/award', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', idx }),
        });
        const data = await res.json();
        if (data.ok) {
          _setMasterChangeNotice('Awards & Honours', data.action || 'deleted');
          showAlertModal('✅ Deleted', `Award removed.`);
          await populateMasterTab();
        } else {
          showAlertModal('❌ Error', data.error || 'Delete failed');
        }
      } catch (e) {
        showAlertModal('❌ Error', 'Failed to delete award');
      }
    }
  );
}

// ---- Achievement/Summary delete handlers ----

async function deleteMasterAchievement(id, title) {
  showConfirmModal(
    '🗑️ Delete Achievement',
    `Delete "${title}"? This cannot be undone.`,
    async () => {
      try {
        const res  = await fetch('/api/master-data/update-achievement', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        });
        const data = await res.json();
        if (data.ok) {
          _setMasterChangeNotice('Selected Achievements', data.action || 'deleted');
          showAlertModal('✅ Deleted', `Achievement removed.`);
          await populateMasterTab();
        } else {
          showAlertModal('❌ Error', data.error || 'Delete failed');
        }
      } catch (e) {
        showAlertModal('❌ Error', 'Failed to delete achievement');
      }
    }
  );
}

async function deleteMasterSummary(key) {
  showConfirmModal(
    '🗑️ Delete Summary',
    `Delete summary variant "${key}"? This cannot be undone.`,
    async () => {
      try {
        const res  = await fetch('/api/master-data/update-summary', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', key }),
        });
        const data = await res.json();
        if (data.ok) {
          _setMasterChangeNotice('Professional Summaries', data.action || 'deleted');
          showAlertModal('✅ Deleted', `Summary "${key}" removed.`);
          await populateMasterTab();
        } else {
          showAlertModal('❌ Error', data.error || 'Delete failed');
        }
      } catch (e) {
        showAlertModal('❌ Error', 'Failed to delete summary');
      }
    }
  );
}

export {
  populateMasterTab,
  _renderPersonalInfoCard,
  _renderExperiencesList,
  _renderSkillsSection,
  _renderEducationList,
  _renderAwardsList,
  _renderMasterAchievementsTable,
  _renderSummariesList,
  showAddAchievementModal,
  editMasterAchievement,
  closeMasterAchModal,
  saveMasterAchievement,
  showAddSummaryModal,
  editMasterSummary,
  closeMasterSumModal,
  saveMasterSummary,
  showEditPersonalInfoModal,
  closePersonalInfoModal,
  savePersonalInfo,
  showAddExperienceModal,
  editMasterExperience,
  closeExperienceModal,
  saveMasterExperience,
  deleteMasterExperience,
  showAddSkillModal,
  editMasterSkill,
  closeSkillModal,
  saveMasterSkill,
  deleteMasterSkill,
  showAddEducationModal,
  editMasterEducation,
  closeEducationModal,
  saveMasterEducation,
  deleteMasterEducation,
  showAddAwardModal,
  editMasterAward,
  closeAwardModal,
  saveMasterAward,
  deleteMasterAward,
  deleteMasterAchievement,
  deleteMasterSummary,
  loadPublications,
  loadPublicationsBib,
  togglePublicationsView,
  setPublicationSortMode,
  setPublicationGroupMode,
  validatePublicationsBib,
  savePublicationsBib,
  showImportPublicationsModal,
  closeImportPublicationsModal,
  importPublicationsBib,
  showConvertPublicationsModal,
  closeConvertPublicationsModal,
  convertPublicationText,
  importConvertedPublicationText,
  showAddPublicationModal,
  editMasterPublication,
  closePublicationModal,
  saveMasterPublication,
  deleteMasterPublication,
};

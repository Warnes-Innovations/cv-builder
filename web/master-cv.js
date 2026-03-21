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
  try {
    const res  = await fetch('/api/master-data/skill', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      await populateMasterTab();
    } else {
      showAlertModal('❌ Error', data.error || 'Could not remove skill');
    }
  } catch (e) {
    showAlertModal('❌ Error', 'Failed to remove skill');
  }
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
};

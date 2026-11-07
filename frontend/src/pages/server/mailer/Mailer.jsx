import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Send,
  Users,
  User,
  Star,
  Sparkles,
  Wrench,
  ShieldAlert,
  Globe,
  HardDrive,
  Eye,
  Edit3,
  History,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { useToast } from "../../../context/ToastContext";
import {
  getMailerTemplates,
  getMailerRecipients,
  previewMailerEmail,
  sendMailerTest,
  sendMailerBroadcast,
  getMailerHistory,
} from "../../../services/admin.api";
import "./Mailer.css";

const TEMPLATE_ICONS = {
  Wrench: Wrench,
  ShieldAlert: ShieldAlert,
  Sparkles: Sparkles,
  Globe: Globe,
  HardDrive: HardDrive,
  Send: Send,
};

export default function Mailer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const isSuperAdmin = user?.is_owner === true;

  // Tabs: 'compose' | 'preview' | 'history'
  const [activeTab, setActiveTab] = useState("compose");

  // Data
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("server_maintenance");
  const [allUsersList, setAllUsersList] = useState([]);
  const [audienceCounts, setAudienceCounts] = useState({ all: 0, privileged: 0 });
  const [historyList, setHistoryList] = useState([]);

  // Form State
  const [audienceType, setAudienceType] = useState("all"); // 'all' | 'privileged' | 'individual'
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  const [subject, setSubject] = useState("");
  const [badge, setBadge] = useState("");
  const [badgeType, setBadgeType] = useState("warning"); // 'warning' | 'danger' | 'success' | 'info'
  const [body, setBody] = useState("");
  const [enableCta, setEnableCta] = useState(true);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  // Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Action states
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Confirm Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const textareaRef = useRef(null);

  // Load initial templates and recipient data
  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const [tpls, recData, hist] = await Promise.all([
        getMailerTemplates(),
        getMailerRecipients("all"),
        getMailerHistory(50),
      ]);

      setTemplates(tpls);
      setAllUsersList(recData.users || []);
      setAudienceCounts(recData.counts || { all: 0, privileged: 0 });
      setHistoryList(hist || []);

      // If first load, apply default maintenance template
      if (!isRefresh && tpls.length > 0) {
        applyTemplate(tpls[0]);
      }
    } catch (err) {
      toast.error("Failed to load mailer configuration", err.message);
    } finally {
      setLoadingInitial(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  // Apply template values to form
  const applyTemplate = (tpl) => {
    if (!tpl) return;
    setSelectedTemplateKey(tpl.key);
    setSubject(tpl.subject || "");
    setBadge(tpl.badge || "");
    setBadgeType(tpl.badgeType || "info");
    setBody(tpl.body || "");
    if (tpl.ctaLabel && tpl.ctaUrl) {
      setEnableCta(true);
      setCtaLabel(tpl.ctaLabel);
      setCtaUrl(tpl.ctaUrl);
    } else {
      setEnableCta(false);
      setCtaLabel("");
      setCtaUrl("");
    }
  };

  const handleSelectTemplate = (key) => {
    const tpl = templates.find((t) => t.key === key);
    if (tpl) {
      applyTemplate(tpl);
      toast.info("Template Applied", `Loaded "${tpl.name}" draft into editor.`);
    }
  };

  const handleResetTemplate = () => {
    const tpl = templates.find((t) => t.key === selectedTemplateKey);
    if (tpl) {
      applyTemplate(tpl);
      toast.info("Template Reset", `Restored default text for "${tpl.name}".`);
    }
  };

  // Insert helper variable into textarea at cursor position
  const insertVariable = (variable) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((prev) => prev + " " + variable);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = body;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setBody(before + variable + after);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 50);
  };

  // Individual users list filtered by search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsersList;
    const q = userSearch.toLowerCase();
    return allUsersList.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [allUsersList, userSearch]);

  const handleToggleUserSelect = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSelectAllFilteredUsers = () => {
    const filteredIds = filteredUsers.map((u) => u.id);
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleClearSelectedUsers = () => {
    setSelectedUserIds([]);
  };

  // Target count calculation
  const targetCount = useMemo(() => {
    if (audienceType === "all") return audienceCounts.all;
    if (audienceType === "privileged") return audienceCounts.privileged;
    return selectedUserIds.length;
  }, [audienceType, audienceCounts, selectedUserIds]);

  // Fetch live HTML preview when switching to preview tab or typing
  const fetchPreview = async () => {
    try {
      setPreviewLoading(true);
      const res = await previewMailerEmail({
        subject,
        badge,
        badgeType,
        body,
        ctaLabel: enableCta ? ctaLabel : null,
        ctaUrl: enableCta ? ctaUrl : null,
      });
      setPreviewHtml(res.html || "");
    } catch (err) {
      toast.error("Preview Failed", err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "preview") {
      fetchPreview();
    }
  };

  // Send Test Email to Super Admin
  const handleSendTest = async () => {
    if (testing) return;
    try {
      setTesting(true);
      const res = await sendMailerTest({
        subject,
        badge,
        badgeType,
        body,
        ctaLabel: enableCta ? ctaLabel : null,
        ctaUrl: enableCta ? ctaUrl : null,
      });
      toast.success(
        "Test Email Dispatched",
        res.message || `Test preview successfully sent to ${res.data?.recipient}`,
      );
    } catch (err) {
      toast.error("Test Send Failed", err.response?.data?.message || err.message);
    } finally {
      setTesting(false);
    }
  };

  // Open confirmation modal
  const handleOpenBroadcastModal = () => {
    if (!subject.trim()) {
      toast.warning("Subject Required", "Please enter an email subject line.");
      return;
    }
    if (!body.trim()) {
      toast.warning("Body Required", "Please enter the email body content.");
      return;
    }
    if (audienceType === "individual" && selectedUserIds.length === 0) {
      toast.warning("No Recipients", "Please select at least one individual recipient.");
      return;
    }
    if (targetCount === 0) {
      toast.warning("Zero Recipients", "No active users qualify for the selected audience.");
      return;
    }
    setConfirmModalOpen(true);
  };

  // Execute broadcast
  const handleConfirmBroadcast = async () => {
    try {
      setSending(true);
      const res = await sendMailerBroadcast({
        audienceType,
        individualUserIds: audienceType === "individual" ? selectedUserIds : [],
        draft: {
          subject,
          badge,
          badgeType,
          body,
          ctaLabel: enableCta ? ctaLabel : null,
          ctaUrl: enableCta ? ctaUrl : null,
          templateKey: selectedTemplateKey,
        },
      });

      toast.success(
        "Broadcast Completed",
        res.message || `Dispatched to ${res.data?.sent}/${res.data?.total} recipient(s).`,
      );

      setConfirmModalOpen(false);
      // Refresh history
      const hist = await getMailerHistory(50);
      setHistoryList(hist);
      setActiveTab("history");
    } catch (err) {
      toast.error("Broadcast Failed", err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  // Reuse previous broadcast
  const handleReuseBroadcast = (record) => {
    setSubject(record.subject || "");
    setBadge(record.badge_text || "ANNOUNCEMENT");
    setBody(record.body_text || "");
    if (record.cta_label && record.cta_url) {
      setEnableCta(true);
      setCtaLabel(record.cta_label);
      setCtaUrl(record.cta_url);
    } else {
      setEnableCta(false);
      setCtaLabel("");
      setCtaUrl("");
    }
    if (record.template_key) {
      setSelectedTemplateKey(record.template_key);
    }
    setActiveTab("compose");
    toast.info("Broadcast Loaded", `Loaded "${record.subject}" into the editor.`);
  };

  if (!isSuperAdmin) {
    return (
      <div className="mailer-unauthorized">
        <div className="mailer-unauthorized-card">
          <ShieldAlert size={48} className="unauthorized-icon" />
          <h2>Super Admin Access Required</h2>
          <p>The platform broadcast mailer is strictly restricted to the platform owner.</p>
          <button
            type="button"
            className="mailer-btn mailer-btn--primary"
            onClick={() => navigate("/server")}
          >
            Back to Server Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mailer-page">
      {/* Top Header */}
      <div className="mailer-header">
        <button
          type="button"
          className="mailer-back-btn"
          onClick={() => navigate("/server")}
          aria-label="Back to Server Hub"
        >
          <ArrowLeft size={18} />
          <span>Server Hub</span>
        </button>

        <div className="mailer-title-wrap">
          <div className="mailer-badge">
            <ShieldCheck size={14} />
            <span>SuperAdmin Console</span>
          </div>
          <h1>Platform Broadcast & Mailer</h1>
          <p>
            Compose, preview, and dispatch announcements, scheduled maintenance notices, and security advisories to developers.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="mailer-toolbar">
          <div className="mailer-nav-tabs">
            <button
              type="button"
              className={`mailer-nav-tab ${activeTab === "compose" ? "active" : ""}`}
              onClick={() => handleTabChange("compose")}
            >
              <Edit3 size={15} />
              <span>Compose Draft</span>
            </button>

            <button
              type="button"
              className={`mailer-nav-tab ${activeTab === "preview" ? "active" : ""}`}
              onClick={() => handleTabChange("preview")}
            >
              <Eye size={15} />
              <span>Live HTML Preview</span>
            </button>

            <button
              type="button"
              className={`mailer-nav-tab ${activeTab === "history" ? "active" : ""}`}
              onClick={() => handleTabChange("history")}
            >
              <History size={15} />
              <span>Broadcast History ({historyList.length})</span>
            </button>
          </div>

          <div className="mailer-actions-group">
            <button
              type="button"
              className="mailer-test-btn"
              onClick={handleSendTest}
              disabled={testing || !subject.trim() || !body.trim()}
              title="Send a sample email of current draft to your registered admin address"
            >
              <Mail size={15} />
              <span>{testing ? "Sending Test..." : "Send Test to Me"}</span>
            </button>

            <button
              type="button"
              className={`mailer-refresh-btn ${refreshing ? "spinning" : ""}`}
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Refresh recipient counts and history"
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {loadingInitial ? (
        <div className="mailer-loading">
          <div className="mailer-spinner" />
          <span>Loading templates and developer recipients...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: COMPOSE */}
          {activeTab === "compose" && (
            <div className="mailer-compose-layout">
              {/* Left Column: Audience & Templates & Form */}
              <div className="mailer-main-column">
                {/* 1. Audience Selector */}
                <div className="mailer-section-card">
                  <div className="section-card-header">
                    <div className="section-title-wrap">
                      <Users size={18} className="section-icon" />
                      <h2>1. Select Target Audience</h2>
                    </div>
                    <span className="audience-summary-pill">
                      Target: <strong>{targetCount} developer(s)</strong>
                    </span>
                  </div>

                  <div className="audience-options-grid">
                    <label
                      className={`audience-option-card ${audienceType === "all" ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="audienceType"
                        value="all"
                        checked={audienceType === "all"}
                        onChange={() => setAudienceType("all")}
                      />
                      <div className="audience-card-content">
                        <div className="audience-icon-badge">
                          <Users size={20} />
                        </div>
                        <div className="audience-meta">
                          <strong>All Active Developers</strong>
                          <span>Every active, non-disabled registered developer</span>
                        </div>
                        <span className="audience-count-pill">
                          {audienceCounts.all} Users
                        </span>
                      </div>
                    </label>

                    <label
                      className={`audience-option-card ${audienceType === "privileged" ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="audienceType"
                        value="privileged"
                        checked={audienceType === "privileged"}
                        onChange={() => setAudienceType("privileged")}
                      />
                      <div className="audience-card-content">
                        <div className="audience-icon-badge audience-icon-badge--gold">
                          <Star size={20} />
                        </div>
                        <div className="audience-meta">
                          <strong>Privileged Users</strong>
                          <span>Users with Custom Subdomain privilege or Admin access</span>
                        </div>
                        <span className="audience-count-pill audience-count-pill--gold">
                          {audienceCounts.privileged} Users
                        </span>
                      </div>
                    </label>

                    <label
                      className={`audience-option-card ${audienceType === "individual" ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="audienceType"
                        value="individual"
                        checked={audienceType === "individual"}
                        onChange={() => setAudienceType("individual")}
                      />
                      <div className="audience-card-content">
                        <div className="audience-icon-badge audience-icon-badge--cyan">
                          <User size={20} />
                        </div>
                        <div className="audience-meta">
                          <strong>Individual Developer(s)</strong>
                          <span>Manually select one or more specific user accounts</span>
                        </div>
                        <span className="audience-count-pill audience-count-pill--cyan">
                          {selectedUserIds.length} Selected
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Individual Users Picker */}
                  {audienceType === "individual" && (
                    <div className="individual-picker-box">
                      <div className="picker-toolbar">
                        <div className="picker-search-wrap">
                          <Search size={15} />
                          <input
                            type="text"
                            placeholder="Search by username or registered email..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="picker-search-input"
                          />
                          {userSearch && (
                            <button
                              type="button"
                              onClick={() => setUserSearch("")}
                              className="search-clear-btn"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        <div className="picker-quick-actions">
                          <button
                            type="button"
                            onClick={handleSelectAllFilteredUsers}
                            className="picker-btn"
                          >
                            Select All ({filteredUsers.length})
                          </button>
                          {selectedUserIds.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearSelectedUsers}
                              className="picker-btn picker-btn--clear"
                            >
                              Clear All ({selectedUserIds.length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Selected Chips */}
                      {selectedUserIds.length > 0 && (
                        <div className="selected-chips-wrap">
                          <span className="chips-label">Selected:</span>
                          <div className="chips-list">
                            {selectedUserIds.map((id) => {
                              const u = allUsersList.find((x) => x.id === id);
                              if (!u) return null;
                              return (
                                <span key={id} className="user-chip">
                                  <span>{u.username}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserSelect(id)}
                                    title="Remove"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Checklist */}
                      <div className="picker-users-list">
                        {filteredUsers.length === 0 ? (
                          <div className="picker-empty">No matching developers found.</div>
                        ) : (
                          filteredUsers.map((u) => {
                            const isSelected = selectedUserIds.includes(u.id);
                            return (
                              <label
                                key={u.id}
                                className={`picker-user-row ${isSelected ? "checked" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleUserSelect(u.id)}
                                />
                                <div className="picker-user-info">
                                  <strong className="picker-username">{u.username}</strong>
                                  <span className="picker-email">{u.email}</span>
                                </div>
                                <div className="picker-badges">
                                  {u.is_owner && (
                                    <span className="badge-owner">Super Admin</span>
                                  )}
                                  {u.can_custom_subdomain && (
                                    <span className="badge-subdomain">Custom Subdomain</span>
                                  )}
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Standard Templates */}
                <div className="mailer-section-card">
                  <div className="section-card-header">
                    <div className="section-title-wrap">
                      <Sparkles size={18} className="section-icon" />
                      <h2>2. Choose Standard Template (Editable)</h2>
                    </div>
                    <button
                      type="button"
                      className="reset-template-btn"
                      onClick={handleResetTemplate}
                      title="Reset current template back to its default text"
                    >
                      <RotateCcw size={13} />
                      <span>Reset to Template Default</span>
                    </button>
                  </div>

                  <div className="templates-carousel">
                    {templates.map((tpl) => {
                      const IconComponent = TEMPLATE_ICONS[tpl.icon] || Send;
                      const isSelected = selectedTemplateKey === tpl.key;
                      return (
                        <button
                          key={tpl.key}
                          type="button"
                          className={`template-card ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectTemplate(tpl.key)}
                        >
                          <div className={`template-icon-wrap tpl-badge--${tpl.badgeType || "info"}`}>
                            <IconComponent size={18} />
                          </div>
                          <strong className="template-name">{tpl.name}</strong>
                          <span className="template-desc">{tpl.description}</span>
                          <span className="template-category">{tpl.category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Message Composer Form */}
                <div className="mailer-section-card">
                  <div className="section-card-header">
                    <div className="section-title-wrap">
                      <Edit3 size={18} className="section-icon" />
                      <h2>3. Edit Subject, Content & Actions</h2>
                    </div>
                  </div>

                  <div className="composer-form">
                    {/* Subject Line */}
                    <div className="form-group">
                      <label htmlFor="mailer-subject-input">
                        Email Subject Line <span className="req-star">*</span>
                      </label>
                      <input
                        id="mailer-subject-input"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. 🛠️ Scheduled System Maintenance Notice: EchoHub Platform"
                        className="form-input form-input--lg"
                      />
                    </div>

                    {/* Badge Category Tag & Badge Type */}
                    <div className="form-row-grid">
                      <div className="form-group">
                        <label htmlFor="mailer-badge-input">Category Header Badge</label>
                        <input
                          id="mailer-badge-input"
                          type="text"
                          value={badge}
                          onChange={(e) => setBadge(e.target.value)}
                          placeholder="e.g. SCHEDULED MAINTENANCE, SECURITY ADVISORY"
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label>Badge Color Tone</label>
                        <div className="badge-color-selector">
                          {[
                            { id: "warning", label: "Warning (Amber)" },
                            { id: "danger", label: "Urgent (Red)" },
                            { id: "success", label: "Release (Green)" },
                            { id: "info", label: "Notice (Cyan)" },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={`color-pill pill--${t.id} ${badgeType === t.id ? "active" : ""}`}
                              onClick={() => setBadgeType(t.id)}
                            >
                              <span>{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Body Content Editor */}
                    <div className="form-group">
                      <div className="textarea-label-row">
                        <label htmlFor="mailer-body-textarea">
                          Message Body (Markdown & Bullets supported){" "}
                          <span className="req-star">*</span>
                        </label>
                        <div className="var-helpers">
                          <span className="var-helper-label">Insert:</span>
                          {[
                            { label: "{{username}}", val: "{{username}}" },
                            { label: "{{email}}", val: "{{email}}" },
                            { label: "{{frontendUrl}}", val: "{{frontendUrl}}" },
                            { label: "{{date}}", val: "{{date}}" },
                          ].map((v) => (
                            <button
                              key={v.val}
                              type="button"
                              className="var-pill"
                              onClick={() => insertVariable(v.val)}
                              title={`Insert dynamic placeholder ${v.val}`}
                            >
                              + {v.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        id="mailer-body-textarea"
                        ref={textareaRef}
                        rows={12}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Compose your announcement message here..."
                        className="form-textarea"
                      />
                      <span className="field-hint">
                        Tip: Use <code>**bold**</code> for strong text, <code>• bullet items</code> for lists, and dynamic placeholders like <code>{`{{username}}`}</code> to personalize.
                      </span>
                    </div>

                    {/* Call to Action Button Toggle */}
                    <div className="cta-config-card">
                      <div className="cta-toggle-row">
                        <label className="cta-checkbox-label">
                          <input
                            type="checkbox"
                            checked={enableCta}
                            onChange={(e) => setEnableCta(e.target.checked)}
                          />
                          <span>Include Call-to-Action (CTA) Button</span>
                        </label>
                        <span className="cta-hint">Direct users to an active link or platform dashboard</span>
                      </div>

                      {enableCta && (
                        <div className="cta-inputs-grid">
                          <div className="form-group">
                            <label>Button Label</label>
                            <input
                              type="text"
                              value={ctaLabel}
                              onChange={(e) => setCtaLabel(e.target.value)}
                              placeholder="e.g. Check System Health"
                              className="form-input"
                            />
                          </div>

                          <div className="form-group">
                            <label>Target URL</label>
                            <input
                              type="text"
                              value={ctaUrl}
                              onChange={(e) => setCtaUrl(e.target.value)}
                              placeholder="e.g. {{frontendUrl}}/server/health"
                              className="form-input"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Dispatch Actions */}
                    <div className="composer-footer-actions">
                      <button
                        type="button"
                        className="preview-tab-shortcut-btn"
                        onClick={() => handleTabChange("preview")}
                      >
                        <Eye size={16} />
                        <span>Preview Email Output</span>
                      </button>

                      <div className="send-actions-wrap">
                        <button
                          type="button"
                          className="test-email-btn"
                          onClick={handleSendTest}
                          disabled={testing || !subject.trim() || !body.trim()}
                        >
                          <Mail size={16} />
                          <span>{testing ? "Sending..." : "Test to My Inbox"}</span>
                        </button>

                        <button
                          type="button"
                          className="dispatch-broadcast-btn"
                          onClick={handleOpenBroadcastModal}
                          disabled={sending || targetCount === 0 || !subject.trim() || !body.trim()}
                        >
                          <Send size={16} />
                          <span>
                            Dispatch Broadcast ({targetCount} {targetCount === 1 ? "User" : "Users"})
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE HTML PREVIEW */}
          {activeTab === "preview" && (
            <div className="mailer-preview-layout">
              <div className="preview-top-bar">
                <div className="preview-meta-info">
                  <span className="preview-indicator">
                    <Eye size={16} />
                    <span>Live Responsive Preview</span>
                  </span>
                  <span className="preview-recipient-sample">
                    Sample View for: <strong>{user?.username} ({user?.email})</strong>
                  </span>
                </div>

                <div className="preview-actions">
                  <button
                    type="button"
                    className="preview-btn preview-btn--edit"
                    onClick={() => setActiveTab("compose")}
                  >
                    <Edit3 size={15} />
                    <span>Return to Editor</span>
                  </button>

                  <button
                    type="button"
                    className="preview-btn preview-btn--send"
                    onClick={handleOpenBroadcastModal}
                    disabled={targetCount === 0}
                  >
                    <Send size={15} />
                    <span>Send to {targetCount} Recipient(s)</span>
                  </button>
                </div>
              </div>

              {previewLoading ? (
                <div className="preview-loading-card">
                  <div className="mailer-spinner" />
                  <span>Rendering live HTML markup...</span>
                </div>
              ) : (
                <div className="preview-stage-container">
                  <div className="email-client-mockup">
                    <div className="email-client-header">
                      <div className="mockup-dots">
                        <span className="dot dot--red" />
                        <span className="dot dot--yellow" />
                        <span className="dot dot--green" />
                      </div>
                      <div className="mockup-subject-row">
                        <strong>Subject:</strong> <span>{subject || "(No Subject)"}</span>
                      </div>
                      <div className="mockup-from-row">
                        <span>From:</span> <strong>"EchoHub" &lt;noreply@devpiyush.in&gt;</strong>
                        <span className="mockup-divider">•</span>
                        <span>To:</span> <span>{user?.email}</span>
                      </div>
                    </div>

                    <div
                      className="email-client-body"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BROADCAST HISTORY */}
          {activeTab === "history" && (
            <div className="mailer-history-layout">
              <div className="history-header-card">
                <h2>Broadcast Audit Trail</h2>
                <p>Log of previous platform notifications, maintenance notices, and broadcast dispatches.</p>
              </div>

              {historyList.length === 0 ? (
                <div className="history-empty-card">
                  <History size={40} className="empty-icon" />
                  <h3>No Broadcasts Sent Yet</h3>
                  <p>When you dispatch broadcasts to users, they will appear here with delivery metrics.</p>
                  <button
                    type="button"
                    className="mailer-btn mailer-btn--primary"
                    onClick={() => setActiveTab("compose")}
                  >
                    Compose Your First Broadcast
                  </button>
                </div>
              ) : (
                <div className="history-grid">
                  {historyList.map((item) => (
                    <div key={item.id} className="history-card">
                      <div className="history-card-top">
                        <div className="history-badge-row">
                          <span className="history-badge">
                            {item.badge_text || "ANNOUNCEMENT"}
                          </span>
                          <span className="history-audience-tag">
                            {item.audience_type?.toUpperCase()}
                          </span>
                        </div>
                        <span className="history-time">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>

                      <h3 className="history-subject">{item.subject}</h3>

                      <p className="history-summary">{item.recipients_summary}</p>

                      <div className="history-stats-bar">
                        <span className="stat-item stat-item--success">
                          <CheckCircle2 size={14} />
                          <strong>{item.success_count} Delivered</strong>
                        </span>
                        {item.failure_count > 0 && (
                          <span className="stat-item stat-item--fail">
                            <XCircle size={14} />
                            <strong>{item.failure_count} Failed</strong>
                          </span>
                        )}
                        <span className="stat-item stat-item--total">
                          <strong>Total: {item.recipient_count}</strong>
                        </span>
                      </div>

                      <div className="history-actions">
                        <button
                          type="button"
                          className="reuse-template-btn"
                          onClick={() => handleReuseBroadcast(item)}
                          title="Load this broadcast into editor"
                        >
                          <Edit3 size={14} />
                          <span>Reuse in Editor</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModalOpen && (
        <div className="mailer-modal-backdrop">
          <div className="mailer-modal-card">
            <div className="mailer-modal-header">
              <div className="modal-title-wrap">
                <AlertTriangle size={24} className="warning-icon" />
                <h3>Confirm Broadcast Dispatch</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setConfirmModalOpen(false)}
                disabled={sending}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mailer-modal-body">
              <p className="modal-alert-desc">
                You are about to dispatch an official platform email broadcast. Please verify the distribution details:
              </p>

              <div className="modal-summary-box">
                <div className="summary-row">
                  <span className="summary-label">Target Audience:</span>
                  <strong className="summary-val">
                    {audienceType === "all"
                      ? "All Active Developers"
                      : audienceType === "privileged"
                      ? "Privileged Developers"
                      : "Selected Individual Developers"}
                  </strong>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Total Recipients:</span>
                  <strong className="summary-val summary-val--count">
                    {targetCount} Registered Developer(s)
                  </strong>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Subject:</span>
                  <span className="summary-val">{subject}</span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Category Badge:</span>
                  <span className="summary-val">{badge || "ANNOUNCEMENT"}</span>
                </div>
              </div>

              <div className="modal-disclaimer">
                ⚠️ Each recipient will receive an individualized email delivered directly to their registered account email address.
              </div>
            </div>

            <div className="mailer-modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn--cancel"
                onClick={() => setConfirmModalOpen(false)}
                disabled={sending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-btn modal-btn--send"
                onClick={handleConfirmBroadcast}
                disabled={sending}
              >
                {sending ? (
                  <span className="btn-spinner-wrap">
                    <span className="btn-spinner" />
                    Dispatching to {targetCount} Users...
                  </span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Confirm & Dispatch Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

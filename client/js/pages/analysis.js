/**
 * Resume Analysis Page Controller (pages/analysis.js)
 * Manages AI ATS analysis rendering, animated score gauges, category cards, and actionable suggestions.
 */

import { authService } from '../services/auth.service.js';
import {
  triggerAnalysisApi,
  getAnalysisByIdApi,
  getUserAnalysesApi,
  getLatestAnalysisForResumeApi
} from '../api/analysis.api.js';
import { showToast } from '../components/toast.js';
import { renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication guard
  const isAuthenticated = await authService.requireAuthGuard();
  if (!isAuthenticated) return;

  const urlParams = new URLSearchParams(window.location.search);
  const analysisId = urlParams.get('id');
  const resumeId = urlParams.get('resumeId');
  const shouldTrigger = urlParams.get('trigger') === 'true';

  const loadingOverlay = document.getElementById('analysis-loading-overlay');
  const contentWrapper = document.getElementById('analysis-content-wrapper');
  const emptyState = document.getElementById('analysis-empty-state');

  // Score Elements
  const gaugeScoreEl = document.getElementById('ats-gauge-score');
  const gaugeCircleFill = document.getElementById('ats-gauge-fill');
  const scoreTitleEl = document.getElementById('ats-score-title');
  const scoreBadgeEl = document.getElementById('ats-score-badge');
  const scoreDescEl = document.getElementById('ats-score-description');
  const resumeFileTitle = document.getElementById('analysis-file-title');
  const topbarFileName = document.getElementById('topbar-file-name');

  // Breakdown Containers
  const categoriesGrid = document.getElementById('categories-score-grid');
  const strengthsList = document.getElementById('strengths-list');
  const weaknessesList = document.getElementById('weaknesses-list');
  const suggestionsContainer = document.getElementById('suggestions-container');
  const technicalSkillsContainer = document.getElementById('technical-skills-chips');
  const softSkillsContainer = document.getElementById('soft-skills-chips');
  const missingSkillsContainer = document.getElementById('missing-skills-chips');
  const trendingSkillsContainer = document.getElementById('trending-skills-chips');

  function renderScoreGauge(score) {
    const rounded = Math.round(score);
    if (gaugeScoreEl) gaugeScoreEl.textContent = rounded;

    // SVG radial gauge circumference: 2 * PI * 50 = ~314.15
    const circumference = 314.15;
    const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);

    if (gaugeCircleFill) {
      gaugeCircleFill.style.strokeDashoffset = offset;

      if (score >= 80) {
        gaugeCircleFill.setAttribute('stroke', 'url(#score-gradient-green)');
        if (scoreBadgeEl) {
          scoreBadgeEl.className = 'badge badge--success';
          scoreBadgeEl.textContent = 'Ready to Apply';
        }
        if (scoreTitleEl) scoreTitleEl.textContent = 'Strong ATS Compatibility';
      } else if (score >= 70) {
        gaugeCircleFill.setAttribute('stroke', '#06b6d4');
        if (scoreBadgeEl) {
          scoreBadgeEl.className = 'badge badge--primary';
          scoreBadgeEl.textContent = 'Good Match';
        }
        if (scoreTitleEl) scoreTitleEl.textContent = 'Good ATS Alignment';
      } else if (score >= 50) {
        gaugeCircleFill.setAttribute('stroke', '#f59e0b');
        if (scoreBadgeEl) {
          scoreBadgeEl.className = 'badge badge--warning';
          scoreBadgeEl.textContent = 'Needs Optimization';
        }
        if (scoreTitleEl) scoreTitleEl.textContent = 'Moderate ATS Compatibility';
      } else {
        gaugeCircleFill.setAttribute('stroke', '#ef4444');
        if (scoreBadgeEl) {
          scoreBadgeEl.className = 'badge badge--danger';
          scoreBadgeEl.textContent = 'Significant Gaps';
        }
        if (scoreTitleEl) scoreTitleEl.textContent = 'Low ATS Compatibility';
      }
    }
  }

  function renderCategoryCards(breakdown = {}) {
    if (!categoriesGrid) return;

    const categories = [
      { key: 'skillsAnalysis', title: 'Skills Relevance', max: 20, desc: 'Technical & domain skill coverage' },
      { key: 'experienceQuality', title: 'Experience Quality', max: 20, desc: 'Work history depth & responsibility' },
      { key: 'structureFormatting', title: 'Structure & Formatting', max: 15, desc: 'ATS layout hierarchy & readability' },
      { key: 'keywordRelevance', title: 'Keyword Density', max: 15, desc: 'Keyword frequency and domain alignment' },
      { key: 'quantifiableAchievements', title: 'Quantifiable Impact', max: 10, desc: 'Metrics, %, and scale in bullets' },
      { key: 'educationRelevance', title: 'Education & Credentials', max: 10, desc: 'Degrees, certifications & dates' },
      { key: 'sectionCompleteness', title: 'Section Completeness', max: 10, desc: 'Standard ATS section coverage' }
    ];

    categoriesGrid.innerHTML = categories
      .map((cat) => {
        const item = breakdown[cat.key] || { score: 0, maxScore: cat.max, details: cat.desc };
        const percent = Math.round((item.score / cat.max) * 100);
        const scoreColor = percent >= 80 ? 'text-success' : percent >= 60 ? 'text-accent' : 'text-warning';

        return `
          <div class="category-score-card">
            <div class="d-flex justify-between items-center mb-xs">
              <span class="text-sm font-semibold text-primary">${cat.title}</span>
              <span class="font-mono font-bold ${scoreColor}">${item.score} / ${cat.max}</span>
            </div>
            <div class="progress-bar mb-xs">
              <div class="progress-bar__fill" style="width: ${percent}%;"></div>
            </div>
            <p class="text-xs text-muted">${item.details || cat.desc}</p>
          </div>
        `;
      })
      .join('');
  }

  function renderReport(analysis) {
    if (!analysis) return;

    if (emptyState) emptyState.classList.add('d-none');
    if (contentWrapper) contentWrapper.classList.remove('d-none');

    const fileName = analysis.resumeId?.file?.originalName || 'Resume.pdf';
    if (topbarFileName) topbarFileName.textContent = fileName;
    if (resumeFileTitle) resumeFileTitle.textContent = fileName;

    // Score and Insights
    renderScoreGauge(analysis.atsScore?.overall || 0);
    if (scoreDescEl) {
      scoreDescEl.textContent =
        analysis.aiInsights ||
        'Your resume has been comprehensively evaluated across modern recruitment ATS standards.';
    }

    // 7 Category Cards
    renderCategoryCards(analysis.atsScore?.breakdown || {});

    // Strengths
    if (strengthsList) {
      strengthsList.innerHTML = (analysis.strengths || [])
        .map(
          (s) => `
            <li class="d-flex items-start gap-sm text-sm">
              <i data-lucide="check-circle-2" style="color: var(--color-success); flex-shrink: 0; width:18px; height:18px; margin-top:2px;"></i>
              <span class="text-secondary">${s}</span>
            </li>
          `
        )
        .join('');
    }

    // Weaknesses
    if (weaknessesList) {
      weaknessesList.innerHTML = (analysis.weaknesses || [])
        .map(
          (w) => `
            <li class="d-flex items-start gap-sm text-sm">
              <i data-lucide="alert-circle" style="color: var(--color-warning); flex-shrink: 0; width:18px; height:18px; margin-top:2px;"></i>
              <span class="text-secondary">${w}</span>
            </li>
          `
        )
        .join('');
    }

    // Suggestions
    if (suggestionsContainer) {
      suggestionsContainer.innerHTML = (analysis.suggestions || [])
        .map((s) => {
          const badgeClass =
            s.priority === 'high'
              ? 'badge--danger'
              : s.priority === 'medium'
              ? 'badge--warning'
              : 'badge--secondary';

          return `
            <div class="card p-xl mb-lg" style="border-left: 4px solid var(--color-${s.priority === 'high' ? 'danger' : s.priority === 'medium' ? 'warning' : 'primary'});">
              <div class="d-flex justify-between items-center mb-xs">
                <span class="badge ${badgeClass} text-uppercase font-bold">${s.priority} Priority • ${s.category}</span>
              </div>
              <p class="text-sm font-semibold text-primary mb-sm">${s.suggestion}</p>
              ${
                s.example
                  ? `
                <div class="p-md" style="background: rgba(0, 0, 0, 0.25); border-radius: var(--radius-md); font-family: monospace; font-size: var(--text-xs); color: var(--color-accent-light);">
                  <strong>Example:</strong> ${s.example}
                </div>
              `
                  : ''
              }
            </div>
          `;
        })
        .join('');
    }

    // Skills Chips
    const skills = analysis.skillsAnalysis || {};
    if (technicalSkillsContainer) {
      technicalSkillsContainer.innerHTML = (skills.technical || [])
        .map((sk) => `<span class="badge badge--primary font-mono">${sk}</span>`)
        .join(' ');
    }
    if (softSkillsContainer) {
      softSkillsContainer.innerHTML = (skills.soft || [])
        .map((sk) => `<span class="badge badge--secondary font-mono">${sk}</span>`)
        .join(' ');
    }
    if (missingSkillsContainer) {
      missingSkillsContainer.innerHTML = (skills.missing || [])
        .map((sk) => `<span class="badge badge--danger font-mono"><i data-lucide="plus" style="width:10px;height:10px;"></i> ${sk}</span>`)
        .join(' ');
    }
    if (trendingSkillsContainer) {
      trendingSkillsContainer.innerHTML = (skills.trending || [])
        .map((sk) => `<span class="badge badge--success font-mono"><i data-lucide="trending-up" style="width:10px;height:10px;"></i> ${sk}</span>`)
        .join(' ');
    }

    renderIcons();
  }

  // Orchestrate Analysis Loading or Execution
  try {
    if (shouldTrigger && resumeId) {
      // Show loading overlay
      if (loadingOverlay) loadingOverlay.classList.remove('d-none');
      if (contentWrapper) contentWrapper.classList.add('d-none');

      const response = await triggerAnalysisApi(resumeId);
      const analysis = response?.data?.analysis;

      if (loadingOverlay) loadingOverlay.classList.add('d-none');
      showToast('AI ATS Analysis completed successfully!', 'success');
      renderReport(analysis);
    } else if (analysisId) {
      const response = await getAnalysisByIdApi(analysisId);
      renderReport(response?.data?.analysis);
    } else if (resumeId) {
      const response = await getLatestAnalysisForResumeApi(resumeId);
      renderReport(response?.data?.analysis);
    } else {
      // Load user's latest analysis
      const response = await getUserAnalysesApi(1, 1);
      const analyses = response?.data?.analyses || [];
      if (analyses.length > 0) {
        renderReport(analyses[0]);
      } else {
        if (contentWrapper) contentWrapper.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
      }
    }
  } catch (err) {
    if (loadingOverlay) loadingOverlay.classList.add('d-none');
    showToast(err.message || 'Failed to load resume analysis', 'error');
    if (emptyState) emptyState.classList.remove('d-none');
  }
});

/**
 * Resume Upload Page Controller (pages/upload.js)
 * Manages drag-and-drop file upload, progress feedback, and server communication.
 */

import { authService } from '../services/auth.service.js';
import { setupFileUpload } from '../components/fileUpload.js';
import { uploadResumeApi } from '../api/resume.api.js';
import { showToast } from '../components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication guard
  const isAuthenticated = await authService.requireAuthGuard();
  if (!isAuthenticated) return;

  const uploadBtn = document.getElementById('btn-run-upload');
  const progressCard = document.getElementById('upload-progress-card');
  const progressBarFill = document.getElementById('upload-progress-fill');
  const progressStatusText = document.getElementById('upload-status-text');

  const fileUploader = setupFileUpload({
    dropzoneSelector: '#resume-dropzone',
    inputSelector: '#resume-file-input',
    previewSelector: '#selected-file-card',
    fileNameSelector: '#selected-file-name',
    fileSizeSelector: '#selected-file-size',
    removeBtnSelector: '#btn-remove-file',
    maxSizeMb: 5,
    onFileSelected: () => {
      if (uploadBtn) uploadBtn.disabled = false;
    },
    onReset: () => {
      if (uploadBtn) uploadBtn.disabled = true;
      if (progressCard) progressCard.classList.add('d-none');
    }
  });

  if (!uploadBtn) return;

  uploadBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const file = fileUploader?.getFile();
    if (!file) {
      showToast('Please select or drop a PDF resume first', 'warning');
      return;
    }

    // Set UI loading state
    const originalBtnText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="spinner spinner--sm"></span> Uploading Resume...';

    if (progressCard) progressCard.classList.remove('d-none');
    if (progressBarFill) progressBarFill.style.width = '30%';
    if (progressStatusText) progressStatusText.textContent = 'Uploading to secure storage...';

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (progressBarFill) progressBarFill.style.width = '70%';

      const response = await uploadResumeApi(formData);

      if (progressBarFill) progressBarFill.style.width = '100%';
      if (progressStatusText) progressStatusText.textContent = 'Upload complete & verified';

      showToast('Resume uploaded successfully!', 'success');

      // Navigate to History page
      setTimeout(() => {
        window.location.href = 'history.html';
      }, 700);
    } catch (err) {
      showToast(err.message || 'Failed to upload resume', 'error');
      if (progressBarFill) progressBarFill.style.width = '0%';
      if (progressStatusText) progressStatusText.textContent = 'Upload failed';
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = originalBtnText;
    }
  });
});

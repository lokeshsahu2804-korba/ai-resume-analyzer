/**
 * Drag and Drop File Upload Component (components/fileUpload.js)
 * Manages dropzone interactions, file selection previews, and client-side validation.
 */

import { qs } from '../utils/dom.js';
import { showToast } from './toast.js';

export function setupFileUpload(options = {}) {
  const dropzone = qs(options.dropzoneSelector || '#resume-dropzone');
  const fileInput = qs(options.inputSelector || '#resume-file-input');
  const previewContainer = qs(options.previewSelector || '#selected-file-card');
  const fileNameEl = qs(options.fileNameSelector || '#selected-file-name');
  const fileSizeEl = qs(options.fileSizeSelector || '#selected-file-size');
  const removeBtn = qs(options.removeBtnSelector || '#btn-remove-file');

  let selectedFile = null;
  const MAX_BYTES = (options.maxSizeMb || 5) * 1024 * 1024;

  if (!dropzone || !fileInput) return null;

  // Prevent browser default drop behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Highlight dropzone on drag
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.add('dropzone--active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.remove('dropzone--active');
    });
  });

  function validateAndSelect(file) {
    if (!file) return false;

    // Check MIME and Extension
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      showToast('Please upload a PDF document (.pdf)', 'error');
      return false;
    }

    // Check Size
    if (file.size > MAX_BYTES) {
      showToast(`File exceeds maximum size of ${options.maxSizeMb || 5}MB`, 'error');
      return false;
    }

    selectedFile = file;

    // Update Preview UI
    if (previewContainer) previewContainer.classList.remove('d-none');
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload`;

    if (options.onFileSelected) {
      options.onFileSelected(file);
    }

    return true;
  }

  // Handle Drop
  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      validateAndSelect(files[0]);
    }
  });

  // Handle Click / Browse
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelect(files[0]);
    }
  });

  // Handle File Removal
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      reset();
    });
  }

  function reset() {
    selectedFile = null;
    fileInput.value = '';
    if (previewContainer) previewContainer.classList.add('d-none');
    if (options.onReset) options.onReset();
  }

  return {
    getFile: () => selectedFile,
    reset
  };
}

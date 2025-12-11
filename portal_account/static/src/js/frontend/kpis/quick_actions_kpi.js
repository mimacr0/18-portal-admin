/**
 * Dashboard Import Modals with Drag & Drop support
 */

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generic file upload modal setup
function setupFileUploadModal(config) {
    const {
        modalId,
        openButtonId,
        fileInputId,
        dropAreaId,
        browseLinkId,
        previewId,
        errorId,
        uploadButtonId,
        uploadUrl,
        onSuccess
    } = config;

    const modal = document.getElementById(modalId);
    const openButton = document.getElementById(openButtonId);
    const fileInput = document.getElementById(fileInputId);
    const dropArea = document.getElementById(dropAreaId);
    const browseLink = document.getElementById(browseLinkId);
    const preview = document.getElementById(previewId);
    const errorDiv = document.getElementById(errorId);
    const uploadButton = document.getElementById(uploadButtonId);

    if (!modal) return;

    let selectedFiles = [];

    // Reset form
    function resetForm() {
        if (fileInput) fileInput.value = '';
        if (preview) preview.innerHTML = '';
        if (errorDiv) errorDiv.classList.add('invisible');
        selectedFiles = [];
    }

    // Update file preview
    function updateFilePreview() {
        if (!preview) return;
        preview.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item flex items-center justify-between w-full p-2 mb-2 rounded-md border border-gray-300 dark:border-gray-700';

            const fileSize = formatFileSize(file.size);
            fileItem.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-file-excel text-green-600 mr-2"></i>
                    <span class="text-sm text-gray-700 dark:text-gray-300">${file.name} <span class="text-xs text-gray-400">(${fileSize})</span></span>
                </div>
                <button type="button" class="delete-file-btn text-gray-500 hover:text-red-500" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            preview.appendChild(fileItem);

            // Delete button handler
            fileItem.querySelector('.delete-file-btn').addEventListener('click', () => {
                selectedFiles = selectedFiles.filter((_, i) => i !== index);
                updateFilePreview();
            });
        });

        if (errorDiv) errorDiv.classList.add('invisible');
    }

    // Validate files
    function validateFiles() {
        if (selectedFiles.length === 0) {
            if (errorDiv) {
                errorDiv.textContent = 'Please select a file to upload.';
                errorDiv.classList.remove('invisible');
            }
            return false;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        const oversizedFiles = selectedFiles.filter(f => f.size > maxSize);
        if (oversizedFiles.length > 0) {
            if (errorDiv) {
                errorDiv.textContent = 'File exceeds maximum size of 5MB.';
                errorDiv.classList.remove('invisible');
            }
            return false;
        }

        return true;
    }

    // Open modal button
    if (openButton) {
        openButton.addEventListener('click', () => {
            resetForm();
            Modal.open(modalId);
        });
    }

    // Drag & drop events
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('border-primary-theme', 'bg-gray-50', 'dark:bg-gray-700');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('border-primary-theme', 'bg-gray-50', 'dark:bg-gray-700');
            }, false);
        });

        // Handle drop
        dropArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0 && fileInput) {
                const dataTransfer = new DataTransfer();
                for (let i = 0; i < files.length; i++) {
                    dataTransfer.items.add(files[i]);
                }
                fileInput.files = dataTransfer.files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, false);

        // Click to browse
        dropArea.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    // Browse link
    if (browseLink) {
        browseLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (fileInput) fileInput.click();
        });
    }

    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            selectedFiles = Array.from(fileInput.files);
            updateFilePreview();
        });
    }

    // Upload button
    if (uploadButton) {
        uploadButton.addEventListener('click', async () => {
            if (!validateFiles()) return;

            const formData = new FormData();
            if (selectedFiles.length > 0) {
                formData.append('file', selectedFiles[0]);
            }

            // Show loading state
            uploadButton.disabled = true;
            const originalContent = uploadButton.innerHTML;
            uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';

            try {
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (result.status === 'success') {
                    Modal.close(modalId);
                    resetForm();
                    if (window.systemShowNotification) {
                        systemShowNotification(result.message, { type: 'success' });
                    } else {
                        alert(result.message);
                    }
                    if (onSuccess) onSuccess(result);
                } else {
                    let errorMsg = result.message || 'Error importing file';
                    if (result.errors && result.errors.length > 0) {
                        errorMsg += ':\n' + result.errors.slice(0, 5).join('\n');
                        if (result.errors.length > 5) {
                            errorMsg += `\n... and ${result.errors.length - 5} more errors`;
                        }
                    }
                    if (errorDiv) {
                        errorDiv.textContent = errorMsg;
                        errorDiv.classList.remove('invisible');
                    }
                    if (window.systemShowNotification) {
                        systemShowNotification(errorMsg, { type: 'error' });
                    }
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                if (errorDiv) {
                    errorDiv.textContent = 'Error uploading file. Please try again.';
                    errorDiv.classList.remove('invisible');
                }
            } finally {
                uploadButton.disabled = false;
                uploadButton.innerHTML = originalContent;
            }
        });
    }
}

export const setupDashboardImportReceptionsModal = () => {
    setupFileUploadModal({
        modalId: 'dashboard-page-import-receptions-modal',
        openButtonId: 'dashboard-page-import-receptions-button',
        fileInputId: 'receptions-file-input',
        dropAreaId: 'receptions-file-drop-area',
        browseLinkId: 'receptions-browse-link',
        previewId: 'receptions-file-preview',
        errorId: 'receptions-file-error',
        uploadButtonId: 'receptions-upload-btn',
        uploadUrl: '/account/dashboard/import_receptions',
        onSuccess: () => {
            // Optionally refresh dashboard data
        }
    });
};

export const setupDashboardImportExpeditionsModal = () => {
    setupFileUploadModal({
        modalId: 'dashboard-page-import-expeditions-modal',
        openButtonId: 'dashboard-page-import-expeditions-button',
        fileInputId: 'expeditions-file-input',
        dropAreaId: 'expeditions-file-drop-area',
        browseLinkId: 'expeditions-browse-link',
        previewId: 'expeditions-file-preview',
        errorId: 'expeditions-file-error',
        uploadButtonId: 'expeditions-upload-btn',
        uploadUrl: '/account/dashboard/import_expeditions',
        onSuccess: () => {
            // Optionally refresh dashboard data
        }
    });
};

export const updateAccountQuickActionssKpis = () => {
    setupDashboardImportReceptionsModal();
    setupDashboardImportExpeditionsModal();
};

/**
 * Stock Products Import Modal Handler
 */

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Track initialized modals to prevent duplicate event listeners
const initializedModals = new Set();

/**
 * Setup the products import modal with drag & drop support
 */
export function setupProductsImportModal(onSuccess) {
    const modalId = 'page-stock-import-products-modal';
    const fileInputId = 'stock-products-file-input';
    const dropAreaId = 'stock-products-file-drop-area';
    const browseLinkId = 'stock-products-browse-link';
    const previewId = 'stock-products-file-preview';
    const errorId = 'stock-products-file-error';
    const uploadButtonId = 'stock-products-upload-btn';
    const uploadUrl = '/account/stock/import_products';

    // Prevent duplicate initialization
    if (initializedModals.has(modalId)) {
        return;
    }

    const modal = document.getElementById(modalId);
    const fileInput = document.getElementById(fileInputId);
    const dropArea = document.getElementById(dropAreaId);
    const browseLink = document.getElementById(browseLinkId);
    const preview = document.getElementById(previewId);
    const errorDiv = document.getElementById(errorId);
    const uploadButton = document.getElementById(uploadButtonId);

    if (!modal) return;

    // Mark as initialized
    initializedModals.add(modalId);

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

        const file = selectedFiles[0];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (file.size > maxSize) {
            if (errorDiv) {
                errorDiv.textContent = 'File size exceeds 5MB limit.';
                errorDiv.classList.remove('invisible');
            }
            return false;
        }

        const validExtensions = ['.xlsx', '.xls'];
        const fileName = file.name.toLowerCase();
        if (!validExtensions.some(ext => fileName.endsWith(ext))) {
            if (errorDiv) {
                errorDiv.textContent = 'Please select an Excel file (.xlsx or .xls)';
                errorDiv.classList.remove('invisible');
            }
            return false;
        }

        return true;
    }

    // Handle file selection
    function handleFiles(files) {
        selectedFiles = Array.from(files).slice(0, 1); // Only one file
        updateFilePreview();
    }

    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        });
    }

    // Browse link click
    if (browseLink) {
        browseLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (fileInput) fileInput.click();
        });
    }

    // Drag & drop events
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('border-primary-theme', 'bg-gray-50', 'dark:bg-gray-700');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('border-primary-theme', 'bg-gray-50', 'dark:bg-gray-700');
            });
        });

        dropArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFiles(files);
            }
        });

        // Click on drop area
        dropArea.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    // Upload button click
    if (uploadButton) {
        uploadButton.addEventListener('click', async () => {
            if (!validateFiles()) return;

            // Show loading state
            uploadButton.disabled = true;
            const originalContent = uploadButton.innerHTML;
            uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Importing...';

            try {
                const formData = new FormData();
                formData.append('file', selectedFiles[0]);

                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.status === 'success') {
                    resetForm();
                    
                    // Close modal
                    if (window.Modal && Modal.close) {
                        Modal.close(modalId);
                    } else {
                        const modalElement = document.getElementById(modalId);
                        if (modalElement) modalElement.setAttribute('data-open', 'false');
                    }

                    let successMsg = result.message;
                    if (result.errors && result.errors.length > 0) {
                        successMsg += '\n\nWarnings:\n' + result.errors.join('\n');
                    }

                    if (window.systemShowNotification) {
                        systemShowNotification(successMsg, { type: 'success', duration: 6000 });
                    } else {
                        alert(successMsg);
                    }

                    if (onSuccess) onSuccess(result);
                } else {
                    let errorMsg = result.message || 'Error importing file';
                    if (result.errors && result.errors.length > 0) {
                        errorMsg += '\n\nDetails:\n' + result.errors.slice(0, 5).join('\n');
                        if (result.errors.length > 5) {
                            errorMsg += `\n... and ${result.errors.length - 5} more errors`;
                        }
                    }

                    if (result.traceback) {
                        console.error('Import error traceback:', result.traceback);
                    }

                    if (errorDiv) {
                        errorDiv.innerHTML = errorMsg.replace(/\n/g, '<br>');
                        errorDiv.classList.remove('invisible');
                        errorDiv.classList.add('text-left', 'whitespace-pre-wrap');
                    }

                    if (window.systemShowNotification) {
                        systemShowNotification(errorMsg, { type: 'error', duration: 8000 });
                    }
                }
            } catch (error) {
                console.error('Upload error:', error);
                if (errorDiv) {
                    errorDiv.textContent = 'Network error. Please try again.';
                    errorDiv.classList.remove('invisible');
                }
                if (window.systemShowNotification) {
                    systemShowNotification('Network error. Please try again.', { type: 'error' });
                }
            } finally {
                uploadButton.disabled = false;
                uploadButton.innerHTML = originalContent;
            }
        });
    }

    // Reset form when modal is closed
    modal.addEventListener('click', (e) => {
        if (e.target.matches('[data-modal-close]')) {
            resetForm();
        }
    });
}

// Export for global access
window.setupProductsImportModal = setupProductsImportModal;


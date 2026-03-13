import { reloadRmaUnitsListPage } from "./rma_list.js";

/**
 * Initializes the RMA Units import functionality.
 */
export const initRmaImport = () => {
    const importModal = document.getElementById('dashboard-page-import-rma-modal');
    if (!importModal) return;

    const fileInput = document.getElementById('rma-units-file-input');
    const dropArea = document.getElementById('rma-units-file-drop-area');
    const fileNameDisplay = document.getElementById('rma-units-file-name');
    const submitBtn = document.getElementById('rma-units-import-submit-btn');
    const importForm = document.getElementById('page-rma_units-import-form');

    if (!fileInput || !dropArea || !submitBtn || !importForm) return;

    // Handle click on drop area to trigger file input
    dropArea.addEventListener('click', () => fileInput.click());

    // Handle file selection
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            fileNameDisplay.textContent = fileName;
            fileNameDisplay.classList.remove('hidden');
            dropArea.querySelector('.file-input-content').classList.add('hidden');
        }
    });

    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('border-theme'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('border-theme'), false);
    });

    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        
        // Trigger change event manually
        const event = new Event('change');
        fileInput.dispatchEvent(event);
    }, false);

    // Handle form submission
    submitBtn.addEventListener('click', async () => {
        if (!fileInput.files.length) {
            if (window.systemShowNotification) window.systemShowNotification('Please select a file first.', { type: 'warning' });
            else alert('Please select a file first.');
            return;
        }

        const formData = new FormData(importForm);
        if (window.showLoadingScreen) window.showLoadingScreen();

        try {
            const response = await fetch(importForm.action, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.status === 'success') {
                if (window.systemShowNotification) window.systemShowNotification(result.message || 'Import successful', { type: 'success' });
                // Close modal
                const closeBtn = importModal.querySelector('[data-modal-close="true"]');
                if (closeBtn) closeBtn.click();
                
                // Reset form
                importForm.reset();
                fileNameDisplay.classList.add('hidden');
                dropArea.querySelector('.file-input-content').classList.remove('hidden');
                
                // Reload list
                reloadRmaUnitsListPage();
            } else {
                if (window.systemShowNotification) window.systemShowNotification(result.message || 'Import failed', { type: 'error' });
            }
        } catch (error) {
            console.error('Import error:', error);
            if (window.systemShowNotification) window.systemShowNotification('An error occurred during import.', { type: 'error' });
        } finally {
            if (window.hideLoadingScreen) window.hideLoadingScreen();
        }
    });
};

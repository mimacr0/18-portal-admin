import { rpc } from "@web/core/network/rpc";


export const setupDashboardImportReceptionsModal = () => {
    // Import receptions button click handler
    const importReceptionsBtn = document.getElementById('dashboard-page-import-receptions-button');
    const submitReceptionsBtn = document.querySelector('#dashboard-page-import-receptions-modal .modal-btn-primary');

    if (importReceptionsBtn) {
        importReceptionsBtn.addEventListener('click', () => {
            // Reset form fields
            const fileInput = document.querySelector('#dashboard-page-import-receptions-modal input[type="file"]');
            if (fileInput) fileInput.value = '';

            Modal.open('dashboard-page-import-receptions-modal');
        });
    }

    // Submit import receptions handler
    if (submitReceptionsBtn) {
        submitReceptionsBtn.addEventListener('click', async () => {
            const res = sysFormValidate('#dashboard-import-receptions-form');

            if(!res) return;

            const { formData } = sysCollectFormData('#dashboard-import-receptions-form');

            const result = await rpc('/account/dashboard/import_receptions', formData);

            if(result?.errors) sysShowServerErrors('#dashboard-import-receptions-form', result.errors);

            if(result?.message) systemShowNotification(result.message, { type: result?.status || 'error' });

            if(result?.status !== 'success') return;

            Modal.close('dashboard-page-import-receptions-modal');
        });
    }
}

export const setupDashboardImportExpeditionsModal = () => {
    // Import expeditions button click handler
    const importExpeditionsBtn = document.getElementById('dashboard-page-import-expeditions-button');
    const submitExpeditionsBtn = document.querySelector('#dashboard-page-import-expeditions-modal .modal-btn-primary');

    if (importExpeditionsBtn) {
        importExpeditionsBtn.addEventListener('click', () => {
            // Reset form fields
            const fileInput = document.querySelector('#dashboard-page-import-expeditions-modal input[type="file"]');
            if (fileInput) fileInput.value = '';

            Modal.open('dashboard-page-import-expeditions-modal');
        });
    }

    // Submit import expeditions handler
    if (submitExpeditionsBtn) {
        submitExpeditionsBtn.addEventListener('click', async () => {
            const res = sysFormValidate('#dashboard-import-expeditions-form');

            if(!res) return;

            const { formData } = sysCollectFormData('#dashboard-import-expeditions-form');

            const result = await rpc('/account/dashboard/import_expeditions', formData);

            if(result?.errors) sysShowServerErrors('#dashboard-import-expeditions-form', result.errors);

            if(result?.message) systemShowNotification(result.message, { type: result?.status || 'error' });

            if(result?.status !== 'success') return;

            Modal.close('dashboard-page-import-expeditions-modal');
        });
    }
}

export const updateAccountQuickActionssKpis = () => {
    setupDashboardImportReceptionsModal();
    setupDashboardImportExpeditionsModal();
}

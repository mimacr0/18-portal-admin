/**
 * RMA Export Component
 * Handles exporting selected RMA units to Excel (XLSX)
 */
export const initRmaExport = () => {
    const exportBtn = document.getElementById('page-list-rma_units-batch-action-export');

    if (!exportBtn) return;

    exportBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // Get selected IDs (unique)
        const selectedIds = new Set();
        document.querySelectorAll('.rma-units-list-checkbox:checked').forEach(checkbox => {
            selectedIds.add(checkbox.dataset.unitId);
        });

        if (selectedIds.size === 0) return;

        // Build URL with IDs parameter
        const idsParam = Array.from(selectedIds).join(',');
        window.location.href = `/account/rma/export?ids=${idsParam}`;
    });
};

/**
 * Repair Export Component
 * Handles exporting selected repair alerts to Excel (XLSX)
 */

export function initRepairExport() {
    const exportBtn = document.getElementById('page-list-repair-alert-batch-action-export');
    
    if (!exportBtn) return;

    exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get selected IDs (unique)
        const selectedIds = new Set();
        document.querySelectorAll('.repair-alert-list-checkbox:checked').forEach(checkbox => {
            selectedIds.add(checkbox.dataset.alertId);
        });

        if (selectedIds.size === 0) return;

        // Build URL with IDs parameter
        const idsParam = Array.from(selectedIds).join(',');
        window.location.href = `/account/repair/export?ids=${idsParam}`;
    });
}


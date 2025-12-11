/**
 * Reception Export Component
 * Handles exporting selected receptions to Excel (XLSX)
 */

export function initReceptionExport() {
    const exportBtn = document.getElementById('page-list-reception-batch-action-export');
    
    if (!exportBtn) return;

    exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get selected IDs (unique)
        const selectedIds = new Set();
        document.querySelectorAll('.packages-list-checkbox:checked').forEach(checkbox => {
            selectedIds.add(checkbox.dataset.packageId);
        });

        if (selectedIds.size === 0) return;

        // Build URL with IDs parameter
        const idsParam = Array.from(selectedIds).join(',');
        window.location.href = `/account/reception/export?ids=${idsParam}`;
    });
}


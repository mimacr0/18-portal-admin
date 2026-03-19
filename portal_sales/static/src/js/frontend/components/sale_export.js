/**
 * Sale Export Component
 * Handles exporting selected sales to Excel (XLSX)
 */

export function initSaleExport() {
    const exportBtn = document.getElementById('page-list-sale-batch-action-export');
    
    if (!exportBtn) return;

    exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get selected IDs (unique)
        const selectedIds = new Set();
        document.querySelectorAll('.orders-list-checkbox:checked').forEach(checkbox => {
            selectedIds.add(checkbox.dataset.orderId);
        });

        if (selectedIds.size === 0) return;

        // Build URL with IDs parameter
        const idsParam = Array.from(selectedIds).join(',');
        window.location.href = `/account/sale/export?ids=${idsParam}`;
    });
}


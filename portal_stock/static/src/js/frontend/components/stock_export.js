/**
 * Stock Export Component
 * Handles exporting selected products to Excel (XLSX)
 */

export function initStockExport() {
    const exportBtn = document.getElementById('page-list-stock-batch-action-export');
    
    if (!exportBtn) return;

    exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get selected IDs (unique)
        const selectedIds = new Set();
        document.querySelectorAll('.products-list-checkbox:checked').forEach(checkbox => {
            selectedIds.add(checkbox.dataset.productId);
        });

        if (selectedIds.size === 0) return;

        // Build URL with IDs parameter
        const idsParam = Array.from(selectedIds).join(',');
        window.location.href = `/account/stock/export?ids=${idsParam}`;
    });
}


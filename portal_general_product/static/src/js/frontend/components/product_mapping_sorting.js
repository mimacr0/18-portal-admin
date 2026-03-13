import { sortConfig, reloadProductMappingListPage } from "./product_mapping_list.js";

/**
 * Initializes sorting for the product mapping table.
 */
export const initTableSorting = () => {
    const pageName = 'product_mapping';
    const headers = document.querySelectorAll('th[data-column-id]');

    headers.forEach(header => {
        const columnId = header.dataset.columnId;
        const sortIcon = document.getElementById(`list-column-${pageName}-${columnId}-sort-icon`);
        
        if (sortIcon) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                // Update direction if same column, else default to asc
                if (sortConfig.column === columnId) {
                    sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    sortConfig.column = columnId;
                    sortConfig.direction = 'asc';
                }

                // Update icons visually
                document.querySelectorAll('th i.fas.fa-sort, th i.fas.fa-sort-up, th i.fas.fa-sort-down').forEach(icon => {
                    icon.className = 'fas fa-sort ml-1 text-gray-400';
                });

                sortIcon.className = `fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1 text-primary-theme`;

                // Reset page to 1 and reload
                const currentPageInput = document.getElementById(`page-${pageName}-list-pagination-page`);
                if (currentPageInput) currentPageInput.value = 1;
                
                reloadProductMappingListPage();
            });
        }
    });
};

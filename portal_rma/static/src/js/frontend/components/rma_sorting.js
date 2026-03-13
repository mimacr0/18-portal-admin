import { sortConfig, reloadRmaUnitsListPage } from './rma_list.js';

/**
 * Initializes table sorting for the RMA units list.
 */
export const initTableSorting = () => {
    const pageName = 'rma_units';
    const sortableHeaders = document.querySelectorAll(`th [id^="list-column-${pageName}-"][id$="-sort-icon"]`);

    if (!sortableHeaders || sortableHeaders.length === 0) return;

    sortableHeaders.forEach(header => {
        const headerCell = header.closest('th');
        if (!headerCell) return;

        const newHeader = headerCell.cloneNode(true);
        headerCell.parentNode.replaceChild(newHeader, headerCell);

        newHeader.addEventListener('click', () => {
            const iconId = newHeader.querySelector(`[id^="list-column-${pageName}-"]`).id;
            const match = iconId.match(new RegExp(`list-column-${pageName}-(.+)-sort-icon`));

            if (!match || !match[1]) return;

            const columnId = match[1];

            if (sortConfig.column === columnId) {
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortConfig.column = columnId;
                sortConfig.direction = 'asc';
            }

            updateSortIcons();
            reloadRmaUnitsListPage();
        });
    });

    function updateSortIcons() {
        document.querySelectorAll(`[id^="list-column-${pageName}-"][id$="-sort-icon"]`).forEach(icon => {
            icon.className = 'fas fa-sort ml-1 text-gray-400';
        });

        if (sortConfig.column) {
            const selectedIcon = document.getElementById(`list-column-${pageName}-${sortConfig.column}-sort-icon`);
            if (selectedIcon) {
                selectedIcon.className = `fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1 text-primary-theme`;
            }
        }
    }
};

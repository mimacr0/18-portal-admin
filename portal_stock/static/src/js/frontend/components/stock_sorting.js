import { getColumnNameByIndex } from "./stock_utils.js";
import { sortConfig } from "./stock_list.js";
import { applyFiltersAndSort } from "./stock_search.js";

export function initTableSorting() {
    const sortButtons = document.querySelectorAll('th .fas.fa-sort');

    sortButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const column = e.target.closest('th');
            const columnIndex = Array.from(column.parentNode.children).indexOf(column);
            const columnName = getColumnNameByIndex(columnIndex);

            if (!columnName || columnName === 'actions') return;

            // Reset all sort icons
            sortButtons.forEach(btn => {
                btn.classList.remove('fa-sort-up', 'fa-sort-down');
                btn.classList.add('fa-sort');
            });

            // Toggle sort direction
            if (sortConfig.column === columnName && sortConfig.direction === 'asc') {
                sortConfig.direction = 'desc';
                button.classList.remove('fa-sort');
                button.classList.add('fa-sort-down');
            } else if (sortConfig.column === columnName && sortConfig.direction === 'desc') {
                sortConfig.column = null;
                sortConfig.direction = 'asc';
            } else {
                sortConfig.column = columnName;
                sortConfig.direction = 'asc';
                button.classList.remove('fa-sort');
                button.classList.add('fa-sort-up');
            }

            // Apply new sorting
            applyFiltersAndSort();
        });
    });
}

import { reloadLotsListPage } from "./lot_list.js";

/**
 * Initialize quick filter buttons for lots list
 */
export const initLotsQuickFilters = () => {
    const filterButtons = document.querySelectorAll('.page-lots-list-filter');
    const quickFilterInput = document.getElementById('page-lots-list-quick-filter-active');
    const currentPageInput = document.getElementById('lots-list-pagination-page');

    if (filterButtons.length === 0) return;

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterId = this.dataset.filterId;
            
            // Update active state
            filterButtons.forEach(btn => {
                btn.classList.remove('active', 'border-primary-theme', 'text-primary-theme');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            
            this.classList.add('active', 'border-primary-theme', 'text-primary-theme');
            this.classList.remove('border-transparent', 'text-gray-500');
            
            // Update hidden input
            if (quickFilterInput) {
                quickFilterInput.value = filterId;
            }
            
            // Reset to page 1
            if (currentPageInput) {
                currentPageInput.value = 1;
            }
            
            // Reload list with new filter
            reloadLotsListPage();
        });
    });
};


import { reloadRmaUnitsListPage } from './rma_list.js';

/**
 * Initializes quick sort filters (tabs) for the RMA units list.
 */
export const initRmaQuickSortFilters = () => {
    const pageName = 'rma_units';
    const filterButtons = document.querySelectorAll(`[id^="page-${pageName}-list-filter-"]`);

    filterButtons.forEach(filterBtn => {
        filterBtn.addEventListener('click', () => {
            const filterId = filterBtn.id.replace(`page-${pageName}-list-filter-`, '');
            const activeInput = document.getElementById(`page-${pageName}-list-quick-filter-active`);
            
            if (activeInput) {
                activeInput.value = filterId;

                // Update UI state
                filterButtons.forEach(btn => {
                    btn.classList.remove('active', 'border-primary-theme', 'text-primary-theme');
                    btn.classList.add('border-transparent', 'text-gray-500');
                });

                filterBtn.classList.remove('border-transparent', 'text-gray-500');
                filterBtn.classList.add('active', 'border-primary-theme', 'text-primary-theme');

                // Reset page to 1 on filter change
                const currentPageInput = document.getElementById(`page-${pageName}-list-pagination-page`);
                if (currentPageInput) currentPageInput.value = 1;

                reloadRmaUnitsListPage();
            }
        });
    });
};

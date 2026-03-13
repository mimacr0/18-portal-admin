import { reloadProductMappingListPage } from "./product_mapping_list.js";

/**
 * Initializes the quick sort/filter tabs for product mapping.
 */
export const initProductMappingQuickSortFilters = () => {
    const pageName = 'product_mapping';
    const filterButtons = document.querySelectorAll(`[id^="page-${pageName}-list-filter-"]`);
    const activeFilterInput = document.getElementById(`page-${pageName}-list-quick-filter-active`);

    if (!activeFilterInput) return;

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterId = button.id.replace(`page-${pageName}-list-filter-`, '');
            
            // Update active state visually
            filterButtons.forEach(btn => {
                btn.classList.remove('active', 'border-primary-theme', 'text-primary-theme');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            button.classList.add('active', 'border-primary-theme', 'text-primary-theme');
            button.classList.remove('border-transparent', 'text-gray-500');

            // Update hidden input and reload
            activeFilterInput.value = filterId;
            
            const currentPageInput = document.getElementById(`page-${pageName}-list-pagination-page`);
            if (currentPageInput) currentPageInput.value = 1;
            
            reloadProductMappingListPage();
        });
    });
};

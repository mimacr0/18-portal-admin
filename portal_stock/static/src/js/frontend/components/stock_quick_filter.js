import { reloadStockListPage } from "./stock_list.js";

export const initStockQuickSortFilters = () => {
    const quickSortFilters = document.querySelectorAll('.page-stock-list-filter');
    const quickFiltersInput = document.getElementById('page-stock-list-quick-filter-active');
    const activeFilterId = quickFiltersInput.value;

    for(const filter of quickSortFilters) {
        filter.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            const filterId = button.dataset.filterId;

            if (filterId === activeFilterId) {
                // Activar este filtro
                filter.classList.add('active', 'border-cyan-500', 'text-cyan-600');
                filter.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700',
                                      'hover:border-gray-300', 'dark:hover:text-gray-300');
            } else {
                // Desactivar los demás
                filter.classList.remove('active', 'border-cyan-500', 'text-cyan-600');
                filter.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700',
                                    'hover:border-gray-300', 'dark:hover:text-gray-300');
            }

            for(const f of quickSortFilters) {
                // Remove active classes
                f.classList.remove('active');
                f.classList.remove('border-cyan-500');
                f.classList.remove('text-cyan-600');

                // Add inactive classes
                f.classList.add('border-transparent');
                f.classList.add('text-gray-500');
                f.classList.add('hover:text-gray-700');
                f.classList.add('hover:border-gray-300');
                f.classList.add('dark:hover:text-gray-300');
            };

            // Add active classes to clicked filter
            button.classList.add('active');
            button.classList.add('border-cyan-500');
            button.classList.add('text-cyan-600');

            // Remove inactive classes from clicked filter
            button.classList.remove('border-transparent');
            button.classList.remove('text-gray-500');
            button.classList.remove('hover:text-gray-700');
            button.classList.remove('hover:border-gray-300');
            button.classList.remove('dark:hover:text-gray-300');

            quickFiltersInput.value = filterId;
            reloadStockListPage();
        });
    }
}

import { rpc } from "@web/core/network/rpc";
import { debounce } from "./stock_utils.js";
import { reloadStockListPage } from "./stock_list.js";
import { sortConfig } from "./stock_list.js";

export const initProductsListSearch = () => {
    const searchInput = document.getElementById('page-stock-products-list-search');
    if(!searchInput) {
        console.error('No se encontró el input de búsqueda con ID: page-stock-products-list-search');
        return;
    }
    
    const currentPageInput = document.getElementById('stock-list-pagination-page');
    if(!currentPageInput) return;
    
    // Usando la función debounce importada
    searchInput.addEventListener('input', debounce(() => {
        currentPageInput.value = 1;
        reloadStockListPage();
    }, 500));
}

export const portalAccountProductsInitAdvancedFilters = async () => {
    const res = await rpc('/account/stock/list/advanced_filters');
    if(res?.status != 'success') return;

    const advancedFiltersContainer = document.getElementById('page-products-list-advanced-search-fields');
    if(!advancedFiltersContainer) return;

    advancedFiltersContainer.innerHTML = res.filters;
}

export function initAdvancedSearch() {
    const advancedSearchToggle = document.getElementById('page-products-list-advanced-search-toggle');
    const advancedSearchPanel = document.getElementById('page-products-list-advanced-search-panel');
    const applyAdvancedSearchButton = document.getElementById('page-products-list-advanced-search-apply-btn');
    const resetAdvancedSearchButton = document.getElementById('page-products-list-advanced-search-reset-btn');
    const addFilterLineBtn = document.getElementById('page-products-list-advanced-search-add-line-btn');
    const matchTypeSelector = document.getElementById('page-products-list-advanced-search-match-type');
    const linesContainer = document.getElementById('page-products-list-advanced-search-lines-container');

    if (!advancedSearchToggle || !advancedSearchPanel) return;

    // Toggle advanced search panel
    advancedSearchToggle.addEventListener('click', function() {
        if (advancedSearchPanel.classList.contains('hidden')) {
            advancedSearchPanel.classList.remove('hidden');
            setTimeout(() => {
                advancedSearchPanel.style.opacity = '1';
            }, 10);
            advancedSearchToggle.classList.add('bg-gray-100', 'text-cyan-600');
        } else {
            advancedSearchPanel.classList.add('hidden');
            advancedSearchToggle.classList.remove('bg-gray-100', 'text-cyan-600');
        }
    });

    // Add new filter line
    if (addFilterLineBtn) {
        addFilterLineBtn.addEventListener('click', function() {
            addFilterLine();
        });
    }

    // Reset filters
    if (resetAdvancedSearchButton) {
        resetAdvancedSearchButton.addEventListener('click', function() {
            resetFilters();
        });
    }

    // Apply filters
    if (applyAdvancedSearchButton) {
        applyAdvancedSearchButton.addEventListener('click', function() {
            applyFiltersAndSort();
            advancedSearchPanel.classList.add('hidden');
            advancedSearchToggle.classList.remove('bg-gray-100', 'text-cyan-600');
        });
    }

    // Add initial filter line if none exist
    if (linesContainer && linesContainer.children.length === 0) {
        addFilterLine();
    }
}

function addFilterLine() {
    const fieldsData = JSON.parse(document.getElementById('page-products-list-advanced-search-fields').value);
    const linesContainer = document.getElementById('page-products-list-advanced-search-lines-container');

    const lineId = Date.now();
    const line = document.createElement('div');
    line.className = 'flex flex-wrap items-center gap-2 mb-3';
    line.dataset.lineId = lineId;

    // Field select
    const fieldSelect = document.createElement('select');
    fieldSelect.className = 'px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    fieldSelect.dataset.type = 'field';

    fieldsData.forEach(field => {
        const option = document.createElement('option');
        option.value = field.id;
        option.textContent = field.label;
        fieldSelect.appendChild(option);
    });

    // Operator select
    const operatorSelect = document.createElement('select');
    operatorSelect.className = 'px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    operatorSelect.dataset.type = 'operator';

    const operators = [
        { value: 'ilike', label: 'Contains' },
        { value: 'not ilike', label: 'Does not contain' },
        { value: '=', label: 'Equals' },
        { value: '!=', label: 'Does not equal' }
    ];

    operators.forEach(op => {
        const option = document.createElement('option');
        option.value = op.value;
        option.textContent = op.label;
        operatorSelect.appendChild(option);
    });

    // Value input
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    valueInput.dataset.type = 'value';
    valueInput.placeholder = 'Value';

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'text-gray-500 hover:text-red-500';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', function() {
        line.remove();
    });

    line.appendChild(fieldSelect);
    line.appendChild(operatorSelect);
    line.appendChild(valueInput);
    line.appendChild(removeBtn);

    linesContainer.appendChild(line);
}

function resetFilters() {
    const linesContainer = document.getElementById('page-products-list-advanced-search-lines-container');
    linesContainer.innerHTML = '';
    addFilterLine();
    document.getElementById('page-products-list-advanced-search-match-type').value = 'all';
    document.getElementById('page-products-list-advanced-search-domain').value = '[]';
}

function buildSearchDomain() {
    const matchType = document.getElementById('page-products-list-advanced-search-match-type').value;
    const lines = document.querySelectorAll('#page-products-list-advanced-search-lines-container > div');
    const conditions = [];

    lines.forEach(line => {
        const field = line.querySelector('[data-type="field"]').value;
        const operator = line.querySelector('[data-type="operator"]').value;
        const value = line.querySelector('[data-type="value"]').value.trim();

        if (value) {
            conditions.push([field, operator, value]);
        }
    });

    if (conditions.length === 0) return [];

    document.getElementById('page-products-list-advanced-search-domain').value = JSON.stringify(conditions);
    return conditions;
}

export async function applyFiltersAndSort() {
    const searchDomain = buildSearchDomain();
    const matchType = document.getElementById('page-stock-list-advanced-search-match-type').value;
    const currentPageInput = document.getElementById('stock-list-pagination-page');
    currentPageInput.value = 1;

    const searchInput = document.getElementById('page-stock-products-list-search');
    if (!searchInput) {
        console.error('No se encontró el input de búsqueda con ID: page-stock-products-list-search');
    }
    const search = searchInput ? searchInput.value : '';

    const pageListItems = document.getElementById('stock-page-list-items');

    try {
        const res = await rpc('/account/stock/list/reload', {
            page: 1,
            search: search,
            domain: searchDomain,
            match_type: matchType,
            sort: sortConfig.column,
            order: sortConfig.direction
        });

        if (res?.status !== 'success') return;

        if (pageListItems) pageListItems.innerHTML = res.list;

        const paginationContainer = document.getElementById('stock-list-pagination-container');
        if (paginationContainer) paginationContainer.innerHTML = res.pager;

        // IDs y clases corregidos para paginador
        const paginationPrevious = document.getElementById('stock-list-pagination-previous');
        const paginationButton = document.querySelectorAll('.stock-list-pagination-button');
        const paginationNext = document.getElementById('stock-list-pagination-next');

        if (paginationPrevious) {
            paginationPrevious.addEventListener('click', () => {
                if ((parseInt(currentPageInput.value) - 1) < 1) return;
                currentPageInput.value = parseInt(currentPageInput.value) - 1;
                reloadStockListPage();
            });
        }

        if (paginationButton) {
            paginationButton.forEach(button => {
                button.addEventListener('click', () => {
                    currentPageInput.value = parseInt(button.dataset.page);
                    reloadStockListPage();
                });
            });
        }

        if (paginationNext) {
            paginationNext.addEventListener('click', () => {
                if ((parseInt(currentPageInput.value) + 1) > res.last_page) return;
                currentPageInput.value = parseInt(currentPageInput.value) + 1;
                reloadStockListPage();
            });
        }

        document.dispatchEvent(new CustomEvent('filtersApplied'));
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

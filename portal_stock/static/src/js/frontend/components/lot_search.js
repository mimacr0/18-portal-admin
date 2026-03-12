import { rpc } from "@web/core/network/rpc";
import { debounce } from "./stock_utils.js";
import { reloadLotsListPage } from "./lot_list.js";

export const initLotsListSearch = () => {
    const searchInput = document.getElementById('page-lots-list-search');
    if (!searchInput) return;
    
    const currentPageInput = document.getElementById('lots-list-pagination-page');
    if (!currentPageInput) return;
    
    searchInput.addEventListener('input', debounce(() => {
        currentPageInput.value = 1;
        reloadLotsListPage();
    }, 500));
};

export const initLotsAdvancedFilters = async () => {
    const res = await rpc('/account/stock/lots/advanced_filters');
    if (res?.status != 'success') return;

    const fieldsInput = document.getElementById('page-lots-list-advanced-search-fields');
    if (!fieldsInput) return;

    fieldsInput.value = res.filters;
};

export function initLotsAdvancedSearch() {
    const advancedSearchToggle = document.getElementById('page-lots-list-advanced-search-toggle');
    const advancedSearchPanel = document.getElementById('page-lots-list-advanced-search-panel');
    const applyAdvancedSearchButton = document.getElementById('page-lots-list-advanced-search-apply-btn');
    const resetAdvancedSearchButton = document.getElementById('page-lots-list-advanced-search-reset-btn');
    const addFilterLineBtn = document.getElementById('page-lots-list-advanced-search-add-line-btn');
    const matchTypeSelector = document.getElementById('page-lots-list-advanced-search-match-type');
    const linesContainer = document.getElementById('page-lots-list-advanced-search-lines-container');

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
            applyFiltersAndSort();
        });
    }

    // Apply filters
    if (applyAdvancedSearchButton) {
        applyAdvancedSearchButton.addEventListener('click', function() {
            applyFiltersAndSort();
            // Keep panel open after applying filters
        });
    }

    // Add initial filter line if none exist
    if (linesContainer && linesContainer.children.length === 0) {
        addFilterLine();
    }

    // Match type change auto-apply if filters exist
    if (matchTypeSelector) {
        matchTypeSelector.addEventListener('change', () => {
            if (linesContainer && linesContainer.children.length > 0) {
                applyAdvancedSearchButton && applyAdvancedSearchButton.click();
            }
        });
    }
}

function addFilterLine() {
    const fieldsInput = document.getElementById('page-lots-list-advanced-search-fields');
    if (!fieldsInput) return;
    
    const fieldsData = JSON.parse(fieldsInput.value || '[]');
    const linesContainer = document.getElementById('page-lots-list-advanced-search-lines-container');

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

    const buildOperatorOptions = (fieldType) => {
        switch (fieldType) {
            case 'number':
                return [
                    { value: '=', label: 'Equals' },
                    { value: '!=', label: 'Does not equal' },
                    { value: '>', label: 'Greater than' },
                    { value: '>=', label: 'Greater or equal' },
                    { value: '<', label: 'Less than' },
                    { value: '<=', label: 'Less or equal' },
                ];
            case 'select':
                return [
                    { value: '=', label: 'Is' },
                    { value: '!=', label: 'Is not' },
                ];
            case 'text':
            default:
                return [
                    { value: 'ilike', label: 'Contains' },
                    { value: '=', label: 'Equals' },
                    { value: '!=', label: 'Does not equal' },
                ];
        }
    };

    const getFieldSpec = (id) => {
        const fieldsInput = document.getElementById('page-lots-list-advanced-search-fields');
        const fieldsData = JSON.parse(fieldsInput?.value || '[]');
        return fieldsData.find(f => f.id === id) || { id, type: 'text' };
    };

    const populateOperatorOptions = (fieldType) => {
        operatorSelect.innerHTML = '';
        buildOperatorOptions(fieldType).forEach(op => {
            const option = document.createElement('option');
            option.value = op.value;
            option.textContent = op.label;
            operatorSelect.appendChild(option);
        });
    };

    // Value input
    const buildValueInput = (fieldSpec) => {
        if (fieldSpec.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.className = 'px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
            input.dataset.type = 'value';
            input.placeholder = 'Value';
            return input;
        }
        if (fieldSpec.type === 'select') {
            const select = document.createElement('select');
            select.className = 'px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
            select.dataset.type = 'value';
            (fieldSpec.options || []).forEach(opt => {
                const o = document.createElement('option');
                o.value = String(opt.id);
                o.textContent = opt.label;
                select.appendChild(o);
            });
            return select;
        }
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        input.dataset.type = 'value';
        input.placeholder = 'Value';
        return input;
    };

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'text-gray-500 hover:text-red-500';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', function() {
        line.remove();
        const applyBtn = document.getElementById('page-lots-list-advanced-search-apply-btn');
        applyBtn && applyBtn.click();
    });

    // Initialize
    const initialSpec = getFieldSpec(fieldSelect.value);
    populateOperatorOptions(initialSpec.type);
    let valueInput = buildValueInput(initialSpec);

    // React to field changes
    fieldSelect.addEventListener('change', () => {
        const spec = getFieldSpec(fieldSelect.value);
        populateOperatorOptions(spec.type);
        const oldValue = valueInput;
        valueInput = buildValueInput(spec);
        line.replaceChild(valueInput, oldValue);
    });

    line.appendChild(fieldSelect);
    line.appendChild(operatorSelect);
    line.appendChild(valueInput);
    line.appendChild(removeBtn);

    linesContainer.appendChild(line);
}

function resetFilters() {
    const linesContainer = document.getElementById('page-lots-list-advanced-search-lines-container');
    if (linesContainer) linesContainer.innerHTML = '';
    addFilterLine();
    const matchType = document.getElementById('page-lots-list-advanced-search-match-type');
    if (matchType) matchType.value = 'all';
    const domain = document.getElementById('page-lots-list-advanced-search-domain');
    if (domain) domain.value = '[]';
}

function buildSearchDomain() {
    const matchType = document.getElementById('page-lots-list-advanced-search-match-type')?.value || 'all';
    const lines = document.querySelectorAll('#page-lots-list-advanced-search-lines-container > div');
    const conditions = [];

    lines.forEach(line => {
        const field = line.querySelector('[data-type="field"]')?.value;
        const operator = line.querySelector('[data-type="operator"]')?.value;
        const value = line.querySelector('[data-type="value"]')?.value?.trim();

        if (field && operator && value) {
            conditions.push([field, operator, value]);
        }
    });

    const domainInput = document.getElementById('page-lots-list-advanced-search-domain');
    if (domainInput) domainInput.value = JSON.stringify(conditions);
    
    return conditions;
}

export async function applyFiltersAndSort() {
    const searchDomain = buildSearchDomain();
    const matchType = document.getElementById('page-lots-list-advanced-search-match-type')?.value || 'all';
    const currentPageInput = document.getElementById('lots-list-pagination-page');
    if (currentPageInput) currentPageInput.value = 1;

    const searchInput = document.getElementById('page-lots-list-search');
    const search = searchInput ? searchInput.value : '';

    // Get product_id from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product_id');

    const quickFiltersInput = document.getElementById('page-lots-list-quick-filter-active');
    const quickFilter = quickFiltersInput ? quickFiltersInput.value : 'all';

    try {
        const res = await rpc('/account/stock/lots/reload', {
            page: 1,
            search: search,
            domain: searchDomain,
            match_type: matchType,
            product_id: productId,
            quick_filter: quickFilter
        });

        if (res?.status !== 'success') return;

        const pageListItems = document.getElementById('lots-page-list-items');
        if (pageListItems) pageListItems.innerHTML = res.list;

        const paginationContainer = document.getElementById('lots-list-pagination-container');
        if (paginationContainer) paginationContainer.innerHTML = res.pager;

        document.dispatchEvent(new CustomEvent('lotsFiltersApplied'));
    } catch (error) {
        console.error('Error applying lot filters:', error);
    }
}


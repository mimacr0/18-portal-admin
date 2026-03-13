import { reloadProductMappingListPage } from "./product_mapping_list.js";

/**
 * Initializes the quick search for the product mapping list.
 */
export const initProductMappingSearch = () => {
    const pageName = 'product_mapping';
    const searchInput = document.getElementById(`page-${pageName}-list-quick-search`);
    if (!searchInput) return;

    // Remove existing listeners to avoid duplicates
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    newSearchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter' || this.value.trim() === '') {
            const currentPageInput = document.getElementById(`page-${pageName}-list-pagination-page`);
            if (currentPageInput) currentPageInput.value = 1;
            reloadProductMappingListPage();
        }
    });
};

/**
 * Initializes the advanced filters panel for the product mapping list.
 */
export const initAdvancedSearch = () => {
    const pageName = 'product_mapping';
    const advancedSearchToggle = document.getElementById(`page-${pageName}-list-advanced-search-toggle`);
    const applyBtn = document.getElementById(`page-${pageName}-list-advanced-search-apply-btn`);
    const resetBtn = document.getElementById(`page-${pageName}-list-advanced-search-reset-btn`);
    const addLineBtn = document.getElementById(`page-${pageName}-list-advanced-search-add-line-btn`);
    const linesContainer = document.getElementById(`page-${pageName}-list-advanced-search-lines-container`);
    const searchDomainInput = document.getElementById(`page-${pageName}-list-advanced-search-domain`);
    const advancedSearchPanel = document.getElementById(`page-${pageName}-list-advanced-search-panel`);

    if (advancedSearchToggle && advancedSearchPanel) {
        advancedSearchToggle.addEventListener('click', () => {
            advancedSearchPanel.classList.toggle('hidden');
        });
    }

    if (!applyBtn || !linesContainer || !searchDomainInput) return;

    const fieldsInput = document.getElementById(`page-${pageName}-list-advanced-search-fields`);
    if (!fieldsInput) return;

    let fields;
    try {
        fields = JSON.parse(fieldsInput.value || '[]');
    } catch (e) {
        console.error('Error parsing advanced search fields:', e);
        return;
    }

    const getFieldSpecById = (id) => fields.find(f => f.id === id) || { id, type: 'text', label: id };

    const buildOperatorOptionsHtml = (fieldType) => {
        switch (fieldType) {
            case 'number':
                return `
                    <option value="=">is equal to</option>
                    <option value="!=">is not equal to</option>
                    <option value=">">is greater than</option>
                    <option value=">=">is greater than or equal to</option>
                    <option value="<">is less than</option>
                    <option value="<=">is less than or equal to</option>
                `;
            case 'date':
                return `
                    <option value="=">is on</option>
                    <option value=">=">is on or after</option>
                    <option value="<=">is on or before</option>
                `;
            case 'many2one':
            case 'selection':
                return `
                    <option value="=">is</option>
                    <option value="!=">is not</option>
                `;
            case 'char':
            case 'text':
            default:
                return `
                    <option value="ilike">contains</option>
                    <option value="=">is equal to</option>
                    <option value="!=">is not equal to</option>
                `;
        }
    };

    const createValueInputElement = (fieldSpec) => {
        if (fieldSpec.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'value-input px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700';
            return input;
        } else if (fieldSpec.type === 'date') {
            const input = document.createElement('input');
            input.type = 'date';
            input.className = 'value-input px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700';
            return input;
        } else if (fieldSpec.type === 'selection') {
            const select = document.createElement('select');
            select.className = 'value-input px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700';
            (fieldSpec.options || []).forEach(opt => {
                const o = document.createElement('option');
                o.value = opt[0];
                o.textContent = opt[1];
                select.appendChild(o);
            });
            return select;
        }
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'value-input px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700';
        return input;
    };

    if (addLineBtn) {
        addLineBtn.addEventListener('click', () => {
            const lineHtml = `
                <div class="filter-line flex space-x-2 items-center mb-2">
                    <select class="field-select px-2 py-1 text-sm border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700">
                        ${fields.map(field => `<option value="${field.id}">${field.label}</option>`).join('')}
                    </select>
                    <select class="operator-select px-2 py-1 text-sm border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700"></select>
                    <span class="value-container"></span>
                    <button class="remove-line-btn text-red-500"><i class="fas fa-times"></i></button>
                </div>
            `;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = lineHtml;
            const lineElement = tempDiv.firstElementChild;
            linesContainer.appendChild(lineElement);
            
            const fieldSelect = lineElement.querySelector('.field-select');
            const operatorSelect = lineElement.querySelector('.operator-select');
            const valueContainer = lineElement.querySelector('.value-container');

            const updateOptions = () => {
                const spec = getFieldSpecById(fieldSelect.value);
                operatorSelect.innerHTML = buildOperatorOptionsHtml(spec.type);
                valueContainer.innerHTML = '';
                valueContainer.appendChild(createValueInputElement(spec));
            };

            fieldSelect.addEventListener('change', updateOptions);
            updateOptions();

            lineElement.querySelector('.remove-line-btn').addEventListener('click', () => lineElement.remove());
        });
    }

    applyBtn.addEventListener('click', () => {
        const domain = [];
        linesContainer.querySelectorAll('.filter-line').forEach(line => {
            const field = line.querySelector('.field-select').value;
            const op = line.querySelector('.operator-select').value;
            const valueInput = line.querySelector('.value-input');
            const val = valueInput ? valueInput.value : '';
            if (val) domain.push([field, op, val]);
        });
        searchDomainInput.value = JSON.stringify(domain);
        reloadProductMappingListPage();
    });

    resetBtn.addEventListener('click', () => {
        linesContainer.innerHTML = '';
        searchDomainInput.value = '[]';
        reloadProductMappingListPage();
    });
};

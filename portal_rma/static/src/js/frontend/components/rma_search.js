import { reloadRmaUnitsListPage } from "./rma_list.js";

/**
 * Initializes the quick search for the RMA units list.
 */
export const initRmaListSearch = () => {
    const searchInput = document.getElementById('page-rma_units-list-quick-search');
    if (!searchInput) return;

    // Remove existing listeners to avoid duplicates
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    newSearchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter' || this.value.trim() === '') {
            const currentPageInput = document.getElementById('page-rma_units-list-pagination-page');
            if (currentPageInput) currentPageInput.value = 1;
            reloadRmaUnitsListPage();
        }
    });
};

/**
 * Initializes the advanced filters panel for the RMA units list.
 */
export const portalAccountRmaInitAdvancedFilters = async () => {
    const pageName = 'rma_units';
    const advancedSearchToggle = document.getElementById(`page-${pageName}-list-advanced-search-toggle`);
    
    if (!advancedSearchToggle) return;

    advancedSearchToggle.addEventListener('click', () => {
        const advancedSearchPanel = document.getElementById(`page-${pageName}-list-advanced-search-panel`);
        if (advancedSearchPanel) {
            advancedSearchPanel.classList.toggle('hidden');
        }
    });
};

/**
 * Initializes the advanced search functionality.
 */
export const initAdvancedSearch = () => {
    const pageName = 'rma_units';
    const addLineBtn = document.getElementById(`page-${pageName}-list-advanced-search-add-line-btn`);
    const applyBtn = document.getElementById(`page-${pageName}-list-advanced-search-apply-btn`);
    const resetBtn = document.getElementById(`page-${pageName}-list-advanced-search-reset-btn`);
    const matchTypeSelect = document.getElementById(`page-${pageName}-list-advanced-search-match-type`);
    const linesContainer = document.getElementById(`page-${pageName}-list-advanced-search-lines-container`);
    const searchDomainInput = document.getElementById(`page-${pageName}-list-advanced-search-domain`);

    // In this module, the "add line" button might be missing if we use a simpler approach, 
    // but we'll include it for parity with portal_reception if needed.
    // If not in template, we skip these parts.
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
            input.className = 'value-input px-2 py-1 text-sm border rounded-md dark:bg-gray-800';
            return input;
        } else if (fieldSpec.type === 'date') {
            const input = document.createElement('input');
            input.type = 'date';
            input.className = 'value-input px-2 py-1 text-sm border rounded-md dark:bg-gray-800';
            return input;
        } else if (fieldSpec.type === 'selection') {
            const select = document.createElement('select');
            select.className = 'value-input px-2 py-1 text-sm border rounded-md dark:bg-gray-800';
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
        input.className = 'value-input px-2 py-1 text-sm border rounded-md dark:bg-gray-800';
        return input;
    };

    // If we want to support dynamic lines like portal_reception
    if (addLineBtn) {
        addLineBtn.addEventListener('click', () => {
            const lineHtml = `
                <div class="filter-line flex space-x-2 items-center mb-2">
                    <select class="field-select px-2 py-1 text-sm border border-gray-300 rounded-md">
                        ${fields.map(field => `<option value="${field.id}">${field.label}</option>`).join('')}
                    </select>
                    <select class="operator-select px-2 py-1 text-sm border border-gray-300 rounded-md"></select>
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
        reloadRmaUnitsListPage();
    });

    resetBtn.addEventListener('click', () => {
        linesContainer.innerHTML = '';
        searchDomainInput.value = '[]';
        reloadRmaUnitsListPage();
    });
};

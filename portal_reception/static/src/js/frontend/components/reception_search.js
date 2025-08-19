
import { reloadReceptionListPage } from "./reception_list.js";

export const initReceptionListSearch = () => {
    // Obtener campo de búsqueda
    const searchInput = document.getElementById('page-reception-list-quick-search');

    // Si no existe, terminar
    if(!searchInput) return;

    // Eliminar eventos para evitar duplicados
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    // Ejecutar búsqueda cuando se presiona Enter o se limpia el campo
    newSearchInput.addEventListener('keyup', function(e) {
        if(e.key === 'Enter' || this.value.trim() === '') {
            // Resetear página
            const currentPageInput = document.getElementById('page-reception-list-pagination-page');
            if(currentPageInput) currentPageInput.value = 1;

            // Recargar la lista
            reloadReceptionListPage();
        }
    });
};

export const portalAccountReceptionInitAdvancedFilters = async () => {
    // URL para obtener los filtros
    const url = '/account/reception/list/advanced_filters';

    // Comprobar si existe el botón de búsqueda avanzada
    const advancedSearchToggle = document.getElementById('page-reception-list-advanced-search-toggle');
    if (!advancedSearchToggle) return;

    // Evento para mostrar/ocultar el panel de búsqueda avanzada
    advancedSearchToggle.addEventListener('click', () => {
        const advancedSearchPanel = document.getElementById('page-reception-list-advanced-search-panel');
        if (advancedSearchPanel) {
            advancedSearchPanel.classList.toggle('hidden');
        }
    });
};

export const initAdvancedSearch = () => {
    // Botones de acción
    const addLineBtn = document.getElementById('page-reception-list-advanced-search-add-line-btn');
    const applyBtn = document.getElementById('page-reception-list-advanced-search-apply-btn');
    const resetBtn = document.getElementById('page-reception-list-advanced-search-reset-btn');
    const matchTypeSelect = document.getElementById('page-reception-list-advanced-search-match-type');

    // Contenedor para las líneas
    const linesContainer = document.getElementById('page-reception-list-advanced-search-lines-container');

    // Dominio de búsqueda
    const searchDomainInput = document.getElementById('page-reception-list-advanced-search-domain');

    // Comprobar si existen los elementos necesarios
    if (!addLineBtn || !linesContainer || !searchDomainInput) return;

    // Obtener los campos definidos para la búsqueda avanzada
    const fieldsInput = document.getElementById('page-reception-list-advanced-search-fields');
    if (!fieldsInput) return;

    let fields;
    try {
        fields = JSON.parse(fieldsInput.value || '[]');
    } catch (e) {
        console.error('Error parsing advanced search fields:', e);
        return;
    }

    // Helpers para operadores y valores por tipo
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
            case 'select':
                return `
                    <option value="=">is</option>
                    <option value="!=">is not</option>
                `;
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
            input.step = 'any';
            input.className = 'value-input px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
            input.placeholder = 'Value';
            return input;
        } else if (fieldSpec.type === 'date') {
            const input = document.createElement('input');
            input.type = 'date';
            input.className = 'value-input px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
            input.placeholder = 'YYYY-MM-DD';
            return input;
        } else if (fieldSpec.type === 'select') {
            const select = document.createElement('select');
            select.className = 'value-input px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
            const options = fieldSpec.options || [];
            options.forEach(opt => {
                const o = document.createElement('option');
                o.value = String(opt.id);
                o.textContent = opt.label;
                select.appendChild(o);
            });
            return select;
        }
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'value-input px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        input.placeholder = 'Value';
        return input;
    };

    // Agregar línea de filtro
    addLineBtn.addEventListener('click', () => {
        const lineCount = linesContainer.children.length + 1;
        const lineHtml = `
            <div class="filter-line flex flex-wrap space-x-2 items-center" id="page-reception-list-advanced-search-line-${lineCount}">
                <select class="field-select px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                    ${fields.map(field => `<option value="${field.id}">${field.label}</option>`).join('')}
                </select>
                <select class="operator-select px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"></select>
                <span class="value-container"></span>
                <button class="remove-line-btn flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
                    <i class="fas fa-times text-gray-600 dark:text-gray-400"></i>
                </button>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lineHtml;
        const lineElement = tempDiv.firstElementChild;
        const fieldSelect = lineElement.querySelector('.field-select');
        const operatorSelect = lineElement.querySelector('.operator-select');
        const valueContainer = lineElement.querySelector('.value-container');

        // Inicializar con el primer campo
        const initialFieldSpec = getFieldSpecById(fieldSelect.value);
        operatorSelect.innerHTML = buildOperatorOptionsHtml(initialFieldSpec.type || 'text');
        valueContainer.innerHTML = '';
        valueContainer.appendChild(createValueInputElement(initialFieldSpec));

        // Manejar cambio de campo para actualizar operadores e input de valor
        fieldSelect.addEventListener('change', () => {
            const spec = getFieldSpecById(fieldSelect.value);
            operatorSelect.innerHTML = buildOperatorOptionsHtml(spec.type || 'text');
            valueContainer.innerHTML = '';
            valueContainer.appendChild(createValueInputElement(spec));
        });

        linesContainer.appendChild(lineElement);

        // Manejar el evento de eliminar línea
        const removeBtn = lineElement.querySelector('.remove-line-btn');
        removeBtn.addEventListener('click', () => {
            lineElement.remove();
            // Aplicar filtros automáticamente al eliminar una línea
            if (applyBtn) applyBtn.click();
        });
    });

    // Asegurar que las líneas ya existentes también apliquen filtros al eliminar
    const existingRemoveButtons = linesContainer.querySelectorAll('.filter-line .remove-line-btn');
    existingRemoveButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const lineEl = e.currentTarget.closest('.filter-line');
            if (lineEl) lineEl.remove();
            if (applyBtn) applyBtn.click();
        });
    });

    // Aplicar filtros
    applyBtn.addEventListener('click', () => {
        const lines = linesContainer.querySelectorAll('.filter-line');
        const domain = [];

        lines.forEach(line => {
            const fieldValue = line.querySelector('.field-select').value;
            const operatorValue = line.querySelector('.operator-select').value;
            const valueEl = line.querySelector('.value-input');
            const valueInput = (valueEl && 'value' in valueEl) ? String(valueEl.value).trim() : '';

            if (valueInput) {
                domain.push([fieldValue, operatorValue, valueInput]);
            }
        });

        // Guardar el dominio
        searchDomainInput.value = JSON.stringify(domain);

        // Resetear página actual
        const currentPageInput = document.getElementById('page-reception-list-pagination-page');
        if (currentPageInput) currentPageInput.value = 1;

        // Recargar la lista con los filtros aplicados
        reloadReceptionListPage();

        // Notificar que se han aplicado filtros
        document.dispatchEvent(new CustomEvent('filtersApplied'));
    });

    // Resetear filtros
    resetBtn.addEventListener('click', () => {
        // Limpiar contenedor de líneas
        linesContainer.innerHTML = '';

        // Reestablecer valor de dominio
        searchDomainInput.value = '[]';

        // Resetear página actual
        const currentPageInput = document.getElementById('page-reception-list-pagination-page');
        if (currentPageInput) currentPageInput.value = 1;

        // Reestablecer el tipo de coincidencia
        if (matchTypeSelect) matchTypeSelect.value = 'all';

        // Recargar la lista sin filtros
        reloadReceptionListPage();
    });

    // Cambiar tipo de coincidencia
    if (matchTypeSelect) {
        matchTypeSelect.addEventListener('change', () => {
            // Solo aplicamos si ya hay filtros definidos
            if (linesContainer.children.length > 0) {
                applyBtn.click();
            }
        });
    }
};
import { rpc } from "@web/core/network/rpc";
import { reloadRepairAlertListPage } from "./repair_alert_list.js";

export const initRepairAlertListSearch = () => {
    // Obtener campo de búsqueda
    const searchInput = document.getElementById('page-repair-alert-products-list-search');

    // Si no existe, terminar
    if(!searchInput) return;

    // Eliminar eventos para evitar duplicados
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    // Ejecutar búsqueda cuando se presiona Enter o se limpia el campo
    newSearchInput.addEventListener('keyup', function(e) {
        if(e.key === 'Enter' || this.value.trim() === '') {
            // Resetear página
            const currentPageInput = document.getElementById('repair-alert-list-pagination-page');
            if(currentPageInput) currentPageInput.value = 1;

            // Recargar la lista
            reloadRepairAlertListPage();
        }
    });
};

export const portalAccountRepairAlertInitAdvancedFilters = async () => {
    // URL para obtener los filtros
    const url = '/account/reception/list/advanced_filters';

    // Comprobar si existe el botón de búsqueda avanzada
    const advancedSearchToggle = document.getElementById('page-repair-alert-list-advanced-search-toggle');
    if (!advancedSearchToggle) return;

    // Evento para mostrar/ocultar el panel de búsqueda avanzada
    advancedSearchToggle.addEventListener('click', () => {
        const advancedSearchPanel = document.getElementById('page-repair-alert-list-advanced-search-panel');
        if (advancedSearchPanel) {
            advancedSearchPanel.classList.toggle('hidden');
        }
    });
};

export const initAdvancedSearch = () => {
    // Botones de acción
    const addLineBtn = document.getElementById('page-repair-alert-list-advanced-search-add-line-btn');
    const applyBtn = document.getElementById('page-repair-alert-list-advanced-search-apply-btn');
    const resetBtn = document.getElementById('page-repair-alert-list-advanced-search-reset-btn');
    const matchTypeSelect = document.getElementById('page-repair-alert-list-advanced-search-match-type');

    // Contenedor para las líneas
    const linesContainer = document.getElementById('page-repair-alert-list-advanced-search-lines-container');

    // Dominio de búsqueda
    const searchDomainInput = document.getElementById('page-repair-alert-list-advanced-search-domain');

    // Comprobar si existen los elementos necesarios
    if (!addLineBtn || !linesContainer || !searchDomainInput) return;

    // Obtener los campos definidos para la búsqueda avanzada
    const fieldsInput = document.getElementById('page-repair-alert-list-advanced-search-fields');
    if (!fieldsInput) return;

    let fields;
    try {
        fields = JSON.parse(fieldsInput.value || '[]');
    } catch (e) {
        console.error('Error parsing advanced search fields:', e);
        return;
    }

    // Agregar línea de filtro
    addLineBtn.addEventListener('click', () => {
        const lineCount = linesContainer.children.length + 1;
        const lineHtml = `
            <div class="filter-line flex flex-wrap space-x-2 items-center" id="page-repair-alert-list-advanced-search-line-${lineCount}">
                <select class="field-select px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                    ${fields.map(field => `<option value="${field.id}">${field.label}</option>`).join('')}
                </select>
                <select class="operator-select px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                    <option value="ilike">contains</option>
                    <option value="=">is equal to</option>
                    <option value="!=">is not equal to</option>
                    <option value=">">is greater than</option>
                    <option value="<">is less than</option>
                    <option value=">=">is greater than or equal to</option>
                    <option value="<=">is less than or equal to</option>
                </select>
                <input type="text" class="value-input px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" placeholder="Value"/>
                <button class="remove-line-btn flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
                    <i class="fas fa-times text-gray-600 dark:text-gray-400"></i>
                </button>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lineHtml;
        const lineElement = tempDiv.firstElementChild;
        linesContainer.appendChild(lineElement);

        // Manejar el evento de eliminar línea
        const removeBtn = lineElement.querySelector('.remove-line-btn');
        removeBtn.addEventListener('click', () => {
            lineElement.remove();
        });
    });

    // Aplicar filtros
    applyBtn.addEventListener('click', () => {
        const lines = linesContainer.querySelectorAll('.filter-line');
        const domain = [];

        lines.forEach(line => {
            const fieldValue = line.querySelector('.field-select').value;
            const operatorValue = line.querySelector('.operator-select').value;
            const valueInput = line.querySelector('.value-input').value.trim();

            if (valueInput) {
                domain.push([fieldValue, operatorValue, valueInput]);
            }
        });

        // Guardar el dominio
        searchDomainInput.value = JSON.stringify(domain);

        // Resetear página actual
        const currentPageInput = document.getElementById('repair-alert-list-pagination-page');
        if (currentPageInput) currentPageInput.value = 1;

        // Recargar la lista con los filtros aplicados
        reloadRepairAlertListPage();

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
        const currentPageInput = document.getElementById('repair-alert-list-pagination-page');
        if (currentPageInput) currentPageInput.value = 1;

        // Reestablecer el tipo de coincidencia
        if (matchTypeSelect) matchTypeSelect.value = 'all';

        // Recargar la lista sin filtros
        reloadRepairAlertListPage();
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
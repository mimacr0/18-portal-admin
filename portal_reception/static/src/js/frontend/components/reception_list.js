import { rpc } from "@web/core/network/rpc";

/**
 * Configuración de ordenamiento para la lista de recepciones.
 * Esta variable controla cómo se ordenan los elementos en la lista de recepciones.
 * @type {Object}
 * @property {string|null} column - Columna por la que se está ordenando (null inicialmente)
 * @property {string} direction - Dirección del ordenamiento ('asc' para ascendente, 'desc' para descendente)
 */
export let sortConfig = {
    column: null,
    direction: 'asc'
};

/**
 * Recarga la lista de recepciones en la página.
 *
 * Esta función asíncrona realiza las siguientes operaciones:
 * 1. Obtiene los elementos DOM necesarios (contenedor, paginación, búsqueda)
 * 2. Recopila los parámetros de búsqueda y filtrado
 * 3. Realiza una petición RPC al servidor
 * 4. Actualiza el HTML con los resultados
 * 5. Configura los eventos para la navegación del paginador
 *
 * @async
 * @returns {Promise<void>}
 */
export const reloadReceptionListPage = async () => {
    // Obtener el contenedor principal de la lista
    const pageListItems = document.getElementById('reception-page-list-items');
    if(!pageListItems) return;

    // Obtener y validar el input de página actual
    const currentPageInput = document.getElementById('page-reception-list-pagination-page');
    if(!currentPageInput) return;
    const currentPage = parseInt(currentPageInput.value);

    // Obtener y validar el campo de búsqueda
    const searchInput = document.getElementById('page-reception-list-quick-search');
    if(!searchInput) return;
    const search = searchInput.value;

    // Obtener dominio de búsqueda avanzada si existe
    const domainInput = document.getElementById('page-reception-list-advanced-search-domain');
    const domain = domainInput ? JSON.parse(domainInput.value || '[]') : [];

    // Obtener tipo de coincidencia para los filtros
    const matchTypeSelect = document.getElementById('page-reception-list-advanced-search-match-type');
    const matchType = matchTypeSelect ? matchTypeSelect.value : 'all';

    // Obtener el valor del input de filtros rápidos
    const quickFiltersInput = document.getElementById('page-reception-list-quick-filter-active');
    const quickFilter = quickFiltersInput ? quickFiltersInput.value : '';

    // Realizar petición RPC al servidor con todos los parámetros recopilados
    const res = await rpc('/account/reception/list/reload', {
        page: currentPage,
        search: search,
        domain: domain,
        match_type: matchType,
        sort: sortConfig.column,
        order: sortConfig.direction,
        quick_filter: quickFilter
    });

    // Verificar si la respuesta es exitosa
    if(res?.status != 'success') return;

    // Actualizar el contenido HTML con los resultados
    if(pageListItems) pageListItems.innerHTML = res.list;

    // Actualizar el paginador
    const paginationContainer = document.getElementById('page-reception-list-pagination-container');
    if(paginationContainer) paginationContainer.innerHTML = res.pager;

    // Actualizar el paginador
    const paginationContainerMain = document.getElementById('page-reception-list-pagination-container-main');
    if(paginationContainerMain && res.last_page == 0) paginationContainerMain.classList.add('hidden');
    else paginationContainerMain.classList.remove('hidden');

    // Configurar eventos para el PAGINADOR
    // IDs in template use 'stock-list-' prefix
    const paginationPrevious = document.getElementById('stock-list-pagination-previous');
    const paginationButton = document.querySelectorAll('.reception-list-pagination-button');
    const paginationNext = document.getElementById('stock-list-pagination-next');

    // Evento para el botón "Anterior"
    if(paginationPrevious) paginationPrevious.addEventListener('click', () => {
        if((currentPage - 1) < 1) return;
        currentPageInput.value = currentPage - 1;
        reloadReceptionListPage();
    });

    // Eventos para los botones de página específica
    if(paginationButton) paginationButton.forEach(button => {
        button.addEventListener('click', () => {
            currentPageInput.value = parseInt(button.dataset.page);
            reloadReceptionListPage();
        });
    });

    // Evento para el botón "Siguiente"
    if(paginationNext) paginationNext.addEventListener('click', () => {
        if((currentPage + 1) > res.last_page) return;
        currentPageInput.value = currentPage + 1;
        reloadReceptionListPage();
    });

    const deleteButtons = document.querySelectorAll('.reception-delete-btn');
    const editButtons = document.querySelectorAll('.reception-edit-btn');

    for(const deleteButton of deleteButtons) {
        deleteButton.addEventListener('click', async () => {
            const id = deleteButton.dataset.receptionId;
            if(!id) return;
            if(!confirm('Are you sure you want to delete this reception?')) return;
            const res = await rpc('/account/reception/delete', { reception_id: id });
            if(res?.status === 'success') {
                reloadReceptionListPage();
            } else if(res?.message) {
                alert(res.message);
            }
        });
    }

    for(const editButton of editButtons) {
        editButton.addEventListener('click', async () => {
            const id = editButton.dataset.receptionId;
            if(!id) return;
            try {
                const res = await rpc('/account/reception/get', { reception_id: id });
                if(res?.status !== 'success') {
                    if(res?.message) alert(res.message);
                    return;
                }

                // Open modal in edit mode
                const modalId = 'page-reception-list-create-modal';
                const modal = document.getElementById(modalId);
                if (!modal) return;

                // Set hidden edit id
                const editHiddenIdInput = document.getElementById('page-reception-list-create-form-reception-id');
                if (editHiddenIdInput) editHiddenIdInput.value = id;

                // Update modal title and button
                const headerTitle = modal.querySelector('.modal-header h3');
                if (headerTitle) headerTitle.textContent = 'Reception Update';
                const submitBtn = document.getElementById('page-reception-list-create-product-form-submit');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update';

                // Prefill fields
                const scheduledDateInput = document.getElementById('page-reception-list-create-form-scheduled-date');
                if (scheduledDateInput) {
                    const dateValue = res.data.scheduled_date || '';
                    if (scheduledDateInput._flatpickr) {
                        try { scheduledDateInput._flatpickr.setDate(dateValue, true); } catch(e) { scheduledDateInput.value = dateValue; }
                    } else {
                        scheduledDateInput.value = dateValue;
                    }
                }

                const trackingInput = document.getElementById('page-reception-list-create-form-tracking-number');
                if (trackingInput) trackingInput.value = res.data.tracking_number || '';

                const trackingOptionalInput = document.getElementById('page-reception-list-create-form-tracking-number-optional');
                if (trackingOptionalInput) trackingOptionalInput.value = res.data.tracking_number_optional || '';

                const carrierSelect = document.getElementById('page-reception-list-create-form-carrier-id');
                if (carrierSelect) {
                    if ($(carrierSelect).data('select2')) {
                        $(carrierSelect).val(null).trigger('change');
                    }
                    const carrier = res.data.carrier;
                    if (carrier && carrier.id) {
                        const option = new Option(carrier.name, carrier.id, true, true);
                        $(carrierSelect).append(option).trigger('change');
                    }
                }

                const carrierNameInput = document.getElementById('page-reception-list-create-form-carrier-name');
                if (carrierNameInput) carrierNameInput.value = res.data.carrier_name || '';

                // Prefill Package Type and measures/weight
                const packageTypeSelect = document.getElementById('page-reception-list-create-form-package-type-id');
                if (packageTypeSelect) {
                    if ($(packageTypeSelect).data('select2')) {
                        $(packageTypeSelect).val(null).trigger('change');
                    }
                    const pt = res.data.package_type_id;
                    if (pt && pt.id) {
                        const option = new Option(pt.name, pt.id, true, true);
                        $(packageTypeSelect).append(option).trigger('change');
                    }
                }

                const widthField = document.getElementById('page-reception-list-create-form-measures-width');
                if (widthField) widthField.value = res.data.width || '';
                const heightField = document.getElementById('page-reception-list-create-form-measures-height');
                if (heightField) heightField.value = res.data.height || '';
                const lengthField = document.getElementById('page-reception-list-create-form-measures-length');
                if (lengthField) lengthField.value = res.data.length || '';
                const weightField = document.getElementById('page-reception-list-create-form-weight');
                if (weightField) weightField.value = res.data.weight || '';

                // Show modal
                if (typeof Modal !== 'undefined' && Modal.open) {
                    Modal.open(modalId);
                } else {
                    modal.classList.remove('hidden');
                }
            } catch (e) {
                console.error(e);
                alert('Failed to load reception data');
            }
        });
    }
}

/**
 * Inicializa los botones de acción en la página de gestión de recepciones.
 *
 * Esta función configura:
 * 1. El botón para crear nuevos elementos de recepción
 * 2. El botón para importar archivos
 *
 */
export const initReceptionsManagementListPage = () => {
    // Configurar botón para crear nuevos elementos
    const createButton = document.getElementById('launch-create-reception-form-button');
    if(createButton) createButton.addEventListener('click', () => {
        // Open the modal
        const modal = document.getElementById('page-reception-list-create-modal');
        if (modal) modal.classList.remove('hidden');
    });

    // Configurar botón para importar archivos
    const fileUploadButton = document.getElementById('page-list-reception-tools-action-import');
    if(fileUploadButton) fileUploadButton.addEventListener('click', () => {
        // Open the file upload modal
        const modal = document.getElementById('file-upload-modal');
        if (modal) modal.classList.remove('hidden');
    });

    // Configurar botón para eliminar por lote
    const batchDeleteButton = document.getElementById('page-list-reception-batch-action-delete');
    if(batchDeleteButton) batchDeleteButton.addEventListener('click', async () => {
        // Get selected ids
        const selectedIds = [];
        document.querySelectorAll('.packages-list-checkbox:checked').forEach(checkbox => {
            selectedIds.push(checkbox.dataset.packageId);
        });

        if(selectedIds.length === 0) return;

        if(confirm('Are you sure you want to delete these items?')) {
            const res = await rpc('/account/reception/batch/delete', {
                ids: selectedIds,
            });

            if(res?.status === 'success') {
                reloadReceptionListPage();
            }
        }
    });

}
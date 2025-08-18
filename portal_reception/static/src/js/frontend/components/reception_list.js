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
import { rpc } from "@web/core/network/rpc";

/**
 * Configuración de ordenamiento para la lista de productos.
 * Esta variable controla cómo se ordenan los elementos en la lista de stock.
 * @type {Object}
 * @property {string|null} column - Columna por la que se está ordenando (null inicialmente)
 * @property {string} direction - Dirección del ordenamiento ('asc' para ascendente, 'desc' para descendente)
 */
export let sortConfig = {
    column: null,
    direction: 'asc'
};

/**
 * Recarga la lista de stock en la página.
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
export const reloadStockListPage = async () => {
    // Obtener el contenedor principal de la lista
    const pageListItems = document.getElementById('stock-page-list-items');
    if(!pageListItems) return;

    // Obtener y validar el input de página actual
    const currentPageInput = document.getElementById('stock-list-pagination-page');
    if(!currentPageInput) return;
    const currentPage = parseInt(currentPageInput.value);

    // Obtener y validar el campo de búsqueda
    const searchInput = document.getElementById('page-stock-products-list-search');
    if(!searchInput) return;
    const search = searchInput.value;

    // Obtener dominio de búsqueda avanzada si existe
    const domainInput = document.getElementById('page-products-list-advanced-search-domain');
    const domain = domainInput ? JSON.parse(domainInput.value || '[]') : [];

    // Obtener tipo de coincidencia para los filtros
    const matchTypeSelect = document.getElementById('page-products-list-advanced-search-match-type');
    const matchType = matchTypeSelect ? matchTypeSelect.value : 'all';

    // Realizar petición RPC al servidor con todos los parámetros recopilados
    const res = await rpc('/account/stock/list/reload', {
        page: currentPage,
        search: search,
        domain: domain,
        match_type: matchType,
        sort: sortConfig.column,
        order: sortConfig.direction
    });

    // Verificar si la respuesta es exitosa
    if(res?.status != 'success') return;

    // Actualizar el contenido HTML con los resultados
    if(pageListItems) pageListItems.innerHTML = res.list;

    // Actualizar el paginador
    const paginationContainer = document.getElementById('stock-list-pagination-container');
    if(paginationContainer) paginationContainer.innerHTML = res.pager;

    // Configurar eventos para el PAGINADOR
    const paginationPrevious = document.getElementById('stock-list-pagination-previous');
    const paginationButton = document.querySelectorAll('.stock-list-pagination-button');
    const paginationNext = document.getElementById('stock-list-pagination-next');

    // Evento para el botón "Anterior"
    if(paginationPrevious) paginationPrevious.addEventListener('click', () => {
        if((currentPage - 1) < 1) return;
        currentPageInput.value = currentPage - 1;
        reloadStockListPage();
    });

    // Eventos para los botones de página específica
    if(paginationButton) paginationButton.forEach(button => {
        button.addEventListener('click', () => {
            currentPageInput.value = parseInt(button.dataset.page);
            reloadStockListPage();
        });
    });

    // Evento para el botón "Siguiente"
    if(paginationNext) paginationNext.addEventListener('click', () => {
        if((currentPage + 1) > res.last_page) return;
        currentPageInput.value = currentPage + 1;
        reloadStockListPage();
    });
}

/**
 * Inicializa los botones de acción en la página de gestión de stock.
 *
 * Esta función configura:
 * 1. El botón para crear nuevos elementos de stock
 * 2. El botón para importar archivos
 *
 */
export const initProductsManagementListPage = () => {
    // Configurar botón para crear nuevos elementos de stock
    const createButton = document.getElementById('launch-create-stock-form-button');
    if(createButton) createButton.addEventListener('click', () => {
        Modal.open('page-stock-list-create-modal');
    });

    // Configurar botón para importar archivos
    const fileUploadButton = document.getElementById('page-list-stock-tools-action-import');
    if(fileUploadButton) fileUploadButton.addEventListener('click', () => {
        Modal.open('file-upload-modal');
    });
}
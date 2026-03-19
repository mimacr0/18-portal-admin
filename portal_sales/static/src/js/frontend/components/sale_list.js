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
export const reloadSaleListPage = async () => {
    // Obtener el contenedor principal de la lista
    const pageListItems = document.getElementById('sale-page-list-items');
    if(!pageListItems) return;

    // Obtener y validar el input de página actual
    const currentPageInput = document.getElementById('page-sale-list-pagination-page');
    if(!currentPageInput) return;
    const currentPage = parseInt(currentPageInput.value);

    // Obtener y validar el campo de búsqueda
    const searchInput = document.getElementById('page-sale-list-quick-search');
    if(!searchInput) return;
    const search = searchInput.value;

    // Obtener dominio de búsqueda avanzada si existe
    const domainInput = document.getElementById('page-sale-list-advanced-search-domain');
    const domain = domainInput ? JSON.parse(domainInput.value || '[]') : [];

    // Obtener tipo de coincidencia para los filtros
    const matchTypeSelect = document.getElementById('page-sale-list-advanced-search-match-type');
    const matchType = matchTypeSelect ? matchTypeSelect.value : 'all';

    // Obtener el valor del input de filtros rápidos
    const quickFiltersInput = document.getElementById('page-sale-list-quick-filter-active');
    const quickFilter = quickFiltersInput ? quickFiltersInput.value : '';

    // Realizar petición RPC al servidor con todos los parámetros recopilados
    const res = await rpc('/account/sale/list/reload', {
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
    const paginationContainer = document.getElementById('page-sale-list-pagination-container');
    if(paginationContainer) paginationContainer.innerHTML = res.pager;

    // Actualizar el paginador
    const paginationContainerMain = document.getElementById('page-sale-list-pagination-container-main');
    if(paginationContainerMain && res.last_page == 0) paginationContainerMain.classList.add('hidden');
    else paginationContainerMain.classList.remove('hidden');

    // Configurar eventos para el PAGINADOR
    // IDs in template use 'sale-list-' prefix
    const paginationPrevious = document.getElementById('sale-list-pagination-previous');
    const paginationButton = document.querySelectorAll('.sale-list-pagination-button');
    const paginationNext = document.getElementById('sale-list-pagination-next');

    // Evento para el botón "Anterior"
    if(paginationPrevious) paginationPrevious.addEventListener('click', () => {
        if((currentPage - 1) < 1) return;
        currentPageInput.value = currentPage - 1;
        reloadSaleListPage();
    });

    // Eventos para los botones de página específica
    if(paginationButton) paginationButton.forEach(button => {
        button.addEventListener('click', () => {
            currentPageInput.value = parseInt(button.dataset.page);
            reloadSaleListPage();
        });
    });

    // Evento para el botón "Siguiente"
    if(paginationNext) paginationNext.addEventListener('click', () => {
        if((currentPage + 1) > res.last_page) return;
        currentPageInput.value = currentPage + 1;
        reloadSaleListPage();
    });

    const deleteButtons = document.querySelectorAll('.sale-delete-btn');

    for(const deleteButton of deleteButtons) {
        deleteButton.addEventListener('click', async () => {
            const id = deleteButton.dataset.saleId;
            if(!id) return;
            if(!confirm('Are you sure you want to cancel this sale?')) return;
            const res = await rpc('/account/sale/delete', { sale_id: id });
            if(res?.status === 'success') {
                reloadSaleListPage();
            } else if(res?.message) {
                alert(res.message);
            }
        });
    }

}

/**
 * Inicializa los botones de acción en la página de gestión de pedidos.
 */
export const initSalesManagementListPage = () => {
    // No specific management buttons like "Create" for sales portal yet
}
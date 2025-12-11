import { rpc } from "@web/core/network/rpc";

/**
 * Inicializa los botones de lotes en la lista de productos.
 * 
 * Esta función configura el event delegation para manejar los clicks
 * en los botones de lotes (product-lots-button) y navegar a la página
 * de lotes del producto correspondiente.
 * 
 * @returns {void}
 */
export const initProductLotsButton = () => {
    const pageListItems = document.getElementById('stock-page-list-items');
    if (!pageListItems) return;

    // Event delegation para manejar clicks en botones de lotes
    pageListItems.addEventListener('click', async (event) => {
        const lotsBtn = event.target.closest('button.product-lots-button');
        if (!lotsBtn) return;

        // Prevenir el comportamiento por defecto y la propagación
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const productId = lotsBtn.dataset.productId;
        if (!productId) {
            console.error('Product ID not found in button dataset');
            return;
        }

        try {
            if (typeof showLoadingScreen === 'function') {
                showLoadingScreen();
            }
            
            // Navegar a la página de lotes del producto
            const url = `/account/stock/lots?product_id=${productId}`;
            console.log('Navigating to lots page:', url);
            window.location.href = url;
            
        } catch (e) {
            console.error('Error navigating to lots page:', e);
            if (typeof systemShowNotification === 'function') {
                systemShowNotification('Error loading lots', { type: 'error', duration: 4000 });
            }
            if (typeof hideLoadingScreen === 'function') {
                hideLoadingScreen();
            }
        }
    });
};

/**
 * Recarga la lista de lotes en la página.
 *
 * Esta función asíncrona realiza las siguientes operaciones:
 * 1. Obtiene los elementos DOM necesarios (contenedor, paginación, búsqueda)
 * 2. Recopila los parámetros de búsqueda y filtrado
 * 3. Realiza una petición RPC al servidor
 * 4. Actualiza el HTML con los resultados
 * 5. Configura los eventos para la navegación del paginador
 *
 * @async
 * @param {number|null} productId - ID del producto para filtrar los lotes (opcional)
 * @returns {Promise<void>}
 */
export const reloadLotsListPage = async (productId = null) => {
    // Obtener el contenedor principal de la lista
    const pageListItems = document.getElementById('lots-page-list-items');
    if (!pageListItems) return;

    // Obtener y validar el input de página actual
    const currentPageInput = document.getElementById('lots-list-pagination-page');
    if (!currentPageInput) return;
    const currentPage = parseInt(currentPageInput.value);

    // Obtener y validar el campo de búsqueda
    const searchInput = document.getElementById('page-lots-list-search');
    const search = searchInput ? searchInput.value : '';

    // Obtener dominio de búsqueda avanzada si existe
    const domainInput = document.getElementById('page-lots-list-advanced-search-domain');
    const domain = domainInput ? JSON.parse(domainInput.value || '[]') : [];

    // Obtener tipo de coincidencia para los filtros
    const matchTypeSelect = document.getElementById('page-lots-list-advanced-search-match-type');
    const matchType = matchTypeSelect ? matchTypeSelect.value : 'all';

    // Obtener el valor del input de filtros rápidos
    const quickFiltersInput = document.getElementById('page-lots-list-quick-filter-active');
    const quickFilter = quickFiltersInput ? quickFiltersInput.value : '';

    // Obtener product_id de la URL si no se proporciona
    if (!productId) {
        const urlParams = new URLSearchParams(window.location.search);
        productId = urlParams.get('product_id');
    }

    // Realizar petición RPC al servidor con todos los parámetros recopilados
    const res = await rpc('/account/stock/lots/reload', {
        page: currentPage,
        search: search,
        domain: domain,
        match_type: matchType,
        product_id: productId,
        quick_filter: quickFilter
    });

    // Verificar si la respuesta es exitosa
    if (res?.status != 'success') return;

    // Actualizar el contenido HTML con los resultados
    if (pageListItems) pageListItems.innerHTML = res.list;

    // Actualizar el paginador
    const paginationContainer = document.getElementById('lots-list-pagination-container');
    if (paginationContainer) paginationContainer.innerHTML = res.pager;

    // Configurar eventos para el PAGINADOR
    const paginationPrevious = document.getElementById('lot-list-pagination-previous');
    const paginationButton = document.querySelectorAll('.lot-list-pagination-button');
    const paginationNext = document.getElementById('lot-list-pagination-next');

    // Evento para el botón "Anterior"
    if (paginationPrevious) paginationPrevious.addEventListener('click', () => {
        if ((currentPage - 1) < 1) return;
        currentPageInput.value = currentPage - 1;
        reloadLotsListPage(productId);
    });

    // Eventos para los botones de página específica
    if (paginationButton) paginationButton.forEach(button => {
        button.addEventListener('click', () => {
            currentPageInput.value = parseInt(button.dataset.page);
            reloadLotsListPage(productId);
        });
    });

    // Evento para el botón "Siguiente"
    if (paginationNext) paginationNext.addEventListener('click', () => {
        if ((currentPage + 1) > res.last_page) return;
        currentPageInput.value = currentPage + 1;
        reloadLotsListPage(productId);
    });
};

/**
 * Inicializa los botones de acción en la página de gestión de lotes.
 *
 * Esta función configura:
 * 1. Los botones de editar y eliminar lotes
 * 2. Los botones de acciones masivas
 *
 * @returns {void}
 */
export const initLotsManagementListPage = () => {
    // Hook edit and delete buttons (event delegation after each reload)
    const pageListItems = document.getElementById('lots-page-list-items');
    if (pageListItems) {
        pageListItems.addEventListener('click', async (event) => {
            const editBtn = event.target.closest('button.lot-edit-button');
            const deleteBtn = event.target.closest('button.lot-delete-button');
            if (!editBtn && !deleteBtn) return;
            const lotId = (editBtn || deleteBtn).dataset.lotId;
            if (!lotId) return;

            try {
                showLoadingScreen();
                if (deleteBtn) {
                    // Confirm and delete
                    const confirmed = typeof sysConfirmModal === 'function'
                        ? await sysConfirmModal('Delete lot?', 'This action cannot be undone.')
                        : window.confirm('Delete lot? This action cannot be undone.');
                    if (!confirmed) return;
                    const delRes = await rpc('/account/stock/lots/delete', { lot_id: lotId });
                    systemShowNotification(delRes.message || 'Delete', { type: delRes.status === 'success' ? 'success' : 'error', duration: 4000 });
                    if (delRes.status === 'success') {
                        document.dispatchEvent(new CustomEvent('lots:reload'));
                    }
                } else if (editBtn) {
                    // TODO: Implementar modal de edición de lotes
                    const res = await rpc('/account/stock/lots/get', { lot_id: lotId });
                    if (res?.status !== 'success') {
                        return systemShowNotification(res?.message || 'Error loading lot', { type: 'error', duration: 4000 });
                    }
                    // Aquí se puede abrir un modal de edición similar al de productos
                    systemShowNotification('Edit lot functionality coming soon', { type: 'info', duration: 3000 });
                }
            } catch (e) {
                systemShowNotification('Error executing action', { type: 'error', duration: 4000 });
            } finally {
                hideLoadingScreen();
            }
        });
    }

    // Bulk delete handler
    const bulkDeleteButton = document.getElementById('page-list-lots-batch-action-delete');
    if (bulkDeleteButton) {
        bulkDeleteButton.addEventListener('click', async () => {
            try {
                const selected = Array.from(document.querySelectorAll('.lots-list-checkbox:checked')).map(cb => cb.dataset.lotId);
                if (selected.length === 0) {
                    return systemShowNotification('No lots selected', { type: 'warning', duration: 3000 });
                }
                const confirmed = typeof sysConfirmModal === 'function'
                    ? await sysConfirmModal('Delete selected lots?', 'This action cannot be undone.')
                    : window.confirm('Delete selected lots? This action cannot be undone.');
                if (!confirmed) return;
                showLoadingScreen();
                const res = await rpc('/account/stock/lots/delete/batch', { lot_ids: selected });
                systemShowNotification(res.message || 'Delete', { type: res.status === 'success' ? 'success' : 'error', duration: 4000 });
                if (res.status === 'success') {
                    document.dispatchEvent(new CustomEvent('lots:reload'));
                }
            } catch (e) {
                systemShowNotification('Error deleting lots', { type: 'error', duration: 4000 });
            } finally {
                hideLoadingScreen();
            }
        });
    }
};


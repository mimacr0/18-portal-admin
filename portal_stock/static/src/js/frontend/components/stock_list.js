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
    direction: 'desc'
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
    const searchInput = document.getElementById('page-stock-list-search');
    if(!searchInput) return;
    const search = searchInput.value;

    // Obtener dominio de búsqueda avanzada si existe
    const domainInput = document.getElementById('page-stock-list-advanced-search-domain');
    const domain = domainInput ? JSON.parse(domainInput.value || '[]') : [];

    // Obtener tipo de coincidencia para los filtros
    const matchTypeSelect = document.getElementById('page-stock-list-advanced-search-match-type');
    const matchType = matchTypeSelect ? matchTypeSelect.value : 'all';

    // Obtener el valor del input de filtros rápidos
    const quickFiltersInput = document.getElementById('page-stock-list-quick-filter-active');
    const quickFilter = quickFiltersInput ? quickFiltersInput.value : '';

    // Realizar petición RPC al servidor con todos los parámetros recopilados
    const res = await rpc('/account/stock/list/reload', {
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
        Modal.open('page-stock-import-products-modal');
    });

    // Hook edit and delete buttons (event delegation after each reload)
    const pageListItems = document.getElementById('stock-page-list-items');
    if (pageListItems) {
        pageListItems.addEventListener('click', async (event) => {
            const editBtn = event.target.closest('button.product-edit-button');
            const deleteBtn = event.target.closest('button.product-delete-button');
            if (!editBtn && !deleteBtn) return;
            const productId = (editBtn || deleteBtn).dataset.productId;
            if (!productId) return;

            try {
                showLoadingScreen();
                if (deleteBtn) {
                    // Confirm and delete
                    const confirmed = typeof sysConfirmModal === 'function'
                        ? await sysConfirmModal('Delete product?', 'This action cannot be undone.')
                        : window.confirm('Archive product? This action cannot be undone.');
                    if (!confirmed) return;
                    const delRes = await rpc('/account/stock/delete/product', { product_id: productId });
                    systemShowNotification(delRes.message || 'Delete', { type: delRes.status === 'success' ? 'success' : 'error', duration: 4000 });
                    if (delRes.status === 'success') {
                        document.dispatchEvent(new CustomEvent('list:reload'));
                    }
                } else if (editBtn) {
                    const res = await rpc('/account/stock/get/product', { product_id: productId });
                    if (res?.status !== 'success') {
                        return systemShowNotification(res?.message || 'Error loading product', { type: 'error', duration: 4000 });
                    }

                    const product = res.product;
                    // Fill form
                    document.getElementById('page-stock-edit-form-product-id').value = product.id;
                    document.getElementById('page-stock-edit-form-name').value = product.name || '';
                    document.getElementById('page-stock-edit-form-sku').value = product.sku || '';
                    document.getElementById('page-stock-edit-form-barcode').value = product.barcode || '';
                    document.getElementById('page-stock-edit-form-weight').value = String(product.weight || '');
                    document.getElementById('page-stock-edit-form-volume').value = String(product.volume || '');
                    // Establecer la imagen directamente desde product.product (variante)
                    const preview = document.getElementById('page-stock-edit-form-image-preview');
                    if (preview) {
                        if (product.image_base64) {
                            // Usar la imagen base64 de product.product
                            preview.src = `data:image/png;base64,${product.image_base64}`;
                            document.getElementById('page-stock-edit-form-image-base64').value = product.image_base64;
                        } else {
                            // Usar placeholder si no hay imagen
                            preview.src = '/portal_stock/static/img/placeholder.png';
                            document.getElementById('page-stock-edit-form-image-base64').value = '';
                        }
                    }
                    const tNone = document.getElementById('page-stock-edit-tracking-none');
                    const tSerial = document.getElementById('page-stock-edit-tracking-serial');
                    if (tNone && tSerial) {
                        tNone.checked = product.tracking === 'none';
                        tSerial.checked = product.tracking === 'serial';
                    }

                    // Initialize image picker controls
                    const imgInput = document.getElementById('page-stock-edit-form-image');
                    const imgDelete = document.getElementById('page-stock-edit-form-image-delete');
                    if (imgInput) {
                        imgInput.onchange = (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            if (!file.type.startsWith('image/')) {
                                systemShowNotification('Please select a valid image file', { type: 'error', duration: 3000 });
                                return;
                            }
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                                const base64 = evt.target.result.split(',')[1];
                                document.getElementById('page-stock-edit-form-image-base64').value = base64;
                                if (preview) preview.src = evt.target.result;
                            };
                            reader.readAsDataURL(file);
                        };
                    }
                    if (imgDelete) {
                        imgDelete.onclick = () => {
                            document.getElementById('page-stock-edit-form-image-base64').value = '';
                            if (preview) preview.src = '/portal_stock/static/img/placeholder.png';
                            const fileInput = document.getElementById('page-stock-edit-form-image');
                            if (fileInput) fileInput.value = '';
                        };
                    }

                    // Submit handler
                    const submit = document.getElementById('page-stock-edit-form-submit');
                    if (submit) {
                        submit.onclick = async () => {
                            try {
                                showLoadingScreen();
                                const { formData } = sysCollectFormData('#page-stock-edit-form');
                                const response = await rpc('/account/stock/update/product', formData);
                                systemShowNotification(response.message || 'Saved', { type: response.status === 'success' ? 'success' : 'error', duration: 4000 });
                                if (response.status === 'success') {
                                    Modal.close('page-stock-edit-modal');
                                    document.dispatchEvent(new CustomEvent('list:reload'));
                                }
                            } catch (e) {
                                systemShowNotification('Error saving product', { type: 'error', duration: 4000 });
                            } finally {
                                hideLoadingScreen();
                            }
                        };
                    }

                    Modal.open('page-stock-edit-modal');
                }
            } catch (e) {
                systemShowNotification('Error executing action', { type: 'error', duration: 4000 });
            } finally {
                hideLoadingScreen();
            }
        });
    }

    // Bulk delete handler
    const bulkDeleteButton = document.getElementById('page-list-stock-batch-action-delete') || document.getElementById('page-list-products-batch-action-delete');
    if (bulkDeleteButton) {
        bulkDeleteButton.addEventListener('click', async () => {
            try {
                const selected = Array.from(document.querySelectorAll('.products-list-checkbox:checked')).map(cb => cb.dataset.productId);
                if (selected.length === 0) {
                    return systemShowNotification('No products selected', { type: 'warning', duration: 3000 });
                }
                const confirmed = typeof sysConfirmModal === 'function'
                    ? await sysConfirmModal('Delete selected products?', 'This action cannot be undone.')
                    : window.confirm('Delete selected products? This action cannot be undone.');
                if (!confirmed) return;
                showLoadingScreen();
                const res = await rpc('/account/stock/delete/products', { product_ids: selected });
                systemShowNotification(res.message || 'Delete', { type: res.status === 'success' ? 'success' : 'error', duration: 4000 });
                if (res.status === 'success') {
                    document.dispatchEvent(new CustomEvent('list:reload'));
                }
            } catch (e) {
                systemShowNotification('Error deleting products', { type: 'error', duration: 4000 });
            } finally {
                hideLoadingScreen();
            }
        });
    }
}
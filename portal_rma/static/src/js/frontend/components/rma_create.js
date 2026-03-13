import { rpc } from "@web/core/network/rpc";

const getElement = (id) => document.getElementById(id);

/**
 * Helper to fetch and render unmapped products
 */
const fetchUnmappedProducts = async () => {
    try {
        const response = await rpc('/account/rma/unmapped_products', {});
        if (response.status === 'success') renderStockKanban(response.quants);
    } catch (e) {
        console.error('Error fetching stock:', e);
    }
};

/**
 * Creates an RMA unit for a single product
 */
const createSingleRmaUnit = async (productId) => {
    try {
        if (window.showLoadingScreen) window.showLoadingScreen();

        const response = await rpc('/account/rma/unit/create', {
            products: JSON.stringify([{
                product_id: parseInt(productId),
                quantity: 1
            }]),
            notes: "Direct creation from portal"
        });

        if (window.systemShowNotification) {
            window.systemShowNotification(response?.message || 'RMA unit created', {
                type: response?.status === 'success' ? 'success' : 'error'
            });
        }

        if (response?.status === 'success') {
            // Close all modals
            if (window.Modal) {
                window.Modal.close('rma-stock-selector-modal');
                window.Modal.close('rma-product-mapping-modal');
            }
            // Reload the list
            window.location.reload();
        }
    } catch (e) {
        console.error('Error creating RMA unit:', e);
    } finally {
        if (window.hideLoadingScreen) window.hideLoadingScreen();
    }
};

/**
 * Opens the mapping creation modal for a specific product
 */
const openMappingModal = (productId, productName, currentSku = '') => {
    const pIdInput = getElement('mapping-product-id');
    const pIntNameInput = getElement('mapping-internal-name');
    const pCliNameInput = getElement('mapping-client-name');
    const pCliSkuInput = getElement('mapping-client-sku');

    if (pIdInput) pIdInput.value = productId;
    if (pIntNameInput) pIntNameInput.value = productName;
    if (pCliNameInput) pCliNameInput.value = productName;
    if (pCliSkuInput) pCliSkuInput.value = currentSku;

    if (window.Modal) window.Modal.open('rma-product-mapping-modal');
};

/**
 * Renders the Kanban cards for Stock
 */
const renderStockKanban = (quants) => {
    const container = getElement('rma-stock-kanban-container');
    if (!container) return;

    if (!quants || quants.length === 0) {
        container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500">No products found.</div>';
        return;
    }

    container.innerHTML = quants.map(q => `
        <div class="stock-product-card bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 p-2 cursor-pointer transition-all duration-200 group flex flex-col items-center text-center"
             data-product-id="${q.id}" data-product-name="${q.name}">
            <div class="w-16 h-16 mb-2 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center relative">
                <img src="${q.image_url}" alt="${q.name}" class="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"/>
            </div>
            <div class="flex-1 w-full">
                <h4 class="text-[11px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5 line-clamp-2 leading-tight h-7 shadow-none text-center w-full">${q.name}</h4>
                <p class="text-[9px] text-gray-500 dark:text-gray-400 font-mono mb-1.5">${q.code || ''}</p>
                <div class="px-3 py-1 bg-theme text-white text-[9px] font-bold rounded-full uppercase tracking-wider inline-block">Map & Create</div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.stock-product-card').forEach(card => {
        card.addEventListener('click', () => {
            openMappingModal(card.dataset.productId, card.dataset.productName);
        });
    });
};

/**
 * Initializes the creation logic
 */
export const initRmaCreate = () => {
    const createBtn = getElement('launch-create-rma_units-form-button');
    if (!createBtn) return;

    createBtn.addEventListener('click', () => {
        if (window.Modal) {
            window.Modal.open('rma-stock-selector-modal');
            fetchUnmappedProducts();
        }
    });

    // Mapping save logic -> Auto CREATE RMA Unit
    const saveMappingBtn = getElement('rma-product-mapping-save-btn');
    if (saveMappingBtn) {
        saveMappingBtn.addEventListener('click', async () => {
            const productId = getElement('mapping-product-id').value;
            const name = getElement('mapping-client-name').value.trim();
            const sku = getElement('mapping-client-sku').value.trim();

            if (!name) {
                if (window.systemShowNotification) window.systemShowNotification('Name is required', { type: 'error' });
                else alert('Name is required');
                return;
            }

            try {
                if (window.showLoadingScreen) window.showLoadingScreen();
                const response = await rpc('/account/rma/product/map/quick_create', {
                    product_id: productId,
                    name: name,
                    account_sku: sku
                });

                if (response.status === 'success') {
                    // Mapping successful, now create the RMA Unit automatically
                    await createSingleRmaUnit(response.product_id);
                } else if (window.systemShowNotification) {
                    window.systemShowNotification(response.message || 'Error mapping product', { type: 'error' });
                }
            } catch (e) {
                console.error('Error mapping product:', e);
            } finally {
                // hideLoadingScreen is inside createSingleRmaUnit
            }
        });
    }

    const stockSearch = getElement('rma-stock-search');
    if (stockSearch) {
        let timeout = null;
        stockSearch.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const response = await rpc('/account/rma/unmapped_products', { search: stockSearch.value });
                if (response.status === 'success') renderStockKanban(response.quants);
            }, 300);
        });
    }
};

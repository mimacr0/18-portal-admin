import { rpc } from "@web/core/network/rpc";
import { reloadProductMappingListPage } from "./product_mapping_list.js";

const getElement = (id) => document.getElementById(id);

/**
 * Helper to fetch and render unmapped products (Catalog)
 */
const fetchUnmappedProducts = async () => {
    try {
        const response = await rpc('/account/product_mapping/unmapped_products', {});
        if (response.status === 'success') renderCatalogKanban(response.products);
    } catch (e) {
        console.error('Error fetching catalog:', e);
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

    if (window.Modal) window.Modal.open('product-mapping-create-modal');
};

/**
 * Renders the Kanban cards for Catalog
 */
const renderCatalogKanban = (products) => {
    const container = getElement('product-mapping-stock-kanban-container');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500">No products found.</div>';
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="catalog-product-card bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 p-2 cursor-pointer transition-all duration-200 group flex flex-col items-center text-center"
             data-product-id="${p.id}" data-product-name="${p.name}">
            <div class="w-16 h-16 mb-2 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center relative">
                <img src="${p.image_url}" alt="${p.name}" class="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"/>
            </div>
            <div class="flex-1 w-full">
                <h4 class="text-[11px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5 line-clamp-2 leading-tight h-7 shadow-none text-center w-full">${p.name}</h4>
                <p class="text-[9px] text-gray-500 dark:text-gray-400 font-mono mb-1.5">${p.code || ''}</p>
                <div class="px-3 py-1 bg-theme text-white text-[9px] font-bold rounded-full uppercase tracking-wider inline-block">Map Product</div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.catalog-product-card').forEach(card => {
        card.addEventListener('click', () => {
            openMappingModal(card.dataset.productId, card.dataset.productName);
        });
    });
};

/**
 * Initializes the creation logic for Product Mapping
 */
export const initProductMappingCreate = () => {
    const createBtn = getElement('launch-create-product_mapping-form-button');
    if (!createBtn) return;

    createBtn.addEventListener('click', () => {
        if (window.Modal) {
            window.Modal.open('product-mapping-stock-selector-modal');
            fetchUnmappedProducts();
        }
    });

    // Mapping save logic
    const saveMappingBtn = getElement('product-mapping-save-btn');
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
                const response = await rpc('/account/product_mapping/create', {
                    product_id: productId,
                    name: name,
                    account_sku: sku
                });

                if (response.status === 'success') {
                    if (window.systemShowNotification) {
                        window.systemShowNotification(response.message || 'Mapping created successfully', { type: 'success' });
                    }
                    // Close modals
                    if (window.Modal) {
                        window.Modal.close('product-mapping-create-modal');
                        window.Modal.close('product-mapping-stock-selector-modal');
                    }
                    // Reload list
                    reloadProductMappingListPage();
                } else if (window.systemShowNotification) {
                    window.systemShowNotification(response.message || 'Error creating mapping', { type: 'error' });
                }
            } catch (e) {
                console.error('Error creating mapping:', e);
            } finally {
                if (window.hideLoadingScreen) window.hideLoadingScreen();
            }
        });
    }

    const stockSearch = getElement('product-mapping-stock-search');
    if (stockSearch) {
        let timeout = null;
        stockSearch.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const response = await rpc('/account/product_mapping/unmapped_products', { search: stockSearch.value });
                if (response.status === 'success') renderCatalogKanban(response.products);
            }, 300);
        });
    }
};

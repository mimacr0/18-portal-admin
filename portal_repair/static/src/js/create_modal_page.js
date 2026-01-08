import { rpc } from "@web/core/network/rpc";
import { reloadRepairAlertListPage } from "./frontend/components/repair_alert_list.js";

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// TODO: UNUSED - Product catalog variables, kept for future use
// let currentCatalogPage = 1;
// let catalogSearchQuery = '';

// Lot catalog state variables
let currentQuantCatalogPage = 1;
let quantCatalogSearchQuery = '';

// TODO: UNUSED - Product catalog debounced search, kept for future use
// const debouncedSearch = debounce(function() {
//     catalogSearchQuery = this.value;
//     currentCatalogPage = 1;
//     loadProductCatalog();
// }, 300);

// Create a debounced search function for lots
const debouncedQuantSearch = debounce(function() {
    quantCatalogSearchQuery = this.value;
    currentQuantCatalogPage = 1;
    loadQuantCatalog();
}, 300);

// Add a shared product registry to track products across views
const selectedProductsRegistry = new Map();
const catalogSelectedProductsRegistry = new Map();
const selectedLotsRegistry = new Map();

const updateRepairAlertsProductsField = () => {
    const productsContainer = document.getElementById('page-repair-alert-list-create-form-products-line-items-container');
    const productsField = document.getElementById('page-repair-alert-list-create-form-products-list');

    if (!productsContainer || !productsField) {
        console.error('Products container or field not found');
        return;
    }

    const productLines = productsContainer.querySelectorAll('.line-item');
    const products = [];

    for (const line of productLines) {
        const select = line.querySelector('.product-select');
        const qtyInput = line.querySelector('.product-qty');
        const secondSelect = line.querySelector('.second-select');

        try {
            const selectData = $(select).select2('data')[0];
            if (!selectData || !qtyInput) continue;

            const trackingType = selectData?.tracking || 'none';
            const selectedItems = secondSelect ? $(secondSelect).select2('data') : [];
            const selectedId = selectedItems.length > 0 ? (selectedItems[0].lot_id || selectedItems[0].id) : null;

            const productObj = {
                product_id: selectData.id,
                quantity: parseFloat(qtyInput.value) || 0,
                tracking: trackingType

            };

            // Asignar clave según trackingType
            if (trackingType === 'none') {
                productObj.location = selectedId;
            } else {
                productObj.lot = selectedId;
            }

            products.push(productObj);
        } catch (e) {
            console.error('Error getting product data:', e);
        }
    }

    productsField.value = JSON.stringify(products);
};



/**
 * Inicializa el formulario de creación de recepciones
 *
 * Esta función configura:
 * 1. Eventos de apertura del modal
 * 2. Cálculo automático de volumen
 * 3. Validación y envío del formulario
 */
export const initRepairAlertCreateForm = () => {
    console.log("Initializing repair-alert create form");

    // Define pageName at the beginning of the function so it's available in all callbacks
    const pageName = "repair-alert";

    // Obtener elementos del DOM usando el nombre de la página
    const createButton = document.getElementById('launch-create-repair-alert-form-button');
    const createModal = document.getElementById('page-repair-alert-list-create-modal');
    const submitButton = document.getElementById('page-repair-alert-list-create-product-form-submit');
    const lotCatalogButton = document.getElementById('page-repair-alert-list-create-form-lots-add-catalog-btn');
    const pageMainContainer = document.querySelector('#page-repair-alert-main-container');
    const lotCatalogSelectContainer = document.querySelector('#page-repair-alert-lot-catalog-select');

    const resetRepairAlertForm = () => {
        // Reset all form inputs
        const form = document.getElementById(`page-${pageName}-list-create-form`);
        if (form) {
            form.reset();
        }

        // Reset product lines container
        const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
        if (productsContainer) {
            productsContainer.innerHTML = '';
        }

        // Reset hidden products field
        const productsField = document.getElementById(`page-${pageName}-list-create-form-products-list`);
        if (productsField) {
            productsField.value = '';
        }

        // Clear selected products registry
        selectedProductsRegistry.clear();
    };

    // Add event listener for modal closing
    document.addEventListener('modalClosed', (e) => {
        if (e.detail.modalId !== 'page-repair-alert-list-create-modal') return;
        resetRepairAlertForm();
    });

    if (createButton) {
    createButton.addEventListener('click', () => {
        Modal.open('page-repair-alert-list-create-modal');
    });
    }

    // Lot Catalog button handler
    if (lotCatalogButton) {
        lotCatalogButton.addEventListener('click', async () => {
            const skipStickyHeader = document.getElementById('skip-list-page-sticky-header');
            if(skipStickyHeader) skipStickyHeader.value = 'true';

            const paginationContainerMain = document.getElementById('page-repair-alert-list-pagination-container-main');
            if (paginationContainerMain) {
                paginationContainerMain.classList.add('hidden');
            }

            if (lotCatalogSelectContainer) {
                lotCatalogSelectContainer.classList.remove('hidden');
            }
            if (pageMainContainer) {
                pageMainContainer.classList.add('hidden');
            }
            if (createModal) {
                createModal.dataset.open = 'false';
            }

            // Reset pagination and load first page
            currentQuantCatalogPage = 1;
            quantCatalogSearchQuery = '';
            const searchInput = document.getElementById(`page-${pageName}-lot-catalog-select-search`);
            if (searchInput) searchInput.value = '';

            // Sync registry with form lots before opening catalog
            syncQuantsRegistryFromForm();

            loadQuantCatalog();

            // Rebuild selected lots list from registry
            rebuildSelectedQuantsList();

            setupQuantSearchListener();
        });
    }

    // Set up close lot catalog button
    const closeQuantCatalogButton = document.getElementById(`page-${pageName}-lot-catalog-select-close-btn`);
    if (closeQuantCatalogButton) {
        closeQuantCatalogButton.addEventListener('click', closeQuantCatalog);
    }

    // Set up clear lot selection button
    const clearQuantSelectionButton = document.getElementById(`page-${pageName}-lot-catalog-select-clear-selection-btn`);
    if (clearQuantSelectionButton) {
        clearQuantSelectionButton.addEventListener('click', clearQuantSelection);
    }

    // Set up close catalog button
    const closeCatalogButton = document.getElementById(`page-${pageName}-product-catalog-select-close-btn`);
    if (closeCatalogButton) {
        closeCatalogButton.addEventListener('click', closeProductCatalog);
    }

    // Set up clear selection button
    const clearSelectionButton = document.getElementById(`page-${pageName}-product-catalog-select-clear-selection-btn`);
    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', () => {
            catalogSelectedProductsRegistry.clear();
            const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
            const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
            const selectedCount = document.getElementById("selected-count");

            if (selectedProductsList) {
                selectedProductsList.innerHTML = '';
                selectedProductsList.classList.add('hidden');
            }
            if (noProductsMessage) {
                noProductsMessage.classList.remove('hidden');
            }
            if (selectedCount) {
                selectedCount.textContent = '0';
            }

            // Reset all product cards in the catalog
            const productGrid = document.getElementById('page-repair-alert-product-catalog-select-products-grid');
            if (productGrid) {
                productGrid.querySelectorAll('.product-card').forEach(card => {
                    const initialAddDiv = card.querySelector('.product-initial-add');
                    const quantityControls = card.querySelector('.product-quantity-controls');
                    if (initialAddDiv) initialAddDiv.classList.remove('hidden');
                    if (quantityControls) quantityControls.classList.add('hidden');
                });
            }
        });
    }

    // Manejar envío del formulario
    if (!submitButton) {
        console.error('Submit button not found: page-repair-alert-list-create-product-form-submit');
        return;
    }
    submitButton.addEventListener('click', async () => {
        const res = sysFormValidate('#page-repair-alert-list-create-form');
        if(!res) return;

        const { formData } = sysCollectFormData('#page-repair-alert-list-create-form');

        const resp = await rpc('/account/repair-alert/create', formData);

        if(resp?.errors) sysShowServerErrors('#page-repair-alert-list-create-form', resp.errors);

        if(resp?.message) systemShowNotification(resp.message, { type: resp?.status || 'error' })

        if(resp?.status !== 'success') return;

        Modal.close('page-repair-alert-list-create-modal');

        reloadRepairAlertListPage();
    });

};

// TODO: UNUSED - Product format, kept for future use
function formatProduct(product) {
    if (!product.id) return product.text;

    // Create container with flexbox
    let html = `<div class="flex items-center space-x-3">`;

    // Add product image if available
    if (product.image) {
        html += `<div class="flex-shrink-0">
            <img src="${product.image}" class="h-10 w-10 object-cover rounded-sm" alt="${product.text}"/>
        </div>`;
    }

    // Product details with attributes
    html += `<div class="flex-grow">
        <div class="font-medium">${product.text}</div>`;

    if (product.default_code) {
        html += `<div class="text-xs text-gray-500">[${product.default_code}]</div>`;
    }

    // Add attributes as tags if available
    if (product.attributes && product.attributes.length > 0) {
        html += `<div class="flex flex-wrap gap-1 mt-1">`;
        product.attributes.forEach(attr => {
            html += `<span class="bg-gray-100 text-gray-800 text-xs px-1 py-0.5 rounded-sm">
                ${attr.display_name}
            </span>`;
        });
        html += `</div>`;
    }

    return $(html);
}

// TODO: UNUSED - Product format selection, kept for future use
function formatProductSelection(product) {
    if (!product.id) return product.text;

    let text = product.text;
    if (product.default_code) {
        text += ` [${product.default_code}]`;
    }

    // Optionally add a small badge with attribute count if product has attributes
    if (product.attributes && product.attributes.length > 0) {
        text += ` (${product.attributes.map(attr => attr.value).join(', ')})`;
    }

    return text;
}

// Format function for lot dropdown items - only show name
function formatQuant(lot) {
    if (!lot.id) return lot.text;

    // Simple container with just the lot name
    let html = `<div class="flex items-center">
        <div class="font-medium">${lot.text}</div>
    </div>`;

    return $(html);
}

// Format function for selected lot - only show name
function formatsecondSelection(lot) {
    if (!lot.id) return lot.text;

    return lot.text;
}
// Formatear cada opción de ubicación en el dropdown
function formatLocation(location) {
    if (!location.id) return location.text;

    // Contenedor simple con el nombre de la ubicación
    let html = `<div class="flex items-center">
        <div class="font-medium">${location.text}</div>
    </div>`;

    return $(html);
}

// Formatear la ubicación seleccionada en el select (solo el nombre)
function formatLocationSelection(location) {
    if (!location.id) return location.text;

    return location.text;
}


// Update the document ready function
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('repair-alert-page-list-items')) return;

    initRepairAlertCreateForm();
});

// Add near the top with other formatting functions

function formatCarrier(data) {
    if (!data.id) return data.text;

    // Create container with flexbox
    let html = `<div class="flex items-center space-x-3">`;

    // Add carrier image if available
    if (data.image) {
        html += `<div class="flex-shrink-0">
            <img src="${data.image}" class="h-10 w-10 object-cover rounded-sm" alt="${data.text}"/>
        </div>`;
    } else {
        html += `<div class="flex-shrink-0">
            <div class="h-10 w-10 flex items-center justify-center bg-gray-200 rounded-sm">
                <i class="fas fa-truck text-gray-500"></i>
            </div>
        </div>`;
    }

    // Carrier details
    html += `<div class="flex-grow">
        <div class="font-medium">${data.text}</div>`;

    if (data.delivery_type) {
        html += `<div class="text-xs text-gray-500">${data.delivery_type}</div>`;
    }

    if (data.price) {
        html += `<div class="text-xs font-medium text-gray-700">${data.price} ${data.currency || ''}</div>`;
    }

    html += `</div></div>`;

    return $(html);
}

function formatPackageType(data) {
    if (!data.id) return data.text;

    // Create container with flexbox
    let html = `<div class="flex items-center space-x-3">`;

    // Add package type image if available
    if (data.image) {
        html += `<div class="flex-shrink-0">
            <img src="${data.image}" class="h-10 w-10 object-cover rounded-sm" alt="${data.text}"/>
        </div>`;
    } else {
        html += `<div class="flex-shrink-0">
            <div class="h-10 w-10 flex items-center justify-center bg-gray-200 rounded-sm">
                <i class="fas fa-box text-gray-500"></i>
            </div>
        </div>`;
    }

    // Package type details
    html += `<div class="flex-grow">
        <div class="font-medium">${data.text}</div>`;

    if (data.dimensions) {
        html += `<div class="text-xs font-medium text-gray-700">${data.dimensions}</div>`;
    }

    html += `</div></div>`;

    return $(html);
}

// ==================== CATALOG FUNCTIONS ====================
// TODO: UNUSED - All product catalog functions below, kept for future use

// TODO: UNUSED - Product catalog search listener
function setupSearchListener() {
    const pageName = "repair-alert";
    const searchInput = document.getElementById(`page-${pageName}-product-catalog-select-search`);

    if (searchInput) {
        searchInput.removeEventListener('input', debouncedSearch);
        searchInput.addEventListener('input', debouncedSearch);
    }
}

// TODO: UNUSED - Product catalog load
async function loadProductCatalog() {
    const pageName = "repair-alert";
    const productGrid = document.getElementById(`page-${pageName}-product-catalog-select-products-grid`);
    const paginationContainer = document.getElementById(`page-${pageName}-product-catalog-select-pagination`);

    if (!productGrid || !paginationContainer) {
        console.error("Required elements not found for catalog", { productGrid, paginationContainer });
        return;
    }

    try {
        productGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-spinner fa-spin fa-2x text-gray-400"></i><p class="mt-2 text-gray-500">Loading products...</p></div>';

        const result = await rpc('/account/repair-alert/product-catalog', {
            page: currentCatalogPage,
            search: catalogSearchQuery
        });

        if (result.status === 'success') {
            productGrid.innerHTML = result.products_html;
            paginationContainer.innerHTML = result.pagination_html;
            setupPaginationEvents();
            setupProductCardEvents();
        } else {
            productGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-exclamation-triangle text-red-500 fa-2x"></i><p class="mt-2 text-gray-700">Failed to load products</p></div>';
        }
    } catch (error) {
        console.error("Error loading product catalog:", error);
        productGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-exclamation-triangle text-red-500 fa-2x"></i><p class="mt-2 text-gray-700">An error occurred</p></div>';
    }
}

// TODO: UNUSED - Product catalog pagination
function setupPaginationEvents() {
    document.querySelectorAll('.product-catalog-page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (page && !isNaN(page) && !this.disabled) {
                currentCatalogPage = page;
                loadProductCatalog();
            }
        });
    });
}

// TODO: UNUSED - Product catalog card events
function setupProductCardEvents() {
    const pageName = "repair-alert";
    const productGrid = document.getElementById(`page-${pageName}-product-catalog-select-products-grid`);
    if (!productGrid) return;
    
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById("selected-count");

    productGrid.querySelectorAll('.product-card').forEach(card => {
        const productId = card.dataset.productId;
        const initialAddDiv = card.querySelector('.product-initial-add');
        const addBtn = card.querySelector('.product-add-btn');
        const quantityControls = card.querySelector('.product-quantity-controls');
        const quantityInput = card.querySelector('.product-quantity');
        const decreaseBtn = card.querySelector('.product-decrease');
        const increaseBtn = card.querySelector('.product-increase');
        const removeBtn = card.querySelector('.product-remove');

        // Check if product is already in registry
        if (catalogSelectedProductsRegistry.has(productId)) {
            const product = catalogSelectedProductsRegistry.get(productId);
            if (initialAddDiv) initialAddDiv.classList.add('hidden');
            if (quantityControls) {
                quantityControls.classList.remove('hidden');
                if (quantityInput) quantityInput.value = product.quantity;
            }
        }

        if (addBtn) {
            addBtn.addEventListener('click', function() {
                const productName = card.querySelector('h3')?.textContent || '';
                let productSku = '';
                const skuElement = card.querySelector('.text-gray-500');
                if (skuElement) {
                    productSku = skuElement.textContent.replace(/[\[\]]/g, '').trim();
                }
                const imageElement = card.querySelector('img');
                const imgSrc = imageElement ? imageElement.src : '';

                addProductToSelection(productId, productName, productSku, 1, imgSrc);

                if (initialAddDiv) initialAddDiv.classList.add('hidden');
                if (quantityControls) quantityControls.classList.remove('hidden');

                if (selectedProductsList && selectedProductsList.children.length > 0) {
                    selectedProductsList.classList.remove('hidden');
                    if (noProductsMessage) noProductsMessage.classList.add('hidden');
                }

                if (selectedCount) {
                    selectedCount.textContent = selectedProductsList.children.length;
                }
            });
        }

        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', function() {
                if (catalogSelectedProductsRegistry.has(productId)) {
                    const product = catalogSelectedProductsRegistry.get(productId);
                    if (product.quantity > 1) {
                        product.quantity--;
                        if (quantityInput) quantityInput.value = product.quantity;
                        updateSelectedProductQuantity(productId, product.quantity);
                    } else {
                        removeProductFromSelection(productId);
                        if (initialAddDiv) initialAddDiv.classList.remove('hidden');
                        if (quantityControls) quantityControls.classList.add('hidden');
                    }
                }
            });
        }

        if (increaseBtn) {
            increaseBtn.addEventListener('click', function() {
                if (catalogSelectedProductsRegistry.has(productId)) {
                    const product = catalogSelectedProductsRegistry.get(productId);
                    product.quantity++;
                    if (quantityInput) quantityInput.value = product.quantity;
                    updateSelectedProductQuantity(productId, product.quantity);
                }
            });
        }

        if (quantityInput) {
            quantityInput.addEventListener('change', function() {
                let qty = parseInt(this.value);
                if (isNaN(qty) || qty < 1) {
                    qty = 1;
                    this.value = qty;
                }
                if (catalogSelectedProductsRegistry.has(productId)) {
                    const product = catalogSelectedProductsRegistry.get(productId);
                    product.quantity = qty;
                    updateSelectedProductQuantity(productId, qty);
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                removeProductFromSelection(productId);
                if (initialAddDiv) initialAddDiv.classList.remove('hidden');
                if (quantityControls) quantityControls.classList.add('hidden');
            });
        }
    });
}

// TODO: UNUSED - Product add to selection, kept for future use
function addProductToSelection(id, name, sku, qty = 1, imgSrc = '') {
    const pageName = "repair-alert";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById("selected-count");

    const productExists = catalogSelectedProductsRegistry.has(id);
    let newQty = qty;

    if (productExists) {
        const product = catalogSelectedProductsRegistry.get(id);
        newQty = product.quantity + 1;
        product.quantity = newQty;
        catalogSelectedProductsRegistry.set(id, product);
    } else {
        catalogSelectedProductsRegistry.set(id, { id, name, sku, quantity: newQty, imgSrc });
    }

    // Check if product already exists in UI
    const existingProduct = selectedProductsList?.querySelector(`[data-product-id="${id}"]`);
    if (existingProduct) {
        const qtyInput = existingProduct.querySelector('.product-quantity');
        if (qtyInput) qtyInput.value = newQty;
        return;
    }

    // Create product item
    const productItem = document.createElement('div');
    productItem.className = 'bg-white dark:bg-gray-700 rounded p-2 flex flex-col justify-between h-full';
    productItem.dataset.productId = id;

    productItem.innerHTML = `
        <div class="flex items-center">
            <div class="flex-grow pr-1 min-w-0">
                <p class="text-xs font-medium text-gray-800 dark:text-white truncate mb-0">${name}</p>
                <span class="text-2xs text-gray-500 dark:text-gray-400 truncate">${sku}</span>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <div class="inline-flex border border-gray-300 dark:border-gray-600 rounded-sm overflow-hidden h-5">
                    <button class="px-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 product-decrease">
                        <i class="fas fa-minus text-2xs"></i>
                    </button>
                    <input type="text" value="${newQty}" class="w-6 px-0 py-0 text-center border-none focus:ring-0 product-quantity bg-white dark:bg-gray-800 text-2xs"/>
                    <button class="px-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 product-increase">
                        <i class="fas fa-plus text-2xs"></i>
                    </button>
                </div>
                <button class="text-red-500 hover:text-red-700 product-remove h-5 w-5 flex items-center justify-center">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        </div>
    `;

    if (selectedProductsList) {
        selectedProductsList.appendChild(productItem);
        selectedProductsList.classList.remove('hidden');
        if (noProductsMessage) noProductsMessage.classList.add('hidden');
        if (selectedCount) selectedCount.textContent = selectedProductsList.children.length;
    }

    // Add event listeners
    const removeBtn = productItem.querySelector('.product-remove');
    const decreaseBtn = productItem.querySelector('.product-decrease');
    const increaseBtn = productItem.querySelector('.product-increase');
    const qtyInput = productItem.querySelector('.product-quantity');

    removeBtn?.addEventListener('click', () => {
        removeProductFromSelection(id);
    });

    decreaseBtn?.addEventListener('click', () => {
        let qty = parseInt(qtyInput.value);
        if (qty > 1) {
            qtyInput.value = qty - 1;
            const product = catalogSelectedProductsRegistry.get(id);
            if (product) {
                product.quantity = qty - 1;
                catalogSelectedProductsRegistry.set(id, product);
            }
        }
    });

    increaseBtn?.addEventListener('click', () => {
        let qty = parseInt(qtyInput.value);
        qtyInput.value = qty + 1;
        const product = catalogSelectedProductsRegistry.get(id);
        if (product) {
            product.quantity = qty + 1;
            catalogSelectedProductsRegistry.set(id, product);
        }
    });

    qtyInput?.addEventListener('change', () => {
        let qty = parseInt(qtyInput.value);
        if (isNaN(qty) || qty < 1) {
            qty = 1;
            qtyInput.value = 1;
        }
        const product = catalogSelectedProductsRegistry.get(id);
        if (product) {
            product.quantity = qty;
            catalogSelectedProductsRegistry.set(id, product);
        }
    });
}

// TODO: UNUSED - Product update quantity, kept for future use
function updateSelectedProductQuantity(productId, quantity) {
    const pageName = "repair-alert";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);

    if (selectedProductsList) {
        const productItem = selectedProductsList.querySelector(`[data-product-id="${productId}"]`);
        if (productItem) {
            const qtyInput = productItem.querySelector('.product-quantity');
            if (qtyInput) qtyInput.value = quantity;
        }
    }
}

// TODO: UNUSED - Product remove from selection, kept for future use
function removeProductFromSelection(productId) {
    const pageName = "repair-alert";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById("selected-count");

    catalogSelectedProductsRegistry.delete(productId);

    if (selectedProductsList) {
        const productItem = selectedProductsList.querySelector(`[data-product-id="${productId}"]`);
        if (productItem) {
            selectedProductsList.removeChild(productItem);

            if (selectedProductsList.children.length === 0) {
                selectedProductsList.classList.add('hidden');
                if (noProductsMessage) noProductsMessage.classList.remove('hidden');
            }

            if (selectedCount) {
                selectedCount.textContent = selectedProductsList.children.length;
            }
        }
    }

    // Reset card UI
    const productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    if (productCard) {
        const initialAddDiv = productCard.querySelector('.product-initial-add');
        const quantityControls = productCard.querySelector('.product-quantity-controls');
        if (initialAddDiv) initialAddDiv.classList.remove('hidden');
        if (quantityControls) quantityControls.classList.add('hidden');
    }
}

// TODO: UNUSED - Product catalog close, kept for future use
function closeProductCatalog() {
    const pageName = "repair-alert";
    const pageMainContainer = document.querySelector('#page-repair-alert-main-container');
    const productCatalogSelectContainer = document.querySelector(`#page-${pageName}-product-catalog-select`);
    const paginationContainerMain = document.getElementById('page-repair-alert-list-pagination-container-main');
    const skipStickyHeader = document.getElementById('skip-list-page-sticky-header');

    if(skipStickyHeader) skipStickyHeader.value = '';

    if (productCatalogSelectContainer) {
        productCatalogSelectContainer.classList.add('hidden');
    }
    if (pageMainContainer) {
        pageMainContainer.classList.remove('hidden');
    }
    if (paginationContainerMain) {
        paginationContainerMain.classList.remove('hidden');
    }

    // Re-open the create modal
    Modal.open('page-repair-alert-list-create-modal');

    // Transfer selected products to form
    transferSelectedProductsToForm();
}

// TODO: UNUSED - Product transfer to form, kept for future use
function transferSelectedProductsToForm() {
    const pageName = "repair-alert";
    const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
    const modal = document.getElementById(`page-${pageName}-list-create-modal`);

    if (!productsContainer) {
        console.error("Products container not found");
        return;
    }

    // Add each product from catalog registry
    catalogSelectedProductsRegistry.forEach((product) => {
        addCatalogProductLineToForm(productsContainer, product, modal);
    });

    // Clear catalog registry after transfer
    catalogSelectedProductsRegistry.clear();

    // Update the hidden input field
    updateRepairAlertsProductsField();
}

// TODO: UNUSED - Product line to form, kept for future use
function addCatalogProductLineToForm(container, product, modal) {
    const pageName = "repair-alert";
    const lineId = `catalog-product-line-${product.id}`;
    
    // Check if product already exists
    if (container.querySelector(`[data-line-id="${lineId}"]`)) {
        return;
    }

    const newRow = document.createElement('div');
    newRow.className = 'line-item flex items-center gap-2 mb-2';
    newRow.dataset.lineId = lineId;

    newRow.innerHTML = `
        <div class="flex-grow" style="max-width: 400px;">
            <select class="product-select form-select-sm w-full rounded-md border border-gray-300
                focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500" style="width: auto; max-width: 100px;">
            </select>
        </div>
        <div class="flex-grow">
            <select class="second-select form-select-sm w-full rounded-md border border-gray-300
                focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500 select2-single page-${pageName}-list-create-form-lot-value-select">
            </select>
        </div>
        <div class="w-24">
            <input type="number" value="${product.quantity}" min="1"
                class="product-qty form-input-sm w-full text-center rounded-md border border-gray-300
                focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
        </div>
        <div>
            <button type="button" class="product-remove-btn p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" data-line-id="${lineId}">
                <i class="fas fa-trash-alt text-red-500"></i>
            </button>
        </div>
    `;

    container.appendChild(newRow);

    const select = $(newRow).find('.product-select');
    const qtyInput = newRow.querySelector('.product-qty');
    const secondSelect = $(newRow).find('.second-select');

    // Initialize product select with preselected product
    select.select2({
        placeholder: 'Search product...',
        dropdownParent: $(modal),
        data: [{
            id: product.id,
            text: product.name,
            default_code: product.sku,
            selected: true
        }],
        ajax: {
            transport: function(params, success, failure) {
                rpc('/account/repair-alert/product-search', { term: params.data.term })
                .then(result => {
                    success({ results: result.items });
                })
                .catch(error => { 
                    console.error(error); 
                    failure('Failed to load products'); 
                });
            },
            processResults: data => data,
            delay: 250
        },
        templateResult: formatProduct,
        templateSelection: formatProductSelection
    });

    // Initialize lot/location select
    $(secondSelect).select2({
        placeholder: 'Select a lot',
        dropdownParent: $(modal)
    });

    // Load lots for the preselected product
    loadQuantsForProductCatalog(product.id, secondSelect, modal);

    // Event when product changes
    $(select).on('change', function() {
        const newProductId = $(this).val();
        $(secondSelect).val(null).trigger('change');
        if (!newProductId) return;
        loadQuantsForProductCatalog(newProductId, secondSelect, modal);
    });

    $(select).on('change', updateRepairAlertsProductsField);
    $(secondSelect).on('change', updateRepairAlertsProductsField);
    qtyInput.addEventListener('change', updateRepairAlertsProductsField);

    // Remove button
    const removeBtn = newRow.querySelector('.product-remove-btn');
    removeBtn?.addEventListener('click', () => {
        container.removeChild(newRow);
        updateRepairAlertsProductsField();
    });
}

// TODO: UNUSED - Lots for product catalog, kept for future use
function loadQuantsForProductCatalog(productId, secondSelect, modal) {
    if ($(secondSelect).hasClass("select2-hidden-accessible")) {
        $(secondSelect).select2('destroy');
    }

    // Get tracking from product select data
    const lineItem = $(secondSelect).closest('.line-item');
    const productSelect = lineItem.find('.product-select');
    const trackingType = productSelect.select2('data')[0]?.tracking || 'none';

    $(secondSelect).select2({
        placeholder: trackingType === 'none' ? 'Select location...' : 'Search lot...',
        dropdownParent: $(modal),
        multiple: false,
        ajax: {
            transport: function(params, success, failure) {
                let endpoint = trackingType === 'none'
                    ? '/account/repair-alert/product-locations'
                    : '/account/repair-alert/product-lots';

                rpc(endpoint, { product_id: parseInt(productId), term: params.data.term })
                    .then(function(result) {
                        success({ results: result.items });
                    })
                    .catch(function(error) {
                        console.error('Error fetching data:', error);
                        failure('Failed to load data');
                    });
            },
            processResults: data => data,
            delay: 250
        },
        templateResult: function(item) {
            return trackingType === 'none' ? formatLocation(item) : formatQuant(item);
        },
        templateSelection: function(item) {
            return trackingType === 'none' ? formatLocationSelection(item) : formatsecondSelection(item);
        }
    });

    // Handle quantity max based on selection
    $(secondSelect).on('change', function() {
        const selectedItems = $(this).select2('data');
        const $qtyInput = lineItem.find('.product-qty');

        if (selectedItems.length > 0) {
            const minAvailable = Math.min(...selectedItems.map(i => i.product_qty || Infinity));
            $qtyInput[0].max = minAvailable;
        } else {
            $qtyInput[0].removeAttribute("max");
        }

        updateRepairAlertsProductsField();
    });
}

// ==================== LOT CATALOG FUNCTIONS ====================

// Sync selectedLotsRegistry from the form's current lot lines
function syncQuantsRegistryFromForm() {
    const pageName = "repair-alert";
    const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
    
    if (!productsContainer) return;

    const productLines = productsContainer.querySelectorAll('.line-item');
    
    // Clear registry and rebuild from form
    selectedLotsRegistry.clear();
    
    for (const line of productLines) {
        const lineId = line.dataset.lineId;
        const hasLot = line.dataset.hasLot === 'true';
        const lotId = line.dataset.lotId || '';
        const select = line.querySelector('.product-select');
        const secondSelect = line.querySelector('.second-select');
        const qtyInput = line.querySelector('.product-qty');

        if (!select) continue;

        try {
            const selectData = $(select).select2('data')[0];
            if (selectData) {
                // Create unique key based on lineId or generate from product+lot
                const itemKey = lineId || `lot-${lotId || selectData.id}`;
                
                // Get location/lot data from second select
                let locationId = '';
                let locationName = '';
                let actualLotId = lotId;
                let actualLotName = '';
                
                if (secondSelect && $(secondSelect).data('select2')) {
                    const secondSelectData = $(secondSelect).select2('data')[0];
                    if (secondSelectData) {
                        if (hasLot) {
                            // Second select contains lot
                            actualLotId = secondSelectData.id || lotId;
                            actualLotName = secondSelectData.text || '';
                        } else {
                            // Second select contains location
                            locationId = secondSelectData.id || '';
                            locationName = secondSelectData.text || '';
                        }
                    }
                }
                
                selectedLotsRegistry.set(itemKey, {
                    id: itemKey,
                    lotId: actualLotId,
                    lotName: actualLotName || $(select).data('lot_name') || '',
                    hasLot: hasLot,
                    name: selectData.text || '',
                    productId: selectData.id || '',
                    productName: selectData.text || '',
                    productCode: selectData.default_code || '',
                    quantity: parseInt(qtyInput?.value) || 1,
                    maxQty: Infinity,
                    locationId: locationId,
                    locationName: locationName
                });
            }
        } catch (e) {
            console.error('Error syncing lot to registry:', e);
        }
    }
    
    console.log('Synced lots registry from form:', selectedLotsRegistry.size, 'items');
}

// Rebuild the selected lots list in the catalog from registry
function rebuildSelectedQuantsList() {
    const pageName = "repair-alert";
    const selectedLotsList = document.getElementById(`page-${pageName}-lot-catalog-select-selected-lots-list`);
    const noLotsMessage = document.getElementById(`page-${pageName}-lot-catalog-select-no-lots-message`);
    const selectedCount = document.getElementById(`page-${pageName}-lot-catalog-selected-count`);

    if (!selectedLotsList) return;

    // Clear current list
    selectedLotsList.innerHTML = '';

    // Rebuild from registry
    if (selectedLotsRegistry.size > 0) {
        selectedLotsList.classList.remove('hidden');
        if (noLotsMessage) noLotsMessage.classList.add('hidden');

        selectedLotsRegistry.forEach((item, itemKey) => {
            // Badge HTML: show "No Lot" for products without lot
            const badgeHtml = item.hasLot 
                ? '' 
                : '<span class="ml-1 text-2xs px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">No Lot</span>';

            const displayName = item.hasLot ? item.lotName : item.productName;

            const lotItem = document.createElement('div');
            lotItem.className = 'bg-white dark:bg-gray-700 rounded p-2 flex flex-col justify-between h-full';
            lotItem.dataset.itemKey = itemKey;

            lotItem.innerHTML = `
                <div class="flex items-center">
                    <div class="flex-grow pr-1 min-w-0">
                        <p class="text-xs font-medium text-gray-800 dark:text-white truncate mb-0">${displayName}${badgeHtml}</p>
                        <span class="text-2xs text-gray-500 dark:text-gray-400 truncate">${item.hasLot ? item.productName : (item.productCode ? '[' + item.productCode + ']' : '')}</span>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <div class="inline-flex border border-gray-300 dark:border-gray-600 rounded-sm overflow-hidden h-5">
                            <button class="px-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 lot-decrease">
                                <i class="fas fa-minus text-2xs"></i>
                            </button>
                            <input type="text" value="${item.quantity}" class="w-6 px-0 py-0 text-center border-none focus:ring-0 lot-quantity bg-white dark:bg-gray-800 text-2xs"/>
                            <button class="px-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 lot-increase">
                                <i class="fas fa-plus text-2xs"></i>
                            </button>
                        </div>
                        <button class="text-red-500 hover:text-red-700 lot-remove h-5 w-5 flex items-center justify-center">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </div>
                </div>
            `;

            selectedLotsList.appendChild(lotItem);

            // Add event listeners for this item
            const removeBtn = lotItem.querySelector('.lot-remove');
            const decreaseBtn = lotItem.querySelector('.lot-decrease');
            const increaseBtn = lotItem.querySelector('.lot-increase');
            const qtyInput = lotItem.querySelector('.lot-quantity');

            removeBtn?.addEventListener('click', () => {
                removeQuantFromSelection(itemKey);
            });

            decreaseBtn?.addEventListener('click', () => {
                let qty = parseInt(qtyInput.value);
                if (qty > 1) {
                    qty--;
                    qtyInput.value = qty;
                    const regItem = selectedLotsRegistry.get(itemKey);
                    if (regItem) {
                        regItem.quantity = qty;
                        selectedLotsRegistry.set(itemKey, regItem);
                    }
                    updateCatalogCardQuantity(itemKey, qty);
                }
            });

            increaseBtn?.addEventListener('click', () => {
                let qty = parseInt(qtyInput.value);
                const regItem = selectedLotsRegistry.get(itemKey);
                const itemMaxQty = regItem?.maxQty || Infinity;
                if (qty < itemMaxQty) {
                    qty++;
                    qtyInput.value = qty;
                    if (regItem) {
                        regItem.quantity = qty;
                        selectedLotsRegistry.set(itemKey, regItem);
                    }
                    updateCatalogCardQuantity(itemKey, qty);
                }
            });

            qtyInput?.addEventListener('change', () => {
                let qty = parseInt(qtyInput.value);
                const regItem = selectedLotsRegistry.get(itemKey);
                const itemMaxQty = regItem?.maxQty || Infinity;
                if (isNaN(qty) || qty < 1) {
                    qty = 1;
                } else if (qty > itemMaxQty) {
                    qty = Math.floor(itemMaxQty);
                }
                qtyInput.value = qty;
                if (regItem) {
                    regItem.quantity = qty;
                    selectedLotsRegistry.set(itemKey, regItem);
                }
                updateCatalogCardQuantity(itemKey, qty);
            });
        });

        if (selectedCount) selectedCount.textContent = selectedLotsRegistry.size;
    } else {
        selectedLotsList.classList.add('hidden');
        if (noLotsMessage) noLotsMessage.classList.remove('hidden');
        if (selectedCount) selectedCount.textContent = '0';
    }

    console.log('Rebuilt selected lots list:', selectedLotsRegistry.size, 'items');
}

function setupQuantSearchListener() {
    const pageName = "repair-alert";
    const searchInput = document.getElementById(`page-${pageName}-lot-catalog-select-search`);
    if (searchInput) {
        searchInput.removeEventListener('input', debouncedQuantSearch);
        searchInput.addEventListener('input', debouncedQuantSearch);
    }
}

async function loadQuantCatalog() {
    const pageName = "repair-alert";
    const lotGrid = document.getElementById(`page-${pageName}-lot-catalog-select-lots-grid`);
    const paginationContainer = document.getElementById(`page-${pageName}-lot-catalog-select-pagination`);

    if (!lotGrid || !paginationContainer) {
        console.error("Required elements not found for lot catalog", { lotGrid, paginationContainer });
        return;
    }

    try {
        lotGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-spinner fa-spin fa-2x text-gray-400"></i><p class="mt-2 text-gray-500">Loading lots...</p></div>';

        const result = await rpc('/catalog/lot-catalog', {
            page: currentQuantCatalogPage,
            search: quantCatalogSearchQuery
        });

        if (result.status === 'success') {
            lotGrid.innerHTML = result.lots_html;
            paginationContainer.innerHTML = result.pagination_html;
            setupQuantPaginationEvents();
            setupQuantCardEvents();
        } else {
            lotGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-exclamation-triangle text-red-500 fa-2x"></i><p class="mt-2 text-gray-700">Failed to load lots</p></div>';
        }
    } catch (error) {
        console.error("Error loading lot catalog:", error);
        lotGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-exclamation-triangle text-red-500 fa-2x"></i><p class="mt-2 text-gray-700">An error occurred</p></div>';
    }
}

function setupQuantPaginationEvents() {
    document.querySelectorAll('.lot-catalog-page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (page && !isNaN(page) && !this.disabled) {
                currentQuantCatalogPage = page;
                loadQuantCatalog();
            }
        });
    });
}

function setupQuantCardEvents() {
    const pageName = "repair-alert";
    const lotGrid = document.getElementById(`page-${pageName}-lot-catalog-select-lots-grid`);
    if (!lotGrid) return;
    
    const selectedLotsList = document.getElementById(`page-${pageName}-lot-catalog-select-selected-lots-list`);
    const noLotsMessage = document.getElementById(`page-${pageName}-lot-catalog-select-no-lots-message`);
    const selectedCount = document.getElementById(`page-${pageName}-lot-catalog-selected-count`);

    lotGrid.querySelectorAll('.lot-card').forEach(card => {
        // Use quant-id as unique identifier (works for both with and without lot)
        const quantId = card.dataset.quantId;
        const lotId = card.dataset.lotId || '';
        const hasLot = card.dataset.hasLot === 'true';
        // Unique key for registry: quant-{id} or lot-{id} for backwards compatibility
        const itemKey = quantId ? `quant-${quantId}` : (lotId ? `lot-${lotId}` : null);
        
        if (!itemKey) return;

        const initialAddDiv = card.querySelector('.lot-initial-add');
        const addBtn = card.querySelector('.lot-add-btn');
        const quantityControls = card.querySelector('.lot-quantity-controls');
        const quantityInput = card.querySelector('.lot-quantity');
        const decreaseBtn = card.querySelector('.lot-decrease');
        const increaseBtn = card.querySelector('.lot-increase');
        const removeBtn = card.querySelector('.lot-remove');

        // Check if item is already in registry
        if (selectedLotsRegistry.has(itemKey)) {
            const item = selectedLotsRegistry.get(itemKey);
            if (initialAddDiv) initialAddDiv.classList.add('hidden');
            if (quantityControls) {
                quantityControls.classList.remove('hidden');
                if (quantityInput) quantityInput.value = item.quantity;
            }
        }

        if (addBtn) {
            addBtn.addEventListener('click', function() {
                const lotName = card.dataset.lotName || card.querySelector('h3')?.textContent || '';
                const productId = card.dataset.productId || '';
                const productName = card.dataset.productName || '';
                const productCode = card.dataset.productCode || '';
                const maxQty = parseFloat(card.dataset.productQty) || Infinity;
                const imageElement = card.querySelector('img');
                const imgSrc = imageElement ? imageElement.src : '';
                const locationId = card.dataset.locationId || '';
                const locationName = card.dataset.locationName || '';

                addQuantToSelection(itemKey, lotId, lotName, hasLot, productId, productName, productCode, 1, maxQty, imgSrc, locationId, locationName);

                if (initialAddDiv) initialAddDiv.classList.add('hidden');
                if (quantityControls) quantityControls.classList.remove('hidden');

                if (selectedLotsList && selectedLotsList.children.length > 0) {
                    selectedLotsList.classList.remove('hidden');
                    if (noLotsMessage) noLotsMessage.classList.add('hidden');
                }

                if (selectedCount) {
                    selectedCount.textContent = selectedLotsList.children.length;
                }
            });
        }

        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', function() {
                if (selectedLotsRegistry.has(itemKey)) {
                    const item = selectedLotsRegistry.get(itemKey);
                    if (item.quantity > 1) {
                        item.quantity--;
                        if (quantityInput) quantityInput.value = item.quantity;
                        updateSelectedQuantQuantity(itemKey, item.quantity);
                    } else {
                        removeQuantFromSelection(itemKey);
                        if (initialAddDiv) initialAddDiv.classList.remove('hidden');
                        if (quantityControls) quantityControls.classList.add('hidden');
                    }
                }
            });
        }

        if (increaseBtn) {
            increaseBtn.addEventListener('click', function() {
                if (selectedLotsRegistry.has(itemKey)) {
                    const item = selectedLotsRegistry.get(itemKey);
                    const maxQty = parseFloat(card.dataset.productQty) || Infinity;
                    if (item.quantity < maxQty) {
                        item.quantity++;
                        if (quantityInput) quantityInput.value = item.quantity;
                        updateSelectedQuantQuantity(itemKey, item.quantity);
                    }
                }
            });
        }

        if (quantityInput) {
            quantityInput.addEventListener('change', function() {
                let qty = parseInt(this.value);
                const maxQty = parseFloat(card.dataset.productQty) || Infinity;
                if (isNaN(qty) || qty < 1) {
                    qty = 1;
                    this.value = qty;
                } else if (qty > maxQty) {
                    qty = maxQty;
                    this.value = qty;
                }
                if (selectedLotsRegistry.has(itemKey)) {
                    const item = selectedLotsRegistry.get(itemKey);
                    item.quantity = qty;
                    updateSelectedQuantQuantity(itemKey, qty);
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                removeQuantFromSelection(itemKey);
                if (initialAddDiv) initialAddDiv.classList.remove('hidden');
                if (quantityControls) quantityControls.classList.add('hidden');
            });
        }
    });
}

function addQuantToSelection(itemKey, lotId, lotName, hasLot, productId, productName, productCode, qty = 1, maxQty = Infinity, imgSrc = '', locationId = '', locationName = '') {
    const pageName = "repair-alert";
    const selectedLotsList = document.getElementById(`page-${pageName}-lot-catalog-select-selected-lots-list`);
    const noLotsMessage = document.getElementById(`page-${pageName}-lot-catalog-select-no-lots-message`);
    const selectedCount = document.getElementById(`page-${pageName}-lot-catalog-selected-count`);

    const itemExists = selectedLotsRegistry.has(itemKey);
    let newQty = qty;

    // Display name: lot name if has lot, otherwise product name
    const displayName = hasLot ? lotName : productName;

    if (itemExists) {
        const item = selectedLotsRegistry.get(itemKey);
        newQty = Math.min(item.quantity + 1, item.maxQty || Infinity);
        item.quantity = newQty;
        selectedLotsRegistry.set(itemKey, item);
    } else {
        selectedLotsRegistry.set(itemKey, { 
            id: itemKey, 
            lotId: lotId,
            lotName: lotName,
            hasLot: hasLot,
            name: displayName,
            productId, 
            productName, 
            productCode, 
            quantity: newQty, 
            maxQty,
            imgSrc,
            locationId,
            locationName
        });
    }

    // Check if item already exists in UI
    const existingItem = selectedLotsList?.querySelector(`[data-item-key="${itemKey}"]`);
    if (existingItem) {
        const qtyInput = existingItem.querySelector('.lot-quantity');
        if (qtyInput) qtyInput.value = newQty;
        return;
    }

    // Badge HTML: show "No Lot" for products without lot
    const badgeHtml = hasLot 
        ? '' 
        : '<span class="ml-1 text-2xs px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">No Lot</span>';

    // Create item element
    const lotItem = document.createElement('div');
    lotItem.className = 'bg-white dark:bg-gray-700 rounded p-2 flex flex-col justify-between h-full';
    lotItem.dataset.itemKey = itemKey;

    lotItem.innerHTML = `
        <div class="flex items-center">
            <div class="flex-grow pr-1 min-w-0">
                <p class="text-xs font-medium text-gray-800 dark:text-white truncate mb-0">${displayName}${badgeHtml}</p>
                <span class="text-2xs text-gray-500 dark:text-gray-400 truncate">${hasLot ? productName : (productCode ? '[' + productCode + ']' : '')}</span>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <div class="inline-flex border border-gray-300 dark:border-gray-600 rounded-sm overflow-hidden h-5">
                    <button class="px-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 lot-decrease">
                        <i class="fas fa-minus text-2xs"></i>
                    </button>
                    <input type="text" value="${newQty}" class="w-6 px-0 py-0 text-center border-none focus:ring-0 lot-quantity bg-white dark:bg-gray-800 text-2xs"/>
                    <button class="px-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 lot-increase">
                        <i class="fas fa-plus text-2xs"></i>
                    </button>
                </div>
                <button class="text-red-500 hover:text-red-700 lot-remove h-5 w-5 flex items-center justify-center">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        </div>
    `;

    if (selectedLotsList) {
        selectedLotsList.appendChild(lotItem);
        selectedLotsList.classList.remove('hidden');
        if (noLotsMessage) noLotsMessage.classList.add('hidden');
        if (selectedCount) selectedCount.textContent = selectedLotsList.children.length;
    }

    // Add event listeners
    const removeBtn = lotItem.querySelector('.lot-remove');
    const decreaseBtn = lotItem.querySelector('.lot-decrease');
    const increaseBtn = lotItem.querySelector('.lot-increase');
    const qtyInput = lotItem.querySelector('.lot-quantity');

    removeBtn?.addEventListener('click', () => {
        removeQuantFromSelection(itemKey);
    });

    decreaseBtn?.addEventListener('click', () => {
        let qty = parseInt(qtyInput.value);
        if (qty > 1) {
            qty--;
            qtyInput.value = qty;
            const item = selectedLotsRegistry.get(itemKey);
            if (item) {
                item.quantity = qty;
                selectedLotsRegistry.set(itemKey, item);
            }
            // Sync with catalog card
            updateCatalogCardQuantity(itemKey, qty);
        }
    });

    increaseBtn?.addEventListener('click', () => {
        let qty = parseInt(qtyInput.value);
        const item = selectedLotsRegistry.get(itemKey);
        const itemMaxQty = item?.maxQty || Infinity;
        if (qty < itemMaxQty) {
            qty++;
            qtyInput.value = qty;
            if (item) {
                item.quantity = qty;
                selectedLotsRegistry.set(itemKey, item);
            }
            // Sync with catalog card
            updateCatalogCardQuantity(itemKey, qty);
        }
    });

    qtyInput?.addEventListener('change', () => {
        let qty = parseInt(qtyInput.value);
        const item = selectedLotsRegistry.get(itemKey);
        const itemMaxQty = item?.maxQty || Infinity;
        if (isNaN(qty) || qty < 1) {
            qty = 1;
        } else if (qty > itemMaxQty) {
            qty = Math.floor(itemMaxQty);
        }
        qtyInput.value = qty;
        if (item) {
            item.quantity = qty;
            selectedLotsRegistry.set(itemKey, item);
        }
        // Sync with catalog card
        updateCatalogCardQuantity(itemKey, qty);
    });
}

function updateSelectedQuantQuantity(itemKey, quantity) {
    const pageName = "repair-alert";
    const selectedLotsList = document.getElementById(`page-${pageName}-lot-catalog-select-selected-lots-list`);

    // Update the selected list input
    if (selectedLotsList) {
        const lotItem = selectedLotsList.querySelector(`[data-item-key="${itemKey}"]`);
        if (lotItem) {
            const qtyInput = lotItem.querySelector('.lot-quantity');
            if (qtyInput) qtyInput.value = quantity;
        }
    }

    // Also update the catalog card input (bidirectional sync)
    updateCatalogCardQuantity(itemKey, quantity);
}

function updateCatalogCardQuantity(itemKey, quantity) {
    // Find the catalog card by quant-id or lot-id
    let lotCard = null;
    if (itemKey.startsWith('quant-')) {
        const quantId = itemKey.replace('quant-', '');
        lotCard = document.querySelector(`.lot-card[data-quant-id="${quantId}"]`);
    } else if (itemKey.startsWith('lot-')) {
        const lotId = itemKey.replace('lot-', '');
        lotCard = document.querySelector(`.lot-card[data-lot-id="${lotId}"]`);
    }
    
    if (lotCard) {
        const qtyInput = lotCard.querySelector('.lot-quantity');
        if (qtyInput) qtyInput.value = quantity;
    }
}

function removeQuantFromSelection(itemKey) {
    const pageName = "repair-alert";
    const selectedLotsList = document.getElementById(`page-${pageName}-lot-catalog-select-selected-lots-list`);
    const noLotsMessage = document.getElementById(`page-${pageName}-lot-catalog-select-no-lots-message`);
    const selectedCount = document.getElementById(`page-${pageName}-lot-catalog-selected-count`);

    selectedLotsRegistry.delete(itemKey);

    if (selectedLotsList) {
        const lotItem = selectedLotsList.querySelector(`[data-item-key="${itemKey}"]`);
        if (lotItem) {
            selectedLotsList.removeChild(lotItem);

            if (selectedLotsList.children.length === 0) {
                selectedLotsList.classList.add('hidden');
                if (noLotsMessage) noLotsMessage.classList.remove('hidden');
            }

            if (selectedCount) {
                selectedCount.textContent = selectedLotsList.children.length;
            }
        }
    }

    // Reset card UI - try to find by quant-id first, then by lot-id for backwards compatibility
    let lotCard = null;
    if (itemKey.startsWith('quant-')) {
        const quantId = itemKey.replace('quant-', '');
        lotCard = document.querySelector(`.lot-card[data-quant-id="${quantId}"]`);
    } else if (itemKey.startsWith('lot-')) {
        const lotId = itemKey.replace('lot-', '');
        lotCard = document.querySelector(`.lot-card[data-lot-id="${lotId}"]`);
    }
    
    if (lotCard) {
        const initialAddDiv = lotCard.querySelector('.lot-initial-add');
        const quantityControls = lotCard.querySelector('.lot-quantity-controls');
        if (initialAddDiv) initialAddDiv.classList.remove('hidden');
        if (quantityControls) quantityControls.classList.add('hidden');
    }
}

function clearQuantSelection() {
    const pageName = "repair-alert";
    
    // Reset all card UIs before clearing
    selectedLotsRegistry.forEach((item, itemKey) => {
        let lotCard = null;
        if (itemKey.startsWith('quant-')) {
            const quantId = itemKey.replace('quant-', '');
            lotCard = document.querySelector(`.lot-card[data-quant-id="${quantId}"]`);
        } else if (itemKey.startsWith('lot-')) {
            const lotId = itemKey.replace('lot-', '');
            lotCard = document.querySelector(`.lot-card[data-lot-id="${lotId}"]`);
        }
        
        if (lotCard) {
            const initialAddDiv = lotCard.querySelector('.lot-initial-add');
            const quantityControls = lotCard.querySelector('.lot-quantity-controls');
            const qtyInput = lotCard.querySelector('.lot-quantity');
            if (initialAddDiv) initialAddDiv.classList.remove('hidden');
            if (quantityControls) quantityControls.classList.add('hidden');
            if (qtyInput) qtyInput.value = 1;
        }
    });

    // Clear the registry
    selectedLotsRegistry.clear();

    // Clear the selected lots list UI
    const selectedLotsList = document.getElementById(`page-${pageName}-lot-catalog-select-selected-lots-list`);
    const noLotsMessage = document.getElementById(`page-${pageName}-lot-catalog-select-no-lots-message`);
    const selectedCount = document.getElementById(`page-${pageName}-lot-catalog-selected-count`);
    
    if (selectedLotsList) {
        selectedLotsList.innerHTML = '';
        selectedLotsList.classList.add('hidden');
    }
    if (noLotsMessage) noLotsMessage.classList.remove('hidden');
    if (selectedCount) selectedCount.textContent = '0';
}

function closeQuantCatalog() {
    const pageName = "repair-alert";
    const pageMainContainer = document.querySelector('#page-repair-alert-main-container');
    const lotCatalogSelectContainer = document.querySelector(`#page-${pageName}-lot-catalog-select`);
    const paginationContainerMain = document.getElementById('page-repair-alert-list-pagination-container-main');
    const skipStickyHeader = document.getElementById('skip-list-page-sticky-header');

    if(skipStickyHeader) skipStickyHeader.value = '';

    if (lotCatalogSelectContainer) {
        lotCatalogSelectContainer.classList.add('hidden');
    }
    if (pageMainContainer) {
        pageMainContainer.classList.remove('hidden');
    }
    if (paginationContainerMain) {
        paginationContainerMain.classList.remove('hidden');
    }

    // Re-open the create modal
    Modal.open('page-repair-alert-list-create-modal');

    // Transfer selected lots to form
    transferSelectedQuantsToForm();
}

function transferSelectedQuantsToForm() {
    const pageName = "repair-alert";
    const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
    const modal = document.getElementById(`page-${pageName}-list-create-modal`);

    if (!productsContainer) {
        console.error("Products container not found");
        return;
    }

    // Get all existing line IDs from form that came from catalog
    const existingCatalogLines = productsContainer.querySelectorAll('.line-item[data-line-id^="catalog-item-line-"]');
    const existingLineIds = new Set();
    existingCatalogLines.forEach(line => {
        existingLineIds.add(line.dataset.lineId);
    });

    // Get all line IDs that should exist (from registry)
    const registryLineIds = new Set();
    selectedLotsRegistry.forEach((lot) => {
        registryLineIds.add(`catalog-item-line-${lot.id}`);
    });

    // Remove lines that are no longer in the registry (user deleted them in catalog)
    existingCatalogLines.forEach(line => {
        const lineId = line.dataset.lineId;
        if (!registryLineIds.has(lineId)) {
            // This line was removed in the catalog, delete it from form
            productsContainer.removeChild(line);
            console.log('Removed line from form:', lineId);
        }
    });

    // Update existing lines and add new ones from registry
    selectedLotsRegistry.forEach((lot) => {
        const lineId = `catalog-item-line-${lot.id}`;
        const existingLine = productsContainer.querySelector(`[data-line-id="${lineId}"]`);
        
        if (existingLine) {
            // Line exists - update quantity if changed
            const qtyInput = existingLine.querySelector('.product-qty');
            if (qtyInput && parseInt(qtyInput.value) !== lot.quantity) {
                qtyInput.value = lot.quantity;
                console.log('Updated quantity for line:', lineId, 'to', lot.quantity);
            }
        } else {
            // Line doesn't exist - add it
            addQuantLineToForm(productsContainer, lot, modal);
        }
    });

    // Clear lot registry after transfer
    selectedLotsRegistry.clear();

    // Update the hidden input field
    updateRepairAlertsProductsField();
}

function addQuantLineToForm(container, item, modal) {
    const pageName = "repair-alert";
    const lineId = `catalog-item-line-${item.id}`;
    
    // Check if item already exists
    if (container.querySelector(`[data-line-id="${lineId}"]`)) {
        return;
    }

    // Determine tracking type based on whether item has lot
    const trackingType = item.hasLot ? 'lot' : 'none';

    const newRow = document.createElement('div');
    newRow.className = 'line-item flex items-center gap-2 mb-2';
    newRow.dataset.lineId = lineId;
    newRow.dataset.hasLot = item.hasLot ? 'true' : 'false';
    newRow.dataset.lotId = item.lotId || '';

    newRow.innerHTML = `
        <div class="flex-grow" style="max-width: 400px;">
            <select class="product-select form-select-sm w-full rounded-md border border-gray-300
                focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500" style="width: auto; max-width: 100px;">
            </select>
        </div>
        <div class="flex-grow">
            <select class="second-select form-select-sm w-full rounded-md border border-gray-300
                focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500 select2-single page-${pageName}-list-create-form-lot-value-select">
            </select>
        </div>
        <div class="w-24">
            <input type="number" value="${item.quantity}" min="1"
                class="product-qty form-input-sm w-full text-center rounded-md border border-gray-300
                focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
        </div>
        <div>
            <button type="button" class="product-remove-btn p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" data-line-id="${lineId}">
                <i class="fas fa-trash-alt text-red-500"></i>
            </button>
        </div>
    `;

    container.appendChild(newRow);

    const select = $(newRow).find('.product-select');
    const qtyInput = newRow.querySelector('.product-qty');
    const secondSelect = $(newRow).find('.second-select');

    // Initialize product select with preselected product
    select.select2({
        placeholder: 'Search product...',
        dropdownParent: $(modal),
        data: [{
            id: item.productId,
            text: item.productName,
            default_code: item.productCode,
            tracking: trackingType,
            selected: true
        }],
        ajax: {
            transport: function(params, success, failure) {
                rpc('/account/repair-alert/product-search', { term: params.data.term })
                .then(result => {
                    success({ results: result.items });
                })
                .catch(error => { 
                    console.error(error); 
                    failure('Failed to load products'); 
                });
            },
            processResults: data => data,
            delay: 250
        },
        templateResult: formatProduct,
        templateSelection: formatProductSelection
    });

    // Initialize second select based on tracking type
    if (item.hasLot) {
        // Has lot - initialize lot select with preselected lot
        $(secondSelect).select2({
            placeholder: 'Search lot...',
            dropdownParent: $(modal),
            data: [{
                id: item.lotId,
                text: item.lotName,
                lot_id: item.lotId,
                selected: true
            }],
            ajax: {
                transport: function(params, success, failure) {
                    rpc('/account/repair-alert/product-lots', { product_id: parseInt(item.productId), term: params.data.term })
                        .then(function(result) {
                            success({ results: result.items });
                        })
                        .catch(function(error) {
                            console.error('Error fetching lots:', error);
                            failure('Failed to load lots');
                        });
                },
                processResults: data => data,
                delay: 250
            },
            templateResult: formatQuant,
            templateSelection: formatsecondSelection
        });
    } else {
        // No lot - initialize location select with preselected location if available
        const locationSelectConfig = {
            placeholder: 'Select location...',
            dropdownParent: $(modal),
            ajax: {
                transport: function(params, success, failure) {
                    rpc('/account/repair-alert/product-locations', { product_id: parseInt(item.productId), term: params.data.term })
                        .then(function(result) {
                            success({ results: result.items });
                        })
                        .catch(function(error) {
                            console.error('Error fetching locations:', error);
                            failure('Failed to load locations');
                        });
                },
                processResults: data => data,
                delay: 250
            },
            templateResult: formatLocation,
            templateSelection: formatLocationSelection
        };

        // Add preselected location if available
        if (item.locationId) {
            locationSelectConfig.data = [{
                id: item.locationId,
                text: item.locationName || 'Location',
                selected: true
            }];
        }

        $(secondSelect).select2(locationSelectConfig);
    }

    // Event when product changes - reload lots/locations based on product tracking
    $(select).on('change', function() {
        const newProductId = $(this).val();
        $(secondSelect).val(null).trigger('change');
        if (!newProductId) return;
        loadQuantsForProductCatalog(newProductId, secondSelect, modal);
    });

    $(select).on('change', updateRepairAlertsProductsField);
    $(secondSelect).on('change', updateRepairAlertsProductsField);
    qtyInput.addEventListener('change', updateRepairAlertsProductsField);

    // Remove button
    const removeBtn = newRow.querySelector('.product-remove-btn');
    removeBtn?.addEventListener('click', () => {
        container.removeChild(newRow);
        updateRepairAlertsProductsField();
    });
}

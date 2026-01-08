import { rpc } from "@web/core/network/rpc";
import { reloadExpeditionListPage } from "./frontend/components/expedition_list.js";

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @return {Function} The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// TODO: Product catalog variables - Currently unused, kept for future use
// let currentCatalogPage = 1;
// let catalogSearchQuery = '';

// Lot catalog variables
let currentLotCatalogPage = 1;
let lotCatalogSearchQuery = '';

// TODO: Product catalog debounced search - Currently unused, kept for future use
// const debouncedSearch = debounce(function() {
//     catalogSearchQuery = this.value;
//     currentCatalogPage = 1; // Reset to first page when searching
//     loadProductCatalog();
// }, 300);

// Create a debounced search function for lots
const debouncedLotSearch = debounce(function() {
    lotCatalogSearchQuery = this.value;
    currentLotCatalogPage = 1; // Reset to first page when searching
    loadLotCatalog();
}, 300);

// Add a shared product registry to track products across views
const selectedProductsRegistry = new Map();

// Add a shared lot registry to track lots across views
const selectedLotsRegistry = new Map();

const updateExpeditionsProductsField = () => {
    const productsContainer = document.getElementById('page-expedition-list-create-form-products-line-items-container');
    const productsField = document.getElementById('page-expedition-list-create-form-products-list');

    if (!productsContainer || !productsField) {
        console.error('Products container or field not found');
        return;
    }

    const productLines = productsContainer.querySelectorAll('.line-item');
    const products = [];

    for (const line of productLines) {
        const packageInput = line.querySelector('.product-package');
        const select = line.querySelector('.product-select');
        const qtyInput = line.querySelector('.product-qty');

        try {
            if (select && $(select).data('select2')) {
                const selectData = $(select).select2('data')[0];
                if (packageInput && selectData && qtyInput) {
                    products.push({
                        package: packageInput.value,
                        product_id: selectData.id,
                        quantity: qtyInput.value
                    });
                }
            }
        } catch (e) {
            console.error('Error getting product data:', e);
        }
    }

    productsField.value = JSON.stringify(products);
    console.log('Updated products field with:', products.length, 'products');
}


/**
 * Inicializa el formulario de creación de expediciones
 *
 */
export const initExpeditionCreateForm = () => {
    const pageName = "expedition";

    console.log("Initializing expedition create form");
    const createButton = document.getElementById('launch-create-expedition-form-button');

    const createModal = document.getElementById('page-expedition-list-create-modal');
    const submitButton = document.getElementById('page-expedition-list-create-product-form-submit');
    const lotCatalogButton = document.getElementById('page-expedition-list-create-form-lots-add-catalog-btn');
    const pageMainContainer = document.querySelector('#page-expedition-main-container');
    const lotCatalogSelectContainer = document.querySelector('#page-expedition-lot-catalog-select');

    const carrierSelectInput = document.getElementById('page-expedition-list-create-form-carrier-id');
    const searchSelectInput = document.getElementById('page-expedition-list-create-form-address');

    const zipInput = document.getElementById('page-expedition-list-create-form-zip')
    const zipInputId = document.getElementById('page-expedition-list-create-form-zip-id')
    const cityInput = document.getElementById('page-expedition-list-create-form-city')
    const cityInputId = document.getElementById('page-expedition-list-create-form-city-id')
    const stateInput = document.getElementById('page-expedition-list-create-form-state')
    const stateInputId = document.getElementById('page-expedition-list-create-form-state-id')
    const countryInput = document.getElementById('page-expedition-list-create-form-country')
    const countryInputId = document.getElementById('page-expedition-list-create-form-country-id')

    $(carrierSelectInput).select2({
        placeholder: 'Select Carrier',
        dropdownParent: $(createModal),
        ajax: {
            transport: function(params, success, failure) {
                rpc('/account/expedition/carrier-search', {
                    term: params.data.term
                })
                .then(function(result) {
                    success({ results: result.items });
                })
                .catch(function(error) {
                    console.error('Error fetching carriers:', error);
                    failure('Failed to load carriers');
                });
            },
            processResults: function(data) {
                return data;
            },
            delay: 250
        },
        templateResult: function(data) {
            return formatCarrier(data);
        }
    });

    $(searchSelectInput).select2({
        placeholder: 'Search Address',
        dropdownParent: $(createModal),
        ajax: {
            transport: function(params, success, failure) {
                rpc('/account/expedition/address-search', {
                    term: params.data.term
                })
                .then(function(result) {
                    success({ results: result.items });
                })
                .catch(function(error) {
                    console.error('Error fetching address:', error);
                    failure('Failed to load addresses');
                });
            },
            processResults: function(data) {
                return data;
            },
            delay: 250
        },
        templateResult: function(data) {
            return formatAddress(data);
        }
    });

    $(searchSelectInput).on('select2:select', function (e) {
        const data = e.params.data;

        zipInput.value = data.zip || '';
        cityInput.value = data.city_name || '';
        stateInput.value = data.state_name || '';
        countryInput.value = data.country_name || '';

        zipInputId.value = data.zip_id || '';
        cityInputId.value = data.city_id || '';
        stateInputId.value = data.state_id || '';
        countryInputId.value = data.country_id || '';
    });

    // Event listener for lot catalog button
    if (lotCatalogButton) {
        lotCatalogButton.addEventListener('click', async () => {
            const skipStickyHeader = document.getElementById('skip-list-page-sticky-header');
            if(skipStickyHeader) skipStickyHeader.value = 'true';

            const paginationContainerMain = document.getElementById('page-expedition-list-pagination-container-main');
            if (paginationContainerMain) {
                paginationContainerMain.classList.add('hidden');
            }

            const expeditionListTable = document.getElementById('page-expedition-list-table');
            if (expeditionListTable) {
                expeditionListTable.style.display = 'none';
            }

            lotCatalogSelectContainer.classList.remove('hidden');
            pageMainContainer.classList.add('hidden');
            createModal.dataset.open = 'false';

            // Reset pagination and load first page
            currentLotCatalogPage = 1;
            lotCatalogSearchQuery = '';
            const searchInput = document.getElementById(`page-${pageName}-lot-catalog-select-search`);
            if (searchInput) searchInput.value = '';

            // Sync registry with form lots before opening catalog
            syncLotsRegistryFromForm();

            loadLotCatalog();

            // Rebuild selected lots list from registry
            rebuildSelectedLotsList();

            setupLotSearchListener();
        });
    }

    // Set up close lot catalog button
    const closeLotCatalogButton = document.getElementById(`page-${pageName}-lot-catalog-select-close-btn`);
    if (closeLotCatalogButton) {
        closeLotCatalogButton.addEventListener('click', closeLotCatalog);
    }

    // Set up clear lot selection button
    const clearLotSelectionButton = document.getElementById(`page-${pageName}-lot-catalog-select-clear-selection-btn`);
    if (clearLotSelectionButton) {
        clearLotSelectionButton.addEventListener('click', () => {
            clearLotSelection();
        });
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
            // Clear registry
            selectedProductsRegistry.clear();

            // Clear selected products list
            const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
            const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);

            if (selectedProductsList) {
                selectedProductsList.innerHTML = '';
                selectedProductsList.classList.add('hidden');
            }

            if (noProductsMessage) {
                noProductsMessage.classList.remove('hidden');
            }

            // Reset all product cards in the catalog
            const productGrid = document.getElementById('page-expedition-product-catalog-select-products-grid');
            if (productGrid) {
                productGrid.querySelectorAll('.product-card').forEach(card => {
                    const addBtn = card.querySelector('.product-add-btn');
                    if (addBtn) {
                        addBtn.innerHTML = '<i class="fas fa-plus mr-1"></i> Add';
                        addBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                        addBtn.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-purple-700', 'hover:from-purple-700', 'hover:to-purple-800');
                    }

                    const addedQtyDisplay = card.querySelector('.product-added-qty');
                    if (addedQtyDisplay) {
                        addedQtyDisplay.classList.add('hidden');
                    }
                });
            }

            // Update counter
            const selectedCount = document.getElementById("selected-count");
            if (selectedCount) {
                selectedCount.textContent = '0';
            }
        });
    }

    createButton.addEventListener('click', () => {
        Modal.open('page-expedition-list-create-modal');
    });

    submitButton.addEventListener('click', async () => {
        const res = sysFormValidate('#page-expedition-list-create-form');
        if(!res) return;

        const { formData } = sysCollectFormData('#page-expedition-list-create-form');

        console.log(formData)
        const resp = await rpc('/account/expedition/create', formData);

        if(resp?.status !== 'success') return;

        console.log(resp.message)

        Modal.close('page-expedition-list-create-modal');

        reloadExpeditionListPage();
    });
};

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

function formatAddress(data) {
    if (!data.id) return data.text;

    // Create container with flexbox
    let html = `<div class="flex items-center space-x-3">`;

    // Add carrier image if available

    // Carrier details
    html += `<div class="flex-grow">
        <div class="font-medium">${data.text}</div>`;

    html += `</div></div>`;

    return $(html);
}


// TODO: Product catalog search listener - Currently unused, kept for future use
// function setupSearchListener() {
//     const pageName = "expedition";
//     const searchInput = document.getElementById(`page-${pageName}-product-catalog-select-search`);
//
//     if (searchInput) {
//         searchInput.removeEventListener('input', debouncedSearch);
//         searchInput.addEventListener('input', debouncedSearch);
//     } else {
//         console.error(`Search input not found with ID: page-${pageName}-product-catalog-select-search`);
//     }
// }

// Sync selectedLotsRegistry from the form's current lot lines
function syncLotsRegistryFromForm() {
    const pageName = "expedition";
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
        const qtyInput = line.querySelector('.product-qty');

        if (!select) continue;

        try {
            const selectData = $(select).select2('data')[0];
            if (selectData) {
                // Create unique key based on lineId or generate from product+lot
                const itemKey = lineId || `lot-${lotId || selectData.id}`;
                
                selectedLotsRegistry.set(itemKey, {
                    id: itemKey,
                    lotId: lotId || $(select).data('lot_id') || '',
                    lotName: $(select).data('lot_name') || '',
                    hasLot: hasLot,
                    name: selectData.text || '',
                    productId: selectData.id || '',
                    productName: selectData.text || '',
                    productCode: selectData.default_code || '',
                    quantity: parseInt(qtyInput?.value) || 1,
                    maxQty: Infinity
                });
            }
        } catch (e) {
            console.error('Error syncing lot to registry:', e);
        }
    }
    
    console.log('Synced lots registry from form:', selectedLotsRegistry.size, 'items');
}

// Rebuild the selected lots list in the catalog from registry
function rebuildSelectedLotsList() {
    const pageName = "expedition";
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
                removeLotFromSelection(itemKey);
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

// Create a separate function to set up the lot search functionality
function setupLotSearchListener() {
    const pageName = "expedition";
    const searchInput = document.getElementById(`page-${pageName}-lot-catalog-select-search`);

    if (searchInput) {
        searchInput.removeEventListener('input', debouncedLotSearch);
        searchInput.addEventListener('input', debouncedLotSearch);
    } else {
        console.error(`Lot search input not found with ID: page-${pageName}-lot-catalog-select-search`);
    }
}

// Load lot catalog
async function loadLotCatalog() {
    const pageName = "expedition";
    const lotGrid = document.getElementById(`page-${pageName}-lot-catalog-select-lots-grid`);
    const paginationContainer = document.getElementById(`page-${pageName}-lot-catalog-select-pagination`);

    console.log("Loading lot catalog:", {
        page: currentLotCatalogPage,
        search: lotCatalogSearchQuery,
        grid: lotGrid,
        pagination: paginationContainer
    });

    if (!lotGrid || !paginationContainer) {
        console.error("Required lot elements not found", { lotGrid, paginationContainer });
        return;
    }

    try {
        lotGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-spinner fa-spin fa-2x text-gray-400"></i><p class="mt-2 text-gray-500">Loading lots...</p></div>';

        const result = await rpc('/catalog/lot-catalog', {
            page: currentLotCatalogPage,
            search: lotCatalogSearchQuery
        });

        console.log("Lot catalog response received");

        if (result.status === 'success') {
            lotGrid.innerHTML = result.lots_html;
            paginationContainer.innerHTML = result.pagination_html;

            setupLotPaginationEvents();
            setupLotCardEvents();
        } else {
            console.error("Failed to load lots", result);
            lotGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-exclamation-triangle text-red-500 fa-2x"></i><p class="mt-2 text-gray-700">Failed to load lots</p></div>';
        }
    } catch (error) {
        console.error("Error loading lot catalog:", error);
        lotGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-exclamation-triangle text-red-500 fa-2x"></i><p class="mt-2 text-gray-700">Error loading lots</p></div>';
    }
}

function setupLotPaginationEvents() {
    const pageName = "expedition";
    const paginationContainer = document.getElementById(`page-${pageName}-lot-catalog-select-pagination`);
    if (!paginationContainer) return;

    const pageButtons = paginationContainer.querySelectorAll('.lot-catalog-page-btn');
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.disabled) return;
            const page = parseInt(this.dataset.page);
            if (page > 0) {
                currentLotCatalogPage = page;
                loadLotCatalog();
            }
        });
    });
}

function setupLotCardEvents() {
    const pageName = "expedition";
    const lotGrid = document.getElementById(`page-${pageName}-lot-catalog-select-lots-grid`);
    if (!lotGrid) return;

    const lotCards = lotGrid.querySelectorAll('.lot-card');
    lotCards.forEach(card => {
        // Use quant-id as unique identifier (works for both with and without lot)
        const quantId = card.dataset.quantId;
        const lotId = card.dataset.lotId || '';
        const hasLot = card.dataset.hasLot === 'true';
        // Unique key for registry: quant-{id} or lot-{id} for backwards compatibility
        const itemKey = quantId ? `quant-${quantId}` : (lotId ? `lot-${lotId}` : null);
        
        if (!itemKey) return;
        
        // Restore state if already selected
        if (selectedLotsRegistry.has(itemKey)) {
            const initialAdd = card.querySelector('.lot-initial-add');
            const quantityControls = card.querySelector('.lot-quantity-controls');
            const quantityInput = card.querySelector('.lot-quantity');
            
            if (initialAdd) initialAdd.classList.add('hidden');
            if (quantityControls) quantityControls.classList.remove('hidden');
            if (quantityInput) quantityInput.value = selectedLotsRegistry.get(itemKey).quantity;
        }

        // Add button click
        const addBtn = card.querySelector('.lot-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const lotName = card.dataset.lotName || card.querySelector('h3')?.textContent.trim() || '';
                const productId = card.dataset.productId || '';
                const productName = card.dataset.productName || '';
                const productCode = card.dataset.productCode || '';
                const maxQty = parseFloat(card.dataset.productQty) || Infinity;

                addLotToSelection(itemKey, lotId, lotName, hasLot, productId, productName, productCode, 1, maxQty);

                const initialAdd = card.querySelector('.lot-initial-add');
                const quantityControls = card.querySelector('.lot-quantity-controls');
                if (initialAdd) initialAdd.classList.add('hidden');
                if (quantityControls) quantityControls.classList.remove('hidden');
            });
        }

        // Decrease button
        const decreaseBtn = card.querySelector('.lot-decrease');
        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', () => {
                const quantityInput = card.querySelector('.lot-quantity');
                let quantity = parseInt(quantityInput.value);
                if (quantity > 1) {
                    quantity--;
                    quantityInput.value = quantity;
                    if (selectedLotsRegistry.has(itemKey)) {
                        selectedLotsRegistry.get(itemKey).quantity = quantity;
                        updateSelectedLotQuantity(itemKey, quantity);
                    }
                }
            });
        }

        // Increase button
        const increaseBtn = card.querySelector('.lot-increase');
        if (increaseBtn) {
            increaseBtn.addEventListener('click', () => {
                const quantityInput = card.querySelector('.lot-quantity');
                const maxQty = parseFloat(card.dataset.productQty) || Infinity;
                let quantity = parseInt(quantityInput.value);
                if (quantity < maxQty) {
                    quantity++;
                    quantityInput.value = quantity;
                    if (selectedLotsRegistry.has(itemKey)) {
                        selectedLotsRegistry.get(itemKey).quantity = quantity;
                        updateSelectedLotQuantity(itemKey, quantity);
                    }
                }
            });
        }

        // Quantity input change
        const quantityInput = card.querySelector('.lot-quantity');
        if (quantityInput) {
            quantityInput.addEventListener('change', () => {
                const maxQty = parseFloat(card.dataset.productQty) || Infinity;
                let qty = parseInt(quantityInput.value);
                if (isNaN(qty) || qty < 1) {
                    qty = 1;
                } else if (qty > maxQty) {
                    qty = Math.floor(maxQty);
                }
                quantityInput.value = qty;
                if (selectedLotsRegistry.has(itemKey)) {
                    selectedLotsRegistry.get(itemKey).quantity = qty;
                    updateSelectedLotQuantity(itemKey, qty);
                }
            });
        }

        // Remove button
        const removeBtn = card.querySelector('.lot-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                removeLotFromSelection(itemKey);
                
                const quantityInput = card.querySelector('.lot-quantity');
                if (quantityInput) quantityInput.value = 1;
            });
        }
    });
}

function addLotToSelection(itemKey, lotId, lotName, hasLot, productId, productName, productCode, qty = 1, maxQty = Infinity) {
    const pageName = "expedition";
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
            maxQty 
        });
    }

    // Update count
    if (selectedCount) {
        selectedCount.textContent = selectedLotsRegistry.size;
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
    }

    // Add event listeners for this item
    const removeBtn = lotItem.querySelector('.lot-remove');
    const decreaseBtn = lotItem.querySelector('.lot-decrease');
    const increaseBtn = lotItem.querySelector('.lot-increase');
    const qtyInput = lotItem.querySelector('.lot-quantity');

    removeBtn?.addEventListener('click', () => {
        removeLotFromSelection(itemKey);
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

function updateSelectedLotQuantity(itemKey, quantity) {
    const pageName = "expedition";
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

function removeLotFromSelection(itemKey) {
    const pageName = "expedition";
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
        }
    }

    if (selectedCount) {
        selectedCount.textContent = selectedLotsRegistry.size;
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

function clearLotSelection() {
    const pageName = "expedition";
    
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

function closeLotCatalog() {
    try {
        const pageName = "expedition";
        const pageMainContainer = document.querySelector('#page-expedition-main-container');
        const lotCatalogSelectContainer = document.querySelector(`#page-${pageName}-lot-catalog-select`);
        const createModal = document.getElementById('page-expedition-list-create-modal');
        const paginationContainerMain = document.getElementById('page-expedition-list-pagination-container-main');
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

        const expeditionListTable = document.getElementById('page-expedition-list-table');
        if (expeditionListTable) {
            expeditionListTable.style.display = '';
        }

        // Re-open the create modal
        Modal.open('page-expedition-list-create-modal');

        // Transfer selected lots to form
        transferSelectedLotsToForm();
    } catch (error) {
        console.error("Error closing lot catalog:", error);
    }
}

function transferSelectedLotsToForm() {
    const pageName = "expedition";
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
        addLotLineToForm(productsContainer, lot, modal);
        }
    });

    // Clear lot registry after transfer
    selectedLotsRegistry.clear();

    // Clear the selected lots list UI
    const selectedLotsList = document.getElementById(`page-${pageName}-lot-catalog-select-selected-lots-list`);
    const noLotsMessage = document.getElementById(`page-${pageName}-lot-catalog-select-no-lots-message`);
    const selectedCount = document.getElementById(`page-${pageName}-lot-catalog-selected-count`);
    
    if (selectedLotsList) selectedLotsList.innerHTML = '';
    if (selectedLotsList) selectedLotsList.classList.add('hidden');
    if (noLotsMessage) noLotsMessage.classList.remove('hidden');
    if (selectedCount) selectedCount.textContent = '0';

    // Update the products field
    updateExpeditionsProductsField();
}

function addLotLineToForm(container, item, modal) {
    const pageName = "expedition";
    const lineId = `catalog-item-line-${item.id}`;
    
    // Check if item already exists
    if (container.querySelector(`[data-line-id="${lineId}"]`)) {
        return;
    }

    // Info display: show lot name if has lot, otherwise show "No Lot"
    const infoHtml = item.hasLot 
        ? `<i class="fas fa-barcode mr-1"></i> Lot: <span class="lot-name-display">${item.lotName}</span>`
        : `<i class="fas fa-box mr-1"></i> <span class="px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">No Lot</span>`;

    const newRow = document.createElement('div');
    newRow.className = 'line-item bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-2';
    newRow.dataset.lineId = lineId;
    newRow.dataset.hasLot = item.hasLot ? 'true' : 'false';
    newRow.dataset.lotId = item.lotId || '';

    newRow.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-16">
                <input type="text" value="1" placeholder="Package #" class="product-package form-input-sm w-full text-xs rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
            </div>
            <div class="flex-grow">
                <select class="product-select form-select-sm w-full rounded-md border border-gray-300
                    focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
                </select>
            </div>
            <div class="flex-shrink-0 w-20">
                <input type="number" value="${item.quantity}" min="1"
                    class="product-qty form-input-sm w-full text-center rounded-md border border-gray-300
                    focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
            </div>
            <div class="flex-shrink-0">
                <button type="button" class="remove-line-btn text-red-500 hover:text-red-700 transition-colors p-1" data-line-id="${lineId}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        <div class="mt-1 text-xs text-gray-500">
            ${infoHtml}
        </div>
    `;

    container.appendChild(newRow);

    const select = $(newRow).find('.product-select');
    const qtyInput = newRow.querySelector('.product-qty');
    const packageInput = newRow.querySelector('.product-package');

    // Initialize product select with preselected product
    select.select2({
        placeholder: 'Search product...',
        dropdownParent: $(modal),
        data: [{
            id: item.productId,
            text: item.productName,
            default_code: item.productCode,
            lot_id: item.lotId || '',
            lot_name: item.lotName || '',
            has_lot: item.hasLot,
            selected: true
        }],
        ajax: {
            transport: function(params, success, failure) {
                rpc('/account/expedition/product-search', { term: params.data.term })
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

    // Store lot info in the select element's data
    select.data('lot_id', item.lotId || '');
    select.data('lot_name', item.lotName || '');

    $(select).on('change', updateExpeditionsProductsField);
    qtyInput.addEventListener('change', updateExpeditionsProductsField);
    packageInput.addEventListener('change', updateExpeditionsProductsField);

    // Remove button
    const removeBtn = newRow.querySelector('.remove-line-btn');
    removeBtn?.addEventListener('click', () => {
        container.removeChild(newRow);
        updateExpeditionsProductsField();
    });
}

// TODO: UNUSED - Product catalog function, kept for future use
async function loadProductCatalog() {
    const pageName = "expedition";
    const productGrid = document.getElementById(`page-${pageName}-product-catalog-select-products-grid`);
    const paginationContainer = document.getElementById(`page-${pageName}-product-catalog-select-pagination`);

    console.log("Loading product catalog:", {
        page: currentCatalogPage,
        search: catalogSearchQuery,
        grid: productGrid,
        pagination: paginationContainer
    });

    if (!productGrid || !paginationContainer) {
        console.error("Required elements not found", { productGrid, paginationContainer });
        return;
    }

    try {
        productGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-spinner fa-spin fa-2x text-gray-400"></i><p class="mt-2 text-gray-500">Loading products...</p></div>';

        const result = await rpc('/account/expedition/product-catalog', {
            page: currentCatalogPage,
            search: catalogSearchQuery
        });

        console.log("Product catalog response received");

        if (result.status === 'success') {
            // Update the product grid with server-rendered HTML
            productGrid.innerHTML = result.products_html;

            // Update the pagination with server-rendered HTML
            paginationContainer.innerHTML = result.pagination_html;

            // Add event listeners to pagination buttons
            setupPaginationEvents();

            // Add event listeners to product cards
            setupProductCardEvents();
        } else {
            console.error("Failed to load products", result);
            productGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-exclamation-triangle text-red-500 fa-2x"></i><p class="mt-2 text-gray-700">Failed to load products</p></div>';
        }
    } catch (error) {
        console.error("Error loading product catalog:", error);
        productGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-exclamation-triangle text-red-500 fa-2x"></i><p class="mt-2 text-gray-700">An error occurred</p></div>';
    }
}

// TODO: UNUSED - Product catalog pagination, kept for future use
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

// TODO: UNUSED - Product catalog card events, kept for future use
function setupProductCardEvents() {
    const pageName = "expedition";
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

        // Check if product is already in registry and update UI accordingly
        if (selectedProductsRegistry.has(productId)) {
            const product = selectedProductsRegistry.get(productId);

            // Hide the initial add button and show quantity controls
            if (initialAddDiv) initialAddDiv.classList.add('hidden');
            if (quantityControls) {
                quantityControls.classList.remove('hidden');
                if (quantityInput) quantityInput.value = product.quantity;
            }
        }

        // Set up the add button event listener
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                const productName = card.querySelector('h3').textContent;
                let productSku = '';
                const skuElement = card.querySelector('.text-gray-500');
                if (skuElement) {
                    productSku = skuElement.textContent.replace(/[\[\]]/g, '').trim();
                }

                // Get additional attributes
                const priceElement = card.querySelector('.font-medium.text-xs.text-gray-700');
                const stockElement = card.querySelector('.flex.items-center .text-xs');
                const imageElement = card.querySelector('img');

                // Extract price, stock, image data
                const price = priceElement ? priceElement.textContent.trim() : '';
                const stockInfo = stockElement ? stockElement.textContent.trim() : '';
                const inStock = stockElement && stockElement.classList.contains('text-green-600');
                const imgSrc = imageElement ? imageElement.src : '';

                // Get attribute tags if available
                const attributeTags = [];
                card.querySelectorAll('.bg-gray-100.text-gray-800.text-xs').forEach(tag => {
                    attributeTags.push(tag.textContent.trim());
                });

                // Add to selected products with additional data
                addProductToSelection(
                    productId,
                    productName,
                    productSku,
                    1, // qty
                    price,
                    stockInfo,
                    inStock,
                    imgSrc,
                    attributeTags
                );

                // Update UI - hide the add button and show quantity controls
                if (initialAddDiv) initialAddDiv.classList.add('hidden');
                if (quantityControls) quantityControls.classList.remove('hidden');

                // Update selected products UI
                if (selectedProductsList.children.length > 0) {
                    selectedProductsList.classList.remove('hidden');
                    noProductsMessage.classList.add('hidden');
                }

                // Update count
                if (selectedCount) {
                    selectedCount.textContent = selectedProductsList.children.length;
                }
            });
        }

        // Set up decrease button event listener
        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', function() {
                if (selectedProductsRegistry.has(productId)) {
                    const product = selectedProductsRegistry.get(productId);
                    if (product.quantity > 1) {
                        product.quantity--;
                        if (quantityInput) quantityInput.value = product.quantity;

                        // Update the selected product in the list if it exists
                        updateSelectedProductQuantity(productId, product.quantity);
                    } else {
                        // If quantity would be 0, remove the product
                        removeProductFromSelection(productId);

                        // Show add button and hide quantity controls
                        if (initialAddDiv) initialAddDiv.classList.remove('hidden');
                        if (quantityControls) quantityControls.classList.add('hidden');
                    }
                }
            });
        }

        // Set up increase button event listener
        if (increaseBtn) {
            increaseBtn.addEventListener('click', function() {
                if (selectedProductsRegistry.has(productId)) {
                    const product = selectedProductsRegistry.get(productId);
                    product.quantity++;
                    if (quantityInput) quantityInput.value = product.quantity;

                    // Update the selected product in the list if it exists
                    updateSelectedProductQuantity(productId, product.quantity);
                }
            });
        }

        // Set up quantity input event listener
        if (quantityInput) {
            quantityInput.addEventListener('change', function() {
                let qty = parseInt(this.value);
                if (isNaN(qty) || qty < 1) {
                    qty = 1;
                    this.value = qty;
                }

                if (selectedProductsRegistry.has(productId)) {
                    const product = selectedProductsRegistry.get(productId);
                    product.quantity = qty;

                    // Update the selected product in the list if it exists
                    updateSelectedProductQuantity(productId, qty);
                }
            });
        }

        // Set up remove button event listener
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                removeProductFromSelection(productId);

                // Show add button and hide quantity controls
                if (initialAddDiv) initialAddDiv.classList.remove('hidden');
                if (quantityControls) quantityControls.classList.add('hidden');
            });
        }
    });
}

// TODO: UNUSED - Product catalog selection, kept for future use
function addProductToSelection(id, name, sku, qty = 1, price = '', stockInfo = '', inStock = true, imgSrc = '', attributeTags = [], attributes = []) {
    const pageName = "expedition";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);

    // Check if product already exists in registry
    const productExists = selectedProductsRegistry.has(id);
    let newQty = qty;

    if (productExists) {
        // If product exists, increment quantity
        const product = selectedProductsRegistry.get(id);
        newQty = product.quantity + 1;

        // Update registry with new quantity
        product.quantity = newQty;
        selectedProductsRegistry.set(id, product);
    } else {
        // Add to registry as new product
        selectedProductsRegistry.set(id, {
            id,
            name,
            sku,
            quantity: newQty,
            price,
            stockInfo,
            inStock,
            imgSrc,
            attributeTags,
            attributes
        });
    }

    // Update quantity badge in the catalog view
    const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
    if (productCard) {
        // Update the quantity display
        const addedQtyDisplay = productCard.querySelector('.product-added-qty');
        const addedQtyValue = productCard.querySelector('.product-added-qty-value');
        if (addedQtyDisplay && addedQtyValue) {
            addedQtyValue.textContent = newQty; // Just show the number
            addedQtyDisplay.classList.remove('hidden');
        }
    }

    // Check if product already exists
    const existingProduct = selectedProductsList.querySelector(`[data-product-id="${id}"]`);
    if (existingProduct) {
        // Update quantity instead of adding new item
        const qtyInput = existingProduct.querySelector('.product-quantity');
        if (qtyInput) {
            qtyInput.value = newQty;
        }
        return;
    }

    // Create product item
    const productItem = document.createElement('div');
    productItem.className = 'bg-white dark:bg-gray-700 rounded p-2 flex flex-col justify-between h-full';
    productItem.dataset.productId = id;
    productItem.dataset.productName = name;
    productItem.dataset.productSku = sku;
    productItem.dataset.productPrice = price;
    if (attributes && attributes.length) {
        productItem.dataset.productAttributes = JSON.stringify(attributes);
    }

    // Build attribute tags HTML
    const attributeTagsHtml = attributeTags.length > 0
        ? `<div class="flex flex-wrap gap-0.5 mt-0.5">
            ${attributeTags.map(tag => `<span class="bg-gray-100 text-gray-700 text-2xs px-1 py-0 rounded-sm">${tag}</span>`).join('')}
           </div>`
        : '';

    productItem.innerHTML = `
        <div class="flex items-center">
            <div class="flex-grow pr-1 min-w-0">
                <p class="text-xs font-medium text-gray-800 dark:text-white truncate mb-0">${name}</p>
                <div class="flex items-center">
                    <span class="text-2xs text-gray-500 dark:text-gray-400 truncate">${sku}</span>
                    ${attributeTagsHtml}
                </div>
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

    selectedProductsList.appendChild(productItem);

    // Add event listeners
    const removeBtn = productItem.querySelector('.product-remove');
    const decreaseBtn = productItem.querySelector('.product-decrease');
    const increaseBtn = productItem.querySelector('.product-increase');
    const qtyInput = productItem.querySelector('.product-quantity');

    removeBtn.addEventListener('click', () => {
        selectedProductsList.removeChild(productItem);

        // Remove from registry
        selectedProductsRegistry.delete(id);

        // Update counter
        const selectedCount = document.getElementById("selected-count");
        if (selectedCount) {
            selectedCount.textContent = selectedProductsList.children.length;
        }

        // Update card UI in the catalog if still visible
        const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
        if (productCard) {
            const addBtn = productCard.querySelector('.product-add-btn');
            if (addBtn) {
                addBtn.innerHTML = '<i class="fas fa-plus mr-1"></i> Add';
                addBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                addBtn.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-purple-700', 'hover:from-purple-700', 'hover:to-purple-800');
            }

            const addedQtyDisplay = productCard.querySelector('.product-added-qty');
            if (addedQtyDisplay) {
                addedQtyDisplay.classList.add('hidden');
            }
        }

        if (selectedProductsList.children.length === 0) {
            const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
            selectedProductsList.classList.add('hidden');
            noProductsMessage.classList.remove('hidden');
        }
    });

    decreaseBtn.addEventListener('click', () => {
        let qty = parseInt(qtyInput.value);
        if (qty > 1) {
            qtyInput.value = qty - 1;

            // Update registry quantity
            const product = selectedProductsRegistry.get(id);
            if (product) {
                product.quantity = qty - 1;
                selectedProductsRegistry.set(id, product);

                // Update quantity in product card if visible
                const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
                if (productCard) {
                    const addedQtyValue = productCard.querySelector('.product-added-qty-value');
                    if (addedQtyValue) {
                        addedQtyValue.textContent = qty - 1;
                    }
                }
            }
        }
    });

    increaseBtn.addEventListener('click', () => {
        let qty = parseInt(qtyInput.value);
        qtyInput.value = qty + 1;

        // Update registry quantity
        const product = selectedProductsRegistry.get(id);
        if (product) {
            product.quantity = qty + 1;
            selectedProductsRegistry.set(id, product);

            // Update quantity in product card if visible
            const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
            if (productCard) {
                const addedQtyValue = productCard.querySelector('.product-added-qty-value');
                if (addedQtyValue) {
                    addedQtyValue.textContent = qty + 1;
                }
            }
        }
    });

    // Manual input handling
    qtyInput.addEventListener('change', () => {
        let qty = parseInt(qtyInput.value);
        // Ensure minimum value of 1
        if (isNaN(qty) || qty < 1) {
            qty = 1;
            qtyInput.value = 1;
        }

        // Update registry quantity
        const product = selectedProductsRegistry.get(id);
        if (product) {
            product.quantity = qty;
            selectedProductsRegistry.set(id, product);

            // Update quantity in product card if visible
            const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
            if (productCard) {
                const addedQtyValue = productCard.querySelector('.product-added-qty-value');
                if (addedQtyValue) {
                    addedQtyValue.textContent = qty;
                }
            }
        }
    });
}

// Update the document ready function
document.addEventListener('DOMContentLoaded', () => {
    try {
        const pageName = "expedition";
        const modalEl = document.getElementById('page-expedition-list-create-modal');
        if (!modalEl) {
            console.log("Expedition modal not found in DOM");
            return;
        }

        console.log("Initializing expedition module");

        // Initialize create form
        initExpeditionCreateForm();

        // Set up auxiliary UI elements
        const productSearchInput = document.getElementById('product-search');
        const clearSelectionBtn = document.getElementById(`page-${pageName}-product-catalog-select-clear-selection-btn`);
        const closeBtn = document.getElementById(`page-${pageName}-product-catalog-select-close-btn`);

        if (productSearchInput) {
            productSearchInput.addEventListener('input', debouncedSearch);
        }

        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => {
                try {
                    // Clear selected products registry
                    selectedProductsRegistry.clear();

                    // Clear UI elements
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
                        selectedCount.textContent = "0";
                    }

                    // Reset all product cards in the catalog
                    const productGrid = document.getElementById('page-expedition-product-catalog-select-products-grid');
                    if (productGrid) {
                        productGrid.querySelectorAll('.product-card').forEach(card => {
                            const addBtn = card.querySelector('.product-add-btn');
                            if (addBtn) {
                                addBtn.innerHTML = '<i class="fas fa-plus mr-1"></i> Add';
                                addBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                                addBtn.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-purple-700', 'hover:from-purple-700', 'hover:to-purple-800');
                            }

                            const addedQtyDisplay = card.querySelector('.product-added-qty');
                            if (addedQtyDisplay) {
                                addedQtyDisplay.classList.add('hidden');
                            }
                        });
                    }
                } catch (error) {
                    console.error("Error clearing product selection:", error);
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeProductCatalog);
        }
    } catch (error) {
        console.error("Error initializing expedition module:", error);
    }
});

// TODO: UNUSED - Product catalog close, kept for future use
function closeProductCatalog() {
    try {
        const pageName = "expedition";
        const pageMainContainer = document.querySelector('#page-expedition-main-container');
        const productCatalogSelectContainer = document.querySelector(`#page-${pageName}-product-catalog-select`);
        const createModal = document.getElementById('page-expedition-list-create-modal');
        const paginationContainerMain = document.getElementById('page-expedition-list-pagination-container-main');
        const skipStickyHeader = document.getElementById('skip-list-page-sticky-header');

        if(skipStickyHeader) skipStickyHeader.value = '';

        // Switch back to main view
        if (productCatalogSelectContainer) {
            productCatalogSelectContainer.classList.add('hidden');
        }

        if (pageMainContainer) {
            pageMainContainer.classList.remove('hidden');
        }

        // Show pagination again
        if (paginationContainerMain) {
            paginationContainerMain.classList.remove('hidden');
        }

        // Show the expedition list table again
        const expeditionListTable = document.getElementById('page-expedition-list-table');
        if (expeditionListTable) {
            expeditionListTable.style.display = '';
        }

        // Re-open the create modal
        Modal.open('page-expedition-list-create-modal');

        // Transfer selected products to form
        transferSelectedProductsToForm();
    } catch (error) {
        console.error("Error closing product catalog:", error);
    }
}

// TODO: UNUSED - Product catalog transfer, kept for future use
function transferSelectedProductsToForm() {
    const pageName = "expedition";
    const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
    const productsField = document.getElementById(`page-${pageName}-list-create-form-products-list`);

    if (!productsContainer || !productsField) {
        console.error("Products container or field not found");
        return;
    }

    try {
        // Clear existing product lines
        productsContainer.innerHTML = '';

        // Add each product from registry
        selectedProductsRegistry.forEach((product) => {
            try {
                // Create a new line for each product
                addProductLineToForm(productsContainer, product);
            } catch (e) {
                console.error(`Error adding product ${product.id} to form:`, e);
            }
        });

        // Update the hidden input field with JSON data
        updateExpeditionsProductsField();
    } catch (error) {
        console.error("Error transferring products to form:", error);
    }
}

// TODO: UNUSED - Product catalog line to form, kept for future use
function addProductLineToForm(container, product) {
    const pageName = "expedition";
    const lineItem = document.createElement('div');
    lineItem.className = 'line-item mb-2 pb-2 border-b border-gray-200 dark:border-gray-700';

    // Create HTML structure for the line item
    lineItem.innerHTML = `
        <div class="flex flex-wrap items-end gap-2">
            <div class="flex-1 min-w-[120px]">
                <input type="text" value="1" placeholder="Package #" class="product-package form-input-sm w-full text-xs rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
            </div>
            <div class="flex-grow">
                <select class="product-select form-input-sm w-full text-xs rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"></select>
            </div>
            <div class="flex-1 min-w-[100px]">
                <input type="number" min="1" step="1" value="${product.quantity}" placeholder="Quantity" class="product-qty form-input-sm w-full text-xs rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
            </div>
            <div>
                <button type="button" class="remove-product-btn px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;

    container.appendChild(lineItem);

    // Set up Select2 for the product selection
    const select = lineItem.querySelector('.product-select');

    // Create data object with attributes if available
    const productData = {
        id: product.id,
        text: product.name,
        selected: true
    };

    if (product.sku) {
        productData.default_code = product.sku;
    }

    // Add attributes to the product data
    if (product.attributes && product.attributes.length > 0) {
        productData.attributes = product.attributes;
    }

    $(select).select2({
        placeholder: 'Select Product',
        dropdownParent: $(document.getElementById(`page-${pageName}-list-create-modal`)),
        data: [productData],
        minimumInputLength: 0,
        templateResult: formatProductWithAttributes,
        templateSelection: formatProductSelectionWithAttributes
    });

    // Add remove button functionality
    const removeBtn = lineItem.querySelector('.remove-product-btn');
    removeBtn.addEventListener('click', () => {
        container.removeChild(lineItem);
        updateExpeditionsProductsField();
    });
}

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
                ${attr.name || attr.attribute_id}: ${attr.value || attr.value_id}
            </span>`;
        });
        html += `</div>`;
    }

    html += `</div></div>`;

    return $(html);
}

// TODO: UNUSED - Product format selection, kept for future use
function formatProductSelection(product) {
    if (!product.id) return product.text;

    let text = product.text;
    if (product.default_code) {
        text += ` [${product.default_code}]`;
    }

    return text;
}

// TODO: UNUSED - Product format with attributes, kept for future use
function formatProductWithAttributes(product) {
    return formatProduct(product);
}

// TODO: UNUSED - Product format selection with attributes, kept for future use
function formatProductSelectionWithAttributes(product) {
    if (!product.id) return product.text;

    let text = product.text;
    if (product.default_code) {
        text += ` [${product.default_code}]`;
    }

    // Optionally add attribute information if product has attributes
    if (product.attributes && product.attributes.length > 0) {
        try {
            const attrText = product.attributes
                .map(attr => `${attr.name || attr.attribute_id}: ${attr.value || attr.value_id}`)
                .join(', ');
            text += ` (${attrText})`;
        } catch (e) {
            console.warn('Error formatting product attributes:', e);
        }
    }

    return text;
}

// TODO: UNUSED - Product update quantity, kept for future use
function updateSelectedProductQuantity(productId, quantity) {
    const pageName = "expedition";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);

    if (selectedProductsList) {
        const productItem = selectedProductsList.querySelector(`[data-product-id="${productId}"]`);
        if (productItem) {
            const qtyInput = productItem.querySelector('.product-quantity');
            if (qtyInput) {
                qtyInput.value = quantity;
            }
        }
    }
}

// TODO: UNUSED - Product remove from selection, kept for future use
function removeProductFromSelection(productId) {
    const pageName = "expedition";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById("selected-count");

    // Remove from registry
    selectedProductsRegistry.delete(productId);

    // Remove from the selected products list
    if (selectedProductsList) {
        const productItem = selectedProductsList.querySelector(`[data-product-id="${productId}"]`);
        if (productItem) {
            selectedProductsList.removeChild(productItem);

            // Update UI if no products left
            if (selectedProductsList.children.length === 0) {
                selectedProductsList.classList.add('hidden');
                if (noProductsMessage) noProductsMessage.classList.remove('hidden');
            }

            // Update count
            if (selectedCount) {
                selectedCount.textContent = selectedProductsList.children.length;
            }
        }
    }
}
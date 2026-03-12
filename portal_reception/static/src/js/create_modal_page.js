import { rpc } from "@portal_admin_theme/network/rpc";

const getElement = (id) => document.getElementById(id);

/**
 * Reads the products hidden input and returns parsed array
 */
const getSelectedProducts = () => {
    const productsInput = getElement('page-reception-list-create-form-products-list');
    if (!productsInput) return [];
    try {
        return JSON.parse(productsInput.value || '[]');
    } catch (e) {
        return [];
    }
};

/**
 * Renders the selected products into the lines container
 */
const renderSelectedProducts = () => {
    const products = getSelectedProducts();
    const container = getElement('page-reception-list-create-form-products-line-items-container');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = products.map((p, index) => `
        <div class="flex items-center justify-between p-2 mb-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div class="flex-grow">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">${p.product_name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">SKU: ${p.account_sku || 'N/A'}</p>
            </div>
            <div class="flex items-center gap-3">
                <input type="number" class="w-16 p-1 text-sm border rounded product-qty-input" 
                       data-index="${index}" value="${p.quantity || 1}" min="1"/>
                <button type="button" class="text-red-500 hover:text-red-700 remove-product-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Add listeners for quantity change
    container.querySelectorAll('.product-qty-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const qty = parseInt(e.target.value) || 1;
            const currentProducts = getSelectedProducts();
            currentProducts[index].quantity = qty;
            getElement('page-reception-list-create-form-products-list').value = JSON.stringify(currentProducts);
        });
    });

    // Add listeners for removal
    container.querySelectorAll('.remove-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(btn.dataset.index);
            const currentProducts = getSelectedProducts();
            currentProducts.splice(index, 1);
            getElement('page-reception-list-create-form-products-list').value = JSON.stringify(currentProducts);
            renderSelectedProducts();
        });
    });
};

/**
 * Submits the reception creation form to the backend
 */
const submitReceptionCreate = async () => {
    const form = getElement('page-reception-list-create-form');
    if (!form) return;

    const senderId = form.querySelector('[name="sender_id"]')?.value;
    const shippingAddressId = form.querySelector('[name="shipping_address_id"]')?.value;
    const customerReference = form.querySelector('[name="customer_reference"]')?.value;
    const packageTypeId = form.querySelector('[name="package_type_id"]')?.value;
    const numberOfPackages = form.querySelector('[name="number_of_packages"]')?.value;
    const weight = form.querySelector('[name="weight"]')?.value;
    const notes = form.querySelector('[name="notes"]')?.value;
    const products = getSelectedProducts();


    if (!senderId) {
        systemShowNotification('Please select a sender.', { type: 'error', duration: 3000 });
        return;
    }

    if (products.length === 0) {
        systemShowNotification('Please add at least one product.', { type: 'error', duration: 3000 });
        return;
    }

    try {
        if (typeof showLoadingScreen === 'function') showLoadingScreen();

        const response = await rpc('/account/reception/create', {
            sender_id: senderId,
            shipping_address_id: shippingAddressId || false,
            customer_reference: customerReference || false,
            package_type_id: packageTypeId,
            number_of_packages: numberOfPackages || 1,
            weight: weight,
            notes: notes,
            products: JSON.stringify(products),
        });


        if (typeof systemShowNotification === 'function') {
            systemShowNotification(response?.message || 'Done', {
                type: response?.status === 'success' ? 'success' : 'error',
                duration: 4000
            });
        }

        if (response?.status === 'success') {
            Modal.close('page-reception-list-create-modal');
            // Reload the list
            document.dispatchEvent(new CustomEvent('list:reload'));
            // Fallback: trigger the reload RPC directly
            if (typeof reloadReceptionListPage === 'function') {
                reloadReceptionListPage();
            }
        }
    } catch (e) {
        console.error('Error creating reception:', e);
        if (typeof systemShowNotification === 'function') {
            systemShowNotification('Error creating reception.', { type: 'error', duration: 4000 });
        }
    } finally {
        if (typeof hideLoadingScreen === 'function') hideLoadingScreen();
    }
};

/**
 * Initializes the shared "Add Address" mini-modal.
 * Each .add-address-btn has data-address-target with the ID of the select to populate.
 */
const initAddAddressModal = () => {
    const MODAL_ID = 'reception-add-address-modal';

    // Wire every "+" button to open the shared modal
    document.querySelectorAll('.add-address-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSelectId = btn.dataset.addressTarget;
            const titleEl = document.getElementById('reception-add-address-modal-title');
            const targetInput = document.getElementById('reception-add-address-target-select');
            const typeInput = document.getElementById('reception-add-address-type');

            if (targetInput) targetInput.value = targetSelectId || '';
            
            // Determine type based on target select ID
            const isShipping = targetSelectId?.includes('shipping');
            if (typeInput) typeInput.value = isShipping ? 'delivery' : 'sender';

            if (titleEl) {
                titleEl.textContent = isShipping
                    ? 'New Shipping Address'
                    : 'New Sender Contact';
            }


            // Clear fields
            ['new-address-name', 'new-address-email', 'new-address-phone',
             'new-address-street', 'new-address-city', 'new-address-zip']
                .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            const countryEl = document.getElementById('new-address-country-id');
            if (countryEl) countryEl.value = '';

            if (window.Modal) window.Modal.open(MODAL_ID);
        });
    });

    // Save button handler
    const saveBtn = document.getElementById('reception-add-address-save-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('new-address-name')?.value?.trim();
        if (!name) {
            if (typeof systemShowNotification === 'function') {
                systemShowNotification('Name is required.', { type: 'error', duration: 3000 });
            }
            return;
        }

        const targetSelectId = document.getElementById('reception-add-address-target-select')?.value;
        const type = document.getElementById('reception-add-address-type')?.value || 'contact';

        try {
            if (typeof showLoadingScreen === 'function') showLoadingScreen();

            const response = await rpc('/account/reception/address/create', {
                name,
                type,
                email: document.getElementById('new-address-email')?.value || '',

                phone: document.getElementById('new-address-phone')?.value || '',
                street: document.getElementById('new-address-street')?.value || '',
                city: document.getElementById('new-address-city')?.value || '',
                zip: document.getElementById('new-address-zip')?.value || '',
                country_id: document.getElementById('new-address-country-id')?.value || '',
            });

            if (response?.status !== 'success') {
                if (typeof systemShowNotification === 'function') {
                    systemShowNotification(response?.message || 'Error creating address.', { type: 'error', duration: 4000 });
                }
                return;
            }

            // Add the new address as an option in both selects (sender + shipping)
            // so it's immediately available in both, then select it in the target
            ['page-reception-list-create-form-sender-id',
             'page-reception-list-create-form-shipping-address-id']
                .forEach(selectId => {
                    const select = document.getElementById(selectId);
                    if (!select) return;
                    // Avoid duplicates
                    if (!select.querySelector(`option[value="${response.id}"]`)) {
                        const opt = new Option(response.display_name, response.id);
                        select.appendChild(opt);
                    }
                    if (selectId === targetSelectId) {
                        select.value = response.id;
                    }
                });

            if (typeof systemShowNotification === 'function') {
                systemShowNotification('Address created successfully.', { type: 'success', duration: 3000 });
            }

            if (window.Modal) window.Modal.close(MODAL_ID);

        } catch (e) {
            console.error('Error creating address:', e);
        } finally {
            if (typeof hideLoadingScreen === 'function') hideLoadingScreen();
        }
    });
};


/**
 * Initializes the submit button handler
 */
const initReceptionCreateModal = () => {
    const submitButton = getElement('page-reception-list-create-product-form-submit');
    if (!submitButton) return;
    submitButton.addEventListener('click', submitReceptionCreate);

    // Reset form when modal closes
    document.addEventListener('modalClosed', (e) => {
        if (e.detail.modalId !== 'page-reception-list-create-modal') return;
        const form = getElement('page-reception-list-create-form');
        if (form) {
            form.reset();
            // Ensure number_of_packages defaults back to 1 if reset doesn't handle it for hidden-synced inputs
            const numPkgInput = getElement('page-reception-list-create-form-number-of-packages');
            if (numPkgInput) numPkgInput.value = '1';
        }
        // Clear products list
        const productsInput = getElement('page-reception-list-create-form-products-list');
        if (productsInput) productsInput.value = '[]';
        const linesContainer = getElement('page-reception-list-create-form-products-line-items-container');
        if (linesContainer) linesContainer.innerHTML = '';
    });

};

/**
 * Renders the Kanban cards for Stock Quants
 */
const renderStockKanban = (quants) => {
    const container = getElement('reception-stock-kanban-container');
    if (!container) return;

    if (!quants || quants.length === 0) {
        container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500">No stock found for your account.</div>';
        return;
    }

    container.innerHTML = quants.map(q => `
        <div class="stock-quant-card bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 p-4 cursor-pointer transition-all duration-200 group flex flex-col items-center text-center"
             data-product-id="${q.product_id}" data-product-name="${q.product_name}" 
             data-mapping-id="${q.mapping_id || ''}" data-mapping-name="${q.mapping_name || ''}" data-mapping-sku="${q.mapping_sku || ''}">
            <div class="w-20 h-20 mb-3 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center relative">
                <img src="${q.image_url}" alt="${q.product_name}" class="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"/>
                <div class="absolute top-0 right-0 bg-theme text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg">
                    Qty: ${q.available_quantity}
                </div>
            </div>
            <div class="flex-1 w-full">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5 line-clamp-1">${q.product_name}</h4>
                <p class="text-[10px] text-gray-500 dark:text-gray-400 font-mono mb-2">${q.product_code || 'No Code'}</p>
                ${q.mapping_id ? `
                    <div class="px-2 py-1 bg-green-50 text-green-600 text-[9px] font-bold rounded uppercase tracking-wider mb-1">Mapping: ${q.mapping_sku}</div>
                ` : `
                    <div class="px-2 py-1 bg-yellow-50 text-yellow-600 text-[9px] font-bold rounded uppercase tracking-wider mb-1">Unmapped</div>
                `}
                <div class="px-3 py-1 bg-theme text-white text-[10px] font-bold rounded-full uppercase tracking-wider inline-block">Select</div>
            </div>
        </div>
    `).join('');

    // Add click events to stock cards
    container.querySelectorAll('.stock-quant-card').forEach(card => {
        card.addEventListener('click', () => {
            const mappingId = card.dataset.mappingId;
            const mappingName = card.dataset.mappingName;
            
            if (mappingId) {
                // If mapping exists, add it directly
                addMappingToLines(mappingId, mappingName);
                if (window.Modal) window.Modal.close('reception-stock-selector-modal');
            } else {
                // If no mapping, open the mapping creation modal
                openMappingModal(card.dataset.productId, card.dataset.productName, card.dataset.mappingSku || '');
            }
        });
    });
};

/**
 * Common function to add a mapping to the selected lines
 */
const addMappingToLines = (mappingId, mappingName) => {
    const products = getSelectedProducts();
    const exists = products.find(p => p.product_id === parseInt(mappingId));
    
    if (exists) {
        systemShowNotification('Product already added.', { type: 'info' });
        return false;
    }
    
    products.push({
        product_id: parseInt(mappingId),
        product_name: mappingName,
        quantity: 1
    });
    
    const productsInput = getElement('page-reception-list-create-form-products-list');
    if (productsInput) productsInput.value = JSON.stringify(products);
    
    renderSelectedProducts();
    systemShowNotification('Product added.', { type: 'success', duration: 2000 });
    return true;
};

/**
 * Opens the mapping creation modal for a specific product
 */
const openMappingModal = (productId, productName, currentSku = '') => {
    getElement('mapping-product-id').value = productId;
    getElement('mapping-internal-name').value = productName;
    getElement('mapping-client-name').value = productName;
    getElement('mapping-client-sku').value = currentSku;
    
    if (window.Modal) window.Modal.open('reception-product-mapping-modal');
};

/**
 * Initializes the stock selector logic
 */
const initStockSelector = () => {
    const btn = getElement('page-reception-list-create-form-products-add-stock-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (window.Modal) window.Modal.open('reception-stock-selector-modal');
        // Fetch quants
        try {
            const response = await rpc('/account/reception/stock_quants', {});
            if (response.status === 'success') {
                renderStockKanban(response.quants);
            }
        } catch (e) {
            console.error('Error fetching stock:', e);
        }
    });

    const searchInput = getElement('reception-stock-search');
    if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const search = searchInput.value;
                const response = await rpc('/account/reception/stock_quants', { search });
                if (response.status === 'success') {
                    renderStockKanban(response.quants);
                }
            }, 300);
        });
    }
};

/**
 * Initializes the mapping creation logic
 */
const initMappingModal = () => {
    const saveBtn = getElement('reception-product-mapping-save-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        const productId = getElement('mapping-product-id').value;
        const name = getElement('mapping-client-name').value.trim();
        const account_sku = getElement('mapping-client-sku').value.trim();

        if (!name) {
            systemShowNotification('Product Name is required.', { type: 'error' });
            return;
        }

        try {
            if (typeof showLoadingScreen === 'function') showLoadingScreen();
            const response = await rpc('/account/reception/product/map/quick_create', {
                product_id: productId,
                name: name,
                account_sku: account_sku
            });

            if (response.status === 'success') {
                // Add the newly created mapping to the lines
                addMappingToLines(response.id, response.name);
                
                if (window.Modal) {
                    window.Modal.close('reception-product-mapping-modal');
                    window.Modal.close('reception-stock-selector-modal'); // Close parent if any
                }
            } else {
                systemShowNotification(response.message || 'Error creating mapping.', { type: 'error' });
            }
        } catch (e) {
            console.error('Error creating mapping:', e);
        } finally {
            if (typeof hideLoadingScreen === 'function') hideLoadingScreen();
        }
    });
};

/**
 * Overwrites the Catalog button behavior to allow mapping creation
 */
const initCatalogLink = () => {
    const btn = getElement('page-reception-list-create-form-products-add-catalog-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        // Open the generic catalog modal
        // We need to listen for product selection events from the catalog
        if (window.Modal) window.Modal.open('page-reception-product-catalog-select');
    });

    // Listen for custom event from catalog cards (if we can inject it)
    // Or we poll for added elements. Usually catalogs trigger a global event.
    // Assuming for now the catalog might need more integration, 
    // but the user wants it to prompt for mapping.
};

/**
 * Renders the Kanban cards for RMA products
 */
const renderRMAProductKanban = (productMaps) => {
    const container = getElement('reception-product-map-kanban-container');
    if (!container) return;

    if (!productMaps || productMaps.length === 0) {
        container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500">No RMA products found for this account.</div>';
        return;
    }

    container.innerHTML = productMaps.map(pm => `
        <div class="rma-product-card bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 p-4 cursor-pointer transition-all duration-200 group flex flex-col items-center text-center"
             data-product-id="${pm.id}" data-product-name="${pm.name}">
            <div class="w-24 h-24 mb-3 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                <img src="${pm.image_url}" alt="${pm.name}" class="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"/>
            </div>
            <div class="flex-1">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">${pm.name}</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">${pm.account_sku || 'No SKU'}</p>
                <div class="px-2 py-1 bg-theme-light text-theme text-[10px] font-bold rounded uppercase tracking-wider inline-block">Select</div>
            </div>
        </div>
    `).join('');

    // Add click events to cards
    container.querySelectorAll('.rma-product-card').forEach(card => {
        card.addEventListener('click', () => {
            const pmId = card.dataset.productId;
            const pmName = card.dataset.productName;
            
            if (addMappingToLines(pmId, pmName)) {
                if (window.Modal) window.Modal.close('reception-product-map-selector-modal');
            }
        });
    });
};

/**
 * Initializes the RMA product Kanban selector
 */
const initRMAProductSelector = () => {
    const btn = getElement('page-reception-list-create-form-products-add-rma-product-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (window.Modal) window.Modal.open('reception-product-map-selector-modal');
        
        // Fetch products
        try {
            const response = await rpc('/account/reception/product_maps', {});
            if (response.status === 'success') {
                renderRMAProductKanban(response.product_maps);
            }
        } catch (e) {
            console.error('Error fetching RMA products:', e);
        }
    });

    // Search logic
    const searchInput = getElement('reception-product-map-search');
    if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const search = searchInput.value;
                const response = await rpc('/account/reception/product_maps', { search });
                if (response.status === 'success') {
                    renderRMAProductKanban(response.product_maps);
                }
            }, 300);
        });
    }
};

/**
 * Initializes the Catalog selector (product.product) for RMA mapping
 */
const initCatalogSelector = () => {
    const pageName = 'reception'; // Assuming fixed or get from DOM
    const mainContainerId = `page-${pageName}-main-container`;
    const catalogContainerId = `page-${pageName}-product-catalog-select`;
    const catalogBtn = getElement(`page-${pageName}-list-create-form-products-add-catalog-btn`);
    const closeBtn = getElement(`${catalogContainerId}-close-btn`);

    if (!catalogBtn) return;

    const loadPage = async (page = 1, search = '') => {
        const grid = getElement(`${catalogContainerId}-products-grid`);
        const pagination = getElement(`${catalogContainerId}-pagination`);
        if (grid) grid.innerHTML = '<div class="col-span-full py-10 text-center"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>';

        try {
            const response = await rpc('/account/reception/product-catalog', { page, search });
            if (response.status === 'success') {
                if (grid) grid.innerHTML = response.products_html;
                if (pagination) pagination.innerHTML = response.pagination_html;
            }
        } catch (e) {
            console.error('Error loading catalog:', e);
        }
    };

    catalogBtn.addEventListener('click', () => {
        const main = getElement(mainContainerId);
        const catalog = getElement(catalogContainerId);
        if (main && catalog) {
            main.classList.add('hidden');
            catalog.classList.remove('hidden');
            loadPage(1);
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const main = getElement(mainContainerId);
            const catalog = getElement(catalogContainerId);
            if (main && catalog) {
                catalog.classList.add('hidden');
                main.classList.remove('hidden');
            }
        });
    }

    // Handle search
    const searchInput = getElement(`${catalogContainerId}-search`);
    if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                loadPage(1, searchInput.value);
            }, 300);
        });
    }

    // Delegation for pagination
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.product-catalog-page-btn');
        if (!btn || !btn.closest(`#${catalogContainerId}`)) return;
        loadPage(btn.dataset.page, searchInput?.value || '');
    });

    // Delegation for "Add" button -> Open Mapping Modal
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.product-add-btn');
        if (!addBtn || !addBtn.closest(`#${catalogContainerId}`)) return;
        
        const card = addBtn.closest('.product-card');
        if (!card) return;
        
        const productId = card.dataset.productId;
        const productName = card.querySelector('h3')?.textContent.trim();
        const productSkuInput = card.querySelector('.text-gray-500');
        const productSku = productSkuInput ? productSkuInput.textContent.trim().replace(/[\[\]]/g, '') : '';
        
        openMappingModal(productId, productName, productSku);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initReceptionCreateModal();
    initAddAddressModal();
    initRMAProductSelector();
    initStockSelector();
    initMappingModal();
    initCatalogSelector();
});


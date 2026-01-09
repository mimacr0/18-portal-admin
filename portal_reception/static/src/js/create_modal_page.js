import { rpc } from "@web/core/network/rpc";
import { reloadReceptionListPage } from "./frontend/components/reception_list.js";

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

// Add to the top of the file
let currentCatalogPage = 1;
let catalogSearchQuery = '';

// Create a debounced search function outside of any other function
const debouncedSearch = debounce(function() {
    catalogSearchQuery = this.value;
    currentCatalogPage = 1; // Reset to first page when searching
    loadProductCatalog();
}, 300);

// Add a shared product registry to track products across views
const selectedProductsRegistry = new Map();

const updateReceptionsProductsField = () => {
    const productsContainer = document.getElementById('page-reception-list-create-form-products-line-items-container');
    const productsField = document.getElementById('page-reception-list-create-form-products-list');

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
            const selectData = $(select).select2('data')[0];
            if (packageInput && selectData && qtyInput) {
                products.push({
                    package: packageInput.value,
                    product_id: selectData.id,
                    quantity: qtyInput.value
                });
            }
        } catch (e) {
            console.error('Error getting product data:', e);
        }
    }

    productsField.value = JSON.stringify(products);
    console.log('Updated products field with:', products.length, 'products');
}

/**
 * Inicializa el formulario de creación de recepciones
 *
 * Esta función configura:
 * 1. Eventos de apertura del modal
 * 2. Cálculo automático de volumen
 * 3. Validación y envío del formulario
 */
export const initReceptionCreateForm = () => {
    console.log("Initializing reception create form");

    // Define pageName at the beginning of the function so it's available in all callbacks
    const pageName = "reception";

    // Obtener elementos del DOM usando el nombre de la página
    const createButton = document.getElementById('launch-create-reception-form-button');
    const createModal = document.getElementById('page-reception-list-create-modal');
    const submitButton = document.getElementById('page-reception-list-create-product-form-submit');
    const editHiddenIdInput = document.getElementById('page-reception-list-create-form-reception-id');
    const catalogButton = document.getElementById('page-reception-list-create-form-products-add-catalog-btn');
    const scheduledDateInput = document.getElementById('page-reception-list-create-form-scheduled-date');
    const pageMainContainer = document.querySelector('#page-reception-main-container');
    const productCatalogSelectContainer = document.querySelector('#page-reception-product-catalog-select');
    const carrierSelectInput = document.getElementById('page-reception-list-create-form-carrier-id');
    const packageTypeSelectInput = document.getElementById('page-reception-list-create-form-package-type-id');

    if (!scheduledDateInput) return;

    // Function to reset the form when modal is closed
    const resetReceptionForm = () => {
        console.log("Resetting reception form");

        // Reset all form inputs
        const form = document.getElementById(`page-${pageName}-list-create-form`);
        if (form) {
            form.reset();
        }

        // Clear Select2 fields
        if ($(packageTypeSelectInput).data('select2')) {
            $(packageTypeSelectInput).val(null).trigger('change');
        }

        if ($(carrierSelectInput).data('select2')) {
            $(carrierSelectInput).val(null).trigger('change');
        }

        // Reset flatpickr date input
        if (scheduledDateInput._flatpickr) {
            scheduledDateInput._flatpickr.clear();
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

        // Ensure edit mode is cleared
        if (editHiddenIdInput) editHiddenIdInput.value = '';

        // Reset modal title and submit button text to default (Create)
        const modal = document.getElementById('page-reception-list-create-modal');
        if (modal) {
            const headerTitle = modal.querySelector('.modal-header h3');
            if (headerTitle) headerTitle.textContent = 'Reception Create';
        }
        const submitBtn = document.getElementById('page-reception-list-create-product-form-submit');
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Save';
    };

    // Add event listener for modal closing
    document.addEventListener('modalClosed', (e) => {
        if (e.detail.modalId !== 'page-reception-list-create-modal') return;
        resetReceptionForm();
    });

    flatpickr(scheduledDateInput, {
        minDate: 'today',
        enableTime: true,
        dateFormat: 'd-m-Y H:i'
    });

    $(packageTypeSelectInput).select2({
        placeholder: 'Select Package Type',
        dropdownParent: $(createModal),
        ajax: {
            transport: function(params, success, failure) {
                rpc('/account/reception/package-type-search', {
                    term: params.data.term
                })
                .then(function(result) {
                    success({ results: result.items });
                })
                .catch(function(error) {
                    console.error('Error fetching package types:', error);
                    failure('Failed to load package types');
                });
            },
            processResults: function(data) {
                return data;
            },
            delay: 250
        },
        templateResult: function(data) {
            return formatPackageType(data);
        }
    });

    // Update measures and weight when package type changes
    $(packageTypeSelectInput).on('select2:select', function (e) {
        const data = e.params.data;
        if (data) {
            // Update width field
            const widthField = document.getElementById('page-reception-list-create-form-measures-width');
            if (widthField && data.width) {
                widthField.value = data.width;
            }

            // Update height field
            const heightField = document.getElementById('page-reception-list-create-form-measures-height');
            if (heightField && data.height) {
                heightField.value = data.height;
            }

            // Update length field
            const lengthField = document.getElementById('page-reception-list-create-form-measures-length');
            if (lengthField && data.packaging_length) {
                lengthField.value = data.packaging_length;
            }

            // Update package weight field (weight of the empty package)
            const packageWeightField = document.getElementById('page-reception-list-create-form-package-weight');
            if (packageWeightField && data.base_weight) {
                packageWeightField.value = data.base_weight;
            }
        }
    });

    $(carrierSelectInput).select2({
        placeholder: 'Select Carrier',
        dropdownParent: $(createModal),
        ajax: {
            transport: function(params, success, failure) {
                rpc('/account/reception/carrier-search', {
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

    catalogButton.addEventListener('click', async () => {
        const paginationContainerMain = document.getElementById('page-reception-list-pagination-container-main');
        paginationContainerMain.classList.add('hidden'); // Hide the main pagination

        productCatalogSelectContainer.classList.remove('hidden');
        pageMainContainer.classList.add('hidden');
        createModal.dataset.open = 'false';

        // Reset pagination and load first page
        currentCatalogPage = 1;
        catalogSearchQuery = '';

        // Reset search input value - Now pageName is defined
        const searchInput = document.getElementById(`page-${pageName}-product-catalog-select-search`);
        if (searchInput) searchInput.value = '';

        // Sync registry with form products before opening catalog
        syncRegistryFromForm();

        loadProductCatalog();

        // Rebuild selected products list from registry
        rebuildSelectedProductsList();

        // Setup search input event listener right after opening the catalog
        setupSearchListener();
    });

    createButton.addEventListener('click', () => {
        Modal.open('page-reception-list-create-modal');
    });

    // Manejar envío del formulario
    submitButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const { formData } = sysCollectFormData('#page-reception-list-create-form');

        // Detect edit mode by presence of reception_id
        const isEdit = !!(editHiddenIdInput && editHiddenIdInput.value);
        let resp;
        if (isEdit) {
            // Only send editable header fields to update endpoint; skip full-form validation
            const payload = {
                reception_id: editHiddenIdInput.value,
                scheduled_date: formData.get('scheduled_date') || '',
                carrier_id: formData.get('carrier_id') || null,
                carrier_name: formData.get('carrier_name') || '',
                tracking_number: formData.get('tracking_number') || '',
                tracking_number_optional: formData.get('tracking_number_optional') || '',
            };
            resp = await rpc('/account/reception/update', payload);
        } else {
            const res = sysFormValidate('#page-reception-list-create-form');
            if(!res) return;
            resp = await rpc('/account/reception/create', formData);
        }

        if(resp?.errors) sysShowServerErrors('#page-reception-list-create-form', resp.errors);

        if(resp?.message) systemShowNotification(resp.message, { type: resp?.status || 'error' })

        if(resp?.status !== 'success') return;

        Modal.close('page-reception-list-create-modal');

        reloadReceptionListPage();
    });

};

// Sync selectedProductsRegistry from the form's current product lines
function syncRegistryFromForm() {
    const pageName = "reception";
    const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
    
    if (!productsContainer) return;

    const productLines = productsContainer.querySelectorAll('.line-item');
    
    // Clear registry and rebuild from form
    selectedProductsRegistry.clear();
    
    for (const line of productLines) {
        const productId = line.dataset.productId;
        const packageInput = line.querySelector('.product-package');
        const select = line.querySelector('.product-select');
        const qtyInput = line.querySelector('.product-qty');

        if (!productId || !select) continue;

        try {
            const selectData = $(select).select2('data')[0];
            if (selectData) {
                selectedProductsRegistry.set(productId, {
                    id: productId,
                    name: selectData.text || '',
                    sku: selectData.default_code || '',
                    quantity: parseInt(qtyInput?.value) || 1,
                    package: parseInt(packageInput?.value) || 1,
                    price: '',
                    stockInfo: '',
                    inStock: true,
                    imgSrc: '',
                    attributeTags: selectData.attributes ? selectData.attributes.map(attr => attr.value || attr.display_name) : []
                });
            }
        } catch (e) {
            console.error('Error syncing product to registry:', e);
        }
    }
    
    console.log('Synced registry from form:', selectedProductsRegistry.size, 'products');
}

// Rebuild the selected products list in the catalog from registry
function rebuildSelectedProductsList() {
    const pageName = "reception";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById(`page-${pageName}-product-catalog-selected-count`);

    if (!selectedProductsList) return;

    // Clear current list
    selectedProductsList.innerHTML = '';

    // Rebuild from registry
    if (selectedProductsRegistry.size > 0) {
        selectedProductsList.classList.remove('hidden');
        if (noProductsMessage) noProductsMessage.classList.add('hidden');

        selectedProductsRegistry.forEach((product, productId) => {
            // Build attribute tags HTML
            const attributeTagsHtml = product.attributeTags && product.attributeTags.length > 0
                ? `<div class="flex flex-wrap gap-0.5 mt-0.5">
                    ${product.attributeTags.map(tag => `<span class="bg-gray-100 text-gray-700 text-2xs px-1 py-0 rounded-sm">${tag}</span>`).join('')}
                   </div>`
                : '';

            const productItem = document.createElement('div');
            productItem.className = 'bg-white dark:bg-gray-700 rounded p-2 flex flex-col justify-between h-full';
            productItem.dataset.productId = productId;
            productItem.dataset.productName = product.name;
            productItem.dataset.productSku = product.sku || '';
            productItem.dataset.productPrice = product.price || '';

            productItem.innerHTML = `
                <div class="flex items-center">
                    <div class="flex-grow pr-1 min-w-0">
                        <p class="text-xs font-medium text-gray-800 dark:text-white truncate mb-0">${product.name}</p>
                        <div class="flex items-center">
                            <span class="text-2xs text-gray-500 dark:text-gray-400 truncate">${product.sku || ''}</span>
                            ${attributeTagsHtml}
                        </div>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <div class="inline-flex border border-gray-300 dark:border-gray-600 rounded-sm overflow-hidden h-5">
                            <button class="px-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 product-decrease">
                                <i class="fas fa-minus text-2xs"></i>
                            </button>
                            <input type="text" value="${product.quantity}" class="w-6 px-0 py-0 text-center border-none focus:ring-0 product-quantity bg-white dark:bg-gray-800 text-2xs"/>
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

            // Add event listeners for this product item
            const removeBtn = productItem.querySelector('.product-remove');
            const decreaseBtn = productItem.querySelector('.product-decrease');
            const increaseBtn = productItem.querySelector('.product-increase');
            const qtyInput = productItem.querySelector('.product-quantity');

            removeBtn.addEventListener('click', () => {
                selectedProductsList.removeChild(productItem);
                selectedProductsRegistry.delete(productId);

                // Update the product card in catalog
                const productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
                if (productCard) {
                    const initialAddDiv = productCard.querySelector('.product-initial-add');
                    const quantityControls = productCard.querySelector('.product-quantity-controls');
                    const addedQtyDisplay = productCard.querySelector('.product-added-qty');
                    const qtyInputCard = productCard.querySelector('.product-quantity');

                    if (initialAddDiv) initialAddDiv.classList.remove('hidden');
                    if (quantityControls) quantityControls.classList.add('hidden');
                    if (addedQtyDisplay) addedQtyDisplay.classList.add('hidden');
                    if (qtyInputCard) qtyInputCard.value = 1;
                }

                if (selectedCount) selectedCount.textContent = selectedProductsRegistry.size;

                if (selectedProductsList.children.length === 0) {
                    selectedProductsList.classList.add('hidden');
                    if (noProductsMessage) noProductsMessage.classList.remove('hidden');
                }
            });

            decreaseBtn.addEventListener('click', () => {
                let qty = parseInt(qtyInput.value);
                if (qty > 1) {
                    qty -= 1;
                    qtyInput.value = qty;
                    product.quantity = qty;
                    updateCatalogCardQuantity(productId, qty);
                }
            });

            increaseBtn.addEventListener('click', () => {
                let qty = parseInt(qtyInput.value);
                qty += 1;
                qtyInput.value = qty;
                product.quantity = qty;
                updateCatalogCardQuantity(productId, qty);
            });

            qtyInput.addEventListener('change', () => {
                let qty = parseInt(qtyInput.value);
                if (isNaN(qty) || qty < 1) {
                    qty = 1;
                    qtyInput.value = qty;
                }
                product.quantity = qty;
                updateCatalogCardQuantity(productId, qty);
            });
        });

        if (selectedCount) selectedCount.textContent = selectedProductsRegistry.size;
    } else {
        selectedProductsList.classList.add('hidden');
        if (noProductsMessage) noProductsMessage.classList.remove('hidden');
        if (selectedCount) selectedCount.textContent = '0';
    }

    console.log('Rebuilt selected products list:', selectedProductsRegistry.size, 'products');
}

// Create a separate function to set up the search functionality
function setupSearchListener() {
    const pageName = "reception";
    const searchInput = document.getElementById(`page-${pageName}-product-catalog-select-search`);

    if (searchInput) {
        // Remove any existing listeners first to prevent duplicates
        searchInput.removeEventListener('input', debouncedSearch);

        // Add the new listener
        searchInput.addEventListener('input', debouncedSearch);
    } else {
        console.error(`Search input not found with ID: page-${pageName}-product-catalog-select-search`);
    }
}

// Make sure loadProductCatalog logs any errors
async function loadProductCatalog() {
    const pageName = "reception";
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

        const result = await rpc('/account/reception/product-catalog', {
            page: currentCatalogPage,
            search: catalogSearchQuery
        });

        console.log("Product catalog response:", result);

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

// Add function to set up pagination events
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

// Update setupProductCardEvents function
function setupProductCardEvents() {
    const pageName = "reception";
    const productGrid = document.getElementById(`page-${pageName}-product-catalog-select-products-grid`);
    if (!productGrid) return;
    
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById(`page-${pageName}-product-catalog-selected-count`);

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

// Update the addProductToSelection function to add to registry and update UI
function addProductToSelection(id, name, sku, qty = 1, price = '', stockInfo = '', inStock = true, imgSrc = '', attributeTags = []) {
    const pageName = "reception";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById(`page-${pageName}-product-catalog-selected-count`);

    if (!selectedProductsList) {
        console.error('Selected products list not found');
        return;
    }

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
            attributeTags
        });
    }

    // Update count
    if (selectedCount) {
        selectedCount.textContent = selectedProductsRegistry.size;
    }

    // Update quantity badge in the catalog view
    const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
    if (productCard) {
        // Update the quantity display
        const addedQtyDisplay = productCard.querySelector('.product-added-qty');
        const addedQtyValue = productCard.querySelector('.product-added-qty-value');
        if (addedQtyDisplay && addedQtyValue) {
            addedQtyValue.textContent = newQty;
            addedQtyDisplay.classList.remove('hidden');
        }
        
        // Update card UI
        const initialAddDiv = productCard.querySelector('.product-initial-add');
        const quantityControls = productCard.querySelector('.product-quantity-controls');
        const quantityInput = productCard.querySelector('.product-quantity');
        
        if (initialAddDiv) initialAddDiv.classList.add('hidden');
        if (quantityControls) quantityControls.classList.remove('hidden');
        if (quantityInput) quantityInput.value = newQty;
    }

    // Check if product already exists in the selected products list
    const existingProduct = selectedProductsList.querySelector(`[data-product-id="${id}"]`);
    if (existingProduct) {
        // Update quantity instead of adding new item
        const qtyInput = existingProduct.querySelector('.product-quantity');
        if (qtyInput) {
            qtyInput.value = newQty;
        }
        return;
    }
    
    // Show the list and hide "no products" message
    selectedProductsList.classList.remove('hidden');
    if (noProductsMessage) noProductsMessage.classList.add('hidden');

    // Create product item
    const productItem = document.createElement('div');
    productItem.className = 'bg-white dark:bg-gray-700 rounded p-2 flex flex-col justify-between h-full';
    productItem.dataset.productId = id;
    productItem.dataset.productName = name;
    productItem.dataset.productSku = sku;
    productItem.dataset.productPrice = price;

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
                    <input type="text" value="${qty}" class="w-6 px-0 py-0 text-center border-none focus:ring-0 product-quantity bg-white dark:bg-gray-800 text-2xs"/>
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
        // Remove from DOM
        selectedProductsList.removeChild(productItem);

        // Remove from registry
        selectedProductsRegistry.delete(id);

        // Update the product card in catalog - reset to initial state
        const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
        if (productCard) {
            const initialAddDiv = productCard.querySelector('.product-initial-add');
            const quantityControls = productCard.querySelector('.product-quantity-controls');
            const addedQtyDisplay = productCard.querySelector('.product-added-qty');
            const qtyInputCard = productCard.querySelector('.product-quantity');

            // Show initial add, hide quantity controls
            if (initialAddDiv) initialAddDiv.classList.remove('hidden');
            if (quantityControls) quantityControls.classList.add('hidden');
            if (addedQtyDisplay) addedQtyDisplay.classList.add('hidden');
            if (qtyInputCard) qtyInputCard.value = 1;
        }

        // Update count
        const countElement = document.getElementById(`page-${pageName}-product-catalog-selected-count`);
        if (countElement) {
            countElement.textContent = selectedProductsRegistry.size;
        }

        if (selectedProductsList.children.length === 0) {
            const noProductsMsg = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
            selectedProductsList.classList.add('hidden');
            if (noProductsMsg) noProductsMsg.classList.remove('hidden');
        }
    });

    decreaseBtn.addEventListener('click', () => {
        let qty = parseInt(qtyInput.value);
        if (qty > 1) {
            qty -= 1;
            qtyInput.value = qty;

            // Update registry quantity
            const product = selectedProductsRegistry.get(id);
            if (product) {
                product.quantity = qty;
            }

            // Sync with catalog card
            updateCatalogCardQuantity(id, qty);
        }
    });

    increaseBtn.addEventListener('click', () => {
        let qty = parseInt(qtyInput.value);
        qty += 1;
        qtyInput.value = qty;

        // Update registry quantity
        const product = selectedProductsRegistry.get(id);
        if (product) {
            product.quantity = qty;
        }

        // Sync with catalog card
        updateCatalogCardQuantity(id, qty);
    });

    // Update registry when manually changing the quantity input
    qtyInput.addEventListener('change', () => {
        let qty = parseInt(qtyInput.value);
        if (isNaN(qty) || qty < 1) {
            qty = 1;
            qtyInput.value = qty;
        }

        // Update registry quantity
        const product = selectedProductsRegistry.get(id);
        if (product) {
            product.quantity = qty;
        }

        // Sync with catalog card
        updateCatalogCardQuantity(id, qty);
    });
}

// Update catalog card quantity display
function updateCatalogCardQuantity(productId, quantity) {
    const productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    if (productCard) {
        const addedQtyValue = productCard.querySelector('.product-added-qty-value');
        const qtyInput = productCard.querySelector('.product-quantity');
        if (addedQtyValue) addedQtyValue.textContent = quantity;
        if (qtyInput) qtyInput.value = quantity;
    }
}

// Update the search input event listener
document.addEventListener('DOMContentLoaded', () => {
    const pageName = "reception";
    const productSearchInput = document.getElementById('product-search');
    const clearSelectionBtn = document.getElementById(`page-${pageName}-product-catalog-select-clear-selection-btn`);
    const closeBtn = document.getElementById(`page-${pageName}-product-catalog-select-close-btn`);

    if (productSearchInput) {
        productSearchInput.addEventListener('input', debouncedSearch);
    }

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', () => {
            const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
            const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
            const selectedCount = document.getElementById(`page-${pageName}-product-catalog-selected-count`);

            // Reset all product card displays
            const productGrid = document.getElementById(`page-${pageName}-product-catalog-select-products-grid`);
            if (productGrid) {
                productGrid.querySelectorAll('.product-card').forEach(card => {
                    const productId = card.dataset.productId;
                    const initialAddDiv = card.querySelector('.product-initial-add');
                    const quantityControls = card.querySelector('.product-quantity-controls');

                    // Reset UI - show add button and hide quantity controls
                    if (initialAddDiv) initialAddDiv.classList.remove('hidden');
                    if (quantityControls) quantityControls.classList.add('hidden');
                });
            }

            // Clear the registry
            selectedProductsRegistry.clear();

            // Clear the selected products list
            selectedProductsList.innerHTML = '';
            selectedProductsList.classList.add('hidden');
            noProductsMessage.classList.remove('hidden');
            if (selectedCount) selectedCount.textContent = "0";
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeProductCatalog);
    }
});

// Modify closeProductCatalog to use Select2 for added products
function closeProductCatalog() {
    const pageName = "reception";
    const productCatalogSelectContainer = document.querySelector(`#page-${pageName}-product-catalog-select`);
    const pageMainContainer = document.querySelector('#page-reception-main-container');
    const modal = document.getElementById(`page-${pageName}-list-create-modal`);
    const paginationContainerMain = document.getElementById('page-reception-list-pagination-container-main');

    if (paginationContainerMain) {
        paginationContainerMain.classList.remove('hidden'); // Show the main pagination again
    }

    // Reset product cards to initial state - important if we open the catalog again
    const productGrid = document.getElementById('page-reception-product-catalog-select-products-grid');
    if (productGrid) productGrid.querySelectorAll('.product-card').forEach(card => {
        const productId = card.dataset.productId;
        // Only update UI for products still in registry
        if (selectedProductsRegistry.has(productId)) {
            const initialAddDiv = card.querySelector('.product-initial-add');
            const quantityControls = card.querySelector('.product-quantity-controls');
            const quantityInput = card.querySelector('.product-quantity');

            // Show quantity controls with current quantity
            if (initialAddDiv) initialAddDiv.classList.add('hidden');
            if (quantityControls) {
                quantityControls.classList.remove('hidden');
                if (quantityInput) {
                    quantityInput.value = selectedProductsRegistry.get(productId).quantity;
                }
            }
        } else {
            // Reset products not in registry
            const initialAddDiv = card.querySelector('.product-initial-add');
            const quantityControls = card.querySelector('.product-quantity-controls');

            if (initialAddDiv) initialAddDiv.classList.remove('hidden');
            if (quantityControls) quantityControls.classList.add('hidden');
        }
    });

    // Get selected products from registry
    const selectedProducts = Array.from(selectedProductsRegistry.values());
    console.log('Transferring products to form:', selectedProducts);

    // Hide catalog view
    productCatalogSelectContainer.classList.add('hidden');
    pageMainContainer.classList.remove('hidden');

    // Transfer selected products to form
    if (selectedProducts.length > 0) {
        const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
        if (productsContainer) {
            // Clear existing products
            productsContainer.innerHTML = '';

            // Add selected products
            selectedProducts.forEach(product => {
                const lineId = `product-line-${product.id}`;
                const newRow = document.createElement('div');
                newRow.className = 'line-item flex items-center gap-2 mb-2';
                newRow.dataset.lineId = lineId;
                newRow.dataset.productId = product.id;

                newRow.innerHTML = `
                    <div class="w-24">
                        <input type="number" value="${product.package || '1'}" min="1"
                            class="product-package form-input-sm w-full text-center rounded-md border border-gray-300
                            focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
                    </div>
                    <div class="flex-grow">
                        <select class="product-select form-select-sm w-full rounded-md border border-gray-300
                            focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
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

                productsContainer.appendChild(newRow);

                // Initialize Select2 for this row
                const packageInput = newRow.querySelector('.product-package');
                const select = newRow.querySelector('.product-select');
                const qtyInput = newRow.querySelector('.product-qty');

                // Add the product as a pre-selected option with attributes
                const option = new Option(product.name, product.id, true, true);
                $(select).append(option).trigger('change');

                // Configure Select2
                $(select).select2({
                    placeholder: 'Search product...',
                    dropdownParent: $(modal),
                    data: [{
                        id: product.id,
                        text: product.name,
                        default_code: product.sku,
                        // Convert attribute tags to format expected by formatProductSelection
                        attributes: product.attributeTags ? product.attributeTags.map(tag => ({value: tag})) : []
                    }],
                    ajax: {
                        transport: function(params, success, failure) {
                            rpc('/account/reception/product-search', {
                                term: params.data.term
                            })
                            .then(function(result) {
                                success({ results: result.items });
                            })
                            .catch(function(error) {
                                console.error('Error fetching products:', error);
                                failure('Failed to load products');
                            });
                        },
                        processResults: function(data) {
                            return data;
                        },
                        delay: 250
                    },
                    templateResult: formatProduct,
                    templateSelection: formatProductSelection
                });

                // Handle product selection change
                $(select).on('change', updateReceptionsProductsField);

                // Update hidden name field and registry when quantity changes
                qtyInput.addEventListener('change', updateReceptionsProductsField);
                packageInput.addEventListener('change', updateReceptionsProductsField);

                // Set up remove button
                const removeBtn = newRow.querySelector('.product-remove-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => {
                        productsContainer.removeChild(newRow);
                        // Also remove from registry
                        selectedProductsRegistry.delete(product.id);
                        // Update the hidden products field
                        updateReceptionsProductsField();
                    });
                }
            });

            // Update the hidden products field
            updateReceptionsProductsField();
        }
    }

    // Reopen the create modal
    Modal.open('page-reception-list-create-modal');
}

// Update the initManualProductAdd function to sync with registry
function initManualProductAdd() {
    const pageName = "reception";
    const addBtn = document.getElementById(`page-${pageName}-list-create-form-products-add-line-btn`);
    const container = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
    const modal = document.getElementById(`page-${pageName}-list-create-modal`);

    let lineCounter = 0;

    if (addBtn && container) {
        addBtn.addEventListener('click', () => {
            const lineId = `manual-product-line-${lineCounter}`;
            const newRow = document.createElement('div');
            newRow.className = 'line-item flex items-center gap-2 mb-2';
            newRow.dataset.lineId = lineId;

            newRow.innerHTML = `
                <div class="w-24">
                    <input type="number" value="1" min="1"
                        class="product-package form-input-sm w-full text-center rounded-md border border-gray-300
                        focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
                </div>
                <div class="flex-grow">
                    <select class="product-select form-select-sm w-full rounded-md border border-gray-300
                        focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
                    </select>
                </div>
                <div class="w-24">
                    <input type="number" value="1" min="1"
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

            // Initialize Select2 for this row
            const packageInput = newRow.querySelector('.product-package');
            const select = newRow.querySelector('.product-select');
            const qtyInput = newRow.querySelector('.product-qty');

            $(select).select2({
                placeholder: 'Search product...',
                dropdownParent: $(modal),
                ajax: {
                    transport: function(params, success, failure) {
                        rpc('/account/reception/product-search', {
                            term: params.data.term
                        })
                        .then(function(result) {
                            success({ results: result.items });
                        })
                        .catch(function(error) {
                            console.error('Error fetching products:', error);
                            failure('Failed to load products');
                        });
                    },
                    processResults: function(data) {
                        return data;
                    },
                    delay: 250
                },
                templateResult: formatProduct,
                templateSelection: formatProductSelection
            });

            // Update hidden name field and transfer attributes data when selection changes
            $(select).on('change', updateReceptionsProductsField);

            // Update registry when quantity changes
            qtyInput.addEventListener('change', updateReceptionsProductsField);
            packageInput.addEventListener('change', updateReceptionsProductsField);

            lineCounter++;

            // Set up remove button
            const removeBtn = newRow.querySelector('.product-remove-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    container.removeChild(newRow);
                    updateReceptionsProductsField();
                });
            }
        });
    }
}

// Format function for product dropdown items - with attributes support
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

// Format function for selected product with attributes
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

// Update the document ready function
document.addEventListener('DOMContentLoaded', () => {
    initReceptionCreateForm();
    initManualProductAdd();

    // Set up the close button for product catalog
    const closeBtn = document.getElementById('page-reception-product-catalog-select-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeProductCatalog);
    }
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

// Update quantity of a product in the selected products list
function updateSelectedProductQuantity(productId, quantity) {
    const pageName = "reception";
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

// Remove a product from the selection
function removeProductFromSelection(productId) {
    const pageName = "reception";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById(`page-${pageName}-product-catalog-selected-count`);

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

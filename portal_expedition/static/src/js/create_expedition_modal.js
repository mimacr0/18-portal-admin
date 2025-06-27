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
    const catalogButton = document.getElementById('page-expedition-list-create-form-products-add-catalog-btn');
    const pageMainContainer = document.querySelector('#page-expedition-main-container');
    const productCatalogSelectContainer = document.querySelector('#page-expedition-product-catalog-select');

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

    catalogButton.addEventListener('click', async () => {
        const paginationContainerMain = document.getElementById('page-expedition-list-pagination-container-main');
        if (paginationContainerMain) {
            paginationContainerMain.classList.add('hidden'); // Hide the main pagination
        }

        productCatalogSelectContainer.classList.remove('hidden');
        pageMainContainer.classList.add('hidden');
        createModal.dataset.open = 'false';

        // Reset pagination and load first page
        currentCatalogPage = 1;
        catalogSearchQuery = '';
        // Reset search input value - Now pageName is defined
        const searchInput = document.getElementById(`page-${pageName}-product-catalog-select-search`);
        if (searchInput) searchInput.value = '';

        loadProductCatalog();

        // Setup search input event listener right after opening the catalog
        setupSearchListener();
    });

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
            document.querySelectorAll('.product-card').forEach(card => {
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

            // Update counter
            const selectedCount = document.getElementById("selected-count");
            if (selectedCount) {
                selectedCount.textContent = '0';
            }
        });
    }

    createButton.addEventListener('click', () => {
        Modal.open('page-expedition-list-create-modal');
        initManualProductAdd();
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


// Create a separate function to set up the search functionality
function setupSearchListener() {
    const pageName = "expedition";
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
    const pageName = "expedition";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById("selected-count");

    if (!selectedProductsList || !noProductsMessage) {
        console.error("Required elements not found for product card events");
        return;
    }

    document.querySelectorAll('.product-card').forEach(card => {
        const productId = card.dataset.productId;
        const addBtn = card.querySelector('.product-add-btn');
        const addedQtyDisplay = card.querySelector('.product-added-qty');
        const addedQtyValue = card.querySelector('.product-added-qty-value');

        if (!productId || !addBtn) {
            console.error("Product card is missing required elements", card);
            return;
        }

        // Check if product is already in registry and update UI accordingly
        if (selectedProductsRegistry.has(productId)) {
            const product = selectedProductsRegistry.get(productId);
            if (addBtn) {
                addBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Added';
                addBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                addBtn.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-purple-700', 'hover:from-purple-700', 'hover:to-purple-800');
            }

            // Show the added quantity in the product card
            if (addedQtyDisplay && addedQtyValue) {
                addedQtyValue.textContent = product.quantity;
                addedQtyDisplay.classList.remove('hidden');
            }
        }

        addBtn.addEventListener('click', function() {
            try {
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
                const attributes = [];

                // Try to extract attributes from the product card
                try {
                    // First, look for visible attribute tags
                    card.querySelectorAll('.bg-gray-100.text-gray-800.text-xs').forEach(tag => {
                        const tagText = tag.textContent.trim();
                        attributeTags.push(tagText);
                    });

                    // Check for data attribute with attributes JSON
                    if (card.dataset.attributes) {
                        try {
                            const dataAttributes = JSON.parse(card.dataset.attributes);
                            if (Array.isArray(dataAttributes)) {
                                dataAttributes.forEach(attr => attributes.push(attr));
                            }
                        } catch (e) {
                            console.warn('Error parsing product attributes JSON:', e);
                        }
                    }

                    // If no attributes were found via JSON, try to extract them from the tags
                    if (attributes.length === 0 && attributeTags.length > 0) {
                        attributeTags.forEach(tag => {
                            if (tag.includes(':')) {
                                const [name, value] = tag.split(':').map(s => s.trim());
                                attributes.push({ name, value });
                            }
                        });
                    }
                } catch (e) {
                    console.warn('Error extracting product attributes:', e);
                }

                console.log('Product data:', {
                    id: productId,
                    name: productName,
                    sku: productSku,
                    attributes: attributes,
                    attributeTags: attributeTags
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
                    attributeTags,
                    attributes
                );

                // Update UI
                if (selectedProductsList.children.length > 0) {
                    selectedProductsList.classList.remove('hidden');
                    noProductsMessage.classList.add('hidden');
                }

                // Update count
                if (selectedCount) {
                    selectedCount.textContent = selectedProductsList.children.length;
                }

                // Update the button state to show it's been added
                addBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Added';
                addBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                addBtn.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-purple-700', 'hover:from-purple-700', 'hover:to-purple-800');

                // Show the quantity in the product card
                const addedQtyDisplay = card.querySelector('.product-added-qty');
                const addedQtyValue = card.querySelector('.product-added-qty-value');
                if (addedQtyDisplay && addedQtyValue) {
                    // Get the current quantity from registry if exists, otherwise use 1
                    const currentQty = selectedProductsRegistry.has(productId)
                        ? selectedProductsRegistry.get(productId).quantity
                        : 1;
                    addedQtyValue.textContent = currentQty;
                    addedQtyDisplay.classList.remove('hidden');
                }
            } catch (error) {
                console.error("Error adding product from catalog:", error);
            }
        });
    });
}

// Update the addProductToSelection function to add to registry and update UI
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
                    document.querySelectorAll('.product-card').forEach(card => {
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

// Modify closeProductCatalog to use Select2 for added products
function closeProductCatalog() {
    try {
        const pageName = "expedition";
        const pageMainContainer = document.querySelector('#page-expedition-main-container');
        const productCatalogSelectContainer = document.querySelector(`#page-${pageName}-product-catalog-select`);
        const createModal = document.getElementById('page-expedition-list-create-modal');
        const paginationContainerMain = document.getElementById('page-expedition-list-pagination-container-main');

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

        // Re-open the create modal
        Modal.open('page-expedition-list-create-modal');

        // Transfer selected products to form
        transferSelectedProductsToForm();
    } catch (error) {
        console.error("Error closing product catalog:", error);
    }
}

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
                ${attr.name || attr.attribute_id}: ${attr.value || attr.value_id}
            </span>`;
        });
        html += `</div>`;
    }

    html += `</div></div>`;

    return $(html);
}

// Format function for selected product with attributes
function formatProductSelection(product) {
    if (!product.id) return product.text;

    let text = product.text;
    if (product.default_code) {
        text += ` [${product.default_code}]`;
    }

    return text;
}

// Format function for product dropdown items - with attributes support
function formatProductWithAttributes(product) {
    return formatProduct(product);
}

// Format function for selected product with attributes
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

// Add isManualProductAddInitialized flag to track initialization state
let isManualProductAddInitialized = false;

export function initManualProductAdd() {
    const pageName = "expedition";
    const addLineBtn = document.getElementById(`page-${pageName}-list-create-form-products-add-line-btn`);
    const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
    const modal = document.getElementById(`page-${pageName}-list-create-modal`);

    if (!addLineBtn || !productsContainer || !modal) {
        console.error('Required elements not found for manual product add initialization');
        return;
    }

    // Prevent double initialization
    if (isManualProductAddInitialized) {
        console.log("Manual product add already initialized, skipping");
        return;
    }

    isManualProductAddInitialized = true;
    console.log("Initializing manual product add");

    // Set up event delegation for dynamically added elements
    productsContainer.addEventListener('click', function(e) {
        const target = e.target;

        // Handle remove button clicks
        if (target.closest('.remove-product-btn')) {
            const lineItem = target.closest('.line-item');
            if (lineItem && lineItem.parentNode === productsContainer) {
                productsContainer.removeChild(lineItem);
                updateExpeditionsProductsField();
            }
        }
    });

    // Handle add line button clicks
    addLineBtn.addEventListener('click', function() {
        try {
            // Create new line item
            const newLineItem = document.createElement('div');
            newLineItem.className = 'line-item mb-2 pb-2 border-b border-gray-200 dark:border-gray-700';

            const lineIndex = productsContainer.querySelectorAll('.line-item').length + 1;

            newLineItem.innerHTML = `
                <div class="flex flex-wrap items-end gap-2">
                    <div class="flex-1 min-w-[120px]">
                        <input type="text" value="${lineIndex}" placeholder="Package #" class="product-package form-input-sm w-full text-xs rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
                    </div>
                    <div class="flex-grow">
                        <select class="product-select form-input-sm w-full text-xs rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"></select>
                    </div>
                    <div class="flex-1 min-w-[100px]">
                        <input type="number" min="1" step="1" value="1" placeholder="Quantity" class="product-qty form-input-sm w-full text-xs rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
                    </div>
                    <div>
                        <button type="button" class="remove-product-btn px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            productsContainer.appendChild(newLineItem);

            // Initialize Select2 for the new product
            const select = newLineItem.querySelector('.product-select');
            $(select).select2({
                placeholder: 'Select Product',
                dropdownParent: $(modal),
                ajax: {
                    transport: function(params, success, failure) {
                        rpc('/account/expedition/product-search', {
                            term: params.data.term || ''
                        })
                        .then(function(result) {
                            success({ results: result.items || [] });
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

            // Handle quantity input changes
            const qtyInput = newLineItem.querySelector('.product-qty');
            qtyInput.addEventListener('change', function() {
                // Ensure minimum value of 1
                if (isNaN(this.value) || parseInt(this.value) < 1) {
                    this.value = 1;
                }
                updateExpeditionsProductsField();
            });

            // Update the hidden products field when product selection changes
            $(select).on('select2:select', function() {
                updateExpeditionsProductsField();
            });
        } catch (error) {
            console.error("Error adding product line:", error);
        }
    });
}
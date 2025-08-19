import { rpc } from "@web/core/network/rpc";
import { reloadRepairAlertListPage } from "./frontend/components/repair_alert_list.js";

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
        const lotSelect = line.querySelector('.lot-select');

        try {
            // Obtener el producto seleccionado
            const selectData = $(select).select2('data')[0];

            // Obtener los lotes seleccionados (si existen)
            const lotData = lotSelect ? $(lotSelect).select2('data') : [];
            const lotIds = lotData.map(l => l.id);

            if (selectData && qtyInput) {
                products.push({
                    product_id: selectData.id,
                    quantity: qtyInput.value,
                    lots: lotIds  // solo los IDs de los lotes
                });
            }
        } catch (e) {
            console.error('Error getting product data:', e);
        }
    }

    productsField.value = JSON.stringify(products);
}


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

    createButton.addEventListener('click', () => {
        Modal.open('page-repair-alert-list-create-modal');
    });

    // Manejar envío del formulario
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

// Create a separate function to set up the search functionality
function setupSearchListener() {
    const pageName = "repair-alert";
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
    const pageName = "repair-alert";
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

        const result = await rpc('/account/repair-alert/product-catalog', {
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
    const pageName = "repair-alert";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById("selected-count");

    document.querySelectorAll('.product-card').forEach(card => {
        const productId = card.dataset.productId;
        const addBtn = card.querySelector('.product-add-btn');
        const addedQtyDisplay = card.querySelector('.product-added-qty');
        const addedQtyValue = card.querySelector('.product-added-qty-value');

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
            });
        }
    });
}

// Update the addProductToSelection function to add to registry and update UI
function addProductToSelection(id, name, sku, qty = 1, price = '', stockInfo = '', inStock = true, imgSrc = '', attributeTags = []) {
    const pageName = "repair-alert";
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
            attributeTags
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

        // Update the product card in catalog - hide quantity badge and reset button
        const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
        if (productCard) {
            const addBtn = productCard.querySelector('.product-add-btn');
            const addedQtyDisplay = productCard.querySelector('.product-added-qty');

            if (addBtn) {
                addBtn.innerHTML = '<i class="fas fa-plus mr-1"></i> Add';
                addBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                addBtn.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-purple-700', 'hover:from-purple-700', 'hover:to-purple-800');
            }

            // Hide the quantity display
            if (addedQtyDisplay) {
                addedQtyDisplay.classList.add('hidden');
            }
        }

        const selectedCount = document.getElementById("selected-count");
        if (selectedCount) {
            selectedCount.textContent = selectedProductsList.children.length;
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
            qty -= 1;
            qtyInput.value = qty;

            // Update registry quantity
            const product = selectedProductsRegistry.get(id);
            if (product) {
                product.quantity = qty;
            }

            // Update the quantity badge in the catalog view
            const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
            if (productCard) {
                // Update the quantity display
                const addedQtyValue = productCard.querySelector('.product-added-qty-value');
                if (addedQtyValue) {
                    addedQtyValue.textContent = qty;
                }
            }
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

        // Update the quantity badge in the catalog view
        const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
        if (productCard) {
            // Update the quantity display
            const addedQtyValue = productCard.querySelector('.product-added-qty-value');
            if (addedQtyValue) {
                addedQtyValue.textContent = qty;
            }
        }
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

        // Update the quantity badge in the catalog view
        const productCard = document.querySelector(`.product-card[data-product-id="${id}"]`);
        if (productCard) {
            // Update the quantity display
            const addedQtyValue = productCard.querySelector('.product-added-qty-value');
            if (addedQtyValue) {
                addedQtyValue.textContent = qty;
            }
        }
    });
}

// Update the search input event listener
// document.addEventListener('DOMContentLoaded', () => {
//     const pageName = "repair-alert";
//     const productSearchInput = document.getElementById('product-search');
//     const clearSelectionBtn = document.getElementById(`page-${pageName}-product-catalog-select-clear-selection-btn`);
//     const closeBtn = document.getElementById(`page-${pageName}-product-catalog-select-close-btn`);

//     if (productSearchInput) {
//         productSearchInput.addEventListener('input', debouncedSearch);
//     }

//     if (clearSelectionBtn) {
//         clearSelectionBtn.addEventListener('click', () => {
//             const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
//             const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
//             const selectedCount = document.getElementById("selected-count");

//             // Reset all product card displays
//             document.querySelectorAll('.product-card').forEach(card => {
//                                 const productId = card.dataset.productId;
//                 const addBtn = card.querySelector('.product-add-btn');
//                 const addedQtyDisplay = card.querySelector('.product-added-qty');

//                 // Reset button display
//                 if (addBtn) {
//                     addBtn.innerHTML = '<i class="fas fa-plus mr-1"></i> Add';
//                     addBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
//                     addBtn.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-purple-700', 'hover:from-purple-700', 'hover:to-purple-800');
//                 }

//                 // Hide quantity badge
//                 if (addedQtyDisplay) addedQtyDisplay.classList.add('hidden');
//             });

//             // Clear the registry
//             selectedProductsRegistry.clear();

//             // Clear the selected products list
//             selectedProductsList.innerHTML = '';
//             selectedProductsList.classList.add('hidden');
//             noProductsMessage.classList.remove('hidden');
//             if (selectedCount) selectedCount.textContent = "0";
//         });
//     }

//     if (closeBtn) {
//         closeBtn.addEventListener('click', closeProductCatalog);
//     }
// });

// Modify closeProductCatalog to use Select2 for added products
// function closeProductCatalog() {
//     const pageName = "repair-alert";
//     const productCatalogSelectContainer = document.querySelector(`#page-${pageName}-product-catalog-select`);
//     const pageMainContainer = document.querySelector('#page-repair-alert-main-container');
//     const modal = document.getElementById(`page-${pageName}-list-create-modal`);
//     const paginationContainerMain = document.getElementById('page-repair-alert-list-pagination-container-main');

//     if (paginationContainerMain) {
//         paginationContainerMain.classList.remove('hidden'); // Show the main pagination again
//     }

//     // Get selected products from registry
//     const selectedProducts = Array.from(selectedProductsRegistry.values());
//     console.log('Transferring products to form:', selectedProducts);

//     // Hide catalog view
//     productCatalogSelectContainer.classList.add('hidden');
//     pageMainContainer.classList.remove('hidden');

//     // Transfer selected products to form
//     if (selectedProducts.length > 0) {
//         const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
//         if (productsContainer) {
//             // Clear existing products
//             productsContainer.innerHTML = '';

//             // Add selected products
//             selectedProducts.forEach(product => {
//                 const lineId = `product-line-${product.id}`;
//                 const newRow = document.createElement('div');
//                 newRow.className = 'line-item flex items-center gap-2 mb-2';
//                 newRow.dataset.lineId = lineId;
//                 newRow.dataset.productId = product.id;
//                     // <div class="w-24">
//                     //     <input type="number" value="${product.package || '1'}" min="1"
//                     //         class="product-package form-input-sm w-full text-center rounded-md border border-gray-300
//                     //         focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
//                     // </div>
//                 newRow.innerHTML = `

//                     <div class="flex-grow">
//                         <select class="product-select form-select-sm w-full rounded-md border border-gray-300
//                             focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
//                         </select>
//                     </div>
//                     <div class="w-24">
//                         <input type="number" value="${product.quantity}" min="1"
//                             class="product-qty form-input-sm w-full text-center rounded-md border border-gray-300
//                             focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
//                     </div>
//                     <div>
//                         <button type="button" class="product-remove-btn p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" data-line-id="${lineId}">
//                             <i class="fas fa-trash-alt text-red-500"></i>
//                         </button>
//                     </div>
//                 `;

//                 productsContainer.appendChild(newRow);

//                 // Initialize Select2 for this row
//                 // const packageInput = newRow.querySelector('.product-package');
//                 const select = newRow.querySelector('.product-select');
//                 const qtyInput = newRow.querySelector('.product-qty');

//                 // Add the product as a pre-selected option with attributes
//                 const option = new Option(product.name, product.id, true, true);
//                 $(select).append(option).trigger('change');

//                 // Configure Select2
//                 $(select).select2({
//                     placeholder: 'Search product...',
//                     dropdownParent: $(modal),
//                     data: [{
//                         id: product.id,
//                         text: product.name,
//                         default_code: product.sku,
//                         // Convert attribute tags to format expected by formatProductSelection
//                         attributes: product.attributeTags ? product.attributeTags.map(tag => ({value: tag})) : []
//                     }],
//                     ajax: {
//                         transport: function(params, success, failure) {
//                             rpc('/account/repair-alert/product-search', {
//                                 term: params.data.term
//                             })
//                             .then(function(result) {
//                                 success({ results: result.items });
//                             })
//                             .catch(function(error) {
//                                 console.error('Error fetching products:', error);
//                                 failure('Failed to load products');
//                             });
//                         },
//                         processResults: function(data) {
//                             return data;
//                         },
//                         delay: 250
//                     },
//                     templateResult: formatProduct,
//                     templateSelection: formatProductSelection
//                 });

//                 // Handle product selection change
//                 $(select).on('change', updateRepairAlertsProductsField);

//                 // Update hidden name field and registry when quantity changes
//                 qtyInput.addEventListener('change', updateRepairAlertsProductsField);
//                 // packageInput.addEventListener('change', updateRepairAlertsProductsField);

//                 // Set up remove button
//                 const removeBtn = newRow.querySelector('.product-remove-btn');
//                 if (removeBtn) {
//                     removeBtn.addEventListener('click', () => {
//                         productsContainer.removeChild(newRow);
//                         // Also remove from registry
//                         selectedProductsRegistry.delete(product.id);
//                         // Update the hidden products field
//                         updateRepairAlertsProductsField();
//                     });
//                 }
//             });

//             // Update the hidden products field
//             updateRepairAlertsProductsField();
//         }
//     }

//     // Reopen the create modal
//     Modal.open('page-repair-alert-list-create-modal');
// }

// Update the initManualProductAddRepair function to sync with registry
function initManualProductAddRepair() {
    const pageName = "repair-alert";
    const addBtn = document.getElementById(`page-${pageName}-list-create-form-products-add-line-btn`);
    const container = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
    const modal = document.getElementById(`page-${pageName}-list-create-modal`);

    let lineCounter = 0;

    if (!addBtn || !container) return;

    addBtn.addEventListener('click', () => {
        const lineId = `manual-product-line-${lineCounter}`;
        const newRow = document.createElement('div');
        newRow.className = 'line-item flex items-center gap-2 mb-2';
        newRow.dataset.lineId = lineId;

        newRow.innerHTML = `
            <div class="flex-grow">
                <select class="product-select form-select-sm w-full rounded-md border border-gray-300
                    focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
                </select>
            </div>
            <div class="flex-grow">
                <select class="lot-select form-select-sm w-full rounded-md border border-gray-300
                    focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500 select2-single page-${pageName}-list-create-form-lot-value-select" multiple>
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

        const select = $(newRow).find('.product-select');
        // const lotSelect = $(newRow).find('.lot-select');
        const qtyInput = newRow.querySelector('.product-qty');

        // Inicializar Select2 para productos
        select.select2({
            placeholder: 'Search product...',
            dropdownParent: $(modal),
            ajax: {
                transport: function(params, success, failure) {
                    rpc('/account/repair-alert/product-search', { term: params.data.term })
                        .then(result => success({ results: result.items }))
                        .catch(error => { console.error(error); failure('Failed to load products'); });
                },
                processResults: data => data,
                delay: 250
            },
            templateResult: formatProduct,
            templateSelection: formatProductSelection
        });

        // Inicializar Select2 para lotes (vacío al inicio)
        select.each(function() {
            const productId = $(this).val();
            const lotSelect = $(this).closest('.line-item').find('.lot-select');

            // Inicializar Select2 vacío para lotes
            $(lotSelect).select2({
                placeholder: 'Select a lot',
                dropdownParent: $(modal)
            });

            // Si el producto ya está seleccionado al cargar
            if (productId) {
                loadLotsForProduct(productId, lotSelect);
            }

            // Evento cuando cambia el producto
            $(this).on('change', function() {
                const newProductId = $(this).val();
                $(lotSelect).val(null).trigger('change');
                if (!newProductId) return;
                loadLotsForProduct(newProductId, lotSelect);
            });
            $(lotSelect).on('change', updateRepairAlertsProductsField);

        });
        

        function loadLotsForProduct(productId, lotSelect, qtyInput) {
            if ($(lotSelect).hasClass("select2-hidden-accessible")) {
                $(lotSelect).select2('destroy');
            }

            $(lotSelect).select2({
                placeholder: 'Search lot...',
                dropdownParent: $(modal),
                multiple: true, // Permitir seleccionar varios lotes
                ajax: {
                    transport: function(params, success, failure) {
                        rpc('/account/repair-alert/product-lots', {
                            product_id: parseInt(productId),
                            term: params.data.term // Esto permite la búsqueda mientras escribes
                        })
                        .then(function(result) {
                            success({ results: result.items });
                        })
                        .catch(function(error) {
                            console.error('Error fetching lots:', error);
                            failure('Failed to load lots');
                        });
                    },
                    processResults: function(data) {
                        return data;
                    },
                    delay: 250
                },
                templateResult: formatLot,
                templateSelection: formatLotSelection
            });
        }

        $(select).on('change', updateRepairAlertsProductsField);


        // Actualizar registro al cambiar cantidad
        qtyInput.addEventListener('change', updateRepairAlertsProductsField);

        // Botón para eliminar fila
        const removeBtn = newRow.querySelector('.product-remove-btn');
        removeBtn?.addEventListener('click', () => {
            container.removeChild(newRow);
            updateRepairAlertsProductsField();
        });

        lineCounter++;
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

// Format function for lot dropdown items - only show name
function formatLot(lot) {
    if (!lot.id) return lot.text;

    // Simple container with just the lot name
    let html = `<div class="flex items-center">
        <div class="font-medium">${lot.text}</div>
    </div>`;

    return $(html);
}

// Format function for selected lot - only show name
function formatLotSelection(lot) {
    if (!lot.id) return lot.text;

    return lot.text;
}


// Update the document ready function
document.addEventListener('DOMContentLoaded', () => {
    initRepairAlertCreateForm();
    initManualProductAddRepair();
    // Set up the close button for product catalog
    // const closeBtn = document.getElementById('page-repair-alert-product-catalog-select-close-btn');
    // if (closeBtn) {
    //     closeBtn.addEventListener('click', closeProductCatalog);
    // }
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

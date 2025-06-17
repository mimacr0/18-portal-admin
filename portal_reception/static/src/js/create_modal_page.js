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

/**
 * Inicializa la funcionalidad de la lista de productos en el formulario
 */
function initStockReceptionList() {
    console.log("Initializing product list functionality");
    const pageName = "reception";
    const addProductBtn = document.getElementById(`page-${pageName}-list-create-form-add-product-btn`);
    const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-items`);

    if (!addProductBtn || !productsContainer) {
        console.error('Products list elements not found', { addProductBtn, productsContainer });
        return;
    }

    console.log('Found product list elements');

    // Add product row
    addProductBtn.addEventListener('click', () => {
        console.log('Adding new product row');
        const newRow = document.createElement('div');
        newRow.className = 'product-row grid grid-cols-12 gap-2';
        newRow.innerHTML = `
            <div class="col-span-5">
                <input type="text" name="product_name[]" placeholder="Product Name" class="form-input-sm w-full"/>
            </div>
            <div class="col-span-2">
                <input type="number" name="product_qty[]" placeholder="Qty" min="1" value="1" class="form-input-sm w-full"/>
            </div>
            <div class="col-span-3">
                <input type="text" name="product_sku[]" placeholder="SKU" class="form-input-sm w-full"/>
            </div>
            <div class="col-span-2 flex items-center">
                <button type="button" class="product-remove-btn text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        productsContainer.appendChild(newRow);

        // Add remove button event
        newRow.querySelector('.product-remove-btn').addEventListener('click', () => {
            console.log('Removing product row');
            productsContainer.removeChild(newRow);
        });
    });

    // Setup existing remove buttons
    document.querySelectorAll('.product-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Removing existing product row');
            const row = btn.closest('.product-row');
            if (row) productsContainer.removeChild(row);
        });
    });
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
    const catalogButton = document.getElementById('page-reception-list-create-form-products-add-catalog-btn');
    const form = document.getElementById('page-reception-list-create-form');
    const closeButtons = document.querySelectorAll('[data-modal-close="true"]');
    const scheduledDateInput = document.getElementById('page-reception-list-create-form-scheduled-date');
    const pageMainContainer = document.querySelector('#page-reception-main-container');
    const productCatalogSelectContainer = document.querySelector('#page-reception-product-catalog-select');

    if (!scheduledDateInput) return;

    flatpickr(scheduledDateInput, { dateFormat: 'd-m-Y' });

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

        loadProductCatalog();

        // Setup search input event listener right after opening the catalog
        setupSearchListener();
    });

    createButton.addEventListener('click', () => {
        Modal.open('page-reception-list-create-modal');
    });

    // Calcular volumen cuando cambian las dimensiones
    const widthInput = document.getElementById('page-reception-list-create-form-measures-width');
    const heightInput = document.getElementById('page-reception-list-create-form-measures-height');
    const lengthInput = document.getElementById('page-reception-list-create-form-measures-length');
    const volumeInput = document.getElementById('page-reception-list-create-form-volume');

    [widthInput, heightInput, lengthInput].forEach(input => {
        if (input) {
            input.addEventListener('input', calculateVolume);
        }
    });

    // Calcular volumen basado en las dimensiones
    function calculateVolume() {
        if (!widthInput || !heightInput || !lengthInput || !volumeInput) return;

        const width = parseFloat(widthInput.value || 0);
        const height = parseFloat(heightInput.value || 0);
        const length = parseFloat(lengthInput.value || 0);

        let volume = 0;
        if (width > 0 && height > 0 && length > 0) {
            volume = (width * height * length) / 1000; // Convertir a cm³
        }

        volumeInput.value = volume.toFixed(2);
    }

    // Manejar envío del formulario
    submitButton.addEventListener('click', async () => {
        console.log("Submit button clicked");
        // Limpiar errores previos
        clearErrors();

        // Recopilar datos del formulario
        const formData = {
            name: form.querySelector('input[name="name"]').value,
            tracking_number: form.querySelector('input[name="tracking_number"]')?.value || "",
            tracking: form.querySelector('select[name="tracking"]').value,
            width: parseFloat(form.querySelector('input[name="width"]').value || 0),
            height: parseFloat(form.querySelector('input[name="height"]').value || 0),
            length: parseFloat(form.querySelector('input[name="length"]').value || 0),
            volume: parseFloat(form.querySelector('input[name="volume"]').value || 0),
            weight: parseFloat(form.querySelector('input[name="weight"]').value || 0),
            sku: form.querySelector('input[name="sku"]').value,
            barcode: form.querySelector('input[name="barcode"]').value,
            products: Array.from(form.querySelectorAll('.product-row')).map(row => ({
                name: row.querySelector('input[name="product_name[]"]')?.value || "",
                quantity: parseInt(row.querySelector('input[name="product_qty[]"]')?.value || "1"),
                sku: row.querySelector('input[name="product_sku[]"]')?.value || ""
            }))
        };

        console.log("Form data:", formData);

        // Validar datos
        if (!validateForm(formData)) {
            console.log("Form validation failed");
            return;
        }

        try {
            // Mostrar indicador de carga
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            console.log("Sending data to server...");
            // Enviar datos al servidor
            const result = await rpc('/account/reception/create', formData);
            console.log("Server response:", result);

            // Manejar respuesta
            if (result.status === 'success') {
                console.log("Reception created successfully");
                // Cerrar modal y reiniciar formulario

                // Use the showModal/hideModal functions if they exist in the global scope
                if (typeof hideModal === 'function') {
                    hideModal(createModal);
                } else {
                    createModal.classList.add('hidden');
                    createModal.style.visibility = 'hidden';
                    createModal.style.opacity = '0';
                }

                form.reset();

                // Recargar la lista
                if (typeof reloadReceptionListPage === 'function') {
                    reloadReceptionListPage();
                } else {
                    console.error("reloadReceptionListPage is not a function", reloadReceptionListPage);
                    window.location.reload();
                }
            } else {
                // Mostrar error
                console.error("Error creating reception:", result.message);
                alert(result.message || 'An error occurred while creating the reception package');
            }
        } catch (error) {
            // Manejar error
            console.error("Exception creating reception:", error);
            alert('An error occurred while creating the reception package');
        } finally {
            // Restaurar botón
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    });

    // Validar formulario antes de enviar
    function validateForm(data) {
        let isValid = true;

        // Validar nombre
        if (!data.name) {
            showError('name', 'Name is required');
            isValid = false;
        }

        // Validar tracking number
        if (!data.tracking_number) {
            showError('tracking-number', 'Tracking number is required');
            isValid = false;
        }

        // Validar dimensiones
        if (data.width <= 0 || data.height <= 0 || data.length <= 0) {
            showError('measures', 'All dimensions are required and must be greater than 0');
            isValid = false;
        }

        // Validar peso
        if (data.weight <= 0) {
            showError('weight', 'Weight is required and must be greater than 0');
            isValid = false;
        }

        // Validar SKU
        if (!data.sku) {
            showError('sku', 'SKU is required');
            isValid = false;
        }

        // Validar código de barras
        if (!data.barcode) {
            showError('barcode', 'Barcode is required');
            isValid = false;
        }

        // Validate that at least one product has a name
        if (data.products.length > 0) {
            const hasValidProduct = data.products.some(p => p.name.trim() !== '');
            if (!hasValidProduct) {
                alert('At least one product must have a name');
                isValid = false;
            }
        }

        return isValid;
    }

    // Mostrar mensaje de error
    function showError(field, message) {
        const errorDiv = document.getElementById(`page-${pageName}-list-create-form-${field}-error`);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('invisible');
        } else {
            console.error(`Error div for field ${field} not found`);
        }
    }

    // Limpiar todos los errores
    function clearErrors() {
        const errorDivs = document.querySelectorAll('.form-error');
        errorDivs.forEach(div => div.classList.add('invisible'));
    }
};

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
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const noProductsMessage = document.getElementById(`page-${pageName}-product-catalog-select-no-products-message`);
    const selectedCount = document.getElementById("selected-count");

    document.querySelectorAll('.product-card').forEach(card => {
        const addBtn = card.querySelector('.product-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                const productId = card.dataset.productId;
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
            });
        }
    });
}

// Add helper function to add product to selection
function addProductToSelection(id, name, sku, qty = 1, price = '', stockInfo = '', inStock = true, imgSrc = '', attributeTags = []) {
    const pageName = "reception";
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);

    // Check if product already exists
    const existingProduct = selectedProductsList.querySelector(`[data-product-id="${id}"]`);
    if (existingProduct) {
        // Update quantity instead of adding new item
        const qtyInput = existingProduct.querySelector('.product-quantity');
        if (qtyInput) {
            qtyInput.value = parseInt(qtyInput.value) + 1;
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
        selectedProductsList.removeChild(productItem);
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
            qtyInput.value = qty - 1;
        }
    });

    increaseBtn.addEventListener('click', () => {
        let qty = parseInt(qtyInput.value);
        qtyInput.value = qty + 1;
    });
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
            const selectedCount = document.getElementById("selected-count");

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

function closeProductCatalog() {
    const pageName = "reception";
    const productCatalogSelectContainer = document.querySelector(`#page-${pageName}-product-catalog-select`);
    const pageMainContainer = document.querySelector('#page-reception-main-container');

    // Get selected products
    const selectedProductsList = document.getElementById(`page-${pageName}-product-catalog-select-selected-products-list`);
    const selectedProducts = [];
    if (selectedProductsList) {
        selectedProductsList.querySelectorAll('[data-product-id]').forEach(item => {
            const qtyInput = item.querySelector('.product-quantity');
            selectedProducts.push({
                id: item.dataset.productId,
                name: item.dataset.productName,
                quantity: qtyInput ? parseInt(qtyInput.value) : 1
            });
        });
    }

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
                    <div class="flex-grow">
                        <input type="hidden" name="product_id[]" value="${product.id}"/>
                        <input type="text" name="product_name[]" value="${product.name}" readonly
                            class="form-select form-select-sm w-full rounded-md border border-gray-300
                            focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
                    </div>
                    <div class="w-24">
                        <input type="number" name="product_qty[]" value="${product.quantity}" min="1"
                            class="form-input-sm w-full text-center rounded-md border border-gray-300
                            focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
                    </div>
                    <div>
                        <button type="button" class="product-remove-btn p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" data-line-id="${lineId}">
                            <i class="fas fa-trash-alt text-red-500"></i>
                        </button>
                    </div>
                `;

                productsContainer.appendChild(newRow);

                // Set up remove button
                const removeBtn = newRow.querySelector('.product-remove-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => {
                        productsContainer.removeChild(newRow);
                    });
                }
            });
        }
    }

    // Reopen the create modal
    Modal.open('page-reception-list-create-modal');
}

// Update the function to initialize manual product add with Select2
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
                <div class="flex-grow">
                    <select name="product_id[]" class="product-select form-select-sm w-full rounded-md border border-gray-300
                        focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500">
                    </select>
                    <input type="hidden" name="product_name[]" class="product-name"/>
                </div>
                <div class="w-24">
                    <input type="number" name="product_qty[]" value="1" min="1"
                        class="form-input-sm w-full text-center rounded-md border border-gray-300
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
            const select = newRow.querySelector('.product-select');
            const nameInput = newRow.querySelector('.product-name');

            $(select).select2({
                placeholder: 'Search product...',
                minimumInputLength: 2,
                dropdownParent: $(modal),
                ajax: {
                    transport: function(params, success, failure) {
                        // Use rpc function directly instead of Select2's built-in AJAX
                        rpc('/account/reception/product-search', {
                            term: params.data.term
                        })
                        .then(function(result) {
                            // Result comes directly from our controller
                            success({ results: result.items });
                        })
                        .catch(function(error) {
                            console.error('Error fetching products:', error);
                            failure('Failed to load products');
                        });
                    },
                    processResults: function(data) {
                        // The data is already correctly formatted by our transport function
                        return data;
                    },
                    delay: 250
                },
                templateResult: formatProduct,
                templateSelection: formatProductSelection
            });

            // Update hidden name field and transfer attributes data when selection changes
            $(select).on('change', function() {
                const data = $(this).select2('data')[0];
                if (data) {
                    nameInput.value = data.text;
                    // Optionally store attribute data in a data attribute if needed for later
                    if (data.attributes) {
                        newRow.dataset.productAttributes = JSON.stringify(data.attributes);
                    }
                }
            });

            lineCounter++;

            // Set up remove button
            const removeBtn = newRow.querySelector('.product-remove-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    container.removeChild(newRow);
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
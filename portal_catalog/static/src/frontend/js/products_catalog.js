/** @odoo-module */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize selected products array
    let selectedProducts = [];

    // Initialize event listeners for product interactions
    initEventListeners();

    /**
     * Initializes event listeners for product interactions
     */
    function initEventListeners() {
        // Event delegation for product interactions
        document.addEventListener('click', function(event) {
            // Handle add button (initial add)
            if (event.target.closest('.product-add-btn')) {
                const addBtn = event.target.closest('.product-add-btn');
                const productCard = addBtn.closest('.product-card');

                // Hide the add button
                addBtn.classList.add('hidden');

                // Show quantity selector and action buttons
                const quantitySelector = productCard.querySelector('.quantity-selector');
                const productActions = productCard.querySelector('.product-actions');

                if (quantitySelector) quantitySelector.classList.remove('hidden');
                if (productActions) productActions.classList.remove('hidden');

                // Add product to selection with quantity 1
                addProductToSelection(productCard, 1);
            }

            // Handle quantity decrease
            if (event.target.closest('.product-decrease')) {
                const quantityInput = event.target.closest('.product-card').querySelector('.product-quantity');
                let quantity = parseInt(quantityInput.value);
                if (quantity > 1) {
                    quantityInput.value = quantity - 1;
                }
            }

            // Handle quantity increase
            if (event.target.closest('.product-increase')) {
                const quantityInput = event.target.closest('.product-card').querySelector('.product-quantity');
                let quantity = parseInt(quantityInput.value);
                quantityInput.value = quantity + 1;
            }

            // Handle product deletion
            if (event.target.closest('.product-delete')) {
                const productCard = event.target.closest('.product-card');
                const productId = productCard.dataset.productId;

                // Show confirmation before deleting
                if (confirm('¿Está seguro de que desea eliminar este producto?')) {
                    // Reset the product card UI to default state
                    resetProductCard(productCard);

                    // Remove from selection
                    removeFromSelection(productId);
                }
            }

            // Handle product addition (after it's already been added once)
            if (event.target.closest('.product-add')) {
                const productCard = event.target.closest('.product-card');
                const quantity = parseInt(productCard.querySelector('.product-quantity').value);
                addProductToSelection(productCard, quantity);
            }

            // Handle product favorite toggle
            if (event.target.closest('.product-favorite')) {
                const favoriteIcon = event.target.closest('.product-favorite');
                favoriteIcon.classList.toggle('fas');
                favoriteIcon.classList.toggle('far');
                favoriteIcon.classList.toggle('text-yellow-500');
            }

            // Handle clear selection button
            if (event.target.closest('#clear-selection')) {
                clearSelection();
            }

            // Handle checkout button
            if (event.target.closest('#checkout-button')) {
                handleCheckout();
            }

            // Handle remove selected product
            if (event.target.closest('.remove-selected-product')) {
                const selectedProductElement = event.target.closest('.selected-product-item');
                const productId = selectedProductElement.dataset.productId;

                // Find and reset the corresponding product card
                const productCard = document.querySelector(`.product-card[data-product-id="${productId}"]`);
                if (productCard) {
                    resetProductCard(productCard);
                }

                removeFromSelection(productId);
            }
        });

        // Handle search functionality
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', function(event) {
                const searchTerm = event.target.value.toLowerCase();
                const productCards = document.querySelectorAll('.product-card');

                productCards.forEach(card => {
                    const productName = card.querySelector('h3').textContent.toLowerCase();
                    const productSku = card.querySelector('.text-gray-500').textContent.toLowerCase();

                    if (productName.includes(searchTerm) || productSku.includes(searchTerm)) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    }

    /**
     * Resets a product card UI to its default state
     * @param {HTMLElement} productCard - The product card element to reset
     */
    function resetProductCard(productCard) {
        // Hide quantity selector and action buttons
        const quantitySelector = productCard.querySelector('.quantity-selector');
        const productActions = productCard.querySelector('.product-actions');
        const addBtn = productCard.querySelector('.product-add-btn');

        // Reset quantity to 1
        const quantityInput = productCard.querySelector('.product-quantity');
        if (quantityInput) quantityInput.value = 1;

        // Show the add button, hide other elements
        if (addBtn) addBtn.classList.remove('hidden');
        if (quantitySelector) quantitySelector.classList.add('hidden');
        if (productActions) productActions.classList.add('hidden');
    }

    /**
     * Adds a product to the selected products list
     * @param {HTMLElement} productCard - The product card element
     * @param {number} quantity - The quantity to add
     */
    function addProductToSelection(productCard, quantity = 1) {
        try {
            // Get product data
            const productId = productCard.dataset.productId;

            // Get product name with fallback
            const nameElement = productCard.querySelector('h3');
            if (!nameElement) {
                throw new Error('No se pudo encontrar el nombre del producto');
            }
            const productName = nameElement.textContent;

            // Get product SKU with fallback
            const skuElement = productCard.querySelector('.text-gray-500');
            if (!skuElement) {
                throw new Error('No se pudo encontrar el SKU del producto');
            }
            const productSku = skuElement.textContent.trim();
            // Remove brackets if present
            const cleanSku = productSku.replace(/[\[\]]/g, '');

            // Get product price with fallback
            const priceElements = productCard.querySelectorAll('.font-medium, .text-gray-700');
            let productPrice = 0;
            let priceFound = false;

            // Try different approaches to find the price
            for (const element of priceElements) {
                const priceText = element.textContent;

                // Check if it looks like a price text (contains numbers and currency symbols)
                if (priceText.includes('€') || priceText.includes('Precio')) {
                    // First try to match a pattern like "962,55 €" or "962.55 €"
                    const priceMatch = priceText.match(/(\d+[.,]\d+)/);
                    if (priceMatch) {
                        productPrice = parseFloat(priceMatch[0].replace(',', '.'));
                        priceFound = true;
                        break;
                    }

                    // If that fails, try to extract any number from the string
                    const numberMatch = priceText.match(/\d+/);
                    if (numberMatch) {
                        productPrice = parseFloat(numberMatch[0]);
                        priceFound = true;
                        break;
                    }
                }
            }

            // Use a default price if we couldn't find one
            if (!priceFound) {
                console.warn('No price found in product, using default value of 100');
                productPrice = 100; // Default price if we can't find one
            }

            // Ensure quantity is valid
            quantity = quantity || 1; // Default to 1 if NaN

            // Check if product already exists in selection
            const existingProductIndex = selectedProducts.findIndex(p => p.id === productId);

            if (existingProductIndex !== -1) {
                // Update quantity if product already exists
                selectedProducts[existingProductIndex].quantity += quantity;
            } else {
                // Add new product to selection
                selectedProducts.push({
                    id: productId,
                    name: productName,
                    sku: cleanSku,
                    price: productPrice,
                    quantity: quantity
                });
            }

            // Update UI
            updateSelectedProductsUI();

            // Show notification
            showNotification(`${quantity} ${productName} añadido(s) al presupuesto`, 'success');
        } catch (error) {
            console.error('Error al añadir producto:', error);
            showNotification(`Error al añadir producto: ${error.message}`, 'error');
        }
    }

    /**
     * Removes a product from the selection
     * @param {string} productId - The ID of the product to remove
     */
    function removeFromSelection(productId) {
        // Find product index
        const productIndex = selectedProducts.findIndex(p => p.id === productId);

        if (productIndex !== -1) {
            const product = selectedProducts[productIndex];

            // Remove product from array
            selectedProducts.splice(productIndex, 1);

            // Update UI
            updateSelectedProductsUI();

            // Show notification
            showNotification(`${product.name} eliminado del presupuesto`, 'info');
        }
    }

    /**
     * Clears all selected products
     */
    function clearSelection() {
        if (selectedProducts.length === 0) return;

        if (confirm('¿Está seguro de que desea eliminar todos los productos seleccionados?')) {
            // Reset all product cards
            selectedProducts.forEach(product => {
                const productCard = document.querySelector(`.product-card[data-product-id="${product.id}"]`);
                if (productCard) {
                    resetProductCard(productCard);
                }
            });

            selectedProducts = [];
            updateSelectedProductsUI();
            showNotification('Todos los productos han sido eliminados', 'info');
        }
    }

    /**
     * Updates the selected products UI
     */
    function updateSelectedProductsUI() {
        const selectedCount = document.getElementById('selected-count');
        const noProductsMessage = document.getElementById('no-products-message');
        const selectedProductsList = document.getElementById('selected-products-list');
        const selectedProductsSummary = document.getElementById('selected-products-summary');

        // Update count
        selectedCount.textContent = selectedProducts.length;

        // Show/hide elements based on selection state
        if (selectedProducts.length === 0) {
            noProductsMessage.classList.remove('hidden');
            selectedProductsList.classList.add('hidden');
            selectedProductsSummary.classList.add('hidden');
            return;
        } else {
            noProductsMessage.classList.add('hidden');
            selectedProductsList.classList.remove('hidden');
            selectedProductsSummary.classList.remove('hidden');
        }

        // Generate selected products list HTML
        let productsHTML = '';

        selectedProducts.forEach(product => {
            const subtotal = product.price * product.quantity;

            productsHTML += `
                <div class="bg-white dark:bg-gray-800 rounded shadow-sm selected-product-item p-2" data-product-id="${product.id}">
                    <div class="flex justify-between items-start">
                        <h4 class="font-medium text-gray-800 dark:text-white text-xs truncate">${product.name}</h4>
                        <button class="text-red-500 hover:text-red-700 transition-colors remove-selected-product ml-1 text-xs">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="text-gray-500 dark:text-gray-400 text-xs">${product.sku}</div>
                    <div class="flex justify-between items-center mt-1">
                        <div class="text-xs text-gray-600 dark:text-gray-300">
                            ${formatPrice(product.price)} € × ${product.quantity}
                        </div>
                        <span class="font-medium text-cyan-600 dark:text-cyan-400 text-xs">${formatPrice(subtotal)} €</span>
                    </div>
                </div>
            `;
        });

        // Update list
        selectedProductsList.innerHTML = productsHTML;

        // Calculate and update totals
        updateTotals();
    }

    /**
     * Calculates and updates the totals in the summary
     */
    function updateTotals() {
        const subtotalElement = document.getElementById('subtotal');
        const taxElement = document.getElementById('tax');
        const totalElement = document.getElementById('total');

        // Calculate subtotal
        const subtotal = selectedProducts.reduce((total, product) => {
            return total + (product.price * product.quantity);
        }, 0);

        // Calculate tax (21%)
        const tax = subtotal * 0.21;

        // Calculate total
        const total = subtotal + tax;

        // Update UI
        subtotalElement.textContent = `${formatPrice(subtotal)} €`;
        taxElement.textContent = `${formatPrice(tax)} €`;
        totalElement.textContent = `${formatPrice(total)} €`;
    }

    /**
     * Handles the checkout process
     */
    function handleCheckout() {
        if (selectedProducts.length === 0) {
            showNotification('No hay productos seleccionados', 'error');
            return;
        }

        // In a real app, this would submit the order to the server
        showNotification('Presupuesto completado con éxito', 'success');

        // Optionally clear the selection after checkout
        // clearSelection();
    }

    /**
     * Formats a price with 2 decimal places and comma as decimal separator
     * @param {number} price - The price to format
     * @return {string} The formatted price
     */
    function formatPrice(price) {
        return price.toFixed(2).replace('.', ',');
    }

    /**
     * Shows a notification message
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, warning, info)
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ${getNotificationClass(type)}`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="${getNotificationIcon(type)} mr-3"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to document
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    /**
     * Gets the CSS class for a notification type
     * @param {string} type - The notification type
     * @return {string} The CSS class
     */
    function getNotificationClass(type) {
        switch (type) {
            case 'success':
                return 'bg-green-500 text-white';
            case 'error':
                return 'bg-red-500 text-white';
            case 'warning':
                return 'bg-yellow-500 text-white';
            case 'info':
            default:
                return 'bg-blue-500 text-white';
        }
    }

    /**
     * Gets the icon for a notification type
     * @param {string} type - The notification type
     * @return {string} The icon class
     */
    function getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return 'fas fa-check-circle';
            case 'error':
                return 'fas fa-times-circle';
            case 'warning':
                return 'fas fa-exclamation-triangle';
            case 'info':
            default:
                return 'fas fa-info-circle';
        }
    }
});

/** @odoo-module */

/**
 * Generic Product Catalog Script
 * 
 * NOTE: This script only handles standalone catalog pages.
 * Quantity controls (add, increase, decrease, remove) are handled by module-specific scripts
 * (create_expedition_modal.js, create_modal_page.js) to avoid duplicate event handling.
 */

document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();

    /**
     * Initializes event listeners for product catalog interactions
     * Only handles search and pagination for standalone pages
     */
    function initEventListeners() {
        // Handle search functionality (standalone pages only)
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', function(event) {
                const searchTerm = event.target.value.toLowerCase();
                const productCards = document.querySelectorAll('.product-card');

                productCards.forEach(card => {
                    // Skip if inside a modal (handled by modal-specific scripts)
                    if (card.closest('#page-expedition-product-catalog-select') ||
                        card.closest('#page-reception-product-catalog-select') ||
                        card.closest('#page-repair-alert-product-catalog-select')) {
                        return;
                    }

                    const productName = card.querySelector('h3')?.textContent.toLowerCase() || '';
                    const productSku = card.querySelector('.text-gray-500')?.textContent.toLowerCase() || '';

                    if (productName.includes(searchTerm) || productSku.includes(searchTerm)) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }

        // Handle pagination clicks (standalone pages only)
        document.addEventListener('click', function(event) {
            if (event.target.closest('.product-catalog-page-btn')) {
                const btn = event.target.closest('.product-catalog-page-btn');
                
                // Skip if inside a modal (handled by modal-specific scripts)
                if (btn.closest('#page-expedition-product-catalog-select') ||
                    btn.closest('#page-reception-product-catalog-select') ||
                    btn.closest('#page-repair-alert-product-catalog-select')) {
                    return;
                }

                if (btn.disabled) return;

                const page = parseInt(btn.dataset.page);
                if (page && page > 0) {
                    loadProductCatalogPage(page);
                }
            }
        });
    }

    /**
     * Loads a specific page of the product catalog (standalone pages)
     * @param {number} page - The page number to load
     */
    function loadProductCatalogPage(page) {
        const searchInput = document.getElementById('product-search');
        const search = searchInput ? searchInput.value : '';

        // Show loading state
        const productsGrid = document.getElementById('products-grid');
        if (productsGrid) {
            productsGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>';
        }

        // Make RPC call to get products
        fetch('/catalog/product-catalog', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                params: {
                    page: page,
                    search: search
                },
                id: Math.floor(Math.random() * 1000000)
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.result && data.result.status === 'success') {
                // Update products grid
                if (productsGrid) {
                    productsGrid.innerHTML = data.result.products_html;
                }

                // Update pagination
                const paginationContainer = document.getElementById('product-pagination');
                if (paginationContainer) {
                    paginationContainer.innerHTML = data.result.pagination_html;
                }
            }
        })
        .catch(error => {
            console.error('Error loading product catalog:', error);
            if (productsGrid) {
                productsGrid.innerHTML = '<div class="col-span-full text-center py-8 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>Error loading products</div>';
            }
        });
    }
});

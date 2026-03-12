/** @odoo-module */

/**
 * Generic Lot/Stock Catalog Script
 * 
 * NOTE: This script only handles standalone catalog pages.
 * Quantity controls (add, increase, decrease, remove) are handled by module-specific scripts
 * (create_expedition_modal.js, create_modal_page.js) to avoid duplicate event handling.
 */

document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();

    /**
     * Initializes event listeners for lot catalog interactions
     * Only handles search and pagination for standalone pages
     */
    function initEventListeners() {
        // Handle search functionality (standalone pages only)
        const searchInput = document.getElementById('lot-search');
        if (searchInput) {
            searchInput.addEventListener('input', function(event) {
                const searchTerm = event.target.value.toLowerCase();
                const lotCards = document.querySelectorAll('.lot-card');

                lotCards.forEach(card => {
                    // Skip if inside a modal (handled by modal-specific scripts)
                    if (card.closest('#page-expedition-lot-catalog-select') ||
                        card.closest('#page-reception-lot-catalog-select') ||
                        card.closest('#page-repair-alert-lot-catalog-select')) {
                        return;
                    }

                    const lotName = card.querySelector('h3')?.textContent.toLowerCase() || '';
                    const productName = card.querySelector('.text-gray-400')?.textContent.toLowerCase() || '';
                    const productCode = card.querySelector('.text-gray-500')?.textContent.toLowerCase() || '';

                    if (lotName.includes(searchTerm) || productName.includes(searchTerm) || productCode.includes(searchTerm)) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }

        // Handle pagination clicks (standalone pages only)
        document.addEventListener('click', function(event) {
            if (event.target.closest('.lot-catalog-page-btn')) {
                const btn = event.target.closest('.lot-catalog-page-btn');
                
                // Skip if inside a modal (handled by modal-specific scripts)
                if (btn.closest('#page-expedition-lot-catalog-select') ||
                    btn.closest('#page-reception-lot-catalog-select') ||
                    btn.closest('#page-repair-alert-lot-catalog-select')) {
                    return;
                }

                if (btn.disabled) return;

                const page = parseInt(btn.dataset.page);
                if (page && page > 0) {
                    loadLotCatalogPage(page);
                }
            }
        });
    }

    /**
     * Loads a specific page of the lot catalog (standalone pages)
     * @param {number} page - The page number to load
     */
    function loadLotCatalogPage(page) {
        const searchInput = document.getElementById('lot-search');
        const search = searchInput ? searchInput.value : '';

        // Show loading state
        const lotsGrid = document.getElementById('lots-grid');
        if (lotsGrid) {
            lotsGrid.innerHTML = '<div class="col-span-full text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>';
        }

        // Make RPC call to get lots
        fetch('/catalog/lot-catalog', {
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
                // Update lots grid
                if (lotsGrid) {
                    lotsGrid.innerHTML = data.result.lots_html;
                }

                // Update pagination
                const paginationContainer = document.getElementById('lot-pagination');
                if (paginationContainer) {
                    paginationContainer.innerHTML = data.result.pagination_html;
                }
            }
        })
        .catch(error => {
            console.error('Error loading lot catalog:', error);
            if (lotsGrid) {
                lotsGrid.innerHTML = '<div class="col-span-full text-center py-8 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>Error loading lots</div>';
            }
        });
    }
});


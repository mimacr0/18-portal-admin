import { rpc } from "@web/core/network/rpc";
import { applyProductMappingColumnVisibility } from "./product_mapping_columns.js";

/**
 * Sorting configuration for the product mapping list.
 * @type {Object}
 */
export let sortConfig = {
    column: null,
    direction: 'asc'
};

/**
 * Reloads the product mapping list on the page.
 * @async
 * @returns {Promise<void>}
 */
export const reloadProductMappingListPage = async () => {
    const pageListItems = document.getElementById('product-mapping-list-items');
    if (!pageListItems) return;

    const pageName = 'product_mapping';
    const currentPageInput = document.getElementById(`page-${pageName}-list-pagination-page`);
    if (!currentPageInput) return;
    const currentPage = parseInt(currentPageInput.value);

    const searchInput = document.getElementById(`page-${pageName}-list-quick-search`);
    const search = searchInput ? searchInput.value : '';

    const domainInput = document.getElementById(`page-${pageName}-list-advanced-search-domain`);
    const domain = domainInput ? JSON.parse(domainInput.value || '[]') : [];

    const matchTypeSelect = document.getElementById(`page-${pageName}-list-advanced-search-match-type`);
    const matchType = matchTypeSelect ? matchTypeSelect.value : 'all';

    const quickFiltersInput = document.getElementById(`page-${pageName}-list-quick-filter-active`);
    const quickFilter = quickFiltersInput ? quickFiltersInput.value : 'all';

    const res = await rpc('/account/product_mapping/reload', {
        page: currentPage,
        search: search,
        domain: domain,
        match_type: matchType,
        sort: sortConfig.column,
        order: sortConfig.direction,
        quick_filter: quickFilter,
    });

    if (res?.status !== 'success') return;

    // Update HTML content
    pageListItems.innerHTML = res.list;

    // Apply column visibility to newly loaded rows
    applyProductMappingColumnVisibility();

    // Update Pager
    const paginationContainer = document.getElementById(`page-${pageName}-list-pagination-container`);
    if (paginationContainer) paginationContainer.innerHTML = res.pager;

    const paginationContainerMain = document.getElementById(`page-${pageName}-list-pagination-container-main`);
    if (paginationContainerMain) {
        if (res.last_page === 0) {
            paginationContainerMain.classList.add('hidden');
        } else {
            paginationContainerMain.classList.remove('hidden');
        }
    }

    // Attach pagination events
    const paginationPrevious = document.getElementById('product-mapping-pagination-previous');
    const paginationButtons = document.querySelectorAll('.product-mapping-list-pagination-button');
    const paginationNext = document.getElementById('product-mapping-pagination-next');

    if (paginationPrevious) {
        paginationPrevious.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPageInput.value = currentPage - 1;
                reloadProductMappingListPage();
            }
        });
    }

    paginationButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentPageInput.value = parseInt(button.dataset.page);
            reloadProductMappingListPage();
        });
    });

    if (paginationNext) {
        paginationNext.addEventListener('click', () => {
            if (currentPage < res.last_page) {
                currentPageInput.value = currentPage + 1;
                reloadProductMappingListPage();
            }
        });
    }
};

/**
 * Initializes buttons and basic events for the product mapping list.
 */
export const initProductMappingListPage = () => {
    const pageName = 'product_mapping';

    // Pager initialization (initial load)
    const paginationPrevious = document.getElementById('product-mapping-pagination-previous');
    const paginationButtons = document.querySelectorAll('.product-mapping-list-pagination-button');
    const paginationNext = document.getElementById('product-mapping-pagination-next');

    if (paginationPrevious) {
        paginationPrevious.addEventListener('click', () => {
            const currentPageInput = document.getElementById(`page-${pageName}-list-pagination-page`);
            const currentPage = parseInt(currentPageInput.value);
            if (currentPage > 1) {
                currentPageInput.value = currentPage - 1;
                reloadProductMappingListPage();
            }
        });
    }

    paginationButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentPageInput = document.getElementById(`page-${pageName}-list-pagination-page`);
            currentPageInput.value = parseInt(button.dataset.page);
            reloadProductMappingListPage();
        });
    });

    if (paginationNext) {
        paginationNext.addEventListener('click', () => {
            const currentPageInput = document.getElementById(`page-${pageName}-list-pagination-page`);
            const currentPage = parseInt(currentPageInput.value);
            // We don't have last_page here easily but reloadProductMappingListPage will handle it
            currentPageInput.value = currentPage + 1;
            reloadProductMappingListPage();
        });
    }
};

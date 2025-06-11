import { rpc } from "@web/core/network/rpc";

// Variable para configuración de ordenamiento
export let sortConfig = {
    column: null,
    direction: 'asc'
};

export const reloadStockListPage = async () => {
    const pageListItems = document.getElementById('stock-page-list-items');
    if(!pageListItems) return;

    const currentPageInput = document.getElementById('stock-list-pagination-page');
    if(!currentPageInput) return;
    const currentPage = parseInt(currentPageInput.value);

    const searchInput = document.getElementById('page-stock-products-list-search');
    if(!searchInput) return;
    const search = searchInput.value;

    // Get advanced search domain if it exists
    const domainInput = document.getElementById('page-products-list-advanced-search-domain');
    const domain = domainInput ? JSON.parse(domainInput.value || '[]') : [];

    // Get match type if it exists
    const matchTypeSelect = document.getElementById('page-products-list-advanced-search-match-type');
    const matchType = matchTypeSelect ? matchTypeSelect.value : 'all';

    const res = await rpc('/account/stock/list/reload', {
        page: currentPage,
        search: search,
        domain: domain,
        match_type: matchType,
        sort: sortConfig.column,
        order: sortConfig.direction
    });
    if(res?.status != 'success') return;

    if(pageListItems) pageListItems.innerHTML = res.list;

    const paginationContainer = document.getElementById('stock-list-pagination-container');
    if(paginationContainer) paginationContainer.innerHTML = res.pager;

    // Paginador: IDs y clases corregidos
    const paginationPrevious = document.getElementById('stock-list-pagination-previous');
    const paginationButton = document.querySelectorAll('.stock-list-pagination-button');
    const paginationNext = document.getElementById('stock-list-pagination-next');

    if(paginationPrevious) paginationPrevious.addEventListener('click', () => {
        if((currentPage - 1) < 1) return;
        currentPageInput.value = currentPage - 1;
        reloadStockListPage();
    });

    if(paginationButton) paginationButton.forEach(button => {
        button.addEventListener('click', () => {
            currentPageInput.value = parseInt(button.dataset.page);
            reloadStockListPage();
        });
    });

    if(paginationNext) paginationNext.addEventListener('click', () => {
        if((currentPage + 1) > res.last_page) return;
        currentPageInput.value = currentPage + 1;
        reloadStockListPage();
    });
}

export const initProductsManagementListPage = () => {
    const createButton = document.getElementById('launch-create-stock-form-button');
    if(createButton) createButton.addEventListener('click', () => {
        Modal.open('page-stock-list-create-modal');
    });
    const fileUploadButton = document.getElementById('page-list-stock-tools-action-import');
    if(fileUploadButton) fileUploadButton.addEventListener('click', () => {
        Modal.open('file-upload-modal');
    });
}

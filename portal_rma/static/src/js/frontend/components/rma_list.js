import { rpc } from "@web/core/network/rpc";
import { applyColumnVisibility } from "./rma_columns.js";

/**
 * Sorting configuration for the RMA units list.
 * @type {Object}
 */
export let sortConfig = {
    column: null,
    direction: 'asc'
};

/**
 * Reloads the RMA units list on the page.
 * @async
 * @returns {Promise<void>}
 */
export const reloadRmaUnitsListPage = async () => {
    const pageListItems = document.getElementById('rma-units-list-items');
    if (!pageListItems) return;

    const pageName = 'rma_units';
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

    const packageIdInput = document.getElementById(`page-${pageName}-package-id`);
    const packageId = packageIdInput ? packageIdInput.value : null;

    const res = await rpc('/account/rma/units/reload', {
        page: currentPage,
        search: search,
        domain: domain,
        match_type: matchType,
        sort: sortConfig.column,
        order: sortConfig.direction,
        quick_filter: quickFilter,
        package_id: packageId,
    });

    if (res?.status !== 'success') return;

    // Update HTML content
    pageListItems.innerHTML = res.list;

    // Apply column visibility to newly loaded rows
    applyColumnVisibility();

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
    const paginationPrevious = document.getElementById('rma-list-pagination-previous');
    const paginationButtons = document.querySelectorAll('.rma-list-pagination-button');
    const paginationNext = document.getElementById('rma-list-pagination-next');

    if (paginationPrevious) {
        paginationPrevious.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPageInput.value = currentPage - 1;
                reloadRmaUnitsListPage();
            }
        });
    }

    paginationButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentPageInput.value = parseInt(button.dataset.page);
            reloadRmaUnitsListPage();
        });
    });

    if (paginationNext) {
        paginationNext.addEventListener('click', () => {
            if (currentPage < res.last_page) {
                currentPageInput.value = currentPage + 1;
                reloadRmaUnitsListPage();
            }
        });
    }
};

/**
 * Initializes buttons and basic events for the RMA units list.
 */
export const initRmaUnitsManagementListPage = () => {
    const pageName = 'rma_units';

    // Batch Actions (Delete/Cancel)
    const batchDeleteButton = document.getElementById(`page-list-${pageName}-batch-action-delete`);
    if (batchDeleteButton) {
        batchDeleteButton.addEventListener('click', async () => {
            const selectedIds = [];
            document.querySelectorAll('.rma-units-list-checkbox:checked').forEach(checkbox => {
                selectedIds.push(checkbox.dataset.unitId);
            });

            if (selectedIds.length === 0) return;

            if (confirm('Are you sure you want to cancel these RMA units?')) {
                const res = await rpc('/account/rma/units/batch/delete', {
                    ids: selectedIds,
                });

                if (res?.status === 'success') {
                    reloadRmaUnitsListPage();
                } else if (res?.message) {
                    alert(res.message);
                }
            }
        });
    }
};

import { reloadLotsListPage, initLotsManagementListPage } from "./components/lot_list.js";
import { initLotsListSearch, initLotsAdvancedFilters, initLotsAdvancedSearch } from "./components/lot_search.js";
import { initLotsCheckboxSelect, reinitLotsSelection } from "./components/lot_selection.js";
import { initLotsQuickFilters } from "./components/lot_quick_filter.js";
import { initTableSorting } from "./components/stock_sorting.js";
import { initStickyTableHeader } from "./components/stock_header.js";

// Initialization on document load
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('lots-page-list-items')) return;
    
    // Get product_id from URL if exists
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product_id');
    
    // Initial load
    reloadLotsListPage(productId);
    
    // Initialize components
    initLotsManagementListPage();
    initLotsListSearch();
    initLotsCheckboxSelect();
    initLotsAdvancedFilters();
    initLotsAdvancedSearch();
    initLotsQuickFilters();
    initTableSorting();
    initStickyTableHeader();
    
    // Event listeners for reloading
    document.addEventListener('lots:reload', () => {
        reloadLotsListPage(productId);
        // Re-init selection after reload
        setTimeout(() => reinitLotsSelection(), 100);
    });
});

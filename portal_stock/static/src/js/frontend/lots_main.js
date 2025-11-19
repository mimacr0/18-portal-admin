import { reloadLotsListPage, initLotsManagementListPage } from "./components/stock_lots.js";
import { initProductsListSearch, portalAccountProductsInitAdvancedFilters, initAdvancedSearch } from "./components/stock_search.js";
import { portalAccountProductsInitCheckboxSelect } from "./components/stock_selection.js";
import { initTableSorting } from "./components/stock_sorting.js";
import { initStickyTableHeader } from "./components/stock_header.js";
import { initStockQuickSortFilters } from "./components/stock_quick_filter.js";

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('lots-page-list-items')) return;
    
    // Obtener product_id de la URL si existe
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product_id');
    
    reloadLotsListPage(productId);
    initLotsManagementListPage();
    document.addEventListener('lots:reload', () => reloadLotsListPage(productId));
    initProductsListSearch();
    portalAccountProductsInitCheckboxSelect();
    portalAccountProductsInitAdvancedFilters();
    initAdvancedSearch();
    initTableSorting();
    initStickyTableHeader();
    initStockQuickSortFilters();
});


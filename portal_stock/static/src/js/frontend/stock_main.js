import { reloadStockListPage, initProductsManagementListPage } from "./components/stock_list.js";
import { initProductsListSearch, portalAccountProductsInitAdvancedFilters, initAdvancedSearch } from "./components/stock_search.js";
import { initFileUploadModal } from "./components/stock_file_upload.js";
import { portalAccountProductsInitCheckboxSelect } from "./components/stock_selection.js";
import { initTableSorting } from "./components/stock_sorting.js";
import { initStickyTableHeader } from "./components/stock_header.js";
import { initStockQuickSortFilters } from "./components/stock_quick_filter.js";
import { initStockExport } from "./components/stock_export.js";
import { setupProductsImportModal } from "./components/stock_import.js";

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('stock-page-list-items')) return;
    reloadStockListPage();
    initProductsManagementListPage();
    document.addEventListener('list:reload', reloadStockListPage);
    initFileUploadModal();
    initProductsListSearch();
    portalAccountProductsInitCheckboxSelect();
    portalAccountProductsInitAdvancedFilters();
    initAdvancedSearch();
    initTableSorting();
    initStickyTableHeader();
    initStockQuickSortFilters();
    initStockExport();
    
    // Setup products import modal
    setupProductsImportModal(() => {
        // Reload the list after successful import
        reloadStockListPage();
    });
});

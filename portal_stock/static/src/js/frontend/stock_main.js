import { reloadStockListPage, initProductsManagementListPage } from "./components/stock_list.js";
import { initProductsListSearch, portalAccountProductsInitAdvancedFilters, initAdvancedSearch } from "./components/stock_search.js";
import { initFileUploadModal } from "./components/stock_file_upload.js";
import { portalAccountProductsInitCheckboxSelect } from "./components/stock_selection.js";
import { initTableSorting } from "./components/stock_sorting.js";

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    reloadStockListPage();
    initProductsManagementListPage();
    initFileUploadModal();
    initProductsListSearch();
    portalAccountProductsInitCheckboxSelect();
    portalAccountProductsInitAdvancedFilters();
    initAdvancedSearch();
    initTableSorting();
});

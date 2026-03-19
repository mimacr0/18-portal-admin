import { reloadSaleListPage, initSalesManagementListPage } from "./components/sale_list.js";
import { initSaleListSearch, portalAccountSaleInitAdvancedFilters, initAdvancedSearch } from "./components/sale_search.js";
import { portalAccountSaleInitCheckboxSelect } from "./components/sale_selection.js";
import { initTableSorting } from "./components/sale_sorting.js";
import { initStickyTableHeader } from "./components/sale_header.js";
import { initSaleQuickSortFilters } from "./components/sale_quick_filter.js";
import { initSaleNotes } from "./components/sale_notes.js";
import { initSaleExport } from "./components/sale_export.js";
import { initSaleColumnSelector } from "./components/sale_columns.js";

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    reloadSaleListPage();
    initSalesManagementListPage();
    initSaleListSearch();
    portalAccountSaleInitCheckboxSelect();
    portalAccountSaleInitAdvancedFilters();
    initAdvancedSearch();
    initTableSorting();
    initStickyTableHeader();
    initSaleQuickSortFilters();
    initSaleNotes();
    initSaleExport();
    initSaleColumnSelector();
});
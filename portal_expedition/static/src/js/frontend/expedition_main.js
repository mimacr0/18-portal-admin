import { reloadExpeditionListPage, initExpeditionsManagementListPage } from "./components/expedition_list.js";
import { initExpeditionListSearch, portalAccountExpeditionInitAdvancedFilters, initAdvancedSearch } from "./components/expedition_search.js";
import { initFileUploadModal } from "./components/expedition_file_upload.js";
import { portalAccountExpeditionInitCheckboxSelect } from "./components/expedition_selection.js";
import { initTableSorting } from "./components/expedition_sorting.js";
import { initStickyTableHeader } from "./components/expedition_header.js";
import { initExpeditionQuickSortFilters } from "./components/expedition_quick_filter.js";

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    reloadExpeditionListPage();
    initExpeditionsManagementListPage();
    initFileUploadModal();
    initExpeditionListSearch();
    portalAccountExpeditionInitCheckboxSelect();
    portalAccountExpeditionInitAdvancedFilters();
    initAdvancedSearch();
    initTableSorting();
    initStickyTableHeader();
    initExpeditionQuickSortFilters();
});
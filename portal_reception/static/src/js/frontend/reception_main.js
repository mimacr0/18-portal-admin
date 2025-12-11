import { reloadReceptionListPage, initReceptionsManagementListPage } from "./components/reception_list.js";
import { initReceptionListSearch, portalAccountReceptionInitAdvancedFilters, initAdvancedSearch } from "./components/reception_search.js";
import { portalAccountReceptionInitCheckboxSelect } from "./components/reception_selection.js";
import { initTableSorting } from "./components/reception_sorting.js";
import { initStickyTableHeader } from "./components/reception_header.js";
import { initReceptionQuickSortFilters } from "./components/reception_quick_filter.js";
import { initReceptionNotes } from "./components/reception_notes.js";
import { initReceptionExport } from "./components/reception_export.js";

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    reloadReceptionListPage();
    initReceptionsManagementListPage();
    // Use global function from portal_account
    if (window.initFileUploadModal) {
        window.initFileUploadModal({ onSuccess: () => reloadReceptionListPage() });
    }
    initReceptionListSearch();
    portalAccountReceptionInitCheckboxSelect();
    portalAccountReceptionInitAdvancedFilters();
    initAdvancedSearch();
    initTableSorting();
    initStickyTableHeader();
    initReceptionQuickSortFilters();
    initReceptionNotes();
    initReceptionExport();
});
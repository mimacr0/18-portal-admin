import { reloadReceptionListPage, initReceptionsManagementListPage } from "./components/reception_list.js";
import { initReceptionListSearch, portalAccountReceptionInitAdvancedFilters, initAdvancedSearch } from "./components/reception_search.js";
import { initFileUploadModal } from "./components/reception_file_upload.js";
import { portalAccountReceptionInitCheckboxSelect } from "./components/reception_selection.js";
import { initTableSorting } from "./components/reception_sorting.js";
import { initStickyTableHeader } from "./components/reception_header.js";
import { initReceptionQuickSortFilters } from "./components/reception_quick_filter.js";
import { initReceptionNotes } from "./components/reception_notes.js";

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    reloadReceptionListPage();
    initReceptionsManagementListPage();
    initFileUploadModal();
    initReceptionListSearch();
    portalAccountReceptionInitCheckboxSelect();
    portalAccountReceptionInitAdvancedFilters();
    initAdvancedSearch();
    initTableSorting();
    initStickyTableHeader();
    initReceptionQuickSortFilters();
    initReceptionNotes();
});
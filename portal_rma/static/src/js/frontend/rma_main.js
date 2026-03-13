import { reloadRmaUnitsListPage, initRmaUnitsManagementListPage } from "./components/rma_list.js";
import { initRmaListSearch, portalAccountRmaInitAdvancedFilters, initAdvancedSearch } from "./components/rma_search.js";
import { portalAccountRmaInitCheckboxSelect } from "./components/rma_selection.js";
import { initTableSorting } from "./components/rma_sorting.js";
import { initStickyTableHeader } from "./components/rma_header.js";
import { initRmaQuickSortFilters } from "./components/rma_quick_filter.js";
import { initRmaExport } from "./components/rma_export.js";
import { initRmaColumnSelector } from "./components/rma_columns.js";
import { initRmaCreate } from "./components/rma_create.js";
import { initRmaImport } from "./components/rma_import.js";

// Initialization on DOM content ready
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById('page-rma_units-main-container');
    if (mainContainer) {
        reloadRmaUnitsListPage();
        initRmaUnitsManagementListPage();
        initRmaListSearch();
        portalAccountRmaInitCheckboxSelect();
        portalAccountRmaInitAdvancedFilters();
        initAdvancedSearch();
        initTableSorting();
        initStickyTableHeader();
        initRmaQuickSortFilters();
        initRmaExport();
        initRmaColumnSelector();
        initRmaCreate();
        initRmaImport();
    }
});

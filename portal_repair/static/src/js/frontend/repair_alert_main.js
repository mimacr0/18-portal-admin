import { reloadRepairAlertListPage, initRepairAlertManagementListPage } from "./components/repair_alert_list.js";
import { initRepairAlertListSearch, portalAccountRepairAlertInitAdvancedFilters, initAdvancedSearch } from "./components/repair_alert_search.js";
import { initFileUploadModal } from "./components/repair_alert_file_upload.js";
import { portalAccountRepairAlertInitCheckboxSelect } from "./components/repair_alert_selection.js";
import { initTableSorting } from "./components/repair_alert_sorting.js";
import { initStickyTableHeader } from "./components/repair_alert_header.js";
import { initRepairAlertQuickSortFilters } from "./components/repair_alert_quick_filter.js";
import { initRepairExport } from "./components/repair_export.js";

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    reloadRepairAlertListPage();
    initRepairAlertManagementListPage();
    initFileUploadModal();
    initRepairAlertListSearch();
    portalAccountRepairAlertInitCheckboxSelect();
    portalAccountRepairAlertInitAdvancedFilters();
    initAdvancedSearch();
    initTableSorting();
    initStickyTableHeader();
    initRepairAlertQuickSortFilters();
    initRepairExport();
});
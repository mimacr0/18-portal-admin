import { reloadProductMappingListPage, initProductMappingListPage } from "./components/product_mapping_list.js";
import { initProductMappingSearch, initAdvancedSearch } from "./components/product_mapping_search.js";
import { initProductMappingCheckboxSelect } from "./components/product_mapping_selection.js";
import { initTableSorting } from "./components/product_mapping_sorting.js";
import { initProductMappingQuickSortFilters } from "./components/product_mapping_quick_filter.js";
import { initProductMappingColumnSelector } from "./components/product_mapping_columns.js";
import { initProductMappingCreate } from "./components/product_mapping_create.js";

// Initialization on DOM content ready
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById('page-product_mapping-main-container');
    if (mainContainer) {
        reloadProductMappingListPage();
        initProductMappingListPage();
        initProductMappingSearch();
        initProductMappingCheckboxSelect();
        initAdvancedSearch();
        initTableSorting();
        initProductMappingQuickSortFilters();
        initProductMappingColumnSelector();
        initProductMappingCreate();
    }
});

/**
 * Initializes checkbox selection for lots list
 */
export const initLotsCheckboxSelect = () => {
    const selectAllCheckboxes = [
        document.getElementById('page-lots-list-select-all-checkbox'),
        document.getElementById('page-lots-list-select-all-checkbox-md'),
        document.getElementById('page-lots-list-select-all-checkbox-sm')
    ].filter(Boolean);
    
    const bulkActionsToolbar = document.getElementById('bulk-actions-toolbar');
    const selectedCountSpan = document.getElementById('selected-count');
    const clearSelectionButton = document.getElementById('clear-selection');

    if (selectAllCheckboxes.length === 0 || !bulkActionsToolbar) return;

    // Clone and replace to remove existing listeners
    selectAllCheckboxes.forEach(checkbox => {
        const newCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    });

    // Get fresh references after cloning
    const freshSelectAllCheckboxes = [
        document.getElementById('page-lots-list-select-all-checkbox'),
        document.getElementById('page-lots-list-select-all-checkbox-md'),
        document.getElementById('page-lots-list-select-all-checkbox-sm')
    ].filter(Boolean);

    // Handle "Select All" checkboxes
    freshSelectAllCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const isChecked = this.checked;
            
            // Sync all select-all checkboxes
            freshSelectAllCheckboxes.forEach(cb => {
                cb.checked = isChecked;
            });

            // Update all lot checkboxes (unique IDs only)
            const processedIds = new Set();
            document.querySelectorAll('.lots-list-checkbox').forEach(cb => {
                const lotId = cb.dataset.lotId;
                if (!processedIds.has(lotId)) {
                    processedIds.add(lotId);
                    cb.checked = isChecked;
                }
            });

            // Sync duplicates
            document.querySelectorAll('.lots-list-checkbox').forEach(cb => {
                cb.checked = processedIds.has(cb.dataset.lotId) ? isChecked : cb.checked;
            });

            updateBulkActionsToolbar();
        });
    });

    // Handle individual lot checkboxes - event delegation
    const listContainer = document.getElementById('lots-page-list-items');
    if (listContainer) {
        listContainer.addEventListener('change', function(e) {
            if (e.target && e.target.classList.contains('lots-list-checkbox')) {
                const lotId = e.target.dataset.lotId;
                const isChecked = e.target.checked;
                
                // Sync all checkboxes with same ID
                document.querySelectorAll(`.lots-list-checkbox[data-lot-id="${lotId}"]`).forEach(cb => {
                    cb.checked = isChecked;
                });
                
                updateSelectAllCheckbox();
                updateBulkActionsToolbar();
            }
        });
    }

    // Handle clear selection button
    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', function() {
            document.querySelectorAll('.lots-list-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            freshSelectAllCheckboxes.forEach(cb => {
                cb.checked = false;
            });
            updateBulkActionsToolbar();
        });
    }

    // Update bulk actions toolbar based on selection
    function updateBulkActionsToolbar() {
        const selectedCount = getSelectedLots().length;

        if (selectedCount > 0) {
            bulkActionsToolbar.classList.remove('hidden');
            if (selectedCountSpan) selectedCountSpan.textContent = `${selectedCount} selected`;
        } else {
            bulkActionsToolbar.classList.add('hidden');
        }
    }

    // Update select all checkbox state
    function updateSelectAllCheckbox() {
        const uniqueIds = new Set();
        const checkedIds = new Set();
        
        document.querySelectorAll('.lots-list-checkbox').forEach(checkbox => {
            const lotId = checkbox.dataset.lotId;
            uniqueIds.add(lotId);
            if (checkbox.checked) {
                checkedIds.add(lotId);
            }
        });

        const allChecked = uniqueIds.size > 0 && uniqueIds.size === checkedIds.size;
        const someChecked = checkedIds.size > 0 && checkedIds.size < uniqueIds.size;

        freshSelectAllCheckboxes.forEach(cb => {
            cb.checked = allChecked;
            cb.indeterminate = someChecked;
        });
    }

    // Update state when filters applied
    document.addEventListener('lotsFiltersApplied', function() {
        updateSelectAllCheckbox();
        updateBulkActionsToolbar();
    });
};

/**
 * Get selected lots (unique IDs only)
 * @returns {Array} Array of objects with lot id and name
 */
export function getSelectedLots() {
    const selected = new Map();
    document.querySelectorAll('.lots-list-checkbox:checked').forEach(checkbox => {
        const id = checkbox.dataset.lotId;
        if (!selected.has(id)) {
            selected.set(id, {
                id: id,
                name: checkbox.dataset.lotName
            });
        }
    });
    return Array.from(selected.values());
}

/**
 * Re-initialize selection after list reload
 */
export const reinitLotsSelection = () => {
    initLotsCheckboxSelect();
};


export const portalAccountExpeditionInitCheckboxSelect = () => {

    const selectAllCheckbox = document.getElementById('page-expedition-list-select-all-checkbox');
    const bulkActionsToolbar = document.getElementById('bulk-actions-toolbar');
    const selectedCountSpan = document.getElementById('selected-count');
    const clearSelectionButton = document.getElementById('clear-selection');

    // Check if elements exist before adding event listeners
    if (!selectAllCheckbox || !bulkActionsToolbar) return;

    // Remove any existing event listeners to prevent duplicates
    const newSelectAllCheckbox = selectAllCheckbox.cloneNode(true);
    selectAllCheckbox.parentNode.replaceChild(newSelectAllCheckbox, selectAllCheckbox);

    // Handle "Select All" checkbox
    newSelectAllCheckbox.addEventListener('change', function() {
        const isChecked = this.checked;

        // Update all visible user checkboxes to match the select all state
        document.querySelectorAll('.packages-list-checkbox').forEach(checkbox => {
            // Only change checkboxes for visible rows
            if (checkbox.closest('tr').style.display !== 'none') {
                checkbox.checked = isChecked;
            }
        });

        updateBulkActionsToolbar();
    });

    // Handle individual user checkboxes - using event delegation for dynamically created checkboxes
    document.querySelector('table tbody').addEventListener('change', function(e) {
        if (e.target && e.target.classList.contains('packages-list-checkbox')) {
            updateSelectAllCheckbox();
            updateBulkActionsToolbar();
        }
    });

    // Handle clear selection button
    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', function() {
            document.querySelectorAll('.packages-list-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            newSelectAllCheckbox.checked = false;
            updateBulkActionsToolbar();
        });
    }

    // Update the bulk actions toolbar based on selection state
    function updateBulkActionsToolbar() {
        const selectedCount = getSelectedItems().length;

        if (selectedCount > 0) {
            bulkActionsToolbar.classList.remove('hidden');
            selectedCountSpan.textContent = `${selectedCount} selected`;
        } else {
            bulkActionsToolbar.classList.add('hidden');
        }
    }

    // Update the "Select All" checkbox based on individual checkboxes
    function updateSelectAllCheckbox() {
        const visibleCheckboxes = Array.from(document.querySelectorAll('.packages-list-checkbox')).filter(checkbox =>
            checkbox.closest('tr').style.display !== 'none'
        );

        const allChecked = visibleCheckboxes.length > 0 &&
                          visibleCheckboxes.every(checkbox => checkbox.checked);

        const someChecked = visibleCheckboxes.some(checkbox => checkbox.checked);

        newSelectAllCheckbox.checked = allChecked;
        newSelectAllCheckbox.indeterminate = someChecked && !allChecked;
    }

    // Helper function to get selected items (unique IDs only)
    function getSelectedItems() {
        const selected = new Map();
        document.querySelectorAll('.packages-list-checkbox:checked').forEach(checkbox => {
            const id = checkbox.dataset.packageId;
            if (!selected.has(id)) {
                selected.set(id, {
                    id: id,
                    name: checkbox.dataset.packageName || ''
                });
            }
        });
        return Array.from(selected.values());
    }

    // Update selection state when filters change
    document.addEventListener('filtersApplied', function() {
        updateSelectAllCheckbox();
        updateBulkActionsToolbar();
    });
}
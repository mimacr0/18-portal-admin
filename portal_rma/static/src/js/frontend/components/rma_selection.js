/**
 * Initializes the checkbox selection logic for the RMA units list.
 */
export const portalAccountRmaInitCheckboxSelect = () => {
    const pageName = 'rma_units';
    const selectAllCheckbox = document.getElementById(`page-${pageName}-list-select-all-checkbox`);
    const bulkActionsToolbar = document.getElementById('bulk-actions-toolbar');
    const selectedCountSpan = document.getElementById('selected-count');
    const clearSelectionButton = document.getElementById('clear-selection');

    if (!selectAllCheckbox || !bulkActionsToolbar) return;

    // Remove existing listeners
    const newSelectAllCheckbox = selectAllCheckbox.cloneNode(true);
    selectAllCheckbox.parentNode.replaceChild(newSelectAllCheckbox, selectAllCheckbox);

    const updateBulkActionsToolbar = () => {
        const selectedCount = document.querySelectorAll('.rma-units-list-checkbox:checked').length;
        if (selectedCount > 0) {
            bulkActionsToolbar.classList.remove('hidden');
            if (selectedCountSpan) selectedCountSpan.textContent = `${selectedCount} selected`;
        } else {
            bulkActionsToolbar.classList.add('hidden');
        }
    };

    const updateSelectAllCheckbox = () => {
        const checkboxes = Array.from(document.querySelectorAll('.rma-units-list-checkbox'));
        if (checkboxes.length === 0) {
            newSelectAllCheckbox.checked = false;
            newSelectAllCheckbox.indeterminate = false;
            return;
        }
        const allChecked = checkboxes.every(c => c.checked);
        const someChecked = checkboxes.some(c => c.checked);
        newSelectAllCheckbox.checked = allChecked;
        newSelectAllCheckbox.indeterminate = someChecked && !allChecked;
    };

    newSelectAllCheckbox.addEventListener('change', function() {
        const isChecked = this.checked;
        document.querySelectorAll('.rma-units-list-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateBulkActionsToolbar();
    });

    // Delegate events for row checkboxes
    const listBody = document.getElementById('rma-units-list-items');
    if (listBody) {
        listBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('rma-units-list-checkbox')) {
                updateSelectAllCheckbox();
                updateBulkActionsToolbar();
            }
        });
    }

    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', () => {
            document.querySelectorAll('.rma-units-list-checkbox').forEach(c => c.checked = false);
            newSelectAllCheckbox.checked = false;
            newSelectAllCheckbox.indeterminate = false;
            updateBulkActionsToolbar();
        });
    }

    document.addEventListener('filtersApplied', () => {
        updateSelectAllCheckbox();
        updateBulkActionsToolbar();
    });
};

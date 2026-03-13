/**
 * Handles checkbox selection for bulk actions in the product mapping list.
 */
export const initProductMappingCheckboxSelect = () => {
    const pageName = 'product_mapping';
    const selectAllCheckbox = document.getElementById(`page-${pageName}-list-select-all-checkbox`);
    const bulkActionsToolbar = document.getElementById('bulk-actions-toolbar');
    const selectedCountSpan = document.getElementById('selected-count');

    if (!selectAllCheckbox) return;

    const updateToolbar = () => {
        const checkedCheckboxes = document.querySelectorAll('.product-mapping-list-checkbox:checked');
        const totalChecked = checkedCheckboxes.length;

        if (totalChecked > 0) {
            bulkActionsToolbar.classList.remove('hidden');
            selectedCountSpan.textContent = `${totalChecked} selected`;
        } else {
            bulkActionsToolbar.classList.add('hidden');
        }
    };

    selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.product-mapping-list-checkbox');
        checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
        updateToolbar();
    });

    // Delegation for individual checkboxes as they might be reloaded
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('product-mapping-list-checkbox')) {
            updateToolbar();
            
            // Update select all state
            const total = document.querySelectorAll('.product-mapping-list-checkbox').length;
            const checked = document.querySelectorAll('.product-mapping-list-checkbox:checked').length;
            selectAllCheckbox.checked = total > 0 && total === checked;
        }
    });

    const clearBtn = document.getElementById('clear-selection');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            selectAllCheckbox.checked = false;
            document.querySelectorAll('.product-mapping-list-checkbox').forEach(cb => cb.checked = false);
            updateToolbar();
        });
    }
};

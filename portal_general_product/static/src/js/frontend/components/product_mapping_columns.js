/**
 * Handles the visibility of optional columns in the product mapping list.
 */
export const applyProductMappingColumnVisibility = () => {
    const pageName = 'product_mapping';
    const storageKey = `portal_${pageName}_columns`;
    const savedColumns = JSON.parse(localStorage.getItem(storageKey) || '{}');

    // Select all headers and cells that have a data-column-id
    const elements = document.querySelectorAll(`[data-column-id]`);
    
    elements.forEach(el => {
        const columnId = el.dataset.columnId;
        if (savedColumns[columnId] === false) {
            el.classList.add('hidden');
        } else if (savedColumns[columnId] === true) {
            el.classList.remove('hidden');
        }
    });

    // Update checkboxes in the selector if it exists
    const checkboxes = document.querySelectorAll('.product-mapping-column-toggle');
    checkboxes.forEach(cb => {
        const columnId = cb.dataset.columnId;
        if (columnId in savedColumns) {
            cb.checked = savedColumns[columnId];
        }
    });
};

/**
 * Initializes the column selector dropdown and events.
 */
export const initProductMappingColumnSelector = () => {
    const pageName = 'product_mapping';
    const selectorBtn = document.getElementById('product-mapping-columns-selector-btn');
    const dropdown = document.getElementById('product-mapping-columns-dropdown');
    
    if (selectorBtn && dropdown) {
        selectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== selectorBtn) {
                dropdown.classList.add('hidden');
            }
        });

        // Column toggles
        const checkboxes = document.querySelectorAll('.product-mapping-column-toggle');
        const storageKey = `portal_${pageName}_columns`;
        
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const columnId = cb.dataset.columnId;
                const savedColumns = JSON.parse(localStorage.getItem(storageKey) || '{}');
                savedColumns[columnId] = cb.checked;
                localStorage.setItem(storageKey, JSON.stringify(savedColumns));
                
                // Apply change immediately
                applyProductMappingColumnVisibility();
            });
        });

        // Initial apply
        applyProductMappingColumnVisibility();
    }
};

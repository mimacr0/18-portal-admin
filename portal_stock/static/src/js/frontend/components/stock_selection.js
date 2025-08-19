
export const portalAccountProductsInitCheckboxSelect = () => {

    const selectAllCheckbox = document.getElementById('page-stock-list-select-all-checkbox')
        || document.getElementById('page-products-list-select-all-checkbox');
    const bulkActionsToolbar = document.getElementById('bulk-actions-toolbar');
    const selectedCountSpan = document.getElementById('selected-count');
    const clearSelectionButton = document.getElementById('clear-selection');
    const bulkPackageButton = document.getElementById('bulk-product-package-create');

    // Check if elements exist before adding event listeners
    if (!selectAllCheckbox || !bulkActionsToolbar) return;

    // Remove any existing event listeners to prevent duplicates
    const newSelectAllCheckbox = selectAllCheckbox.cloneNode(true);
    selectAllCheckbox.parentNode.replaceChild(newSelectAllCheckbox, selectAllCheckbox);

    // Handle "Select All" checkbox
    newSelectAllCheckbox.addEventListener('change', function() {
        const isChecked = this.checked;

        // Update all visible user checkboxes to match the select all state
        document.querySelectorAll('.products-list-checkbox').forEach(checkbox => {
            // Only change checkboxes for visible rows
            if (checkbox.closest('tr').style.display !== 'none') {
                checkbox.checked = isChecked;
            }
        });

        updateBulkActionsToolbar();
    });

    // Handle individual product checkboxes - using event delegation for dynamically created checkboxes
    const listContainer = document.getElementById('stock-page-list-items') || document.querySelector('table tbody');
    if (listContainer) {
        listContainer.addEventListener('change', function(e) {
            if (e.target && e.target.classList.contains('products-list-checkbox')) {
                updateSelectAllCheckbox();
                updateBulkActionsToolbar();
            }
        });
    }

    // Handle clear selection button
    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', function() {
            document.querySelectorAll('.products-list-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            newSelectAllCheckbox.checked = false;
            updateBulkActionsToolbar();
        });
    }

    if (bulkPackageButton) {
        bulkPackageButton.addEventListener('click', function() {
            const selectedItems = getSelectedItems(); // ← ahora devuelve [{ id, name }]

            if (selectedItems.length > 0) {
                const selectedIds = selectedItems.map(item => item.id); // Extraer solo los IDs
                console.log('Creating package for:', selectedItems);

                // Asignar solo los IDs al input hidden
                document.getElementById('portal_products_package_create_ids').value = selectedIds.join(',');
                console.log(document.getElementById('portal_products_package_create_ids').value)
                // Llenar la tabla con los objetos que contienen id y name
                window.itemsMap = populateProductTable(selectedItems);

                Modal.open('portal_products_package_create');

            }
        });
    }

    function populateProductTable(selectedItemIds) {
        const tbody = document.querySelector('#productTable tbody');
        tbody.innerHTML = ''; // Limpiar filas anteriores

        // Crear el Map para guardar datos
        const itemsMap = new Map();

        selectedItemIds.forEach(function(item) {
            const tr = document.createElement('tr');

            // Columna numBox
            const tdNumBox = document.createElement('td');
            const inputNumBox = document.createElement('input');
            inputNumBox.type = 'number';
            inputNumBox.value = '1';
            inputNumBox.min = '1';
            inputNumBox.className = 'w-full p-0 text-center';
            tdNumBox.className = 'border border-gray-300 px-4 py-2 text-center'; // Aplica el borde a la celda

            tdNumBox.appendChild(inputNumBox);

            // Columna Item ID
            const tdItemName = document.createElement('td');
            tdItemName.textContent = item.name;
            tdItemName.className = 'border border-gray-300 px-4 py-2 text-center';

            // Columna Número de Lote
            const tdLotNumber = document.createElement('td');
            const inputLotNumber = document.createElement('input');
            inputLotNumber.type = 'text';
            inputLotNumber.placeholder = 'Lote';
            inputLotNumber.className = 'w-full border-gray-300 p-0 text-center';
            tdLotNumber.appendChild(inputLotNumber);

            // Columna cantidad
            const tdQuantity = document.createElement('td');
            const inputQuantity = document.createElement('input');
            inputQuantity.type = 'number';
            inputQuantity.value = '1';
            inputQuantity.min = '1';
            inputQuantity.className = 'w-full p-0 text-center';
            tdQuantity.className = 'border border-gray-300 px-4 py-2 text-center'; // Aplica el borde a la celda
            tdQuantity.appendChild(inputQuantity);

            tr.appendChild(tdNumBox);
            tr.appendChild(tdItemName);
            tr.appendChild(tdLotNumber);
            tr.appendChild(tdQuantity);
            tbody.appendChild(tr);

            // Inicializar en Map
             itemsMap.set(item.id, {
                box_num: Number(inputNumBox.value),
                quantity: Number(inputQuantity.value),
                lot_number: inputLotNumber.value
            });
            inputNumBox.addEventListener('input', () => {
                const current = itemsMap.get(item.id) || {};
                itemsMap.set(item.id, {
                    ...current,
                    box_num: Number(inputNumBox.value)
                });
            });

            inputQuantity.addEventListener('input', () => {
                const current = itemsMap.get(item.id) || {};
                itemsMap.set(item.id, {
                    ...current,
                    quantity: Number(inputQuantity.value)
                });
            });
            inputLotNumber.addEventListener('input', () => {
            const current = itemsMap.get(item.id) || {};
            itemsMap.set(item.id, {
                ...current,
                lot_number: inputLotNumber.value.trim()
            });
        });
        });

        return itemsMap; // Devuelve el mapa para usarlo externamente
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
        const visibleCheckboxes = Array.from(document.querySelectorAll('.products-list-checkbox')).filter(checkbox =>
            checkbox.closest('tr').style.display !== 'none'
        );

        const allChecked = visibleCheckboxes.length > 0 &&
                          visibleCheckboxes.every(checkbox => checkbox.checked);

        const someChecked = visibleCheckboxes.some(checkbox => checkbox.checked);

        newSelectAllCheckbox.checked = allChecked;
        newSelectAllCheckbox.indeterminate = someChecked && !allChecked;
    }

    // Helper function to get selected items
    function getSelectedItems() {
        return Array.from(document.querySelectorAll('.products-list-checkbox'))
            .filter(checkbox => checkbox.checked)
            .map(checkbox => ({
                id: checkbox.dataset.productId,
                name: checkbox.dataset.productName
            }));
    }

    // Update selection state when filters change
    document.addEventListener('filtersApplied', function() {
        updateSelectAllCheckbox();
        updateBulkActionsToolbar();
    });
}

import { rpc } from "@web/core/network/rpc";

const reloadStockListPage = async () => {
    const pageListItems = document.getElementById('stock-page-list-items');
    if(!pageListItems) return;

    const currentPageInput = document.getElementById('stock-list-pagination-page');
    if(!currentPageInput) return;
    const currentPage = parseInt(currentPageInput.value);

    const searchInput = document.getElementById('page-stock-products-list-search');
    if(!searchInput) return;
    const search = searchInput.value;

    // Get advanced search domain if it exists
    const domainInput = document.getElementById('page-products-list-advanced-search-domain');
    const domain = domainInput ? JSON.parse(domainInput.value || '[]') : [];

    // Get match type if it exists
    const matchTypeSelect = document.getElementById('page-products-list-advanced-search-match-type');
    const matchType = matchTypeSelect ? matchTypeSelect.value : 'all';

    const res = await rpc('/account/stock/list/reload', {
        page: currentPage,
        search: search,
        domain: domain,
        match_type: matchType,
        sort: sortConfig.column,
        order: sortConfig.direction
    });
    if(res?.status != 'success') return;

    if(pageListItems) pageListItems.innerHTML = res.list;

    const paginationContainer = document.getElementById('stock-list-pagination-container');
    if(paginationContainer) paginationContainer.innerHTML = res.pager;

    // Paginador: IDs y clases corregidos
    const paginationPrevious = document.getElementById('stock-list-pagination-previous');
    const paginationButton = document.querySelectorAll('.stock-list-pagination-button');
    const paginationNext = document.getElementById('stock-list-pagination-next');

    if(paginationPrevious) paginationPrevious.addEventListener('click', () => {
        if((currentPage - 1) < 1) return;
        currentPageInput.value = currentPage - 1;
        reloadStockListPage();
    });

    if(paginationButton) paginationButton.forEach(button => {
        button.addEventListener('click', () => {
            currentPageInput.value = parseInt(button.dataset.page);
            reloadStockListPage();
        });
    });

    if(paginationNext) paginationNext.addEventListener('click', () => {
        if((currentPage + 1) > res.last_page) return;
        currentPageInput.value = currentPage + 1;
        reloadStockListPage();
    });
}

// Implementación de debounce para controlar la frecuencia de búsqueda
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

const initProductsListSearch = () => {
    const searchInput = document.getElementById('page-stock-products-list-search');
    if(!searchInput) {
        console.error('No se encontró el input de búsqueda con ID: page-stock-products-list-search');
        return;
    }
    
    const currentPageInput = document.getElementById('stock-list-pagination-page');
    if(!currentPageInput) return;
    
    // Corrigiendo el debounce - usando la función que hemos definido arriba
    searchInput.addEventListener('input', debounce(() => {
        currentPageInput.value = 1;
        reloadStockListPage();
    }, 500));
}

const initStockManagementListPage = () => {
    const createButton = document.getElementById('launch-create-stock-form-button');
    if(createButton) createButton.addEventListener('click', () => {
        Modal.open('page-stock-list-create-modal');
    });
    const fileUploadButton = document.getElementById('page-list-stock-tools-action-import');
    if(fileUploadButton) fileUploadButton.addEventListener('click', () => {
        Modal.open('file-upload-modal');
    });
}

// Helper function to create file icon based on file type
function createFileIcon(file) {
    // Determine file type icon and color
    let iconClass = 'fa-file';
    let iconColor = 'text-gray-500';

    if (file.type && file.type.startsWith('image/')) {
        iconClass = 'fa-file-image';
        iconColor = 'text-blue-500';
    } else if (file.type && file.type.includes('pdf')) {
        iconClass = 'fa-file-pdf';
        iconColor = 'text-red-500';
    } else if (file.type && file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        iconClass = 'fa-file-word';
        iconColor = 'text-blue-600';
    } else if (file.type && file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        iconClass = 'fa-file-excel';
        iconColor = 'text-green-600';
    } else if (file.type && (file.type.includes('zip') || file.type.includes('rar'))) {
        iconClass = 'fa-file-archive';
        iconColor = 'text-yellow-600';
    } else if (file.type && file.type.includes('audio')) {
        iconClass = 'fa-file-audio';
        iconColor = 'text-purple-500';
    } else if (file.type && file.type.includes('video')) {
        iconClass = 'fa-file-video';
        iconColor = 'text-pink-500';
    }

    // Create the icon element
    const icon = document.createElement('div');
    icon.classList.add('flex-shrink-0', 'mr-1.5');
    icon.innerHTML = `<i class="fas ${iconClass} ${iconColor}"></i>`;

    return icon;
}

// Format file size helper
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update the file preview area
function updateFilePreview(files, previewElement) {
    if (!previewElement || !files || files.length === 0) {
        return;
    }

    // Clear previous preview
    previewElement.innerHTML = '';

    // Check if this is a single file input or multiple files
    const isMultiple = files.length > 1 || files[0].webkitRelativePath;

    if (isMultiple) {
        // Multiple files UI
        const filesContainer = document.createElement('div');
        filesContainer.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-3', 'gap-2', 'w-full');

        // Add file count indicator
        const fileCountBar = document.createElement('div');
        fileCountBar.classList.add('col-span-full', 'text-xs', 'text-gray-600', 'dark:text-gray-400', 'mb-2', 'pb-1', 'border-b', 'border-gray-200', 'dark:border-gray-700');
        fileCountBar.innerHTML = `<span class="font-medium">${files.length}</span> file${files.length > 1 ? 's' : ''} selected`;
        filesContainer.appendChild(fileCountBar);

        // Process each file
        Array.from(files).forEach(file => {
            // Create a minimalist file item
            const fileItem = document.createElement('div');
            fileItem.classList.add('flex', 'items-center', 'bg-gray-50', 'dark:bg-gray-800', 'rounded', 'p-1.5', 'border', 'border-gray-200', 'dark:border-gray-700');

            // File type icon and styling
            const icon = createFileIcon(file);

            // Create a file info wrapper with controlled width
            const fileInfoWrapper = document.createElement('div');
            fileInfoWrapper.classList.add('flex-1', 'min-w-0');

            // Create the file name element inside the wrapper
            const fileNameElement = document.createElement('div');
            fileNameElement.classList.add('truncate', 'text-xs');
            fileNameElement.title = `${file.name} (${formatFileSize(file.size)})`;
            fileNameElement.textContent = file.name;
            fileInfoWrapper.appendChild(fileNameElement);

            // Create a remove button
            const removeBtn = document.createElement('button');
            removeBtn.classList.add('flex-shrink-0', 'ml-1.5', 'text-gray-400', 'hover:text-red-500', 'text-xs');
            removeBtn.innerHTML = `<i class="fas fa-times"></i>`;
            removeBtn.title = "Remove file";
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                fileItem.remove();

                // Update file count
                const remainingFiles = filesContainer.querySelectorAll('.flex.items-center') || [];
                fileCountBar.innerHTML = `<span class="font-medium">${remainingFiles.length}</span> file${remainingFiles.length > 1 ? 's' : ''} selected`;

                if (remainingFiles.length === 0) {
                    previewElement.innerHTML = '';
                }
            };

            // Assemble the file item
            fileItem.appendChild(icon);
            fileItem.appendChild(fileInfoWrapper);
            fileItem.appendChild(removeBtn);

            // Add to the container
            filesContainer.appendChild(fileItem);
        });

        previewElement.appendChild(filesContainer);
    } else {
        // Single file UI
        const file = files[0];
        const fileItem = document.createElement('div');
        fileItem.classList.add('flex', 'items-center', 'bg-gray-50', 'dark:bg-gray-800', 'rounded', 'p-2', 'border', 'border-gray-200', 'dark:border-gray-700', 'w-full');

        // File icon or small thumbnail
        if (file.type && file.type.startsWith('image/')) {
            // Small image thumbnail
            const imgContainer = document.createElement('div');
            imgContainer.classList.add('flex-shrink-0', 'mr-3', 'size-8', 'rounded', 'overflow-hidden', 'bg-white', 'dark:bg-gray-700');

            const img = document.createElement('img');
            img.classList.add('w-full', 'h-full', 'object-cover');
            img.alt = file.name;

            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

            imgContainer.appendChild(img);
            fileItem.appendChild(imgContainer);
        } else {
            // File type icon
            const icon = createFileIcon(file);
            icon.classList.add('mr-3');
            fileItem.appendChild(icon);
        }

        // File info
        const fileInfo = document.createElement('div');
        fileInfo.classList.add('flex-1', 'min-w-0');

        const fileName = document.createElement('div');
        fileName.classList.add('truncate', 'text-sm', 'font-medium', 'text-gray-800', 'dark:text-gray-200');
        fileName.title = file.name;
        fileName.textContent = file.name;

        const fileSize = document.createElement('div');
        fileSize.classList.add('text-xs', 'text-gray-500', 'dark:text-gray-400');
        fileSize.textContent = formatFileSize(file.size);

        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(fileInfo);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.classList.add('flex-shrink-0', 'ml-2', 'text-gray-400', 'hover:text-red-500');
        removeBtn.innerHTML = `<i class="fas fa-times"></i>`;
        removeBtn.title = "Remove file";
        removeBtn.onclick = function() {
            previewElement.innerHTML = '';
        };

        fileItem.appendChild(removeBtn);
        previewElement.appendChild(fileItem);
    }
}

// Initialize drag and drop functionality for file upload areas
function initDragDropUpload(container) {
    const dropArea = container.querySelector('.file-drop-area');
    const fileInput = container.querySelector('input[type="file"]');
    const previewArea = container.querySelector('.file-preview');
    const browseLink = container.querySelector('.browse-link');

    if (!dropArea || !fileInput) return;

    let isDialogOpen = false;
    const allowMultiple = fileInput.hasAttribute('multiple');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function openFileDialog() {
        if (!isDialogOpen) {
            isDialogOpen = true;
            fileInput.click();
            setTimeout(() => {
                isDialogOpen = false;
            }, 1000);
        }
    }

    // Add click handler to the drop area
    dropArea.addEventListener('click', function(e) {
        if (!e.target.closest('.browse-link')) {
            openFileDialog();
        }
    });

    // Handle browse link click
    if (browseLink) {
        browseLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openFileDialog();
        });
    }

    // Highlight drop area when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, function() {
            dropArea.classList.add('file-drop-area-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, function() {
            dropArea.classList.remove('file-drop-area-active');
        }, false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            if (!allowMultiple && files.length > 1) {
                const singleFile = new DataTransfer();
                singleFile.items.add(files[0]);
                fileInput.files = singleFile.files;
                updateFilePreview(singleFile.files, previewArea);
            } else {
                fileInput.files = files;
                updateFilePreview(files, previewArea);
            }
        }
    }, false);

    // Handle file input change
    fileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            try {
                updateFilePreview(this.files, previewArea);
                isDialogOpen = false;

                // Remove error state if it was applied
                this.classList.remove('border-red-500');
                const errorElement = container.querySelector('.form-error');
                if (errorElement) {
                    errorElement.style.display = 'none';
                }

                // Show the preview area
                if (previewArea) {
                    previewArea.style.display = 'flex';
                }
            } catch (err) {
                console.error('Error handling file selection:', err);
            }
        }
    });
}

// Initialize file upload modal
function initFileUploadModal() {
    const fileUploadModal = document.getElementById('file-upload-modal');
    if (!fileUploadModal) return;

    initDragDropUpload(fileUploadModal);

    const saveBtn = fileUploadModal.querySelector('.modal-btn-primary');

    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            let isValid = true;
            const fileInput = fileUploadModal.querySelector('input[type="file"][required]');

            if (fileInput && (!fileInput.files || fileInput.files.length === 0)) {
                isValid = false;
                fileInput.classList.add('border-red-500');
                const errorElement = fileUploadModal.querySelector('.form-error');
                if (errorElement) {
                    errorElement.style.display = 'block';
                }
            }

            if (isValid) {
                // Close modal after a short delay
                setTimeout(() => {
                    Modal.close('file-upload-modal');
                }, 1500);
            }
        });
    }

    // Re-initialize file upload when modal opens
    document.addEventListener('modalOpened', function(e) {
        if (e.detail.modalId === 'file-upload-modal') {
            initDragDropUpload(fileUploadModal);
        }
    });
}

const portalAccountProductsInitCheckboxSelect = () => {

    const selectAllCheckbox = document.getElementById('page-products-list-select-all-checkbox');
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

    // Handle individual user checkboxes - using event delegation for dynamically created checkboxes
    document.querySelector('table tbody').addEventListener('change', function(e) {
        if (e.target && e.target.classList.contains('list-product-checkbox')) {
            updateSelectAllCheckbox();
            updateBulkActionsToolbar();
        }
    });

    // Handle clear selection button
    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', function() {
            document.querySelectorAll('.list-product-checkbox').forEach(checkbox => {
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
        const visibleCheckboxes = Array.from(document.querySelectorAll('.list-product-checkbox')).filter(checkbox =>
            checkbox.closest('tr').style.display !== 'none'
        );

        const allChecked = visibleCheckboxes.length > 0 &&
                          visibleCheckboxes.every(checkbox => checkbox.checked);

        const someChecked = visibleCheckboxes.some(checkbox => checkbox.checked);

        newSelectAllCheckbox.checked = allChecked;
        newSelectAllCheckbox.indeterminate = someChecked && !allChecked;
    }

    // Helper function to get selected user IDs
    // function getSelectedItemIds() {
        // return Array.from(document.querySelectorAll('.list-product-checkbox'))
            // .filter(checkbox => checkbox.checked)
            // .map(checkbox => checkbox.dataset.productId);
    // }
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

const portalAccountProductsInitAdvancedFilters = async () => {
    const res = await rpc('/account/stock/list/advanced_filters');
    if(res?.status != 'success') return;

    const advancedFiltersContainer = document.getElementById('page-products-list-advanced-search-fields');
    if(!advancedFiltersContainer) return;

    advancedFiltersContainer.innerHTML = res.filters;
}

let sortConfig = {
    column: null,
    direction: 'asc'
};

function getColumnNameByIndex(index) {
    // Adjust index if select-all checkbox is present
    const hasBatchActions = document.getElementById('page-products-list-select-all-checkbox') !== null;
    if (hasBatchActions) index--;

    const columns = ['name', 'sku', 'barcode', 'status', 'actions'];
    return index >= 0 && index < columns.length ? columns[index] : null;
}

function initAdvancedSearch() {
    const advancedSearchToggle = document.getElementById('page-products-list-advanced-search-toggle');
    const advancedSearchPanel = document.getElementById('page-products-list-advanced-search-panel');
    const applyAdvancedSearchButton = document.getElementById('page-products-list-advanced-search-apply-btn');
    const resetAdvancedSearchButton = document.getElementById('page-products-list-advanced-search-reset-btn');
    const addFilterLineBtn = document.getElementById('page-products-list-advanced-search-add-line-btn');
    const matchTypeSelector = document.getElementById('page-products-list-advanced-search-match-type');
    const linesContainer = document.getElementById('page-products-list-advanced-search-lines-container');

    if (!advancedSearchToggle || !advancedSearchPanel) return;

    // Toggle advanced search panel
    advancedSearchToggle.addEventListener('click', function() {
        if (advancedSearchPanel.classList.contains('hidden')) {
            advancedSearchPanel.classList.remove('hidden');
            setTimeout(() => {
                advancedSearchPanel.style.opacity = '1';
            }, 10);
            advancedSearchToggle.classList.add('bg-gray-100', 'text-cyan-600');
        } else {
            advancedSearchPanel.classList.add('hidden');
            advancedSearchToggle.classList.remove('bg-gray-100', 'text-cyan-600');
        }
    });

    // Add new filter line
    if (addFilterLineBtn) {
        addFilterLineBtn.addEventListener('click', function() {
            addFilterLine();
        });
    }

    // Reset filters
    if (resetAdvancedSearchButton) {
        resetAdvancedSearchButton.addEventListener('click', function() {
            resetFilters();
        });
    }

    // Apply filters
    if (applyAdvancedSearchButton) {
        applyAdvancedSearchButton.addEventListener('click', function() {
            applyFiltersAndSort();
            advancedSearchPanel.classList.add('hidden');
            advancedSearchToggle.classList.remove('bg-gray-100', 'text-cyan-600');
        });
    }

    // Add initial filter line if none exist
    if (linesContainer && linesContainer.children.length === 0) {
        addFilterLine();
    }
}

function addFilterLine() {
    const fieldsData = JSON.parse(document.getElementById('page-products-list-advanced-search-fields').value);
    const linesContainer = document.getElementById('page-products-list-advanced-search-lines-container');

    const lineId = Date.now();
    const line = document.createElement('div');
    line.className = 'flex flex-wrap items-center gap-2 mb-3';
    line.dataset.lineId = lineId;

    // Field select
    const fieldSelect = document.createElement('select');
    fieldSelect.className = 'px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    fieldSelect.dataset.type = 'field';

    fieldsData.forEach(field => {
        const option = document.createElement('option');
        option.value = field.id;
        option.textContent = field.label;
        fieldSelect.appendChild(option);
    });

    // Operator select
    const operatorSelect = document.createElement('select');
    operatorSelect.className = 'px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    operatorSelect.dataset.type = 'operator';

    const operators = [
        { value: 'ilike', label: 'Contains' },
        { value: 'not ilike', label: 'Does not contain' },
        { value: '=', label: 'Equals' },
        { value: '!=', label: 'Does not equal' }
    ];

    operators.forEach(op => {
        const option = document.createElement('option');
        option.value = op.value;
        option.textContent = op.label;
        operatorSelect.appendChild(option);
    });

    // Value input
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    valueInput.dataset.type = 'value';
    valueInput.placeholder = 'Value';

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'text-gray-500 hover:text-red-500';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', function() {
        line.remove();
    });

    line.appendChild(fieldSelect);
    line.appendChild(operatorSelect);
    line.appendChild(valueInput);
    line.appendChild(removeBtn);

    linesContainer.appendChild(line);
}

function resetFilters() {
    const linesContainer = document.getElementById('page-products-list-advanced-search-lines-container');
    linesContainer.innerHTML = '';
    addFilterLine();
    document.getElementById('page-products-list-advanced-search-match-type').value = 'all';
    document.getElementById('page-products-list-advanced-search-domain').value = '[]';
}

function buildSearchDomain() {
    const matchType = document.getElementById('page-products-list-advanced-search-match-type').value;
    const lines = document.querySelectorAll('#page-products-list-advanced-search-lines-container > div');
    const conditions = [];

    lines.forEach(line => {
        const field = line.querySelector('[data-type="field"]').value;
        const operator = line.querySelector('[data-type="operator"]').value;
        const value = line.querySelector('[data-type="value"]').value.trim();

        if (value) {
            conditions.push([field, operator, value]);
        }
    });

    if (conditions.length === 0) return [];

    document.getElementById('page-products-list-advanced-search-domain').value = JSON.stringify(conditions);
    return conditions;
}

async function applyFiltersAndSort() {
    const searchDomain = buildSearchDomain();
    const matchType = document.getElementById('page-stock-list-advanced-search-match-type').value;
    const currentPageInput = document.getElementById('stock-list-pagination-page');
    currentPageInput.value = 1;

    const searchInput = document.getElementById('page-stock-products-list-search');
    // Añadir una verificación y mensaje de error si no se encuentra
    if (!searchInput) {
        console.error('No se encontró el input de búsqueda con ID: page-stock-products-list-search');
    }
    const search = searchInput ? searchInput.value : '';

    const pageListItems = document.getElementById('stock-page-list-items');

    try {
        const res = await rpc('/account/stock/list/reload', {
            page: 1,
            search: search,
            domain: searchDomain,
            match_type: matchType,
            sort: sortConfig.column,
            order: sortConfig.direction
        });

        if (res?.status !== 'success') return;

        if (pageListItems) pageListItems.innerHTML = res.list;

        const paginationContainer = document.getElementById('stock-list-pagination-container');
        if (paginationContainer) paginationContainer.innerHTML = res.pager;

        // IDs y clases corregidos para paginador
        const paginationPrevious = document.getElementById('stock-list-pagination-previous');
        const paginationButton = document.querySelectorAll('.stock-list-pagination-button');
        const paginationNext = document.getElementById('stock-list-pagination-next');

        if (paginationPrevious) {
            paginationPrevious.addEventListener('click', () => {
                if ((parseInt(currentPageInput.value) - 1) < 1) return;
                currentPageInput.value = parseInt(currentPageInput.value) - 1;
                reloadStockListPage();
            });
        }

        if (paginationButton) {
            paginationButton.forEach(button => {
                button.addEventListener('click', () => {
                    currentPageInput.value = parseInt(button.dataset.page);
                    reloadStockListPage();
                });
            });
        }

        if (paginationNext) {
            paginationNext.addEventListener('click', () => {
                if ((parseInt(currentPageInput.value) + 1) > res.last_page) return;
                currentPageInput.value = parseInt(currentPageInput.value) + 1;
                reloadStockListPage();
            });
        }

        document.dispatchEvent(new CustomEvent('filtersApplied'));
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

function initTableSorting() {
    const sortButtons = document.querySelectorAll('th .fas.fa-sort');

    sortButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const column = e.target.closest('th');
            const columnIndex = Array.from(column.parentNode.children).indexOf(column);
            const columnName = getColumnNameByIndex(columnIndex);

            if (!columnName || columnName === 'actions') return;

            // Reset all sort icons
            sortButtons.forEach(btn => {
                btn.classList.remove('fa-sort-up', 'fa-sort-down');
                btn.classList.add('fa-sort');
            });

            // Toggle sort direction
            if (sortConfig.column === columnName && sortConfig.direction === 'asc') {
                sortConfig.direction = 'desc';
                button.classList.remove('fa-sort');
                button.classList.add('fa-sort-down');
            } else if (sortConfig.column === columnName && sortConfig.direction === 'desc') {
                sortConfig.column = null;
                sortConfig.direction = 'asc';
            } else {
                sortConfig.column = columnName;
                sortConfig.direction = 'asc';
                button.classList.remove('fa-sort');
                button.classList.add('fa-sort-up');
            }

            // Apply new sorting
            applyFiltersAndSort();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    reloadStockListPage();
    initStockManagementListPage();
    initFileUploadModal();
    initProductsListSearch();
    portalAccountProductsInitCheckboxSelect();
    portalAccountProductsInitAdvancedFilters();
    initAdvancedSearch();
    initTableSorting();
});
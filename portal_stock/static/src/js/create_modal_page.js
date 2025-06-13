import { rpc } from "@portal_admin_theme/network/rpc";

const computeTotalVolume = (widthEl, heightEl, lengthEl, volumeEl) => {
    if (!widthEl || !heightEl || !lengthEl || !volumeEl) return;

    const width = parseFloat(widthEl.value) || 0;
    const height = parseFloat(heightEl.value) || 0;
    const length = parseFloat(lengthEl.value) || 0;

    const volume = width * height * length;
    volumeEl.value = volume > 0 ? volume.toFixed(2) : '';
};

const ProductListCreate = async () => {
    if(!sysFormValidate('#page-stock-list-product-create-form')) return;
    showLoadingScreen()

    // Collect all form data
    const { formData, fileData } = sysCollectFormData('#page-stock-list-product-create-form');
    let hasFiles = Object.keys(fileData).length > 0;

    // Process attributes
    const attributes = [];
    const attributeLines = document.querySelectorAll('#page-stock-list-create-form-attributes-line-items-container .line-item');
    for(const line of attributeLines) {
        const attributeId = jQuery(line.querySelector('.page-stock-list-create-form-attribute-select')).val();
        const attributeValueId = jQuery(line.querySelector('.page-stock-list-create-form-attribute-value-select')).val();

        if(attributeId && attributeValueId) {
            attributes.push({
                attribute_id: attributeId,
                attribute_value_id: attributeValueId
            });
        }
    }

    // Add attributes to form data
    formData.attributes = JSON.stringify(attributes);

    // Call API to create product
    const response = await rpc('/account/stock/create/product', formData);

    console.log(response);
    hideLoadingScreen();
    Modal.close('page-stock-list-create-modal');

    systemShowNotification(response.message, {
        type: response.status === 'success' ? 'success' : 'error',
        duration: 5000
    });

    // If success, reload the list
    if(response.status === 'success') {
        const listReloadEvent = new CustomEvent('list:reload');
        document.dispatchEvent(listReloadEvent);
    }

    document.querySelectorAll('.list-product-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.querySelector('#bulk-actions-toolbar').classList.add('hidden');
    const selectAllCheckbox = document.querySelector('#page-stock-list-select-all-checkbox');
    if(selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

const initProductListCreatetModal = () => {
    const submitButton = document.getElementById('page-stock-list-create-product-form-submit')
    if(submitButton) {
        submitButton.addEventListener('click', ProductListCreate);
    }
}

const initAddAttributesToProduct = () => {
    const modal = document.getElementById('page-stock-list-create-modal');
    const container = document.getElementById('page-stock-list-create-form-attributes-line-items-container');
    const addBtn = document.getElementById('page-stock-list-create-form-attributes-add-line-btn');
    const addProductForm = document.getElementById('page-stock-list-product-create-form');
    const addProductFooter = document.getElementById('page-stock-list-create-product-form-footer');
    const attrInput = document.getElementById('page-stock-list-create-form-attributes-list');

    let lineCounter = 0;

    document.addEventListener('modalClosed', (e) => {
        if(e.detail.modalId !== 'page-stock-list-create-modal') return;

        // Reset form visibility
        addProductForm.classList.remove('hidden');
        addProductFooter.classList.remove('hidden');

        // Reset all form inputs
        document.getElementById('page-stock-list-create-form-name').value = '';
        document.getElementById('page-stock-list-create-form-tracking').value = 'none';
        document.getElementById('page-stock-list-create-form-measures-width').value = '';
        document.getElementById('page-stock-list-create-form-measures-height').value = '';
        document.getElementById('page-stock-list-create-form-measures-length').value = '';
        document.getElementById('page-stock-list-create-form-volume').value = '';
        document.getElementById('page-stock-list-create-form-weight').value = '';
        document.getElementById('page-stock-list-create-form-sku').value = '';
        document.getElementById('page-stock-list-create-form-barcode').value = '';

        // Reset attributes
        container.innerHTML = '';
        attrInput.value = '[]';

        // Reset any error messages
        document.querySelectorAll('.form-error').forEach(el => {
            el.classList.add('invisible');
            el.textContent = '';
        });
    });

    const updateAttributeValues = async () => {
        const attributeLines = document.querySelectorAll('#page-stock-list-create-form-attributes-container .line-item');
        const attributes = [];
        for(const line of attributeLines) {
            const attributeId = jQuery(line.querySelector('.page-stock-list-create-form-attribute-select')).val();
            const attributeValueId = jQuery(line.querySelector('.page-stock-list-create-form-attribute-value-select')).val();

            if(attributeId && attributeValueId) attributes.push({
                attribute_id: attributeId,
                attribute_value_id: attributeValueId
            });
        }
        document.getElementById('page-stock-list-create-form-attributes-list').value = JSON.stringify(attributes);
    }

    const deleteLine = (lineId) => {
        const line = document.querySelector(`[data-line-id="${lineId}"]`);
        if(line) line.remove();
    }

    addBtn.addEventListener('click', async () => {
        const productAttributes = await rpc('/account/stock/get/attributes');
        if(odoo?.loader?.debug) console.log(productAttributes);
        if(productAttributes?.status !== 'success') return;

        const lineId = `page-stock-list-create-form-attributes-list-${lineCounter}`;
        const line = document.createElement('div');
        line.className = 'line-item flex items-center gap-2 mb-2';
        line.dataset.lineId = lineId;
        line.innerHTML = `
            <div class="flex-grow">
                <select class="form-select form-select-sm item-select select2-single w-full page-stock-list-create-form-attribute-select">
                    <option value="">Select an attribute</option>
                    ${productAttributes.attributes.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
                </select>
            </div>
            <div class="flex-grow">
                <select class="form-select form-select-sm item-select select2-single w-full page-stock-list-create-form-attribute-value-select" multiple="">
                    <option value="">Select an attribute value</option>
                </select>
            </div>
            <div>
                <button type="button" class="delete-line-btn p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" data-line-id="${lineId}">
                    <i class="fas fa-trash-alt text-red-500"></i>
                </button>
            </div>
        `;

        // Initialize Select2 if available
        if (window.jQuery && jQuery.fn.select2) {
            jQuery(line).find('.select2-single').select2({
                minimumResultsForSearch: 5,
                dropdownParent: jQuery(modal)
            });
        }

        const deleteBtn = line.querySelector('.delete-line-btn');
        if(deleteBtn) deleteBtn.addEventListener('click', () => deleteLine(lineId));

        const attributeSelect = jQuery(line.querySelector(`.page-stock-list-create-form-attribute-select`)).select2({
            minimumResultsForSearch: 5,
            dropdownParent: jQuery(modal)
        });
        const attributeValueSelect = jQuery(line.querySelector(`.page-stock-list-create-form-attribute-value-select`)).select2({
            minimumResultsForSearch: 5,
            dropdownParent: jQuery(modal)
        });
        if(attributeSelect) attributeSelect.on('change', async (e) => {
            const attributeId = e.target.value;
            const valuesResult = await rpc('/account/stock/get/attribute/values', {
                attribute_id: attributeId
            });
            if(valuesResult?.status !== 'success') return;
            attributeValueSelect.html(valuesResult.values.map(item => `<option value="${item.id}">${item.name}</option>`).join(''));
            attributeValueSelect.trigger('change');
            attributeValueSelect.on('change', (e) => {
                const attributeValueId = e.target.value;
                const attributeValue = valuesResult.values.find(item => item.id === attributeValueId);
                if(attributeValue) {
                    attributeValueSelect.value = attributeValue.id;
                }
                updateAttributeValues(lineId);
            });
            updateAttributeValues(lineId);
        });

        container.appendChild(line);

        lineCounter++;
    });
};


// document.addEventListener('DOMContentLoaded', initProductsReceptionModal)
const initComputeTotalVolume = () => {
    const width = document.getElementById('page-stock-list-create-form-measures-width');
    const height = document.getElementById('page-stock-list-create-form-measures-height');
    const length = document.getElementById('page-stock-list-create-form-measures-length');
    const volume = document.getElementById('page-stock-list-create-form-volume');

    if (width && height && length) {
        const handler = () => computeTotalVolume(width, height, length, volume);
        width.addEventListener('input', handler);
        height.addEventListener('input', handler);
        length.addEventListener('input', handler);
    }
}


const initManageProductImage = () => {
    const imageInput = document.getElementById('page-stock-list-create-form-image');
    if (!imageInput) return;

    const imagePreview = document.getElementById('page-stock-list-create-form-image-preview');
    if (!imagePreview) return

    const base64Field = document.getElementById('page-stock-list-create-form-image-base64');
    if (!base64Field) return

    const deleteButton = document.getElementById('page-stock-list-create-form-image-delete');

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Data = event.target.result.split(',')[1]; // remove the "data:image/...;base64," part
                imagePreview.src = event.target.result;
                base64Field.value = base64Data;
                deleteButton.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.src = '/portal_stock/static/img/placeholder.png';
            base64Field.value = '';
        }
    });

    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            imagePreview.src = '/portal_stock/static/img/placeholder.png';
            imageInput.value = ''; // Reset file input
            document.getElementById('image-base64-field').value = ''; // Limpiar base64
        });
    }

    // Si ya hay una imagen previa cargada, se podría mostrar aquí (opcional)
};



document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('stock-page-list-items')) return;
    initProductListCreatetModal();
    initComputeTotalVolume();
    initAddAttributesToProduct();
    initManageProductImage();
});

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
    showLoadingScreen();

    // Collect all form data
    const { formData, fileData } = sysCollectFormData('#page-stock-list-product-create-form');

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
    hideLoadingScreen();

    systemShowNotification(response.message, {
        type: response.status === 'success' ? 'success' : 'error',
        duration: 5000
    });

    if(response.status === 'success') {
        // Obtener formularios y footers
        const attributesForm = document.querySelector('#page-stock-list-product-attributes-form');
        const productForm = document.querySelector('#page-stock-list-product-create-form');
        const productFooter = document.querySelector('#page-stock-list-create-product-form-footer');
        const attributesFooter = document.querySelector('#page-stock-list-product-attributes-form-footer');

        // Insertar HTML de variantes y cambiar visibilidad
        attributesForm.innerHTML = response.product_attributes;

        // Mostrar segundo formulario y su footer
        attributesForm.classList.remove('hidden');
        attributesForm.classList.add('block');
        attributesFooter.classList.remove('hidden');

        // Ocultar primer formulario y su footer
        productForm.classList.add('hidden');
        productForm.classList.remove('block');
        productFooter.classList.add('hidden');

        // Configurar evento del botón de guardar
        const submitButton = document.getElementById('page-stock-list-product-attributes-form-submit');
        if(submitButton) {
            submitButton.addEventListener('click', ProductAttributesUpdate);
        }
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
};

// Metodos para volver invisible los campos de SKU, Barcode, Save y Next si hay atributos
const initProductAttributesVisibility = () => {
    const attributesContainer = document.getElementById('page-stock-list-create-form-attributes-line-items-container');
    const skuContainer = document.getElementById('page-stock-list-create-form-sku-container');
    const barcodeContainer = document.getElementById('page-stock-list-create-form-barcode-container');
//    const submitButton = document.getElementById('page-stock-list-create-product-form-submit');
//    const nextButton = document.getElementById('page-stock-list-create-product-form-next');

    if (!attributesContainer || !skuContainer || !barcodeContainer) return;
//     || !submitButton || !nextButton) return;

        const updateFieldsVisibility = () => {
            const hasAttributes = attributesContainer.children.length > 0;

            // Usar tanto clases como estilos directos para asegurar la visibilidad correcta
            skuContainer.classList.toggle('hidden', hasAttributes);
            barcodeContainer.classList.toggle('hidden', hasAttributes);

            // Aplicar estilo display directamente para los botones
            if (hasAttributes) {
                submitButton.classList.add('hidden');
//                submitButton.style.display = 'none';
                nextButton.classList.remove('hidden');
//                nextButton.style.display = '';
            } else {
                submitButton.classList.remove('hidden');
//                submitButton.style.display = '';
                nextButton.classList.add('hidden');
//                nextButton.style.display = 'none';
            }
        };

    const observer = new MutationObserver(updateFieldsVisibility);
    observer.observe(attributesContainer, { childList: true });
    updateFieldsVisibility();

    // Agregar evento al botón usando encadenamiento opcional
    document.querySelector('#page-stock-list-create-form-attributes-add-line-btn')
        ?.addEventListener('click', updateFieldsVisibility);
};

const ProductAttributesUpdate = async () => {
    showLoadingScreen();

    const variantData = [];
    const form = document.getElementById('page-stock-list-product-attributes-form');

    console.log("Contenido del formulario:", form.innerHTML);

    const productRows = form.querySelectorAll('div.mb-2');

    productRows.forEach(row => {
        const inputsContainer = row.nextElementSibling;
        if (!inputsContainer) return;

        const skuInput = inputsContainer.querySelector('input[name="sku"]');
        const barcodeInput = inputsContainer.querySelector('input[name="barcode"]');
        const volumeInput = inputsContainer.querySelector('input[name="volume"]');
        const weightInput = inputsContainer.querySelector('input[name="weight"]');

        if (skuInput && barcodeInput) {
            const productId = skuInput.id.split('-').pop();

            console.log("Encontrado producto:", {
                productId: productId,
                sku: skuInput.value,
                barcode: barcodeInput.value,
                volume: volumeInput ? volumeInput.value : '',
                weight: weightInput ? weightInput.value : ''
            });

            variantData.push({
                product_id: productId,
                sku: skuInput.value || '',
                barcode: barcodeInput.value || '',
                volume: volumeInput ? volumeInput.value || '0' : '0',
                weight: weightInput ? weightInput.value || '0' : '0'
            });
        }
    });

    console.log("Total variantes encontradas:", variantData.length);
    console.log("Datos a enviar:", variantData);

    if (variantData.length > 0) {
        const response = await rpc('/account/stock/update/product/variants', {
            variants: JSON.stringify(variantData)
        });

        hideLoadingScreen();

        systemShowNotification(response.message || 'Producto actualizado correctamente', {
            type: response.status === 'success' ? 'success' : 'error',
            duration: 5000
        });

        if(response.status === 'success') {
            Modal.close('page-stock-list-create-modal');
            const listReloadEvent = new CustomEvent('list:reload');
            document.dispatchEvent(listReloadEvent);
        }
    } else {
        hideLoadingScreen();
        systemShowNotification('No se encontraron variantes para actualizar', {
            type: 'error',
            duration: 5000
        });
    }
}

// Esta es la única inicialización que debe existir
document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('stock-page-list-items')) return;

    // Inicializar todos los componentes necesarios
    initProductListCreatetModal();
    initComputeTotalVolume();
    initAddAttributesToProduct();
    initManageProductImage();
    initProductAttributesVisibility();

    // No es necesario manejar el botón aquí, ya que se configura en ProductListCreate
});
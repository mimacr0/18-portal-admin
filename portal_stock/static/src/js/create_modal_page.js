import { rpc } from "@portal_admin_theme/network/rpc";

// Constantes globales
const PLACEHOLDER_IMAGE = '/portal_stock/static/img/placeholder.png';

// Utilidades
const getElement = (id) => document.getElementById(id);
const createElementWithClass = (tag, className) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    return element;
};

// Función para calcular el volumen total
const computeTotalVolume = (widthEl, heightEl, lengthEl, volumeEl) => {
    if (!widthEl || !heightEl || !lengthEl || !volumeEl) return;

    const width = parseFloat(widthEl.value) || 0;
    const height = parseFloat(heightEl.value) || 0;
    const length = parseFloat(lengthEl.value) || 0;

    const volume = width * height * length;
    volumeEl.value = volume > 0 ? volume.toFixed(2) : '';
};

// Recolecta datos de atributos de producto
const collectProductAttributes = (selector) => {
    const attributes = [];
    const attributeLines = document.querySelectorAll(selector);

    for (const line of attributeLines) {
        const attributeId = jQuery(line.querySelector('.page-stock-list-create-form-attribute-select')).val();
        const attributeValueId = jQuery(line.querySelector('.page-stock-list-create-form-attribute-value-select')).val();

        if (attributeId && attributeValueId) {
            attributes.push({
                attribute_id: attributeId,
                attribute_value_id: attributeValueId
            });
        }
    }

    return attributes;
};

// Manejo de imágenes de producto
const initManageProductImage = () => {
    const imageInput = getElement('page-stock-list-create-form-image');
    const imagePreview = getElement('page-stock-list-create-form-image-preview');
    const base64Field = getElement('page-stock-list-create-form-image-base64');
    const deleteButton = getElement('page-stock-list-create-form-image-delete');

    // Verificar elementos requeridos
    if (!imageInput || !imagePreview || !base64Field) return;

    // Función para resetear la imagen
    const resetImage = () => {
        imagePreview.src = PLACEHOLDER_IMAGE;
        imageInput.value = '';
        base64Field.value = '';
        if (deleteButton) deleteButton.style.display = 'none';
    };

    // Inicializar estado del botón de eliminar
    if (deleteButton) {
        deleteButton.style.display = 'none';
        deleteButton.addEventListener('click', resetImage);
    }

    // Manejar cambio de imagen
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
            resetImage();
            return;
        }

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            systemShowNotification('Por favor, seleccione un archivo de imagen válido', {
                type: 'error',
                duration: 3000
            });
            resetImage();
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            const base64Data = event.target.result.split(',')[1];
            imagePreview.src = event.target.result;
            base64Field.value = base64Data;
            if (deleteButton) deleteButton.style.display = 'block';
        };

        reader.onerror = () => {
            systemShowNotification('Error al leer el archivo de imagen', {
                type: 'error',
                duration: 3000
            });
            resetImage();
        };

        reader.readAsDataURL(file);
    });
};

// Crear producto
const ProductListCreate = async () => {
    if (!sysFormValidate('#page-stock-list-product-create-form')) return;

    try {
        showLoadingScreen();

        // Recolectar datos del formulario
        const { formData, fileData } = sysCollectFormData('#page-stock-list-product-create-form');

        // Procesar atributos y añadirlos a formData
        const attributes = collectProductAttributes('#page-stock-list-create-form-attributes-line-items-container .line-item');
        formData.attributes = JSON.stringify(attributes);

        // Llamar API para crear producto
        const response = await rpc('/account/stock/create/product', formData);

        systemShowNotification(response.message, {
            type: response.status === 'success' ? 'success' : 'error',
            duration: 5000
        });

        if (response.status === 'success') {
            toggleFormsVisibility(true);

            // Insertar HTML de variantes
            const attributesForm = getElement('page-stock-list-product-attributes-form');
            attributesForm.innerHTML = response.product_attributes;

            // Configurar evento del botón de guardar
            const submitButton = getElement('page-stock-list-product-attributes-form-submit');
            if (submitButton) {
                submitButton.addEventListener('click', ProductAttributesUpdate);
            }
        }
    } catch (error) {
        console.error('Error al crear producto:', error);
        systemShowNotification('Ha ocurrido un error al crear el producto', {
            type: 'error',
            duration: 5000
        });
    } finally {
        hideLoadingScreen();
    }
};

// Alternar visibilidad entre formularios
const toggleFormsVisibility = (showAttributes = false) => {
    const productForm = getElement('page-stock-list-product-create-form');
    const productFooter = getElement('page-stock-list-create-product-form-footer');
    const attributesForm = getElement('page-stock-list-product-attributes-form');
    const attributesFooter = getElement('page-stock-list-product-attributes-form-footer');

    if (showAttributes) {
        // Mostrar formulario de atributos
        attributesForm.classList.remove('hidden');
        attributesForm.classList.add('block');
        attributesFooter.classList.remove('hidden');

        // Ocultar formulario de producto
        productForm.classList.add('hidden');
        productForm.classList.remove('block');
        productFooter.classList.add('hidden');
    } else {
        // Mostrar formulario de producto
        productForm.classList.remove('hidden');
        productForm.classList.add('block');
        productFooter.classList.remove('hidden');

        // Ocultar formulario de atributos
        attributesForm.classList.add('hidden');
        attributesForm.classList.remove('block');
        attributesFooter.classList.add('hidden');
    }
};

// Inicializar botón de crear producto
const initProductListCreatetModal = () => {
    const submitButton = getElement('page-stock-list-create-product-form-submit');
    if (submitButton) {
        submitButton.addEventListener('click', ProductListCreate);
    }
};

// Inicializar gestión de atributos
const initAddAttributesToProduct = () => {
    const modal = getElement('page-stock-list-create-modal');
    const container = getElement('page-stock-list-create-form-attributes-line-items-container');
    const addBtn = getElement('page-stock-list-create-form-attributes-add-line-btn');
    const attrInput = getElement('page-stock-list-create-form-attributes-list');

    if (!modal || !container || !addBtn || !attrInput) return;

    let lineCounter = 0;

    // Reiniciar formulario al cerrar modal
    document.addEventListener('modalClosed', (e) => {
        if (e.detail.modalId !== 'page-stock-list-create-modal') return;

        resetForm();
    });

    // Función para resetear todo el formulario
    const resetForm = () => {
        // Restablecer visibilidad de formularios
        toggleFormsVisibility(false);

        // Limpiar formulario de atributos
        const attributesForm = getElement('page-stock-list-product-attributes-form');
        if (attributesForm) attributesForm.innerHTML = '';

        // Reiniciar campos básicos
        resetBasicFields();

        // Reiniciar medidas
        resetMeasurements();

        // Reiniciar imagen
        resetImage();

        // Reiniciar atributos
        container.innerHTML = '';
        attrInput.value = '[]';

        // Reiniciar mensajes de error
        clearErrorMessages();
    };

    // Reiniciar campos básicos
    const resetBasicFields = () => {
        getElement('page-stock-list-create-form-name').value = '';

        // Reiniciar radio buttons
        const radioNone = getElement('tracking_none');
        const radioSerial = getElement('tracking_serial');
        if (radioNone) radioNone.checked = false;
        if (radioSerial) radioSerial.checked = false;
    };

    // Reiniciar medidas
    const resetMeasurements = () => {
        getElement('page-stock-list-create-form-measures-width').value = '';
        getElement('page-stock-list-create-form-measures-height').value = '';
        getElement('page-stock-list-create-form-measures-length').value = '';
        getElement('page-stock-list-create-form-volume').value = '';
        getElement('page-stock-list-create-form-weight').value = '';
    };

    // Reiniciar imagen
    const resetImage = () => {
        const imagePreview = getElement('page-stock-list-create-form-image-preview');
        const imageInput = getElement('page-stock-list-create-form-image');
        const base64Field = getElement('page-stock-list-create-form-image-base64');

        if (imagePreview) imagePreview.src = PLACEHOLDER_IMAGE;
        if (imageInput) imageInput.value = '';
        if (base64Field) base64Field.value = '';
    };

    // Limpiar mensajes de error
    const clearErrorMessages = () => {
        document.querySelectorAll('.form-error').forEach(el => {
            el.classList.add('invisible');
            el.textContent = '';
        });
    };

    // Actualizar valores de atributos
    const updateAttributeValues = async () => {
        const attributeLines = document.querySelectorAll('#page-stock-list-create-form-attributes-container .line-item');
        const attributes = [];

        for (const line of attributeLines) {
            const attributeId = jQuery(line.querySelector('.page-stock-list-create-form-attribute-select')).val();
            const attributeValueId = jQuery(line.querySelector('.page-stock-list-create-form-attribute-value-select')).val();

            if (attributeId && attributeValueId) {
                attributes.push({
                    attribute_id: attributeId,
                    attribute_value_id: attributeValueId
                });
            }
        }

        attrInput.value = JSON.stringify(attributes);
    };

    // Eliminar línea de atributo
    const deleteLine = (lineId) => {
        const line = document.querySelector(`[data-line-id="${lineId}"]`);
        if (line) line.remove();
        updateProductAttributesVisibility();
    };

    // Añadir línea de atributo
    addBtn.addEventListener('click', async () => {
        try {
            const productAttributes = await rpc('/account/stock/get/attributes');
            if (productAttributes?.status !== 'success') {
                throw new Error('Error al obtener atributos');
            }

            // Crear nueva línea
            const lineId = `page-stock-list-create-form-attributes-list-${lineCounter}`;
            const line = createElementWithClass('div', 'line-item flex items-center gap-2 mb-2');
            line.dataset.lineId = lineId;

            // Construir HTML de la línea
            line.innerHTML = buildAttributeLineHTML(lineId, productAttributes.attributes);

            // Inicializar Select2 si está disponible
            initializeSelect2ForLine(line, modal);

            // Configurar eventos de la línea
            setupAttributeLineEvents(line, lineId);

            // Añadir línea al contenedor
            container.appendChild(line);
            lineCounter++;

            // Actualizar visibilidad de campos según atributos
            updateProductAttributesVisibility();

        } catch (error) {
            console.error('Error al añadir atributo:', error);
            systemShowNotification('Error al añadir atributo', {
                type: 'error',
                duration: 3000
            });
        }
    });

    // Construir HTML para línea de atributo
    const buildAttributeLineHTML = (lineId, attributes) => {
        return `
            <div class="flex-grow">
                <select class="form-select form-select-sm item-select select2-single w-full page-stock-list-create-form-attribute-select">
                    <option value="">Select an attribute</option>
                    ${attributes.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
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
    };

    // Inicializar Select2 para línea
    const initializeSelect2ForLine = (line, modalElement) => {
        if (window.jQuery && jQuery.fn.select2) {
            jQuery(line).find('.select2-single').select2({
                minimumResultsForSearch: 5,
                dropdownParent: jQuery(modalElement)
            });
        }
    };

    // Configurar eventos para línea de atributo
    const setupAttributeLineEvents = async (line, lineId) => {
        // Configurar botón de eliminación
        const deleteBtn = line.querySelector('.delete-line-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteLine(lineId));
        }

        // Configurar select de atributos
        const attributeSelect = jQuery(line.querySelector('.page-stock-list-create-form-attribute-select'));
        const attributeValueSelect = jQuery(line.querySelector('.page-stock-list-create-form-attribute-value-select'));

        if (attributeSelect) {
            attributeSelect.on('change', async (e) => {
                try {
                    const attributeId = e.target.value;
                    const valuesResult = await rpc('/account/stock/get/attribute/values', {
                        attribute_id: attributeId
                    });

                    if (valuesResult?.status !== 'success') {
                        throw new Error('Error al obtener valores de atributo');
                    }

                    // Actualizar opciones de valores
                    attributeValueSelect.html(valuesResult.values.map(
                        item => `<option value="${item.id}">${item.name}</option>`
                    ).join(''));

                    attributeValueSelect.trigger('change');

                    // Configurar evento de cambio para valores
                    attributeValueSelect.on('change', () => {
                        updateAttributeValues();
                    });

                    updateAttributeValues();

                } catch (error) {
                    console.error('Error al cargar valores de atributo:', error);
                }
            });
        }
    };
};

// Inicializar cálculo de volumen
const initComputeTotalVolume = () => {
    const width = getElement('page-stock-list-create-form-measures-width');
    const height = getElement('page-stock-list-create-form-measures-height');
    const length = getElement('page-stock-list-create-form-measures-length');
    const volume = getElement('page-stock-list-create-form-volume');

    if (!width || !height || !length || !volume) return;

    const handler = () => computeTotalVolume(width, height, length, volume);

    width.addEventListener('input', handler);
    height.addEventListener('input', handler);
    length.addEventListener('input', handler);
};

// Actualizar visibilidad de campos según atributos
const updateProductAttributesVisibility = () => {
    const attributesContainer = getElement('page-stock-list-create-form-attributes-line-items-container');
    const skuContainer = getElement('page-stock-list-create-form-sku-container');
    const barcodeContainer = getElement('page-stock-list-create-form-barcode-container');
    const submitButton = getElement('page-stock-list-create-product-form-submit');
    const nextButton = getElement('page-stock-list-create-product-form-next');

    if (!attributesContainer || !skuContainer || !barcodeContainer || !submitButton || !nextButton) return;

    const hasAttributes = attributesContainer.children.length > 0;

    // Actualizar visibilidad de campos
    skuContainer.classList.toggle('hidden', hasAttributes);
    barcodeContainer.classList.toggle('hidden', hasAttributes);

    // Actualizar visibilidad de botones
    submitButton.classList.toggle('hidden', hasAttributes);
    nextButton.classList.toggle('hidden', !hasAttributes);
};

// Inicializar visibilidad de campos según atributos
const initProductAttributesVisibility = () => {
    const attributesContainer = getElement('page-stock-list-create-form-attributes-line-items-container');

    if (!attributesContainer) return;

    // Observar cambios en el contenedor de atributos
    const observer = new MutationObserver(updateProductAttributesVisibility);
    observer.observe(attributesContainer, { childList: true });

    // Configuración inicial
    updateProductAttributesVisibility();

    // Añadir evento al botón de añadir línea
    getElement('page-stock-list-create-form-attributes-add-line-btn')
        ?.addEventListener('click', updateProductAttributesVisibility);
};

// Actualizar variantes de producto
const ProductAttributesUpdate = async () => {
    try {
        showLoadingScreen();

        const variantData = collectVariantData();

        if (variantData.length > 0) {
            const response = await rpc('/account/stock/update/product/variants', {
                variants: JSON.stringify(variantData)
            });

            systemShowNotification(response.message || 'Producto actualizado correctamente', {
                type: response.status === 'success' ? 'success' : 'error',
                duration: 5000
            });

            if (response.status === 'success') {
                Modal.close('page-stock-list-create-modal');
                document.dispatchEvent(new CustomEvent('list:reload'));
            }
        } else {
            systemShowNotification('No se encontraron variantes para actualizar', {
                type: 'error',
                duration: 5000
            });
        }
    } catch (error) {
        console.error('Error al actualizar variantes:', error);
        systemShowNotification('Error al actualizar variantes de producto', {
            type: 'error',
            duration: 5000
        });
    } finally {
        hideLoadingScreen();
    }
};

// Recopilar datos de variantes
const collectVariantData = () => {
    const variantData = [];
    const form = getElement('page-stock-list-product-attributes-form');

    if (!form) return variantData;

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

            variantData.push({
                product_id: productId,
                sku: skuInput.value || '',
                barcode: barcodeInput.value || '',
                volume: volumeInput ? volumeInput.value || '0' : '0',
                weight: weightInput ? weightInput.value || '0' : '0'
            });
        }
    });

    return variantData;
};

// Inicialización principal
document.addEventListener('DOMContentLoaded', () => {
    if (!getElement('stock-page-list-items')) return;

    // Inicializar todos los componentes
    initProductListCreatetModal();
    initComputeTotalVolume();
    initAddAttributesToProduct();
    initManageProductImage();
    initProductAttributesVisibility();
});
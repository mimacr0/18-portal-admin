import { rpc } from "@web/core/network/rpc";
import { reloadExpeditionListPage } from "./frontend/components/expedition_list.js";

/**
 * Inicializa la funcionalidad de la lista de productos en el formulario
 */
function initStockExpeditionList() {
    console.log("Initializing product list functionality");
    const pageName = "expedition";
    const addProductBtn = document.getElementById(`page-${pageName}-list-create-form-add-product-btn`);
    const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-items`);
    console.log(pageName);
    console.log('Add product button:', addProductBtn);
    console.log('Products container:', productsContainer);
    if (!addProductBtn || !productsContainer) {
        console.error('Products list elements not found', { addProductBtn, productsContainer });
        return;
    }

    console.log('Found product list elements');

    // Add product row
    addProductBtn.addEventListener('click', () => {
        console.log('Adding new product row');
        const newRow = document.createElement('div');
        newRow.className = 'product-row grid grid-cols-12 gap-2';
        newRow.innerHTML = `
            <div class="col-span-5">
                <input type="text" name="product_name[]" placeholder="Product Name" class="form-input-sm w-full"/>
            </div>
            <div class="col-span-2">
                <input type="number" name="product_qty[]" placeholder="Qty" min="1" value="1" class="form-input-sm w-full"/>
            </div>
            <div class="col-span-3">
                <input type="text" name="product_sku[]" placeholder="SKU" class="form-input-sm w-full"/>
            </div>
            <div class="col-span-2 flex items-center">
                <button type="button" class="product-remove-btn text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        productsContainer.appendChild(newRow);

        // Add remove button event
        newRow.querySelector('.product-remove-btn').addEventListener('click', () => {
            console.log('Removing product row');
            productsContainer.removeChild(newRow);
        });
    });

    // Setup existing remove buttons
    document.querySelectorAll('.product-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Removing existing product row');
            const row = btn.closest('.product-row');
            if (row) productsContainer.removeChild(row);
        });
    });
}

/**
 * Inicializa el formulario de creación de recepciones
 *
 * Esta función configura:
 * 1. Eventos de apertura del modal
 * 2. Cálculo automático de volumen
 * 3. Validación y envío del formulario
 */
export const initExpeditionCreateForm = () => {
    console.log("Initializing expedition create form");

    // Obtener elementos del DOM usando el nombre de la página
    const createButton = document.getElementById('launch-create-expedition-form-button');
    const createModal = document.getElementById('page-expedition-list-create-modal');
    const submitButton = document.getElementById('page-expedition-list-create-product-form-submit');
    const form = document.getElementById('page-expedition-list-create-form');
    const closeButtons = document.querySelectorAll('[data-modal-close="true"]');

    createButton.addEventListener('click', () => {
        Modal.open('page-expedition-list-create-modal');
    });

    // Calcular volumen cuando cambian las dimensiones
    const widthInput = document.getElementById('page-expedition-list-create-form-measures-width');
    const heightInput = document.getElementById('page-expedition-list-create-form-measures-height');
    const lengthInput = document.getElementById('page-expedition-list-create-form-measures-length');
    const volumeInput = document.getElementById('page-expedition-list-create-form-volume');

    [widthInput, heightInput, lengthInput].forEach(input => {
        if (input) {
            input.addEventListener('input', calculateVolume);
        }
    });

    // Calcular volumen basado en las dimensiones
    function calculateVolume() {
        if (!widthInput || !heightInput || !lengthInput || !volumeInput) return;

        const width = parseFloat(widthInput.value || 0);
        const height = parseFloat(heightInput.value || 0);
        const length = parseFloat(lengthInput.value || 0);

        let volume = 0;
        if (width > 0 && height > 0 && length > 0) {
            volume = (width * height * length) / 1000; // Convertir a cm³
        }

        volumeInput.value = volume.toFixed(2);
    }

    // Manejar envío del formulario
    submitButton.addEventListener('click', async () => {
        console.log("Submit button clicked");
        // Limpiar errores previos
        clearErrors();

        // Recopilar datos del formulario
        const formData = {
            name: form.querySelector('input[name="name"]').value,
            tracking_number: form.querySelector('input[name="tracking_number"]')?.value || "",
            tracking: form.querySelector('select[name="tracking"]').value,
            width: parseFloat(form.querySelector('input[name="width"]').value || 0),
            height: parseFloat(form.querySelector('input[name="height"]').value || 0),
            length: parseFloat(form.querySelector('input[name="length"]').value || 0),
            volume: parseFloat(form.querySelector('input[name="volume"]').value || 0),
            weight: parseFloat(form.querySelector('input[name="weight"]').value || 0),
            sku: form.querySelector('input[name="sku"]').value,
            barcode: form.querySelector('input[name="barcode"]').value,
            products: Array.from(form.querySelectorAll('.product-row')).map(row => ({
                name: row.querySelector('input[name="product_name[]"]')?.value || "",
                quantity: parseInt(row.querySelector('input[name="product_qty[]"]')?.value || "1"),
                sku: row.querySelector('input[name="product_sku[]"]')?.value || ""
            }))
        };

        console.log("Form data:", formData);

        // Validar datos
        if (!validateForm(formData)) {
            console.log("Form validation failed");
            return;
        }

        try {
            // Mostrar indicador de carga
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            console.log("Sending data to server...");
            // Enviar datos al servidor
            const result = await rpc('/account/expedition/create', formData);
            console.log("Server response:", result);

            // Manejar respuesta
            if (result.status === 'success') {
                console.log("Expedition created successfully");
                // Cerrar modal y reiniciar formulario

                // Use the showModal/hideModal functions if they exist in the global scope
                if (typeof hideModal === 'function') {
                    hideModal(createModal);
                } else {
                    createModal.classList.add('hidden');
                    createModal.style.visibility = 'hidden';
                    createModal.style.opacity = '0';
                }

                form.reset();

                // Recargar la lista
                if (typeof reloadExpeditionListPage === 'function') {
                    reloadExpeditionListPage();
                } else {
                    console.error("reloadExpeditionListPage is not a function", reloadExpeditionListPage);
                    window.location.reload();
                }
            } else {
                // Mostrar error
                console.error("Error creating expedition:", result.message);
                alert(result.message || 'An error occurred while creating the expedition package');
            }
        } catch (error) {
            // Manejar error
            console.error("Exception creating expedition:", error);
            alert('An error occurred while creating the expedition package');
        } finally {
            // Restaurar botón
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    });

    // Validar formulario antes de enviar
    function validateForm(data) {
        let isValid = true;

        // Validar nombre
        if (!data.name) {
            showError('name', 'Name is required');
            isValid = false;
        }

        // Validar tracking number
        if (!data.tracking_number) {
            showError('tracking-number', 'Tracking number is required');
            isValid = false;
        }

        // Validar dimensiones
        if (data.width <= 0 || data.height <= 0 || data.length <= 0) {
            showError('measures', 'All dimensions are required and must be greater than 0');
            isValid = false;
        }

        // Validar peso
        if (data.weight <= 0) {
            showError('weight', 'Weight is required and must be greater than 0');
            isValid = false;
        }

        // Validar SKU
        if (!data.sku) {
            showError('sku', 'SKU is required');
            isValid = false;
        }

        // Validar código de barras
        if (!data.barcode) {
            showError('barcode', 'Barcode is required');
            isValid = false;
        }

        // Validate that at least one product has a name
        if (data.products.length > 0) {
            const hasValidProduct = data.products.some(p => p.name.trim() !== '');
            if (!hasValidProduct) {
                alert('At least one product must have a name');
                isValid = false;
            }
        }

        return isValid;
    }

    // Mostrar mensaje de error
    function showError(field, message) {
        const errorDiv = document.getElementById(`page-${pageName}-list-create-form-${field}-error`);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('invisible');
        } else {
            console.error(`Error div for field ${field} not found`);
        }
    }

    // Limpiar todos los errores
    function clearErrors() {
        const errorDivs = document.querySelectorAll('.form-error');
        errorDivs.forEach(div => div.classList.add('invisible'));
    }
};

// Immediately fix modal display issues as soon as the page loads
document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('expedition-page-list-items')) return;

    initExpeditionCreateForm();
    initStockExpeditionList();
});
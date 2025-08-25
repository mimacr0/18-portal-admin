import { rpc } from "@web/core/network/rpc";
import { reloadRepairAlertListPage } from "./frontend/components/repair_alert_list.js";


// Add a shared product registry to track products across views
const selectedProductsRegistry = new Map();

const updateRepairAlertsProductsField = () => {
    const productsContainer = document.getElementById('page-repair-alert-list-create-form-products-line-items-container');
    const productsField = document.getElementById('page-repair-alert-list-create-form-products-list');

    if (!productsContainer || !productsField) {
        console.error('Products container or field not found');
        return;
    }

    const productLines = productsContainer.querySelectorAll('.line-item');
    const products = [];

    for (const line of productLines) {
        const select = line.querySelector('.product-select');
        const qtyInput = line.querySelector('.product-qty');
        const secondSelect = line.querySelector('.second-select');

        try {
            const selectData = $(select).select2('data')[0];
            if (!selectData || !qtyInput) continue;

            const trackingType = selectData?.tracking || 'none';
            const selectedItems = secondSelect ? $(secondSelect).select2('data') : [];
            const selectedId = selectedItems.length > 0 ? (selectedItems[0].lot_id || selectedItems[0].id) : null;

            const productObj = {
                product_id: selectData.id,
                quantity: parseFloat(qtyInput.value) || 0,
                tracking: trackingType

            };

            // Asignar clave según trackingType
            if (trackingType === 'none') {
                productObj.location = selectedId;
            } else {
                productObj.lot = selectedId;
            }

            products.push(productObj);
        } catch (e) {
            console.error('Error getting product data:', e);
        }
    }

    productsField.value = JSON.stringify(products);
};



/**
 * Inicializa el formulario de creación de recepciones
 *
 * Esta función configura:
 * 1. Eventos de apertura del modal
 * 2. Cálculo automático de volumen
 * 3. Validación y envío del formulario
 */
export const initRepairAlertCreateForm = () => {
    console.log("Initializing repair-alert create form");

    // Define pageName at the beginning of the function so it's available in all callbacks
    const pageName = "repair-alert";

    // Obtener elementos del DOM usando el nombre de la página
    const createButton = document.getElementById('launch-create-repair-alert-form-button');
    // const createModal = document.getElementById('page-repair-alert-list-create-modal');
    const submitButton = document.getElementById('page-repair-alert-list-create-product-form-submit');

    const resetRepairAlertForm = () => {
        // Reset all form inputs
        const form = document.getElementById(`page-${pageName}-list-create-form`);
        if (form) {
            form.reset();
        }

        // Reset product lines container
        const productsContainer = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
        if (productsContainer) {
            productsContainer.innerHTML = '';
        }

        // Reset hidden products field
        const productsField = document.getElementById(`page-${pageName}-list-create-form-products-list`);
        if (productsField) {
            productsField.value = '';
        }

        // Clear selected products registry
        selectedProductsRegistry.clear();
    };

    // Add event listener for modal closing
    document.addEventListener('modalClosed', (e) => {
        if (e.detail.modalId !== 'page-repair-alert-list-create-modal') return;
        resetRepairAlertForm();
    });

    createButton.addEventListener('click', () => {
        Modal.open('page-repair-alert-list-create-modal');
    });

    // Manejar envío del formulario
    submitButton.addEventListener('click', async () => {
        const res = sysFormValidate('#page-repair-alert-list-create-form');
        if(!res) return;

        const { formData } = sysCollectFormData('#page-repair-alert-list-create-form');

        const resp = await rpc('/account/repair-alert/create', formData);

        if(resp?.errors) sysShowServerErrors('#page-repair-alert-list-create-form', resp.errors);

        if(resp?.message) systemShowNotification(resp.message, { type: resp?.status || 'error' })

        if(resp?.status !== 'success') return;

        Modal.close('page-repair-alert-list-create-modal');

        reloadRepairAlertListPage();
    });

};

// Update the initManualProductAddRepair function to sync with registry
function initManualProductAddRepair() {
    const pageName = "repair-alert";
    const addBtn = document.getElementById(`page-${pageName}-list-create-form-products-add-line-btn`);
    const container = document.getElementById(`page-${pageName}-list-create-form-products-line-items-container`);
    const modal = document.getElementById(`page-${pageName}-list-create-modal`);

    let lineCounter = 0;

    if (!addBtn || !container) return;

    addBtn.addEventListener('click', () => {
        const lineId = `manual-product-line-${lineCounter}`;
        const newRow = document.createElement('div');
        newRow.className = 'line-item flex items-center gap-2 mb-2';
        newRow.dataset.lineId = lineId;

        newRow.innerHTML = `
            <div class="flex-grow"style=" max-width: 400px;">
                <select class="product-select form-select-sm w-full rounded-md border border-gray-300
                    focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500" style="width: auto; max-width: 100px;">
                </select>
            </div>
            <div class="flex-grow">
                <select class="second-select form-select-sm w-full rounded-md border border-gray-300
                    focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500 select2-single page-${pageName}-list-create-form-lot-value-select">
                </select>
            </div>
            <div class="w-24">
                <input type="number" value="1" min="1"
                    class="product-qty form-input-sm w-full text-center rounded-md border border-gray-300
                    focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"/>
            </div>
            <div>
                <button type="button" class="product-remove-btn p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" data-line-id="${lineId}">
                    <i class="fas fa-trash-alt text-red-500"></i>
                </button>
            </div>
        `;

        container.appendChild(newRow);

        const select = $(newRow).find('.product-select');
        const qtyInput = newRow.querySelector('.product-qty');

        // Inicializar Select2 para productos
        select.select2({
            placeholder: 'Search product...',
            dropdownParent: $(modal),
            ajax: {
                transport: function(params, success, failure) {
                    rpc('/account/repair-alert/product-search', { term: params.data.term })
                    .then(result => {
                        console.log("Resultado recibido:", result);  // <-- aquí
                        success({ results: result.items });
                    })                        
                    .catch(error => { console.error(error); failure('Failed to load products'); });
                },
                processResults: data => data,
                delay: 250
            },
            templateResult: formatProduct,
            templateSelection: formatProductSelection
        });

        // Inicializar Select2 para lotes (vacío al inicio)
        select.each(function() {
            const productId = $(this).val();
            const secondSelect = $(this).closest('.line-item').find('.second-select');

            // Inicializar Select2 vacío para lotes
            $(secondSelect).select2({
                placeholder: 'Select a lot',
                dropdownParent: $(modal)
            });

            // Si el producto ya está seleccionado al cargar
            if (productId) {
                loadLotsForProduct(productId, secondSelect);
            }

            // Evento cuando cambia el producto
            $(this).on('change', function() {
                const newProductId = $(this).val();
                $(secondSelect).val(null).trigger('change');
                if (!newProductId) return;
                loadLotsForProduct(newProductId, secondSelect);
            });
            $(secondSelect).on('change', updateRepairAlertsProductsField);
        });
        

        function loadLotsForProduct(productId, secondSelect) {
            if ($(secondSelect).hasClass("select2-hidden-accessible")) {
                $(secondSelect).select2('destroy');
            }

            // Obtener tracking del producto (puede ser vía data attribute o RPC)
            const trackingType = $(secondSelect).closest('.line-item').find('.product-select').select2('data')[0]?.tracking || 'none';

            $(secondSelect).select2({
                placeholder: trackingType === 'none' ? 'Select location...' : 'Search lot...',
                dropdownParent: $(modal),
                multiple: false,
                ajax: {
                    transport: function(params, success, failure) {
                        let endpoint = trackingType === 'none'
                            ? '/account/repair-alert/product-locations'
                            : '/account/repair-alert/product-lots';

                        rpc(endpoint, { product_id: parseInt(productId), term: params.data.term })
                            .then(function(result) {
                                success({ results: result.items });
                            })
                            .catch(function(error) {
                                console.error('Error fetching data:', error);
                                failure('Failed to load data');
                            });
                    },
                    processResults: data => data,
                    delay: 250
                },
                templateResult: function(item) {
                    return trackingType === 'none' ? formatLocation(item) : formatLot(item);
                },
                templateSelection: function(item) {
                    return trackingType === 'none' ? formatLocationSelection(item) : formatsecondSelection(item);
                }
            });

            // Ajustar el máximo del input según los lotes/ubicaciones seleccionados
            $(secondSelect).on('change', function() {
                const selectedItems = $(this).select2('data');
                const $lineItem = $(this).closest('.line-item');
                const $qtyInput = $lineItem.find('.product-qty');

                if (selectedItems.length > 0) {
                    // Para tracking none puedes usar la cantidad disponible de la ubicación
                    const minAvailable = Math.min(...selectedItems.map(i => i.product_qty || Infinity));
                    $qtyInput[0].max = minAvailable;
                } else {
                    $qtyInput[0].removeAttribute("max");
                }

                updateRepairAlertsProductsField();

                let $warning = $qtyInput.next('.qty-warning');
                if ($warning.length === 0) {
                    $warning = $('<span class="qty-warning" style="color: red; display: none; margin-top: 2px; font-size: 0.9em;"></span>');
                    $qtyInput.after($warning);
                }

                $qtyInput.off('input').on('input', function() {
                    const enteredQty = parseFloat(this.value) || 0;
                    const maxQty = parseFloat(this.max) || Infinity;

                    if (enteredQty > maxQty) {
                        $warning.text(`La cantidad máxima disponible es ${maxQty}.`).show();
                    } else {
                        $warning.hide();
                    }
                });
            });
        }

        $(select).on('change', updateRepairAlertsProductsField);

        // Actualizar registro al cambiar cantidad
        qtyInput.addEventListener('change', updateRepairAlertsProductsField);

        // Botón para eliminar fila
        const removeBtn = newRow.querySelector('.product-remove-btn');
        removeBtn?.addEventListener('click', () => {
            container.removeChild(newRow);
            updateRepairAlertsProductsField();
        });

        lineCounter++;
    });
}

// Format function for product dropdown items - with attributes support
function formatProduct(product) {
    if (!product.id) return product.text;

    // Create container with flexbox
    let html = `<div class="flex items-center space-x-3">`;

    // Add product image if available
    if (product.image) {
        html += `<div class="flex-shrink-0">
            <img src="${product.image}" class="h-10 w-10 object-cover rounded-sm" alt="${product.text}"/>
        </div>`;
    }

    // Product details with attributes
    html += `<div class="flex-grow">
        <div class="font-medium">${product.text}</div>`;

    if (product.default_code) {
        html += `<div class="text-xs text-gray-500">[${product.default_code}]</div>`;
    }

    // Add attributes as tags if available
    if (product.attributes && product.attributes.length > 0) {
        html += `<div class="flex flex-wrap gap-1 mt-1">`;
        product.attributes.forEach(attr => {
            html += `<span class="bg-gray-100 text-gray-800 text-xs px-1 py-0.5 rounded-sm">
                ${attr.display_name}
            </span>`;
        });
        html += `</div>`;
    }

    return $(html);
}

// Format function for selected product with attributes
function formatProductSelection(product) {
    if (!product.id) return product.text;

    let text = product.text;
    if (product.default_code) {
        text += ` [${product.default_code}]`;
    }

    // Optionally add a small badge with attribute count if product has attributes
    if (product.attributes && product.attributes.length > 0) {
        text += ` (${product.attributes.map(attr => attr.value).join(', ')})`;
    }

    return text;
}

// Format function for lot dropdown items - only show name
function formatLot(lot) {
    if (!lot.id) return lot.text;

    // Simple container with just the lot name
    let html = `<div class="flex items-center">
        <div class="font-medium">${lot.text}</div>
    </div>`;

    return $(html);
}

// Format function for selected lot - only show name
function formatsecondSelection(lot) {
    if (!lot.id) return lot.text;

    return lot.text;
}
// Formatear cada opción de ubicación en el dropdown
function formatLocation(location) {
    if (!location.id) return location.text;

    // Contenedor simple con el nombre de la ubicación
    let html = `<div class="flex items-center">
        <div class="font-medium">${location.text}</div>
    </div>`;

    return $(html);
}

// Formatear la ubicación seleccionada en el select (solo el nombre)
function formatLocationSelection(location) {
    if (!location.id) return location.text;

    return location.text;
}


// Update the document ready function
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('repair-alert-page-list-items')) return;

    initRepairAlertCreateForm();
    initManualProductAddRepair();
    // Set up the close button for product catalog
    // const closeBtn = document.getElementById('page-repair-alert-product-catalog-select-close-btn');
    // if (closeBtn) {
    //     closeBtn.addEventListener('click', closeProductCatalog);
    // }
});

// Add near the top with other formatting functions

function formatCarrier(data) {
    if (!data.id) return data.text;

    // Create container with flexbox
    let html = `<div class="flex items-center space-x-3">`;

    // Add carrier image if available
    if (data.image) {
        html += `<div class="flex-shrink-0">
            <img src="${data.image}" class="h-10 w-10 object-cover rounded-sm" alt="${data.text}"/>
        </div>`;
    } else {
        html += `<div class="flex-shrink-0">
            <div class="h-10 w-10 flex items-center justify-center bg-gray-200 rounded-sm">
                <i class="fas fa-truck text-gray-500"></i>
            </div>
        </div>`;
    }

    // Carrier details
    html += `<div class="flex-grow">
        <div class="font-medium">${data.text}</div>`;

    if (data.delivery_type) {
        html += `<div class="text-xs text-gray-500">${data.delivery_type}</div>`;
    }

    if (data.price) {
        html += `<div class="text-xs font-medium text-gray-700">${data.price} ${data.currency || ''}</div>`;
    }

    html += `</div></div>`;

    return $(html);
}

function formatPackageType(data) {
    if (!data.id) return data.text;

    // Create container with flexbox
    let html = `<div class="flex items-center space-x-3">`;

    // Add package type image if available
    if (data.image) {
        html += `<div class="flex-shrink-0">
            <img src="${data.image}" class="h-10 w-10 object-cover rounded-sm" alt="${data.text}"/>
        </div>`;
    } else {
        html += `<div class="flex-shrink-0">
            <div class="h-10 w-10 flex items-center justify-center bg-gray-200 rounded-sm">
                <i class="fas fa-box text-gray-500"></i>
            </div>
        </div>`;
    }

    // Package type details
    html += `<div class="flex-grow">
        <div class="font-medium">${data.text}</div>`;

    if (data.dimensions) {
        html += `<div class="text-xs font-medium text-gray-700">${data.dimensions}</div>`;
    }

    html += `</div></div>`;

    return $(html);
}

import { rpc } from "@web/core/network/rpc";


/**
 * Inicializa el formulario de creación de recepciones
 *
 * Esta función configura:
 * 1. Eventos de apertura del modal
 * 2. Cálculo automático de volumen
 * 3. Validación y envío del formulario
 */
export const initExpeditionCreateForm = () => {
    const pageName = "expedition";

    console.log("Initializing expedition create form");
    const createModal = document.getElementById('page-expedition-list-create-modal');

    const carrierSelectInput = document.getElementById('page-expedition-list-create-form-carrier-id');
    const searchSelectInput = document.getElementById('page-expedition-list-create-form-address');
    
    $(carrierSelectInput).select2({
        placeholder: 'Select Carrier',
        dropdownParent: $(createModal),
        ajax: {
            transport: function(params, success, failure) {
                rpc('/account/expedition/carrier-search', {
                    term: params.data.term
                })
                .then(function(result) {
                    success({ results: result.items });
                })
                .catch(function(error) {
                    console.error('Error fetching carriers:', error);
                    failure('Failed to load carriers');
                });
            },
            processResults: function(data) {
                return data;
            },
            delay: 250
        },
        templateResult: function(data) {
            return formatCarrier(data);
        }
    });
    // const createButton = document.getElementById('launch-create-expedition-form-button');
    // if(createButton) createButton.addEventListener('click', () => {
        // Modal.open('page-expedition-list-create-modal');
    // });
    $(searchSelectInput).select2({
        placeholder: 'Search Address',
        dropdownParent: $(createModal),
        ajax: {
            transport: function(params, success, failure) {
                rpc('/account/expedition/address-search', {
                    term: params.data.term
                })
                .then(function(result) {
                    success({ results: result.items });
                })
                .catch(function(error) {
                    console.error('Error fetching address:', error);
                    failure('Failed to load addresses');
                });
            },
            processResults: function(data) {
                return data;
            },
            delay: 250
        },
        templateResult: function(data) {
            return formatAddress(data);
        }
    });

};

// Immediately fix modal display issues as soon as the page loads
document.addEventListener('DOMContentLoaded', () => {
    initExpeditionCreateForm();
});


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

function formatAddress(data) {
    if (!data.id) return data.text;

    // Create container with flexbox
    let html = `<div class="flex items-center space-x-3">`;

    // Add carrier image if available

    // Carrier details
    html += `<div class="flex-grow">
        <div class="font-medium">${data.text}</div>`;

    html += `</div></div>`;

    return $(html);
}

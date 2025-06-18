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
    const searchBtn = document.getElementById(`page-${pageName}-list-create-form-address`);
    console.log("Search button:", searchBtn);
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const select = newRow.querySelector('.order-select');
            $(select).select2({
                placeholder: 'Search addres...',
                minimumInputLength: 2,
                dropdownParent: $(modal),
                ajax: {
                    transport: function(params, success, failure) {
                        rpc('/account/expedition/address-search', {
                            term: params.data.term
                        })
                        .then(function(result) {
                            success({ results: result.items });
                        })
                        .catch(function(error) {
                            console.error('Error fetching products:', error);
                            failure('Failed to load products');
                        });
                    },
                    processResults: function(data) {
                        return data;
                    },
                    delay: 250
                },
                templateResult: formatProduct,
                templateSelection: formatProductSelection
            });
        });
    }

};

// Immediately fix modal display issues as soon as the page loads
document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('expedition-page-list-items')) return;
    initStockExpeditionList();
});
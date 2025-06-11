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
    if(!sysFormValidate('#page-stock-list-create-form')) return;
    showLoadingScreen()

    // Collect all form data
    const { formData, fileData } = sysCollectFormData('#page-stock-list-create-form');
    let hasFiles = Object.keys(fileData).length > 0;
    console.log('Form Data:', formData);
    if (window.itemsMap) {
        // Convertir Map a objeto
        const itemsObject = {};
        window.itemsMap.forEach((value, key) => {
            itemsObject[key] = value;
        });
        // Agregar al formData como JSON string (puedes usar otro nombre)
        formData['items_data'] = JSON.stringify(itemsObject);
    }

    const response = await rpc('/account/stock/create/product', formData)

    console.log(response)
    hideLoadingScreen()
    Modal.close('page-stock-list-create-modal')

    systemShowNotification(response.message, {
        type: response.status === 'success' ? 'success' : 'error',
        duration: 5000
    })

    document.querySelectorAll('.list-product-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.querySelector('#bulk-actions-toolbar').classList.add('hidden');
    const selectAllCheckbox = document.querySelector('page-stock-list-select-all-checkbox');
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
}

const initProductListCreatetModal = () => {
    const submitButton = document.getElementById('page-stock-list-create-product-form-submit')
    if(submitButton) {
        submitButton.addEventListener('click', ProductListCreate);
    }
}

const initAddAttributesToProduct = () => {
    const container = document.getElementById('page-stock-list-create-form-attributes-line-items-container');
    const addBtn = document.getElementById('page-stock-list-create-form-attributes-add-attribute-btn');
    const attrInput = document.getElementById('product-attributes-json');
    
    let productAttributes = [];
    try {
       // Reemplaza comillas simples por dobles, solo para probar:
        const fixedJson = attrInput.value.replace(/'/g, '"');
        productAttributes = JSON.parse(fixedJson);
        } catch (e) {
        console.error('Error parsing attributes JSON:', e, attrInput.value);
        }

    let selectedAttributeValues = new Map();
    let lineIndex = 0;

    addBtn?.addEventListener('click', () => {
        const line = document.createElement('div');
        line.className = 'flex flex-col gap-2 mb-4';

        // Attribute select
        // el class de select tiene que ser:
        // class="form-input-sm w-full text-sm shadow rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500"

        const attrSelect = document.createElement('select');
        attrSelect.className = 'form-input-sm w-full text-sm shadow rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500';
        attrSelect.dataset.lineIndex = lineIndex;

        const defaultAttrOpt = document.createElement('option');
        defaultAttrOpt.textContent = 'Select attribute';
        defaultAttrOpt.value = '';
        defaultAttrOpt.disabled = true;
        defaultAttrOpt.selected = true;
        attrSelect.appendChild(defaultAttrOpt);

        productAttributes.forEach(attr => {
            const opt = document.createElement('option');
            opt.value = attr.id;
            opt.textContent = attr.name;
            attrSelect.appendChild(opt);
        });

        // Value select
        const valueSelect = document.createElement('select');
        valueSelect.className = 'form-input-sm w-full text-sm shadow rounded-md border-1 border-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-500 hidden';
        valueSelect.dataset.lineIndex = lineIndex;

        // Píldoras container
        const pillsContainer = document.createElement('div');
        pillsContainer.className = 'flex flex-wrap gap-2 mt-1';

        const selectedValues = [];

        attrSelect.addEventListener('change', (e) => {
            const attrId = parseInt(e.target.value);
            const selectedAttr = productAttributes.find(a => a.id === attrId);

            // Reset value select
            valueSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.textContent = 'Select value';
            placeholder.value = '';
            placeholder.disabled = true;
            placeholder.selected = true;
            valueSelect.appendChild(placeholder);

            // Show valueSelect
            if (selectedAttr && selectedAttr.values.length) {
                selectedAttr.values.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.id;
                    opt.textContent = v.name;
                    valueSelect.appendChild(opt);
                });
                valueSelect.classList.remove('hidden');
            } else {
                valueSelect.classList.add('hidden');
            }

            // 🧹 Clear selected values
            selectedValues.length = 0;
            pillsContainer.innerHTML = '';
        });

        valueSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            const valueId = parseInt(selectedOption.value);
            const valueName = selectedOption.textContent;

            // Avoid duplicates
            if (selectedValues.find(v => v.id === valueId)) return;

            // Store selected value
            selectedValues.push({ id: valueId, name: valueName });

            // Add pill
            const pill = document.createElement('span');
            pill.className = 'bg-cyan-100 text-cyan-800 px-2 py-1 text-xs rounded-full flex items-center';
            pill.innerHTML = `${valueName} <button class="ml-1 text-red-600 hover:text-red-800" title="Remove">&times;</button>`;

            const removeBtn = pill.querySelector('button');
            removeBtn.addEventListener('click', () => {
                pill.remove();
                selectedValues.splice(selectedValues.findIndex(v => v.id === valueId), 1);

                // Re-add option back to select
                const reOption = document.createElement('option');
                reOption.value = valueId;
                reOption.textContent = valueName;
                valueSelect.appendChild(reOption);
            });

            pillsContainer.appendChild(pill);

            // Remove selected option from select
            selectedOption.remove();

            // Reset to placeholder
            valueSelect.selectedIndex = 0;
        });

        line.appendChild(attrSelect);
        line.appendChild(valueSelect);
        line.appendChild(pillsContainer);
        container.appendChild(line);

        lineIndex++;
    });
    // Si lo necesitas accesible globalmente:
    window.getSelectedAttributes = () => selectedAttributeValues;
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


document.addEventListener('DOMContentLoaded', () => {
    initProductListCreatetModal();
    initComputeTotalVolume();
    initAddAttributesToProduct();
});
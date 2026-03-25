import { rpc } from "@web/core/network/rpc";

let currentStep = 1;
const TOTAL_STEPS = 3;

/**
 * Navigation between steps
 */
const goToStep = (step) => {
    if (step < 1 || step > TOTAL_STEPS) return;

    // Hide all steps
    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));

    // Show current step
    const stepEl = getElement(`reception-create-step-${step}`);
    if (stepEl) stepEl.classList.remove('hidden');

    // Update Indicators
    for (let i = 1; i <= TOTAL_STEPS; i++) {
        const indicator = getElement(`step-indicator-${i}`);
        const label = indicator?.nextElementSibling;
        if (!indicator) continue;

        if (i < step) {
            // Completed
            indicator.className = 'w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold border-2 border-green-500';
            indicator.innerHTML = '<i class="fas fa-check text-xs"></i>';
            if (label) label.className = 'text-[10px] mt-1 font-medium text-green-500 uppercase';
        } else if (i === step) {
            // Active
            indicator.className = 'w-8 h-8 rounded-full bg-theme text-white flex items-center justify-center text-sm font-bold border-2 border-theme';
            indicator.innerHTML = i;
            if (label) label.className = 'text-[10px] mt-1 font-medium text-theme uppercase';
        } else {
            // Pending
            indicator.className = 'w-8 h-8 rounded-full bg-white text-gray-400 flex items-center justify-center text-sm font-bold border-2 border-gray-200';
            indicator.innerHTML = i;
            if (label) label.className = 'text-[10px] mt-1 font-medium text-gray-400 uppercase';
        }
    }

    const backBtn = getElement('reception-create-back-btn');
    const nextBtn = getElement('reception-create-next-btn');
    const submitBtn = getElement('reception-create-submit-btn');
    const newBtn = getElement('reception-create-new-btn');
    const exitBtn = getElement('reception-create-exit-btn');

    const setVisible = (el, visible) => {
        if (!el) return;
        if (visible) {
            el.classList.remove('d-none', 'hidden');
            el.style.setProperty('display', 'inline-flex', 'important');
        } else {
            el.classList.add('d-none', 'hidden');
            el.style.setProperty('display', 'none', 'important');
        }
    };

    // Hide all first
    [backBtn, nextBtn, submitBtn, newBtn, exitBtn].forEach(b => setVisible(b, false));

    if (step === 1) {
        setVisible(nextBtn, true);
        setVisible(exitBtn, true);
    } else if (step === 2) {
        setVisible(backBtn, true);
        setVisible(submitBtn, true);
        setVisible(exitBtn, true);
    } else if (step === 3) {
        setVisible(newBtn, true);
        setVisible(exitBtn, true);
    }

    if (step === 2) {
        // Update Country Display from Step 1 selection
        const form = getElement('page-reception-list-create-form');
        const senderCountrySelect = form?.querySelector('[name="sender_country_id"]');
        const receiverCountrySelect = form?.querySelector('[name="receiver_country_id"]');

        const senderCountryDisplay = getElement('reception-sender-country-name-display');
        const receiverCountryDisplay = getElement('reception-receiver-country-name-display');

        if (senderCountrySelect && senderCountryDisplay) {
            senderCountryDisplay.value = senderCountrySelect.options[senderCountrySelect.selectedIndex]?.text || '';
        }
        if (receiverCountrySelect && receiverCountryDisplay) {
            receiverCountryDisplay.value = receiverCountrySelect.options[receiverCountrySelect.selectedIndex]?.text || '';
        }
    }

    currentStep = step;
};

// Clear state_id if the user manually edits the state_name
document.addEventListener('input', (e) => {
    if (e.target.name === 'sender_state_name') {
        const idInput = document.querySelector('[name="sender_state_id"]');
        if (idInput) idInput.value = '';
    }
    if (e.target.name === 'receiver_state_name') {
        const idInput = document.querySelector('[name="receiver_state_id"]');
        if (idInput) idInput.value = '';
    }
});

/**
 * Dynamic Package Management
 */
const getPackages = () => {
    try {
        return JSON.parse(getElement('reception-packages-data-input')?.value || '[]');
    } catch (e) { return []; }
};

const savePackages = (packages, shouldRender = true) => {
    const input = getElement('reception-packages-data-input');
    if (input) input.value = JSON.stringify(packages);
    if (shouldRender) renderPackagesList();
    updateStep1Rates();
};

const renderPackagesList = () => {
    const container = getElement('reception-packages-list-container');
    const packages = getPackages();
    if (!container) return;

    if (packages.length === 0) {
        // Add one default if empty
        packages.push({ weight: 1.0, length: 10, width: 10, height: 10, units: 1 });
        savePackages(packages);
        return;
    }

    container.innerHTML = packages.map((pkg, index) => `
        <div class="package-item bg-white border ${index === 0 ? 'border-theme-light' : 'border-gray-200'} rounded-xl p-4 shadow-sm relative overflow-hidden group animate-fade-in-up">
            <div class="absolute top-0 left-0 w-1 h-full ${index === 0 ? 'bg-theme' : 'bg-gray-300'}"></div>
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold ${index === 0 ? 'text-theme' : 'text-gray-500'} uppercase tracking-wider">Bulto #${index + 1}</span>
                <div class="flex gap-2">
                    ${index === 0 ? '<span class="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Default</span>' :
            `<button type="button" class="remove-package-btn text-red-400 hover:text-red-600 p-1 transition-colors" data-index="${index}">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>`}
                </div>
            </div>
            <div class="mb-4">
                <label class="text-[9px] font-bold text-gray-400 uppercase flex items-center">
                    <i class="fas fa-tag mr-1.5 text-gray-300"></i> Content / Product Name
                </label>
                <input type="text" class="form-input-sm w-full pkg-field rounded-lg border-gray-100" data-field="product_name" data-index="${index}" value="${pkg.product_name || ''}" placeholder="Briefly describe what's inside..."/>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="space-y-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase flex items-center">
                        <i class="fas fa-cubes mr-1 text-gray-300"></i> Units
                    </label>
                    <input type="number" step="1" min="1" class="form-input-sm w-full pkg-field rounded-lg border-gray-100" data-field="units" data-index="${index}" value="${pkg.units || 1}"/>
                </div>
                <div class="space-y-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase flex items-center">
                        <i class="fas fa-weight-hanging mr-1 text-gray-300"></i> Weight (kg) *
                    </label>
                    <input type="number" step="0.01" min="0.1" class="form-input-sm w-full pkg-field rounded-lg border-gray-100" data-field="weight" data-index="${index}" value="${pkg.weight}"/>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">Length (cm)</label>
                    <input type="number" step="1" min="1" class="form-input-sm w-full pkg-field" data-field="length" data-index="${index}" value="${pkg.length}"/>
                </div>
                <div class="space-y-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">Width (cm)</label>
                    <input type="number" step="1" min="1" class="form-input-sm w-full pkg-field" data-field="width" data-index="${index}" value="${pkg.width}"/>
                </div>
                <div class="space-y-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">Height (cm)</label>
                    <input type="number" step="1" min="1" class="form-input-sm w-full pkg-field" data-field="height" data-index="${index}" value="${pkg.height}"/>
                </div>
            </div>
        </div>
    `).join('');

    // Field listeners
    // Field listeners
    container.querySelectorAll('.pkg-field').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const field = e.target.dataset.field;
            let val = e.target.value;

            // Convert to number only for dimensions/weight
            if (field !== 'product_name') {
                val = parseFloat(val) || 0;
            }

            const pkgs = getPackages();
            pkgs[idx][field] = val;
            savePackages(pkgs, false); // Don't re-render on input to avoid losing focus
        });
    });

    // Remove listeners
    container.querySelectorAll('.remove-package-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            const pkgs = getPackages();
            pkgs.splice(idx, 1);
            savePackages(pkgs);
        });
    });
};

/**
 * Reads the products hidden input and returns parsed array
 */
const getSelectedProducts = () => {
    const productsInput = getElement('page-reception-list-create-form-products-list');
    if (!productsInput) return [];
    try {
        return JSON.parse(productsInput.value || '[]');
    } catch (e) {
        return [];
    }
};

/**
 * Renders the selected products into the lines container
 */
const renderSelectedProducts = () => {
    const products = getSelectedProducts();
    const container = getElement('page-reception-list-create-form-products-line-items-container');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<p class="text-center text-xs text-gray-400 py-10">Use the buttons above to add products to your shipment.</p>';
        return;
    }

    container.innerHTML = products.map((p, index) => `
        <div class="flex items-center justify-between p-3 mb-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm animate-fade-in-up">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    <i class="fas fa-box text-gray-300"></i>
                </div>
                <div>
                    <p class="text-xs font-bold text-gray-900 dark:text-gray-100">${p.product_name}</p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400">SKU: ${p.account_sku || 'N/A'}</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                    <button type="button" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-theme qty-minus" data-index="${index}">
                        <i class="fas fa-minus text-[10px]"></i>
                    </button>
                    <input type="number" class="w-10 text-center text-xs font-bold bg-transparent border-none focus:ring-0 p-0 product-qty-input" 
                           data-index="${index}" value="${p.quantity || 1}" min="1"/>
                    <button type="button" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-theme qty-plus" data-index="${index}">
                        <i class="fas fa-plus text-[10px]"></i>
                    </button>
                </div>
                <button type="button" class="text-red-400 hover:text-red-600 remove-product-btn p-1" data-index="${index}">
                    <i class="fas fa-trash-alt text-xs"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Quantity listeners
    container.querySelectorAll('.product-qty-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const qty = parseInt(e.target.value) || 1;
            const currentProducts = getSelectedProducts();
            currentProducts[index].quantity = qty;
            getElement('page-reception-list-create-form-products-list').value = JSON.stringify(currentProducts);
        });
    });

    container.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            const prods = getSelectedProducts();
            prods[idx].quantity = (prods[idx].quantity || 1) + 1;
            getElement('page-reception-list-create-form-products-list').value = JSON.stringify(prods);
            renderSelectedProducts();
        });
    });

    container.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            const prods = getSelectedProducts();
            if (prods[idx].quantity > 1) {
                prods[idx].quantity -= 1;
                getElement('page-reception-list-create-form-products-list').value = JSON.stringify(prods);
                renderSelectedProducts();
            }
        });
    });

    // Removal listener
    container.querySelectorAll('.remove-product-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            const prods = getSelectedProducts();
            prods.splice(index, 1);
            getElement('page-reception-list-create-form-products-list').value = JSON.stringify(prods);
            renderSelectedProducts();
        });
    });
};

/**
 * Validates step before proceeding
 */
const validateStep = async (step) => {
    const form = getElement('page-reception-list-create-form');
    if (step === 1) {
        const senderCountryId = form.querySelector('[name="sender_country_id"]')?.value;
        const receiverCountryId = form.querySelector('[name="receiver_country_id"]')?.value;
        const carrierId = getElement('reception-selected-carrier-id')?.value;

        if (!senderCountryId || !receiverCountryId) {
            systemShowNotification('Please select origin and destination countries.', { type: 'error' });
            return false;
        }

        const pkgs = getPackages();
        if (pkgs.length === 0 || pkgs.some(p => p.weight <= 0)) {
            systemShowNotification('Please ensure all packages have a valid weight.', { type: 'error' });
            return false;
        }

        if (!carrierId) {
            systemShowNotification('Please select a carrier.', { type: 'error' });
            return false;
        }
    } else if (step === 2) {
        const senderName = form.querySelector('[name="sender_name"]')?.value;
        const receiverName = form.querySelector('[name="receiver_name"]')?.value;

        if (!senderName || !receiverName) {
            systemShowNotification('Please fill in at least the contact names for sender and receiver.', { type: 'error' });
            return false;
        }
    }
    return true;
};

/**
 * Renders carriers with calculated prices
 */
const renderCarriersList = (carriers, containerId = 'reception-carriers-list') => {
    const container = getElement(containerId);
    if (!container) return;

    if (!carriers || carriers.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <i class="fas fa-exclamation-triangle text-amber-400 mb-2"></i>
                <p class="text-xs text-gray-500">No carriers available for this route.</p>
            </div>
        `;
        return;
    }

    const currentCarrierId = getElement('reception-selected-carrier-id')?.value;

    container.innerHTML = carriers.map(c => {
        const isSelected = currentCarrierId == c.id;
        return `
            <div class="carrier-card group p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected ? 'carrier-selected' : 'border-gray-100 hover:border-gray-200 bg-white shadow-sm'}" 
                 id="carrier-card-${c.id}" data-id="${c.id}">
                <div class="flex items-center gap-4 pointer-events-none">
                    <div>
                        <h5 class="text-xs font-bold text-gray-800">${c.name}</h5>
                        <p class="text-[9px] text-gray-500 uppercase tracking-tighter">${c.delivery_type || 'Standard'}</p>
                    </div>
                </div>
                <div class="text-right pointer-events-none">
                    <div class="text-base font-black text-theme">${c.price.toFixed(2)} ${c.currency}</div>
                    <div class="text-[8px] text-gray-400 font-bold uppercase">Estimated</div>
                </div>
            </div>
                `;
    }).join('');

    container.querySelectorAll('.carrier-card').forEach(card => {
        card.addEventListener('click', () => {
            selectCarrier(card.dataset.id);
        });
    });
};

const selectCarrier = (id) => {
    console.log('selectCarrier called for ID:', id);
    // UI Update
    document.querySelectorAll('.carrier-card').forEach(c => {
        c.classList.remove('carrier-selected');
        c.classList.add('border-gray-100', 'hover:border-gray-200', 'bg-white', 'shadow-sm');
    });

    if (!id) {
        const input = getElement('reception-selected-carrier-id');
        if (input) input.value = '';
        return;
    }

    const selectedCard = getElement(`carrier-card-${id}`);
    if (selectedCard) {
        selectedCard.classList.remove('border-gray-100', 'hover:border-gray-200', 'bg-white', 'shadow-sm');
        selectedCard.classList.add('carrier-selected');
    }

    // Input Update
    const input = getElement('reception-selected-carrier-id');
    if (input) {
        input.value = id;
        console.log('Value updated in hidden input:', input.value);
    }
};

/**
 * Submits the reception creation form to the backend
 */
const submitReceptionCreate = async () => {
    const form = getElement('page-reception-list-create-form');
    if (!form) return;

    try {
        if (typeof showLoadingScreen === 'function') showLoadingScreen();

        const response = await rpc('/account/reception/create', {
            sender_country_id: form.querySelector('[name="sender_country_id"]')?.value,
            receiver_country_id: form.querySelector('[name="receiver_country_id"]')?.value,
            sender_id: getElement('reception-sender-address-id')?.value || false,
            sender_name: form.querySelector('[name="sender_name"]')?.value,
            sender_street: form.querySelector('[name="sender_street"]')?.value,
            sender_city: form.querySelector('[name="sender_city"]')?.value,
            sender_zip: form.querySelector('[name="sender_zip"]')?.value,
            sender_email: form.querySelector('[name="sender_email"]')?.value,
            sender_phone: form.querySelector('[name="sender_phone"]')?.value,
            receiver_name: form.querySelector('[name="receiver_name"]')?.value,
            receiver_street: form.querySelector('[name="receiver_street"]')?.value,
            receiver_city: form.querySelector('[name="receiver_city"]')?.value,
            receiver_zip: form.querySelector('[name="receiver_zip"]')?.value,
            receiver_email: form.querySelector('[name="receiver_email"]')?.value,
            receiver_phone: form.querySelector('[name="receiver_phone"]')?.value,
            carrier_id: getElement('reception-selected-carrier-id')?.value || false,
            packages_data: getElement('reception-packages-data-input')?.value,
            type: getElement('reception-type-input')?.value || 'return',
            notes: form.querySelector('[name="notes"]')?.value || '',
        });


        if (response?.status === 'success') {
            // Render summary in Step 3
            renderSummary(response.summary);
            goToStep(3);

            // Reload the list in background
            document.dispatchEvent(new CustomEvent('list:reload'));
            if (typeof reloadReceptionListPage === 'function') {
                reloadReceptionListPage();
            }
        } else {
            if (typeof systemShowNotification === 'function') {
                systemShowNotification(response?.message || 'Error creating reception.', { type: 'error' });
            }
        }
    } catch (e) {
        console.error('Error creating reception:', e);
    } finally {
        if (typeof hideLoadingScreen === 'function') hideLoadingScreen();
    }
};

/**
 * Renders the results summary in Step 3
 */
const renderSummary = (summary) => {
    const container = getElement('reception-summary-content');
    if (!container || !summary) return;

    // Hide Sender Selection Badge
    const selectedBadge = getElement('reception-sender-selected-badge');
    const searchInput = getElement('reception-sender-search');
    const hiddenSenderId = getElement('reception-sender-address-id');
    if (selectedBadge) selectedBadge.classList.add('d-none', 'hidden');
    if (searchInput) {
        searchInput.value = '';
        searchInput.classList.remove('d-none', 'hidden');
    }
    if (hiddenSenderId) hiddenSenderId.value = '';

    container.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-blue-50/50 rounded-xl border border-blue-100 max-h-40 overflow-y-auto">
                    <p class="text-[10px] font-bold text-blue-400 uppercase mb-2">Packages Created</p>
                    <div class="space-y-1">
                        ${summary.packages.map(p => `
                            <div class="flex items-center gap-2">
                                <i class="fas fa-box text-blue-300 text-[10px]"></i>
                                <span class="text-sm font-black text-blue-800">${p.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col justify-center">
                    <p class="text-[10px] font-bold text-indigo-400 uppercase mb-1">Sale Order</p>
                    <p class="text-sm font-black text-indigo-800">${summary.order_name}</p>
                </div>
            </div>

            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-theme shadow-sm border border-gray-100">
                        <i class="fas fa-shipping-fast"></i>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-800">${summary.carrier_name}</p>
                        <p class="text-[10px] text-gray-400 uppercase">${summary.num_packages} Packages</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-lg font-black text-theme">${summary.total_cost.toFixed(2)} ${summary.currency_symbol}</p>
                </div>
            </div>

            <div class="space-y-3">
                <h5 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                    <i class="fas fa-tags mr-2"></i> Shipping Labels
                </h5>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${summary.labels.map(label => `
                        <a href="${label.label_url}" target="_blank" class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-theme hover:bg-theme-light/10 transition-all group">
                            <div class="flex items-center gap-2">
                                <i class="far fa-file-pdf text-red-500 text-lg group-hover:scale-110 transition-transform"></i>
                                <div>
                                    <p class="text-[10px] font-black text-gray-800">${label.package_name}</p>
                                    <p class="text-[9px] text-gray-400 font-mono">${label.tracking_ref}</p>
                                </div>
                            </div>
                            <i class="fas fa-download text-gray-300 group-hover:text-theme text-xs"></i>
                        </a>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

/**
 * Initializes the submit button handler and step navigation
 */
const initReceptionCreateModal = () => {
    const form = getElement('page-reception-list-create-form');

    // Submit
    const submitBtn = getElement('reception-create-submit-btn');
    if (submitBtn) submitBtn.addEventListener('click', submitReceptionCreate);

    // Step 3 Actions
    const newBtn = getElement('reception-create-new-btn');
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            // Reset and go to step 1
            const form = getElement('page-reception-list-create-form');
            if (form) form.reset();
            const productsInput = getElement('page-reception-list-create-form-products-list');
            if (productsInput) productsInput.value = '[]';
            renderSelectedProducts();
            const packagesInput = getElement('reception-packages-data-input');
            if (packagesInput) packagesInput.value = '[]';
            renderPackagesList();

            // Reset Sender Selection Badge
            const selectedBadge = getElement('reception-sender-selected-badge');
            const searchInput = getElement('reception-sender-search');
            const hiddenSenderId = getElement('reception-sender-address-id');
            if (selectedBadge) selectedBadge.classList.add('hidden');
            if (searchInput) {
                searchInput.value = '';
                searchInput.classList.remove('hidden');
            }
            if (hiddenSenderId) hiddenSenderId.value = '';

            goToStep(1);
        });
    }

    // Next / Back
    const nextBtn = getElement('reception-create-next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (await validateStep(currentStep)) {
                goToStep(currentStep + 1);
            }
        });
    }

    const backBtn = getElement('reception-create-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            goToStep(currentStep - 1);
        });
    }

    // Add Package
    const addPkgBtn = getElement('reception-add-package-btn');
    const addPkgBtnBottom = getElement('reception-add-package-btn-bottom');
    const onAddPackage = () => {
        const pkgs = getPackages();
        pkgs.push({ weight: 1.0, length: 10, width: 10, height: 10, units: 1 });
        savePackages(pkgs);
    };

    if (addPkgBtn) addPkgBtn.addEventListener('click', onAddPackage);
    if (addPkgBtnBottom) addPkgBtnBottom.addEventListener('click', onAddPackage);


    // Reset form and steps when modal closes
    document.addEventListener('modalClosed', (e) => {
        if (e.detail.modalId !== 'page-reception-list-create-modal') return;
        const form = getElement('page-reception-list-create-form');
        if (form) form.reset();

        // Reset products
        const productsInput = getElement('page-reception-list-create-form-products-list');
        if (productsInput) productsInput.value = '[]';
        renderSelectedProducts();

        // Reset packages
        const packagesInput = getElement('reception-packages-data-input');
        if (packagesInput) packagesInput.value = '[]';
        renderPackagesList();

        // Reset Sender Selection Badge
        const selectedBadge = getElement('reception-sender-selected-badge');
        const searchInput = getElement('reception-sender-search');
        const hiddenSenderId = getElement('reception-sender-address-id');
        if (selectedBadge) selectedBadge.classList.add('d-none', 'hidden');
        if (searchInput) {
            searchInput.value = '';
            searchInput.classList.remove('d-none', 'hidden');
        }
        if (hiddenSenderId) hiddenSenderId.value = '';

        // Go back to step 1
        goToStep(1);
    });

    // Reset and initialize when modal opens
    document.addEventListener('modalOpened', (e) => {
        if (e.detail.modalId === 'page-reception-list-create-modal' || e.detail.modalId === 'reception-create-modal') {
            goToStep(1);
            // Trigger rates calculation if countries are set
            setTimeout(() => updateStep1Rates(), 50);
        }
    });

    // Initial render
    renderPackagesList();
    renderSelectedProducts();
    goToStep(1);
    // Listeners for Step 1 rate recalculation
    ['sender_country_id', 'receiver_country_id'].forEach(name => {
        const el = form?.querySelector(`[name="${name}"]`);
        if (el) el.addEventListener('change', () => updateStep1Rates());
    });
};

let rateTimeout = null;
const updateStep1Rates = async () => {
    const modal = getElement('page-reception-list-create-modal');
    if (!modal || modal.getAttribute('data-open') !== 'true') return;

    console.log('--- updateStep1Rates triggered ---');
    const form = getElement('page-reception-list-create-form');
    const senderCountryId = form?.querySelector('[name="sender_country_id"]')?.value;
    const receiverCountryId = form?.querySelector('[name="receiver_country_id"]')?.value;
    const pkgs = getPackages();

    const container = getElement('reception-step1-carriers-section');
    const list = getElement('reception-step1-carriers-list');

    if (!senderCountryId || !receiverCountryId || pkgs.length === 0) {
        console.log('Skipping rates: missing countries or packages', { senderCountryId, receiverCountryId, pkgCount: pkgs.length });
        if (container) container.classList.add('hidden');
        return;
    }

    if (container) container.classList.remove('hidden');
    if (list) {
        list.innerHTML = `
            <div class="col-span-full py-6 text-center">
                <i class="fas fa-spinner fa-spin text-theme mb-2"></i>
                <p class="text-[10px] text-gray-400 uppercase font-bold">Recalculating rates...</p>
            </div>
        `;
    }

    if (rateTimeout) clearTimeout(rateTimeout);
    rateTimeout = setTimeout(async () => {
        console.log('Executing RPC /account/reception/calculate_rates', { senderCountryId, receiverCountryId, pkgs });
        try {
            const response = await rpc('/account/reception/calculate_rates', {
                packages_data: JSON.stringify(pkgs),
                sender_country_id: senderCountryId,
                receiver_country_id: receiverCountryId
            });

            console.log('Rate calculation response:', response);

            if (response.status === 'success') {
                renderCarriersList(response.carriers, 'reception-step1-carriers-list');
                const currentCarrierId = getElement('reception-selected-carrier-id')?.value;
                if (currentCarrierId && !response.carriers.find(c => c.id == currentCarrierId)) {
                    console.log('Clearing selected carrier as it is no longer available');
                    selectCarrier(null);
                }
            } else {
                console.error('Rate calculation failed:', response.message);
                if (list) list.innerHTML = `<div class="col-span-full py-4 text-center text-red-500 text-xs">${response.message || 'Error calculating rates.'}</div>`;
            }
        } catch (e) {
            console.error('RPC Error calculating rates:', e);
            if (list) list.innerHTML = `<div class="col-span-full py-4 text-center text-red-500 text-xs text-[10px] uppercase font-bold">Failed to connect to rate service.</div>`;
        }
    }, 500);
};

/**
 * Initializes the sender address search functionality.
 * Searches existing sender contacts by name, email or phone.
 * If no sender is selected, the form fields create a new one on submit.
 */
let senderSearchTimeout = null;
const initSenderAddressSearch = () => {
    const searchInput = getElement('reception-sender-search');
    const resultsContainer = getElement('reception-sender-search-results');
    const hiddenId = getElement('reception-sender-address-id');
    const selectedBadge = getElement('reception-sender-selected-badge');
    const selectedName = getElement('reception-sender-selected-name');
    const clearBtn = getElement('reception-sender-clear-btn');
    const form = getElement('page-reception-list-create-form');

    if (!searchInput || !resultsContainer) return;

    const fillFormFields = (addr) => {
        if (!form) return;
        const fields = {
            'sender_name': addr.name,
            'sender_street': addr.street,
            'sender_city': addr.city,
            'sender_zip': addr.zip,
            'sender_email': addr.email,
            'sender_phone': addr.phone,
        };
        Object.entries(fields).forEach(([name, value]) => {
            const el = form.querySelector(`[name="${name}"]`);
            if (el) el.value = value || '';
        });
    };

    const selectAddress = (addr) => {
        if (hiddenId) hiddenId.value = addr.id;
        if (selectedName) selectedName.textContent = addr.display_name || addr.name;
        if (selectedBadge) selectedBadge.classList.remove('hidden');
        if (searchInput) { searchInput.value = ''; searchInput.classList.add('hidden'); }
        if (resultsContainer) { resultsContainer.innerHTML = ''; resultsContainer.classList.add('hidden'); }
        fillFormFields(addr);
    };

    const clearSelection = () => {
        if (hiddenId) hiddenId.value = '';
        if (selectedBadge) selectedBadge.classList.add('hidden');
        if (searchInput) { searchInput.value = ''; searchInput.classList.remove('hidden'); }
    };

    if (clearBtn) clearBtn.addEventListener('click', clearSelection);

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
            return;
        }

        if (senderSearchTimeout) clearTimeout(senderSearchTimeout);
        senderSearchTimeout = setTimeout(async () => {
            try {
                const res = await rpc('/account/reception/address/search', { query, address_type: 'sender' });
                if (res.status === 'success' && res.addresses.length > 0) {
                    resultsContainer.innerHTML = res.addresses.map(a => `
                        <div class="sender-search-item px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-all"
                             data-id="${a.id}" data-name="${a.name}" data-display="${a.display_name}"
                             data-street="${a.street}" data-city="${a.city}" data-zip="${a.zip}"
                             data-email="${a.email}" data-phone="${a.phone}">
                            <p class="text-xs font-semibold text-gray-700">${a.name}</p>
                            <p class="text-[10px] text-gray-400">${[a.street, a.city, a.zip].filter(Boolean).join(', ')}</p>
                            ${a.email ? `<p class="text-[10px] text-gray-400">${a.email}</p>` : ''}
                        </div>
                    `).join('');
                    resultsContainer.classList.remove('hidden');

                    resultsContainer.querySelectorAll('.sender-search-item').forEach(item => {
                        item.addEventListener('click', () => {
                            selectAddress({
                                id: item.dataset.id,
                                name: item.dataset.name,
                                display_name: item.dataset.display,
                                street: item.dataset.street,
                                city: item.dataset.city,
                                zip: item.dataset.zip,
                                email: item.dataset.email,
                                phone: item.dataset.phone,
                            });
                        });
                    });
                } else {
                    resultsContainer.innerHTML = '<div class="px-3 py-2 text-xs text-gray-400 text-center">No senders found</div>';
                    resultsContainer.classList.remove('hidden');
                }
            } catch (e) {
                console.error('Error searching sender addresses:', e);
            }
        }, 300);
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
};

/**
 * Initializes Zip/City search for sender or receiver
 */
let zipSearchTimeout = null;
const initZipSearch = (type) => {
    const searchInput = getElement(`reception-${type}-zip-search`);
    const resultsContainer = getElement(`reception-${type}-zip-results`);
    const form = getElement('page-reception-list-create-form');

    if (!searchInput || !resultsContainer) return;

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        const countryId = form?.querySelector(`[name="${type}_country_id"]`)?.value;

        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
            return;
        }

        if (zipSearchTimeout) clearTimeout(zipSearchTimeout);
        zipSearchTimeout = setTimeout(async () => {
            try {
                const res = await rpc('/account/reception/zip/search', { query, country_id: countryId });
                if (res.status === 'success' && res.results.length > 0) {
                    resultsContainer.innerHTML = res.results.map(r => `
                        <div class="zip-search-item px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-all"
                             data-zip="${r.zip}" data-city="${r.city}" data-state-id="${r.state_id}" data-state-name="${r.state_name || ''}">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-gray-700">${r.zip}</span>
                                <span class="text-[10px] text-theme uppercase font-bold">${r.city}</span>
                            </div>
                            ${r.state_name ? `<p class="text-[9px] text-gray-400 capitalize">${r.state_name}</p>` : ''}
                        </div>
                    `).join('');
                    resultsContainer.classList.remove('hidden');

                    resultsContainer.querySelectorAll('.zip-search-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const zipInput = form.querySelector(`[name="${type}_zip"]`);
                            const cityInput = form.querySelector(`[name="${type}_city"]`);
                            const stateIdInput = form.querySelector(`[name="${type}_state_id"]`);
                            const stateNameInput = form.querySelector(`[name="${type}_state_name"]`);

                            if (zipInput) zipInput.value = item.dataset.zip;
                            if (cityInput) cityInput.value = item.dataset.city;
                            if (stateIdInput) stateIdInput.value = item.dataset.stateId || '';
                            if (stateNameInput) stateNameInput.value = item.dataset.stateName || '';

                            resultsContainer.classList.add('hidden');
                            searchInput.value = '';
                        });
                    });
                } else {
                    resultsContainer.innerHTML = '<div class="px-3 py-2 text-xs text-gray-400 text-center">No results found</div>';
                    resultsContainer.classList.remove('hidden');
                }
            } catch (e) {
                console.error('Error searching zips:', e);
            }
        }, 300);
    });
};

/**
 * Renders the Kanban cards for Stock
 */
const renderStockKanban = (quants) => {
    const container = getElement('reception-stock-kanban-container');
    if (!container) return;

    if (!quants || quants.length === 0) {
        container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500">No products found.</div>';
        return;
    }

    container.innerHTML = quants.map(q => `
        <div class="stock-item-card bg-white p-3 rounded-xl border border-gray-100 hover:border-theme cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col items-center" 
             data-id="${q.id}" data-name="${q.name}" data-sku="${q.code}">
            <div class="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center mb-2 overflow-hidden">
                <img src="${q.image_url}" class="max-w-full max-h-full object-contain"/>
            </div>
            <p class="text-[10px] font-bold text-center line-clamp-2 h-6 mb-1">${q.name}</p>
            <span class="text-[9px] text-gray-400 font-mono">${q.code || ''}</span>
        </div>
    `).join('');

    container.querySelectorAll('.stock-item-card').forEach(card => {
        card.addEventListener('click', () => {
            addMappingToLines(card.dataset.id, card.dataset.name, card.dataset.sku);
            if (window.Modal) window.Modal.close('reception-stock-selector-modal');
        });
    });
};

const addMappingToLines = (id, name, sku) => {
    const products = getSelectedProducts();
    if (products.find(p => p.product_id === parseInt(id))) {
        systemShowNotification('Product already added.', { type: 'info' });
        return;
    }
    products.push({ product_id: parseInt(id), product_name: name, account_sku: sku, quantity: 1 });
    getElement('page-reception-list-create-form-products-list').value = JSON.stringify(products);
    renderSelectedProducts();
};

const initStockSelector = () => {
    const btn = getElement('page-reception-list-create-form-products-add-stock-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (window.Modal) window.Modal.open('reception-stock-selector-modal');
        try {
            const res = await rpc('/account/reception/unmapped_products', {});
            if (res.status === 'success') renderStockKanban(res.quants);
        } catch (e) { console.error(e); }
    });
};

const initRMAProductSelector = () => {
    const btn = getElement('page-reception-list-create-form-products-add-rma-product-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (window.Modal) window.Modal.open('reception-product-map-selector-modal');
        try {
            const res = await rpc('/account/reception/product_maps', {});
            if (res.status === 'success') {
                const container = getElement('reception-product-map-kanban-container');
                if (!container) return;
                container.innerHTML = res.product_maps.map(pm => `
                    <div class="rma-item-card bg-white p-3 rounded-xl border border-gray-100 hover:border-theme cursor-pointer transition-all shadow-sm flex flex-col items-center" 
                         data-id="${pm.id}" data-name="${pm.name}" data-sku="${pm.account_sku}">
                        <div class="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center mb-2 overflow-hidden">
                            <img src="${pm.image_url}" class="max-w-full max-h-full object-contain"/>
                        </div>
                        <p class="text-[10px] font-bold text-center line-clamp-2 h-6">${pm.name}</p>
                    </div>
                `).join('');
                container.querySelectorAll('.rma-item-card').forEach(card => {
                    card.addEventListener('click', () => {
                        addMappingToLines(card.dataset.id, card.dataset.name, card.dataset.sku);
                        if (window.Modal) window.Modal.close('reception-product-map-selector-modal');
                    });
                });
            }
        } catch (e) { console.error(e); }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initReceptionCreateModal();
    initSenderAddressSearch();
    initZipSearch('sender');
    initZipSearch('receiver');
    initStockSelector();
    initRMAProductSelector();
});

// Helper
const getElement = (id) => document.getElementById(id);


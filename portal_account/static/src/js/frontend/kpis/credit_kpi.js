import { rpc } from "@web/core/network/rpc";

export const reloadAccountCreditKpis = async () => {
    const res = await rpc('/account/dashboard/kpis/credit');
    if(res?.status != 'success') return;
    
    // Also load credit history
    loadCreditHistory();

    // Get elements
    const availableCreditElement = document.querySelector('#dashboard-page-available-credit-value');
    const pendingApprovalElement = document.querySelector('#dashboard-page-pending-approval-value');

    // Set format attributes
    if (availableCreditElement) {
        availableCreditElement.dataset.suffix = ` ${res.currency_symbol}`;
        availableCreditElement.setAttribute('data-decimals', res.decimal_places || 2);
        availableCreditElement.setAttribute('data-thousand-sep', res.thousand_separator || '');
        availableCreditElement.setAttribute('data-decimal-sep', res.decimal_separator || '.');
    }

    if (pendingApprovalElement) {
        pendingApprovalElement.dataset.suffix = ` ${res.currency_symbol}`;
        pendingApprovalElement.setAttribute('data-decimals', res.decimal_places || 2);
        pendingApprovalElement.setAttribute('data-thousand-sep', res.thousand_separator || '');
        pendingApprovalElement.setAttribute('data-decimal-sep', res.decimal_separator || '.');
    }

    sysToolsUdateNumber('#dashboard-page-available-credit-value', res.available_credit);
    sysToolsUdateNumber('#dashboard-page-pending-approval-value', res.pending_approval);

    // Show/hide pending approval section based on whether there are pending requests
    const pendingLabel = document.querySelector('#dashboard-page-pending-approval-label');
    const pendingValue = document.querySelector('#dashboard-page-pending-approval-value');

    if (pendingLabel && pendingValue) {
        if (res.has_pending) {
            pendingLabel.classList.remove('hidden');
            pendingValue.classList.remove('hidden');
        } else {
            pendingLabel.classList.add('hidden');
            pendingValue.classList.add('hidden');
        }
    }
}

export const setupDashboardCreditModal = () => {
    // Add Credit button click handler
    const addCreditBtn = document.getElementById('dashboard-page-add-credit-button');
    const submitCreditBtn = document.getElementById('dashboard-page-add-credit-submit');

    addCreditBtn.addEventListener('click', () => {
        // Reset form fields
        const amountInput = document.getElementById('credit-amount');
        if (amountInput) amountInput.value = '';

        Modal.open('dashboard-page-add-credit-modal');
    });

    // Submit credit request handler
    submitCreditBtn.addEventListener('click', async () => {
        const res = sysFormValidate('#dashboard-add-credit-form');

        if(!res) return;

        const { formData } = sysCollectFormData('#dashboard-add-credit-form');

        const result = await rpc('/account/dashboard/add_credit', formData);

        if(result?.errors) sysShowServerErrors('#dashboard-add-credit-form', result.errors);

        if(result?.message) systemShowNotification(result.message, { type: result?.status || 'error' })

        if(result?.status !== 'success') return;

        Modal.close('dashboard-page-add-credit-modal');

        reloadAccountCreditKpis();
        loadCreditHistory(); // Reload history after adding credit
    });
}

export const updateAccountCreditKpis = () => {
    reloadAccountCreditKpis();
    setupDashboardCreditModal();
}

/**
 * Load and display credit request history
 */
const loadCreditHistory = async () => {
    const container = document.getElementById('dashboard-credit-history-container');
    if (!container) return;

    try {
        const res = await rpc('/account/dashboard/kpis/credit_history');
        
        if (res?.status !== 'success') {
            container.innerHTML = '<p class="text-white/60 text-xs text-center py-2">Error loading history</p>';
            return;
        }

        if (!res.history || res.history.length === 0) {
            container.innerHTML = '<p class="text-white/60 text-xs text-center py-2">No credit requests yet</p>';
            return;
        }

        // Build history HTML (white theme for gradient background)
        let html = '';
        for (const item of res.history) {
            const stateColorClasses = {
                'amber': 'bg-amber-400/80 text-amber-900',
                'green': 'bg-green-400/80 text-green-900',
                'red': 'bg-red-400/80 text-red-900',
                'gray': 'bg-white/30 text-white',
            };
            const colorClass = stateColorClasses[item.state_color] || stateColorClasses['gray'];

            html += `
                <div class="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                    <div class="flex-1">
                        <p class="text-sm font-semibold text-white">${item.amount_formatted}</p>
                        <p class="text-xs text-white/60">${item.date}</p>
                    </div>
                    <span class="px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}">
                        ${item.state_label}
                    </span>
                </div>
            `;
        }
        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading credit history:', error);
        container.innerHTML = '<p class="text-white/60 text-xs text-center py-2">Error loading history</p>';
    }
}

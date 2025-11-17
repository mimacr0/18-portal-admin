import { rpc } from "@web/core/network/rpc";

export const reloadAccountCreditKpis = async () => {
    const res = await rpc('/account/dashboard/kpis/credit');
    if(res?.status != 'success') return;

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
    console.log(res.available_credit);
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
    });
}

export const updateAccountCreditKpis = () => {
    reloadAccountCreditKpis();
    setupDashboardCreditModal();
}

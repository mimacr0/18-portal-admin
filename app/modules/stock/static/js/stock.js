let stockStockPage = 1

const stockStockReloadList = async () => {
    let q = $('#stock-stock-search-input').val()
    $('.tooltip').remove()
    const res = await jsonGet(`/stock/stock/list?q=${q || ''}&page=${stockStockPage || ''}`)
    $('#stock-stock-list').html(res.html)
    $('#stock-stock-footer').html(res.footer)
    $('[data-toggle="tooltip"]').tooltip()
    $('#stock-stock-footer .page-item').click(function () {
        stockStockPage = $(this).data('page')
        stockStockReloadList()
    })
}

$('#stock-stock-search-input').on('keyup', debounceAction(stockStockReloadList, 300))

stockStockReloadList()

//Enable check and uncheck all functionality
$('.stock-stock-checkbox').click(function () {
    var clicks = $(this).data('clicks')
    if (clicks) {
        //Uncheck all checkboxes
        $('.stock-stock-main-container input[type=\'checkbox\']').prop('checked', false)
        $('.stock-stock-checkbox .far.fa-check-square').removeClass('fa-check-square').addClass('fa-square')
    } else {
        //Check all checkboxes
        $('.stock-stock-main-container input[type=\'checkbox\']').prop('checked', true)
        $('.stock-stock-checkbox .far.fa-square').removeClass('fa-square').addClass('fa-check-square')
    }
    $(this).data('clicks', !clicks)
})

$('#stock-expedition-create-form-client-account-id').select2({
    dropdownParent: $('#stockExpeditionBatchCreateModal')
})

$('#stock-expedition-create-form-shipping-adddress-id').select2({
    dropdownParent: $('#stockExpeditionBatchCreateModal')
})

const stockExpeditionBatchCreateAction = async (mids) => {
    const res = await jsonGet(`/expeditions/create/account/data`)
    if(res?.status != 'success') return
    $('#stock-expedition-create-form-client-account-id').html(res.accounts)
    $('#contact_country_id_select').html(res.countries)
    $('#stock-expedition-create-form-id').val(mids.join(','))
    $('#stockExpeditionBatchCreateModal').modal('toggle')
}

const stockExpeditionBatchCreateAccountIdChange = async (e) => {
    const accountId = $(e.currentTarget).val()
    if(!accountId) return $('#stock-expedition-create-form-shipping-adddress-id').html('')
    const res = await jsonPost(`/expeditions/create/account/shipping/data`, { account_id: accountId })
    if(res?.status != 'success') return
    $('#stock-expedition-create-form-shipping-adddress-id').html(res.data)
}

$('#stock-expedition-create-form-client-account-id').on('change', stockExpeditionBatchCreateAccountIdChange)

const selectExpeditionZipCode = async (e) => {
    const zipId = $(e.currentTarget).data('id')
    const zipCode = $(e.currentTarget).data('zip')
    const countryId = $(e.currentTarget).data('country-id')
    const cityId = $(e.currentTarget).data('city')
    const stateId = $(e.currentTarget).data('state-id')
    const res = await jsonPost(`/expeditions/create/account/zip/data`, { zip: zipId }, { loading: false })
    if(res?.status != 'success') return
    $('#contact_country_id_select').val(countryId)
    $('#contact_city_id_select').html(res.data.cities)
    $('#contact_state_id_select').html(res.data.states)
    $('#contact_city_id_select').val(cityId)
    $('#contact_state_id_select').val(stateId)
    $('#stock-expedition-create-form-zip-id').val(zipId)
    $('.o_portal_contact_zip').val(zipCode)
    $('#select_zip_code_list_container').html('')
    $('#search_zip_code_input').val('')
}

const findZipCodesForAccount = async (e) => {
    const zipCode = $(e.currentTarget).val()
    if(!zipCode) return $('#select_zip_code_list_container').html('')
    const res = await jsonPost(`/expeditions/create/account/zip/find`, { zip: zipCode }, { loading: false })
    if(res?.status != 'success') return
    $('#select_zip_code_list_container').html(res.data)
    $('.o_portal_select_zip_code_btn').click(selectExpeditionZipCode)
}

$('#search_zip_code_input').on('keyup', debounceAction(findZipCodesForAccount, 300))

const stockExpeditionCreateButton = () => {
    let msgIds = []
    $('.mailbox-messages input[type=\'checkbox\']').each(function() {
        if ($(this).is(':checked')) msgIds.push($(this).val());
    }).promise().done(() => {
        if(msgIds.length == 0) return alert('No products selected')
        stockExpeditionBatchCreateAction(msgIds)
    })
}

$('.stock-stock-expedition-button').click(stockExpeditionCreateButton)

const stockExpeditionContactSaveAction = async (e) => {
    const res = await formPost('/expeditions/create/account/address/save', '#register-contact-shipping-address-form')
    if(res?.status != 'success') return
    $('#contact_country_id_select').val('')
    $('#contact_city_id_select').val('')
    $('#contact_state_id_select').val('')
    $('#stock-expedition-create-form-zip-id').val('')
    $('.o_portal_contact_zip').val('')
    $('#select_zip_code_list_container').html('')
    $('#search_zip_code_input').val('')
    $('.o_portal_name').val('')
    $('.o_portal_email').val('')
    $('.o_portal_street').val('')
    $('.o_portal_phone').val('')
    $('#register-shipping-address-form').hide()
    const accId = $('#stock-expedition-create-form-client-account-id').val()
    if(accId) return $('#stock-expedition-create-form-client-account-id').trigger('change')
}

$('#save-new-shipping-address').click(stockExpeditionContactSaveAction)

$('#add-shipping-address-btn').click(async () => {
    $('#register-shipping-address-form').show()
})

const stockExpeditionCreateFormSubmit = async (e) => {
    const res = await formPost('/expeditions/create/expedition/create', '#stock-expedition-create-form-data')

    if(res?.status != 'success') return

    $('#stock-expedition-create-form-client-account-id').val('').trigger('change')
    $('#stock-expedition-create-form-shipping-adddress-id').val('').trigger('change')
    $('#stockExpeditionBatchCreateModal').modal('toggle')
}

$('#stock-expedition-create-form-submit').click(stockExpeditionCreateFormSubmit)
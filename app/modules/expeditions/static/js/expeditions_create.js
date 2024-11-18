const selectZipCode = async (e) => {
    const zipId = $(e.currentTarget).data('id')

    const res = await jsonPost(`/expeditions/create/account/zip/data`, { zip: zipId }, { loading: false })
    if(res?.status != 'success') return

    $('#contact_form_country').val(res.data.countryId)
    $('#contact_form_city').val(res.data.city)
    $('#contact_form_state').val(res.data.stateId)
    $('#contact_form_state_id').val(res.data.stateId)
    $('#contact_form_zip').val(res.data.zip)
    $('#contact_form_country').trigger('change')
    $('#contact_form_select_zip_code_list_container').html('')
    $('#contact_form_search_zip_code_input').val('')
}

const findZipCodes = async (e) => {
    const zipCode = $(e.currentTarget).val()
    if(!zipCode) return $('#contact_form_select_zip_code_list_container').html('')

    const res = await jsonPost(`/expeditions/create/account/zip/find`, { zip: zipCode }, { loading: false })
    if(res?.status != 'success') return

    $('#contact_form_select_zip_code_list_container').html(res.data)
    $('.o_portal_select_zip_code_btn').click(selectZipCode)
}

const submitContactForm = async (e) => {
    e.preventDefault()

    if(!formValidate('#contact_form')) return

    const formData = new FormData(document.getElementById('contact_form'))
    const data = Object.fromEntries(formData)
    const clientAccountId = $('#client_account_id_select').val()

    const res = await jsonPost('/expeditions/contact/create', { client_account_id: clientAccountId, ...data })
    if(res?.status != 'success') {
        $('#contact_form_errorMessages')
            .removeClass('d-none')
            .html(res.message || 'Error creating contact')
        return
    }

    $('#partner_shipping_id_select').html(res.data)

    $('#contactModal').modal('hide')
    document.getElementById('contact_form').reset()
    $('#contact_form_errorMessages').addClass('d-none')
}

const openContactModal = async (e) => {
    e.preventDefault()

    const clientAccountId = $('#client_account_id_select').val()

    if(!clientAccountId) return displayAlertNotification('Please select client account', 'danger')

    const res = await jsonGet('/expeditions/countries/list')
    if(res?.status == 'success') {
        $('#contact_form_country').html(res.data)
    }
    $('#contactModal').modal('show')
}

$('.partner_shipping_add_contact_button').click(openContactModal)
$('#contact_form_search_zip_code_input').on('keyup', debounceAction(findZipCodes, 300))
$('#contact_form_submit').click(submitContactForm)

$('#contact_form_country').change(async function() {
    const countryId = $(this).val()
    if(!countryId) {
        $('#contact_form_state_group').hide()
        return
    }

    const stateId = $('#contact_form_state_id').val()

    const res = await jsonGet(`/expeditions/states/${countryId}`)
    if(res?.status == 'success') {
        $('#contact_form_state').html(res.data)
        if(stateId) $('#contact_form_state').val(stateId)
        $('#contact_form_state_id').val('')
        $('#contact_form_state_group').show()
    }
})

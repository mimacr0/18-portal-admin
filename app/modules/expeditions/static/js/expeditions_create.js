const selectZipCode = async (e) => {
    const zipId = $(e.currentTarget).data('id')
    const zipCode = $(e.currentTarget).data('zip')
    const countryId = $(e.currentTarget).data('country-id')
    const cityId = $(e.currentTarget).data('city')
    const stateId = $(e.currentTarget).data('state-id')

    const res = await jsonPost(`/expeditions/create/account/zip/data`, { zip: zipId }, { loading: false })
    if(res?.status != 'success') return

    $('#contact_form_country').val(countryId)
    $('#contact_form_city').val(cityId)
    $('#contact_form_state').val(stateId)
    $('#contact_form_zip').val(zipCode)
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
    const formData = new FormData(document.getElementById('contact_form'))
    const data = Object.fromEntries(formData)

    const res = await jsonPost('/expeditions/contact/create', data)
    if(res?.status != 'success') {
        $('#contact_form_errorMessages')
            .removeClass('d-none')
            .html(res.message || 'Error creating contact')
        return
    }

    const newOption = new Option(res.data.name, res.data.id, false, true)
    $('#partner_shipping_id_select').append(newOption).trigger('change')

    $('#contactModal').modal('hide')
    document.getElementById('contact_form').reset()
    $('#contact_form_errorMessages').addClass('d-none')
}

const openContactModal = async (e) => {
    e.preventDefault()
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

    const res = await jsonGet(`/expeditions/states/${countryId}`)
    if(res?.status == 'success') {
        $('#contact_form_state').html(res.data)
        $('#contact_form_state_group').show()
    }
})

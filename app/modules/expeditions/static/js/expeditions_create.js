
const submitExpeditionForm = async (e) => {
    e.preventDefault()

    if(!formValidate('.o_portal_expedition_order_form')) return

    const formData = new FormData(document.querySelector('.o_portal_expedition_order_form'))
    const data = Object.fromEntries(formData)

    // Get selected products data
    const productIds = []
    const lines = $('.expedition-line-product-item')

    for (let i = 0; i < lines.length; i++) productIds.push({
        pid: $(lines[i]).data('id'),
        qty: $(lines[i]).val()
    })

    const res = await jsonPost('/expeditions/create/action', {
        ...data,
        product_ids: productIds
    })

    if(res?.status != 'success') return

    window.location.href = '/expeditions/details/' + res.data.id
}

$('.o_portal_submit_form_btn').on('click', submitExpeditionForm)

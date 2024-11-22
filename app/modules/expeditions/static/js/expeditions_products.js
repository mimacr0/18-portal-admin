
const updateSubmitButton = () => {
    const hasProducts = $('#order_product_list_content tr').length > 0;
    const hasPartner = $('#partner_shipping_id_select').val();
    const hasAccount = $('#client_account_id_select').val();

    if(hasProducts && hasPartner && hasAccount) {
        $('.o_portal_submit_form_btn').show();
    } else {
        $('.o_portal_submit_form_btn').hide();
    }
}

const showProductsModal = async () => {
    const productIds = []

    const lines = $('.expedition-product-item-row')

    for (let i = 0; i < lines.length; i++)
        productIds.push($(lines[i]).data('id'));

    const res = await jsonGet('/expeditions/products/list?pids=' + productIds.join(','))
    if(res?.status != 'success') return

    $('#select_product_list_container').html(res.data)
    $('#modalproducts').modal('show')
}

const findProducts = async (e) => {
    const searchTerm = $(e.currentTarget).val();

    const productIds = []

    const lines = $('.expedition-product-item-row')

    for (let i = 0; i < lines.length; i++)
        productIds.push($(lines[i]).data('id'));

    const res = await jsonPost(`/expeditions/create/product/find`, { q: searchTerm, pids: productIds }, { loading: false });
    if(res?.status != 'success') return;

    $('#select_product_list_container').html(res.data);
}

const toggleAllProducts = (e) => {
    const isChecked = $(e.currentTarget).prop('checked');
    $('.stock-item-checkbox input[type="checkbox"]').prop('checked', isChecked);
}

const onAddProducts = async (e) => {
    e.preventDefault();
    const productIds = []

    const lines = $('.stock-item-checkbox input[type="checkbox"]')

    for (let i = 0; i < lines.length; i++) {
        const line = $(lines[i]);
        if (line.is(':checked')) productIds.push(line.val());
    }

    const expeditionLines = $('.expedition-product-item-row')

    for (let i = 0; i < expeditionLines.length; i++)
        productIds.push($(expeditionLines[i]).data('id'));

    if (productIds.length == 0) {
        alert('No products selected');
        return;
    }

    const res = await jsonPost('/expeditions/create/product/add', { product_ids: productIds }, { loading: false });

    if(res?.status != 'success') return

    $('#order_product_list_content').html(res.data)
    $('#modalproducts').modal('hide')
    updateSubmitButton()

}

const resetProductsModal = () => {
    $('#search_product_input').val('')
    $('#select_product_list_container').html('')
}

// Event listeners
$('#modalproducts').on('hidden.bs.modal', resetProductsModal);
$('#search_product_input').on('keyup', debounceAction(findProducts, 300));
$(document).on('change', '#selectAll', toggleAllProducts);
$('#js_products_form').on('submit', () => { return false });
$('.o_portal_add_products_btn').click(() => showProductsModal());
$('.o_portal_add_products_confirm_btn').click(onAddProducts);

$('#client_account_id_select, #partner_shipping_id_select').change(updateSubmitButton);
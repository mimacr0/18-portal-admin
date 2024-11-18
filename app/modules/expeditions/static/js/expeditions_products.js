const selectProduct = (e) => {
    const $elem = $(e.currentTarget);
    const productId = $elem.data('id');
    const name = $elem.data('name');
    const qty = 1;

    const $tbody = $('#order_product_list_content');
    const $row = $(`
        <tr data-product-id="${productId}">
            <td>${name}</td>
            <td class="text-right">
                <input type="number" class="form-control form-control-sm text-right product_quantity_input"
                       value="${qty}" min="1" style="width: 100px; float: right;">
            </td>
        </tr>
    `);

    $tbody.append($row);
    updateProductIds();
    updateSubmitButton();
}

const findProducts = async (e) => {
    const searchTerm = $(e.currentTarget).val();
    if(!searchTerm) return $('#select_product_list_container').html('');

    const res = await jsonPost(`/expeditions/create/product/find`, { search: searchTerm }, { loading: false });
    if(res?.status != 'success') return;

    $('#select_product_list_container').html(res.data);
    $('.o_portal_select_product_btn').click(selectProduct);
}

const updateProductIds = () => {
    const productIds = [];
    $('#order_product_list_content tr').each(function() {
        const productId = $(this).data('product-id');
        const quantity = $(this).find('.product_quantity_input').val();
        productIds.push(`${productId}:${quantity}`);
    });
    $('.o_portal_product_ids').val(productIds.join(','));
}

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
    const res = await jsonGet('/expeditions/products/list')
    if(res?.status != 'success') return

    console.log(res.data)

    $('#select_product_list_container').html(res.data)
    $('#modalproducts').modal('show')
}

// Event listeners
$('.o_portal_add_products_btn').click(() => showProductsModal());
$('#search_product_input').on('keyup', debounceAction(findProducts, 300));
$('.o_portal_add_products_confirm_btn').click(() => $('#modalproducts').modal('hide'));

$(document).on('change', '.product_quantity_input', function() {
    updateProductIds();
});

$('#client_account_id_select, #partner_shipping_id_select').change(updateSubmitButton);
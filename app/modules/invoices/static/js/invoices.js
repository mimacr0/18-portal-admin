let invoicesPage = 1

const invoicesReloadList = async () => {
    let q = $('#invoices-search-input').val()
    $('.tooltip').remove()
    const res = await jsonGet(`/invoices/invoices/list?q=${q || ''}&page=${invoicesPage || ''}`)
    $('#invoices-list').html(res.html)
    $('#invoices-footer').html(res.pager)
    $('[data-toggle="tooltip"]').tooltip()
    $('#invoices-footer .page-item').click(function () {
        invoicesPage = $(this).data('page')
        invoicesReloadList()
    })
}

$('#invoices-search-input').on('keyup', debounceAction(invoicesReloadList, 300))

invoicesReloadList()

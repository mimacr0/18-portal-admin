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
let expeditionsExpeditionsPage = 1

const expeditionsExpeditionsReloadList = async () => {
    let q = $('#expeditions-expeditions-search-input').val()
    $('.tooltip').remove()
    const res = await jsonGet(`/expeditions/expeditions/list?q=${q || ''}&page=${expeditionsExpeditionsPage || ''}`)
    $('#expeditions-expeditions-list').html(res.html)
    $('#expeditions-expeditions-pager').html(res.pager)
    $('[data-toggle="tooltip"]').tooltip()
    $('#expeditions-expeditions-pager .page-item').click(function () {
        expeditionsExpeditionsPage = $(this).data('page')
        expeditionsExpeditionsReloadList()
    })
}

$('#expeditions-expeditions-search-input').on('keyup', debounceAction(expeditionsExpeditionsReloadList, 300))

expeditionsExpeditionsReloadList()
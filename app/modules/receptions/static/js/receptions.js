let receptionsReceptionsPage = 1

const receptionsReceptionsReloadList = async () => {
    let q = $('#receptions-receptions-search-input').val()
    $('.tooltip').remove()
    const res = await jsonGet(`/receptions/receptions/list?q=${q || ''}&page=${receptionsReceptionsPage || ''}`)
    $('#receptions-receptions-list').html(res.html)
    $('#receptions-receptions-pager').html(res.pager)
    $('[data-toggle="tooltip"]').tooltip()
    $('#receptions-receptions-pager .page-item').click(function () {
        receptionsReceptionsPage = $(this).data('page')
        receptionsReceptionsReloadList()
    })
}

$('#receptions-receptions-search-input').on('keyup', debounceAction(receptionsReceptionsReloadList, 300))

receptionsReceptionsReloadList()
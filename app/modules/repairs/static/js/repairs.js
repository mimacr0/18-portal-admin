let repairsPage = 1

const repairsReloadList = async () => {
    let q = $('#repairs-repairs-search-input').val()
    $('.tooltip').remove()
    const res = await jsonGet(`/repairs/repairs/list?q=${q || ''}&page=${repairsPage || ''}`)
    $('#repairs-repairs-list').html(res.html)
    $('#repairs-repairs-pager').html(res.pager)
    $('[data-toggle="tooltip"]').tooltip()
    $('#repairs-repairs-pager .page-item').click(function () {
        repairsPage = $(this).data('page')
        repairsReloadList()
    })
}

$('#repairs-repairs-search-input').on('keyup', debounceAction(repairsReloadList, 300))

repairsReloadList()

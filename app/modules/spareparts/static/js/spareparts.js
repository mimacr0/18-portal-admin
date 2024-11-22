let sparepartsPage = 1

const sparepartsReloadList = async () => {
    let q = $('#spareparts-search-input').val()
    $('.tooltip').remove()
    const res = await jsonGet(`/spareparts/list?q=${q || ''}&page=${sparepartsPage || ''}`)
    $('#spareparts-list').html(res.html)
    $('#spareparts-pager').html(res.footer)
    $('[data-toggle="tooltip"]').tooltip()
    $('#spareparts-pager .page-item').click(function () {
        sparepartsPage = $(this).data('page')
        sparepartsReloadList()
    })
}

$('#spareparts-search-input').on('keyup', debounceAction(sparepartsReloadList, 300))

sparepartsReloadList()

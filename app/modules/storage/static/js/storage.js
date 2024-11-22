let storagePage = 1

const storageReloadList = async () => {
    let q = $('#storage-locations-search-input').val()
    $('.tooltip').remove()
    const res = await jsonGet(`/storage/location/list?q=${q || ''}&page=${storagePage || ''}`)
    $('#storage-locations-list').html(res.html)
    $('#storage-locations-pager').html(res.footer)
    $('[data-toggle="tooltip"]').tooltip()
    $('#storage-locations-pager .page-item').click(function () {
        storagePage = $(this).data('page')
        storageReloadList()
    })
}

$('#storage-locations-search-input').on('keyup', debounceAction(storageReloadList, 300))

storageReloadList()

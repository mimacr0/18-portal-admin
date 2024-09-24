
const loadingShow = (txt) => {
    $('#loading-text').html(txt || '')
    $("#loading").show()
}

const loadingHide = () => {
    $('#loading-text').html('')
    $("#loading").hide()
}

const formValidate = (fid) => {
    let $form = $(fid)

    if(!$form[0].checkValidity()) {
        $form.addClass('was-validated')
        return false
    }

    return true
}

const displayAlertNotification = (body, mstyle='success', duration = 8000) => {
    const alertId = `tmp-alert-message-${Math.random().toString(36).substring(7)}`
    $('#page_messages_container').append(`
    <div id="${alertId}" class="alert alert-${mstyle} alert-dismissible fade show" style="display: none" role="alert">
        <i class="fas fa-info-circle"></i> <span class="ml-1">${body}</span>
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    </div>`);
    const notification = $(`#${alertId}`);
    notification.show()
    if(duration > 0) setTimeout(() => { notification.fadeOut() }, duration)
}

const jsonPost = async (url, data={}, options={}) => {

    const {
        loading = 'Loading ...',
        duration = 8000,
    } = options

    if(loading) loadingShow(loading)

    let res = {}

    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data)
        })

        if(r.status == 200) res = await r.json()
        if(r.status == 404) res = { status: 'error', message: 'URL not found' }
        if(r.status == 500) res = { status: 'error', message: 'Internal server error' }
    } catch (error) {
        console.error(error.message)
        res = { status: 'error', message: 'Internal server error' }
    }

    if(loading) loadingHide()

    if(!res.message) return res

    displayAlertNotification(
        res.message,
        res.status == 'success' ? 'success' : 'danger',
        res.sticky ? -1 : duration
    )

    return res

}

const jsonGet = async (url) => {
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })

    if(res.status == 404) return displayAlertNotification(`URL not found: ${url}`, 'danger')
    if(res.status == 500) return displayAlertNotification('Internal server error', 'danger')

    const r = await res.json()

    if(!r.message) return r

    displayAlertNotification(r.message, r.status == 'success' ? 'success' : 'danger')

    return r
}

window.mobileDetect = function() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}

const debounceAction = (callback, ms) => {
    var timer = 0
    return function() {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        callback.apply(context, args)
      }, ms || 0)
    }
}

const serializeObject = ($form) => {
    return $form.serializeArray().reduce((obj, item) => {
        obj[item.name] = item.value;
        return obj
    }, {})
}

const formPost = async (url, fid, options={}) => {
    if(!formValidate(fid)) return

    const { loading = 'Loading ...', duration = 8000 } = options

    let files = []

    $(fid + ' input[type="file"]').each(function() {
        files.push($(this).attr('id'))
    })

    let select = []

    $(fid + ' select').each(function() {
        if($(this).attr('multiple')) select.push($(this).attr('id'))
    })

    let data = serializeObject($(fid))

    for(const inputId of files) {
        let fileInput = $(`#${inputId}`)
        let file_data = fileInput[0].files
        for (let i = 0; i < file_data.length; i++) {
            data[`${fileInput.attr('name')}-${i}`] = file_data[i]
        }
    }

    for(const inputId of select) {
        let selectInput = $(`#${inputId}`)
        data[selectInput.attr('name')] = selectInput.val()
    }

    if(loading) loadingShow(loading)

    const formData  = new FormData()

    for(const name in data) formData.append(name, data[name])

    let res = {}

    const r = files.length > 0 ? await fetch(url, {
        method: 'POST',
        body: formData
    }) : await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data)
    })

    if(r.status == 200) res = await r.json()
    if(r.status == 404) res = { status: 'error', message: 'URL not found' }
    if(r.status == 500) res = { status: 'error', message: 'Internal server error' }

    if(loading) loadingHide()

    let style = res.status == 'success' ? 'success' : 'danger'

    if(!res.message) return res

    displayAlertNotification(res.message, style, res.sticky ? -1 : duration)

    return res

}

function handleFiles(files, l) {
    l.html('')
    files = [...files]
    files.forEach(file => {
        uploadFile(file, l)
    })
}

function uploadFile(file, l) {
    const fileItem = `<div class="alert alert-success mt-2" role="alert">
    ${file.name} - ${formatBytes(file.size)}
    </div>`;
    l.append(fileItem)
}

// Format file size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function fileHighlight(e) {
    const dropArea = $(e.currentTarget)
    dropArea.addClass('highlight')
}

function fileUnhighlight(e) {
    const dropArea = $(e.currentTarget)
    dropArea.removeClass('highlight')
}

$(document).ready(function() {

    // Highlight drop area when item is dragged over it
    $('.drop-area').on('dragenter dragover', function(e) {
        preventDefaults(e)
        $(this).addClass('highlight')
    })

    // Unhighlight drop area when item is dragged out
    $('.drop-area').on('dragleave', function(e) {
        preventDefaults(e)
        $(this).removeClass('highlight')
    })

    // Handle dropped files
    $('.drop-area').on('drop', function(e) {
        preventDefaults(e)
        $(this).removeClass('highlight')

        const fid = $(this).attr('id').replace('-drop-area', '')
        let dt = e.originalEvent.dataTransfer
        let finput = document.getElementById(fid)
        finput.files = dt.files

        const ndt = new DataTransfer()
        for (let i = 0; i < dt.files.length; i++) {
            ndt.items.add(dt.files[i])
        }
        finput.files = ndt.files
        preventDefaults(e)

        handleFiles(dt.files, $(`#${fid}-file-list`))

    })

    // Handle dropped files
    $('.drop-area .btn-clear').on('click', function() {
        const bid = $(this).attr('id').replace('-clear', '')
        const finput = $(`#${bid}`)
        const list = $(`#${bid}-file-list`)
        finput.val('')
        list.html('')
    })

    // Handle file input change
    $('.drop-area input[type="file"]').on('change', function() {
        const files = this.files
        const list = $(`#${$(this).attr('id')}-file-list`)
        handleFiles(files, list)
    })

})

const displayPageScreenAction = (e) => {
    const snum = $(e.currentTarget).data('screen')
    const screens = $('.section-page-screen')

    for(const screen of screens) {
        const num = $(screen).data('screen')
        if(num == snum) continue
        $(screen).hide()
    }
    $(`.page-screen-${snum}`).show()
}

$('.display-page-screen-action').click(displayPageScreenAction)

const updateSystemLangAction = async (e) => {
    const lang = e.currentTarget.getAttribute('data-language')
    const res = await jsonPost(`/base/system/lang/update`, { lang })
    if(res?.status != 'success') return
    location.reload()
}

$('.update-system-lang-action').click(updateSystemLangAction)
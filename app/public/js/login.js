
const serializeData = (data) => {
    let result = {}
    for (const item of data) {
        result[item.name] = item.value
    }
    return result
}

const validateForm = (fsel) => {
    const $form = $(fsel)
    $(`${fsel} input`).removeClass('is-invalid').removeClass('is-valid')

    if (!$form[0].checkValidity()) {
        $form.addClass('was-validated')
        return false
    }

    return true
}

const loginAction = async (e) => {
    if(!validateForm('form')) return

    let data = serializeData($('form').serializeArray())

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    if (response.status !== 200) {
        $('div.alert-danger').show()
        $('div.alert-danger span.message').text('Error de conexión')
        return
    }

    const r = await response.json()

    if(r.status != 'success') {
        $('div.alert-danger').show()
        $('div.alert-danger span.message').text(r.message)
        return
    }

    window.location.href = '/'

}

$('.login-button').click(loginAction)
$('form input').keypress((e) => {
    if (e.keyCode === 13) loginAction()
})

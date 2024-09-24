const numberKPIIntervalTime = 150
let numberKPICurrentValue = 0
let numberKPITargetValue = 0

function numberKPIformat(number) {
    return new Intl.NumberFormat('en-US').format(number);
}

function numberKPIUpdateDisplay(eid) {
    $e = document.querySelector(`#kpi-value-${eid}`)
    $e.textContent = numberKPIformat(parseInt(numberKPICurrentValue))
}

function numberKPIUpdateValue(eid, value) {
    $e = document.querySelector(`#kpi-value-${eid}`)
    numberKPICurrentValue = parseInt($e.getAttribute('data-value'))
    numberKPITargetValue = parseInt(value)
    numberKPIAnimateChange(eid)
}


function numberKPIAnimateChange(eid) {
    const step = Math.sign(numberKPITargetValue - numberKPICurrentValue)
    const interval = setInterval(() => {
        if (Math.abs(numberKPICurrentValue - numberKPITargetValue) < Math.abs(step)) {
            numberKPICurrentValue = numberKPITargetValue;
            clearInterval(interval);
        } else {
            numberKPICurrentValue += step;
        }
        numberKPIUpdateDisplay(eid)
    }, numberKPIIntervalTime);
}

socket.on('sys_status', (data) => {
    const $cpuElement = $(`[data-id="${data.id}"] [data-widget="cpu"]`)
    const $ramElement = $(`[data-id="${data.id}"] [data-widget="memory"]`)
    const $diskElement = $(`[data-id="${data.id}"] [data-widget="storage"]`)
    $cpuElement.css('width', data.cpu.percent)
    $ramElement.css('width', data.memory.percent)
    $diskElement.css('width', data.disk.percent)
    $cpuElement.removeClass('bg-success')
                .removeClass('bg-danger')
                .removeClass('bg-warning')
                .addClass(`bg-${data.cpu.color}`)
    $ramElement.removeClass('bg-success')
                .removeClass('bg-danger')
                .removeClass('bg-warning')
                .addClass(`bg-${data.memory.color}`)
    $diskElement.removeClass('bg-success')
                .removeClass('bg-danger')
                .removeClass('bg-warning')
                .addClass(`bg-${data.disk.color}`)
    document.dispatchEvent(new CustomEvent('dashboard-kpi-change-data', { detail: data }))
})

socket.on('dashboard kpi update', (data) => {
    document.dispatchEvent(new CustomEvent('dashboard-kpi-change-data', { detail: data }))
})

socket.on('dashboard fullscreen', (data) => {
    $('body > div > nav').hide()
    $('body > div > footer').hide()
    $('body > div > aside').css('height', '100vh')
    $('body > div > div.content-wrapper').css('height', '100vh')
})

socket.on('dashboard reload', (data) => {
    location.reload()
})
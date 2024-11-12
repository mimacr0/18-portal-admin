
export const lPad = (str, len, pad='0') => {
    return (pad.repeat(len) + str).slice(-len);
}

export const numFormat = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const parseInterval = (interval) => {
    let seconds = 0

    if(!interval.includes('-')) throw new Error(`Invalid interval: ${interval}`)

    const [amount, unit] = interval.split('-')

    if(unit.toLowerCase().startsWith('second')) seconds = parseInt(amount)
    if(unit.toLowerCase().startsWith('minute')) seconds = parseInt(amount) * 60
    if(unit.toLowerCase().startsWith('hour')) seconds = parseInt(amount) * 3600
    if(unit.toLowerCase().startsWith('day')) seconds = parseInt(amount) * 86400

    return new Date(new Date().getTime() + seconds * 1000)
}

export const dateInterval = (start, end) => {
    const msPerMinute = 60000;
    const msPerHour = 3600000;
    const msPerDay = 86400000;

    let differenceMs = Math.abs(start - end);

    const days = Math.floor(differenceMs / msPerDay);
    differenceMs %= msPerDay;

    const hours = Math.floor(differenceMs / msPerHour);
    differenceMs %= msPerHour;

    const minutes = Math.floor(differenceMs / msPerMinute);
    differenceMs %= msPerMinute;

    const seconds = Math.floor(differenceMs / 1000);

    return `${days > 0 ? `${days} days, ` : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
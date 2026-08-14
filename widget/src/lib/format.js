const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatDayHeader(day) {
  const year = parseInt(day.slice(0, 4), 10)
  const month = parseInt(day.slice(4, 6), 10) - 1
  const date = parseInt(day.slice(6, 8), 10)
  const weekday = WEEKDAYS[new Date(year, month, date).getDay()]
  return `${weekday}, ${MONTHS[month]} ${date}`
}

export function formatStartTime(startTime) {
  const hours24 = parseInt(startTime.slice(0, 2), 10)
  const minutes = startTime.slice(2, 4)
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${minutes} ${period}`
}

export function formatProviderChannel(providerFeed) {
  return providerFeed.cable_number || providerFeed.digital_channel_number || providerFeed.analog_channel_number || ''
}

export function formatBroadcastChannel(programFeed) {
  return programFeed.digital_channel || programFeed.analog_channel || ''
}

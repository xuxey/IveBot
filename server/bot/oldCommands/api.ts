import * as fetch from 'isomorphic-unfetch'
import { getArguments, zeroWidthSpace } from '../imports/tools'
// Typings.
import { client } from '../imports/types'
// Get the NASA API token.
import 'json5/lib/require'
import { weatherAPIkey, fixerAPIkey, oxfordAPI } from '../../../config.json5'

export function handleDefine (message: string, sendResponse: Function) {
  if (!getArguments(message)) {
    sendResponse('Enter a valid word for me to define.')
    return
  }
  // Fetch the definition.
  const headers = { 'app_id': oxfordAPI.appId, 'app_key': oxfordAPI.appKey, Accept: 'application/json' }
  fetch(`https://od-api.oxforddictionaries.com/api/v1/inflections/en/${getArguments(message)}`, {
    headers
  })
    // Convert to JSON.
    .then((res: { json: Function }) => res.json())
    // eslint-disable-next-line handle-callback-err
    .catch((err: string) => sendResponse(`Did you enter a valid word? 👾`))
    // If there is a definition, it will be sent successfully.
    .then((json: { results: Array<{ id: string }> }) => {
      if (!json) return
      let response = json.results[0].id
      fetch(`https://od-api.oxforddictionaries.com/api/v1/entries/en/${response}`, { headers })
        // Convert to JSON.
        .then((res: { json: Function }) => res.json())
        .catch((err: string) => sendResponse(`Something went wrong 👾 Error: ${err}`))
        // If there is a definition, it will be sent successfully.
        .then((json: {
        results: Array<{
        lexicalEntries: Array<{
        lexicalCategory: string,
        entries: Array<{
        senses: Array<{
        definitions: Array<string>,
        short_definitions: Array<string>, examples: Array<{ text: string }>, registers: Array<string>
        }>
        }>
        }>
        }>
        }) => {
          let fields: Array<{ name: string, value: string, inline?: boolean }> = []
          json.results[0].lexicalEntries.forEach((element, index) => {
            if (fields.length === 24) {
              fields.push({
                name: '..too many definitions', value: 'More definitions will not be displayed.'
              })
            } else if (fields.length === 25) return
            console.log(element.entries)
            fields.push({ name: '**' + element.lexicalCategory + '**', value: zeroWidthSpace })
            element.entries.forEach(element => element.senses.forEach((element, index) => {
              if (fields.length === 24) {
                fields.push({
                  name: '..too many definitions', value: 'More definitions will not be displayed.'
                })
              } else if (fields.length === 25) return
              let i = ''
              if (element.registers) i += `(${element.registers[0]})`
              const shouldExample = element.examples && element.examples[0].text
              if (!element.short_definitions && !element.definitions) return
              const definition = element.short_definitions ? element.short_definitions[0]
                : element.definitions[0]
              fields.push(shouldExample ? {
                name: `**${index + 1}.** ${i} ${definition}`,
                value: `e.g. ${element.examples[0].text}`
              } : {
                name: `**${index + 1}.** ${i} ${definition}`,
                value: 'No example is available.'
              })
            }))
            const emptyField = { name: zeroWidthSpace, value: zeroWidthSpace }
            if (index + 1 !== json.results[0].lexicalEntries.length) fields.push(emptyField)
          })
          sendResponse(`📕 **|** Definition of **${getArguments(message)}**:`, {
            color: 0x7289DA,
            type: 'rich',
            title: getArguments(message),
            footer: { text: 'Powered by Oxford Dictionary \\o/' },
            fields
          })
        })
    })
}

// Weather command.
// This is the response we expect.
/* eslint-disable no-undef,camelcase,no-use-before-define */
type weather = { cod: string, coord: { lon: string, lat: string }, weather: Array<{
  main: string,
  description: string
}>, main: { temp: number, temp_min: number, temp_max: number, humidity: number, pressure: number },
  visibility: number, wind: { speed: number, deg: number },
  clouds: { all: number }, rain: { '3h': number }, snow: { '3h': number }
}
/* eslint-enable no-undef,camelcase,no-use-before-define */
// This is the weather handling function.
export function handleWeather (message: string, sendResponse: Function, client: client, channel: string) {
  fetch(`http://api.openweathermap.org/data/2.5/weather?q=${getArguments(message)}&appid=${weatherAPIkey}`)
    .then((res: { json: Function }) => res.json())
    .catch((err: string) => sendResponse(`Something went wrong 👾 Error: ${err}`))
    .then((json: weather) => {
      if (json.cod === '404') {
        sendResponse('Enter a valid city >_<')
      } else {
        client.createMessage(channel, {
          embed: {
            color: 0x00AE86,
            type: 'rich',
            title: 'Weather',
            /* {"clouds":{"all":40},"sys":{"sunrise":1523078495,"sunset":1523126670}} */
            description: `
**Coordinates:** (longitude: ${json.coord.lon}) (latitude: ${json.coord.lat})
**Description:** ${json.weather[0].main} - ${json.weather[0].description}
**Temperature:** (avg: ${Math.floor(json.main.temp - 272.15)}) (max: ${Math.floor(json.main.temp_max - 272.15)}) (min: ${Math.floor(json.main.temp_min - 272.15)})
**Pressure:** ${json.main.pressure} millibars
**Humidity:** ${json.main.humidity}%
**Wind:** (speed: ${json.wind.speed} meter/sec) (direction: ${json.wind.deg} degree)\n` +
`${json.visibility ? `**Visibility:** ${json.visibility} meters` : ''}\n` +
`${json.clouds ? `**Cloud cover:** ${json.clouds.all}%` : ''}\n` +
`${json.rain ? `**Rain (past 3 hours):** ${json.rain['3h']}mm` : ''}\n` +
`${json.snow ? `**Snow (past 3 hours):** ${json.snow['3h']}mm` : ''}\n`,
            footer: { text: 'Weather data from https://openweathermap.org' }
          },
          content: `**🌇🌃🌁🌆 The weather for ${getArguments(message)}:**`
        })
      }
    })
}

fetch(`http://data.fixer.io/api/latest?access_key=${fixerAPIkey}`)
  .then((res: { json: Function }) => res.json())
  .catch((err: string) => console.log(`Something went wrong 👾 Error: ${err}`))
  .then((json: { rates: { [index: string]: number }, timestamp: number }) => {
    exchangeRates = json
    exchangeRates.timestamp = Date.now()
  })
let exchangeRates: { timestamp: number, rates: { [index: string]: number } }
// Currency.
export function handleCurrency (message: string, sendResponse: Function) {
  if (!exchangeRates || Date.now() - exchangeRates.timestamp > 3600000) {
    fetch(`http://data.fixer.io/api/latest?access_key=${fixerAPIkey}`)
      .then((res: { json: Function }) => res.json())
      .catch((err: string) => sendResponse(`Something went wrong 👾 Error: ${err}`))
      .then((json: { rates: { [index: string]: number }, timestamp: number }) => {
        exchangeRates = json
        exchangeRates.timestamp = Date.now()
      })
  }
  // Whee, currency conversion!
  const from = getArguments(message).split(' ')[0].toUpperCase()
  const to = getArguments(message).split(' ')[1].toUpperCase()
  let amount = getArguments(getArguments(getArguments(message))).trim()
  if (from.length !== 3 || !exchangeRates.rates[from]) {
    sendResponse('Invalid currency to convert from.')
    return
  } else if (!to || to.length !== 3 || !exchangeRates.rates[to]) {
    sendResponse('Invalid currency to convert to.')
    return
  } else if (!amount) {
    amount = '1'
  } else if (amount && amount.split(' ').length !== 1) {
    sendResponse('Enter a single number for currency conversion.')
    return
  } else if (amount && isNaN(+amount)) {
    sendResponse('Enter a proper number to convert.')
    return
  }
  let converted: string|Array<string> =
    ((exchangeRates.rates[to] / exchangeRates.rates[from]) * +amount).toString().split('.')
  if (converted[1]) converted[1] = converted[1].substr(0, 4)
  converted = converted.join('.')
  sendResponse(`**${from}** ${amount} = **${to}** ${converted}`)
}
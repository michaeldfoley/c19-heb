const axios = require('axios').default
const geolib = require('geolib')
const playwright = require('playwright')
const { sleep, genUserAgent } = require('./utils')

const noop = () => { }

/**
 * @typedef {'Pfizer' | 'Moderna' | 'Janssen'} VaxTypes
 */

/** Check vaccines and once you find one in your area, try to grab it
 * @param {object} props
 * @param {number | string} props.homeLatitude
 * @param {number | string} props.homeLongitude
 * @param {number} props.maxDistance distance in miles
 * @param {VaxTypes[]} props.types
 */
module.exports = async function heb({
  homeLatitude = 30.267153,
  homeLongitude = -97.743057,
  maxDistance = 25,
  types = ['Pfizer', 'Moderna', 'Janssen'],
} = {}) {
  const METERS_TO_MILES = 1609.34
  const HEB_GET_SLOTS = 'https://heb-ecom-covid-vaccine.hebdigital-prd.com/vaccine_locations.json'

  console.log('Searching...')
  const result = await axios.get(HEB_GET_SLOTS, {
    headers: { 'User-Agent': genUserAgent() },
  }).catch(console.log)

  /**
   * @typedef {object} Location
   * @property {string} zip
   * @property {string} type
   * @property {string} street
   * @property {number} storeNumber
   * @property {string} state
   * @property {string[]} slotDetails
   * @property {number} openTimeslots
   * @property {number} openAppointmentSlots
   * @property {string} name
   * @property {number} [longitude]
   * @property {number} [latitude]
   * @property {string} city
   *
   * @typedef {object} Data
   * @property {Location[]} locations
   */

  /** @type {Data} */
  const { locations } = result.data

  if (result.status !== 200) {
    console.log(result.statusText)
    return false
  }

  /** @type {Location & { distance: number}} */
  const availableAppointments = locations.reduce((appointmentLocations, location) => {

    const {
      latitude,
      longitude,
      openAppointmentSlots,
      slotDetails,
    } = location

    if (
      !latitude ||
      !openAppointmentSlots ||
      !slotDetails.find(slot => types.includes(slot.manufacturer))
    ) {
      return appointmentLocations
    }

    const distance = geolib.getDistance(
      { latitude: homeLatitude, longitude: homeLongitude },
      { latitude, longitude },
    ) / METERS_TO_MILES

    return distance <= maxDistance
      ? [...appointmentLocations, { ...location, distance }]
      : appointmentLocations
  }, [])
    .sort((a, b) => a.distance - b.distance)

  if (availableAppointments.length) {
    return browser(availableAppointments[0].url)
    // browser(availableAppointments.map(({ url }) => url))
  } else {
    console.log('no appointments found')
  }
}

/**
 * Launch browser and pick a slot
 * @param {string} url
 */
async function browser(url) {
  const DATE_SELECTOR = 'input[name="Appointment_Date__c"]'
  const TIME_SELECTOR = 'input[name="Event_Session__c"]'

  const browser = await playwright.firefox.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  let foundAppointment = false

  const page = await context.newPage()

  const closeIfFound = match => value => {
    if (value.trim() === match) {
      console.log('appointments no longer available')
      return page.close()
    }
  }

  await page.goto(url)

  page.textContent('h1').then(
    closeIfFound('Appointments are no longer available for this location.'),
    noop,
  )
  page.textContent('.slds-m-bottom_small.slds-text-color_error.slds-text-title_bold').then(
    closeIfFound('There are no available time slots.'),
    noop,
  )

  await sleep(721)
  await page.click(DATE_SELECTOR).catch(noop)
  const dateSelector = await page.getAttribute(DATE_SELECTOR, 'aria-owns').catch(noop)
  await page.click(`#${dateSelector} > [role="option"]`).catch(noop)

  await sleep(655)
  await page.click('input[name="Event_Session__c"]').catch(noop)
  const timeSelector = await page.getAttribute(TIME_SELECTOR, 'aria-owns').catch(noop)
  await page.click(`#${timeSelector} > [role="option"]`).catch(noop)

  await sleep(600)
  await page.click('lightning-button').then(() => foundAppointment = true, () => browser.close())
  return new Promise((resolve) => resolve(foundAppointment))
}

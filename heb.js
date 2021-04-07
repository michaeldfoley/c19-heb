const axios = require('axios').default
const geolib = require('geolib')
const playwright = require('playwright')
const { sleep, genUserAgent, noop, randomNumber } = require('./utils')

const METERS_TO_MILES = 1609.34
const HEB_GET_SLOTS = 'https://heb-ecom-covid-vaccine.hebdigital-prd.com/vaccine_locations.json'

/**
 * @typedef {'Pfizer' | 'Moderna' | 'Janssen'} VaxTypes
 * 
 * @typedef {object} slotDetails
 * @property {number} openTimeslots
 * @property {number} openAppointmentSlots
 * @property {string} manufacturer
 * 
 * @typedef {object} Location
 * @property {string} zip
 * @property {string} type
 * @property {string} street
 * @property {number} storeNumber
 * @property {string} state
 * @property {slotDetails[]} slotDetails
 * @property {number} openTimeslots
 * @property {number} openAppointmentSlots
 * @property {string} name
 * @property {number} [longitude]
 * @property {number} [latitude]
 * @property {string} city
 * 
 * @typedef {Location & { distance: number }} AppointmentLocation
 *
 * @typedef {object} Data
 * @property {Location[]} locations
 */

/** 
 * Check vaccines and once you find one in your area, try to grab it
 * 
 * @param {object} props
 * @param {number | string} props.homeLatitude
 * @param {number | string} props.homeLongitude
 * @param {number} props.maxDistance distance in miles
 * @param {VaxTypes[]} props.types
 * 
 * @returns {Promise<boolean>}
 */
module.exports = async function heb({
  homeLatitude = 30.267153,
  homeLongitude = -97.743057,
  maxDistance = 25,
  types = ['Pfizer', 'Moderna', 'Janssen'],
} = {}) {

  console.log(`Searching for ${types.join(', ')} appointments within ${maxDistance} miles of (${homeLatitude}, ${homeLongitude})`)

  const result = await axios.get(HEB_GET_SLOTS, {
    headers: { 'User-Agent': genUserAgent() },
  }).catch(console.log)

  /** @type {Data} */
  const { locations } = result.data

  if (result.status !== 200) {
    console.log(result.statusText)
    return false
  }

  /**
   * Reduce locations to the ones that have appointments and meet the supplied criteria
   * @param {AppointmentLocation[]} appointmentLocations 
   * @param {Location} location
   */
  const findAppointments = (appointmentLocations, location) => {
    const {
      latitude,
      longitude,
      openAppointmentSlots,
      slotDetails,
    } = location

    if (
      !latitude ||
      !openAppointmentSlots ||
      !slotDetails.some(slot => types.includes(slot.manufacturer))
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
  }

  const availableAppointments = locations.reduce(findAppointments, [])
    .sort((a, b) => a.distance - b.distance)

  if (availableAppointments.length) {
    console.log('Found an appointment!')
    return browser(availableAppointments[0].url)
  }

  console.log('No appointments found')
  return new Promise((resolve) => resolve(false))
}

/**
 * Launch browser and pick a slot
 * @param {string} url
 */
async function browser(url) {
  const DATE_SELECTOR = 'input[name="Appointment_Date__c"]'
  const TIME_SELECTOR = 'input[name="Event_Session__c"]'
  const OPTION_SELECTOR = '[role="option"]'
  const SUBMIT_BUTTON_SELECTOR = 'lightning-button'

  const browser = await playwright.firefox.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  let foundAppointment = false

  const page = await context.newPage()
  await page.goto(url)

  const closeIfFound = match => value => {
    if (value.trim() === match) {
      console.log('Appointment no longer available')
      return page.close()
    }
  }

  /** If slot is already taken, close the page. */
  page.textContent('h1').then(
    closeIfFound('Appointments are no longer available for this location.'),
    noop,
  )
  page.textContent('.slds-m-bottom_small.slds-text-color_error.slds-text-title_bold').then(
    closeIfFound('There are no available time slots.'),
    noop,
  )

  await sleep(randomNumber(400, 550))
  await page.click(DATE_SELECTOR).catch(noop)
  const dateSelector = await page.getAttribute(DATE_SELECTOR, 'aria-owns').catch(noop)
  await page.click(`#${dateSelector} > ${OPTION_SELECTOR}`).catch(noop)

  await sleep(randomNumber(400, 550))
  await page.click(TIME_SELECTOR).catch(noop)
  const timeSelector = await page.getAttribute(TIME_SELECTOR, 'aria-owns').catch(noop)
  await page.click(`#${timeSelector} > ${OPTION_SELECTOR}`).catch(noop)

  await sleep(randomNumber(400, 550))
  await page.click(SUBMIT_BUTTON_SELECTOR).then(
    () => foundAppointment = true,
    () => browser.close()
  )

  return new Promise((resolve) => resolve(foundAppointment))
}

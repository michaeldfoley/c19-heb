const args = require('node-args');
const heb = require('./heb')
const { sleep } = require('./utils')

const { lat, long, distance, types } = args

async function run() {
  let loop = true
  while (loop) {
    const foundAppointment = await heb({
      homeLatitude: lat,
      homeLongitude: long,
      maxDistance: distance,
      types: types?.split(',')
    })
    loop = !foundAppointment
    await sleep(10000)
  }
}

run()

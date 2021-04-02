const heb = require('./heb')
const { sleep } = require('./utils')

const argv = require('minimist')(process.argv.slice(2));
const { lat, long, distance, types } = argv

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

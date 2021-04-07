const heb = require('./heb')
const { sleep, randomNumber } = require('./utils')

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
    await sleep(randomNumber(10000, 13000))
  }
}

run()

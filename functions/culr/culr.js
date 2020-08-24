/* eslint-disable */
const fetch = require('node-fetch')
const Color = require('color')
const Unsplash = require('unsplash-js').default
// Make visible to Unsplash
global.fetch = fetch

const UNSPLASH = new Unsplash({
  accessKey: process.env.UNSPLASH_APPLICATION_ID,
})

const grabImages = async (keyword) => {
  const images = await (
    await (await UNSPLASH.search.photos(keyword, 1, 12)).json()
  ).results
  return images
}

exports.handler = async function (event, context) {
  try {
    const SEARCH_TERM = event.queryStringParameters.search
    let images = await grabImages(SEARCH_TERM)
    images = images.map((image) => {
      const COLOR = new Color(image.color)
      return {
        ...image,
        color: {
          rgb: {
            ...COLOR.rgb().object(),
            label: COLOR.rgb().string(0)
          },
          hex: COLOR.hex(),
          hsl: COLOR.hsl().string(0),
          dark: !COLOR.isDark(),
        },
      }
    })
    console.info(images)
    return {
      statusCode: 200,
      body: JSON.stringify({ images }),
    }
  } catch (err) {
    console.log(err) // output to netlify function log
    return {
      statusCode: 500,
      body: JSON.stringify({ msg: err.message }), // Could be a custom message or object i.e. JSON.stringify(err)
    }
  }
}

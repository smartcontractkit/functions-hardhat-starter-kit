if (
  !secrets.openWeatherApiKey ||
  secrets.openWeatherApiKey === "Open weather API key (Get a free one: https://openweathermap.org/)"
) {
  throw Error(
    "OPEN_WEATHER_API_KEY environment variable not set for. Get a free one: https://openweathermap.org/"
  )
}

if (
  !secrets.worldWeatherApiKey ||
  secrets.worldWeatherApiKey === "World Weather API key (Get a free one: https://www.worldweatheronline.com/weather-api/)"
) {
  throw Error(
    "WORLD_WEATHER_API_KEY environment variable not set for. Get a free one: https://www.worldweatheronline.com/weather-api/"
  )
}

if (
  !secrets.ambeeWeatherApiKey ||
  secrets.ambeeWeatherApiKey === "ambee data API key (Get a free one: https://api-dashboard.getambee.com/)"
) {
  throw Error(
    "AMBEE_DATA_API_KEY environment variable not set for. Get a free one: https://api-dashboard.getambee.com/"
  )
}

const cityLat = args[0]
const cityLon = args[1]
const cityName = args[2]

const openWeatherRequest = Functions.makeHttpRequest({
  url: `http://api.openweathermap.org/data/2.5/weather?lat=${cityLat}&lon=${cityLon}&appid=${secrets.openWeatherApiKey}&units=imperial`,
})

const worldWeatherRequest = Functions.makeHttpRequest({
  url: `http://api.worldweatheronline.com/premium/v1/weather.ashx?key=${secrets.worldWeatherApiKey}&q=${cityName}&format=json`,
})

const ambeeDataRequest = Functions.makeHttpRequest({
  url: `http://api.ambeedata.com/weather/latest/by-lat-lng?lat=${cityLat}&lng=${cityLon}`,
  headers: { "x-api-key": `${secrets.ambeeWeatherApiKey}` }
})

// wait data returned by multiple APIs
const [openWeatherResponse, worldWeatherResponse, ambeeDataResponse] = await Promise.all([
    openWeatherRequest, 
    worldWeatherRequest,
    ambeeDataRequest])
    
const temperatures = []

// convert Celsius to Fahrenheit if necessary
const celsius2Fahrenheit = (cTemp) => {
  return (cTemp * 9) / 5 + 32
}

if(openWeatherResponse.error) {
  console.log("openWeatherResponse failed!!!!")
  console.log("response obejct: ", JSON.stringify(openWeatherResponse))
} else {
  const temp = openWeatherResponse.data["main"]
    ? openWeatherResponse.data["main"]["temp"]
      ? Number(openWeatherResponse.data["main"]["temp"])
      :0 
    :0
  temperatures.push(temp)
}

if(worldWeatherResponse.error) {
  console.log("worldWeatherResponse failed.")
  console.log("response obejct: ", JSON.stringify(worldWeatherResponse))
} else {
  const temp = worldWeatherResponse.data.data 
    ? worldWeatherResponse.data.data["weather"] 
      ? worldWeatherResponse.data.data["weather"][0]
        ? worldWeatherResponse.data.data["weather"][0]["avgtempF"] 
          ? Number(worldWeatherResponse.data.data["weather"][0]["avgtempF"]) 
          :0
        : 0 
      : 0 
    : 0
  temperatures.push(temp)
}

if(ambeeDataResponse.error) {
  console.log("ambeeResponse failed.")
  console.log("response obejct: ", JSON.stringify(ambeeDataResponse))
} else {
  const temp = ambeeDataResponse.data.data 
    ? ambeeDataResponse.data.data["temperature"] 
      ? Number(ambeeDataResponse.data.data["temperature"]) 
      : 0 
    : 0
  temperatures.push(temp)
}

// check if get at least 2 data returned
if(temperatures.length < 2) {
  throw Error("the api call is not successful");
}

const getMedianTemp = (temps) => {
  temps.sort((a, b) => a - b)
  const half = Math.floor(temps.length / 2)
  if (temps.length % 2) {
    return temps[half]
  } else {
    return (temps[half - 1] + temps[half]) / 2.0
  }
}

console.log(`Collected temperatuer data is ${temperatures}`)
const medianTemp = getMedianTemp(temperatures)
console.log(`data to encode is: ${medianTemp}`)

return Functions.encodeUint256(Math.round(medianTemp))
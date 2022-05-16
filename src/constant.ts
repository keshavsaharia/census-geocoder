/**
 * Endpoint for batch address geocoding with the US Census Geocoder
 */
//const CENSUS_GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch'
export const CENSUS_GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/'
export const MAX_BATCH_SIZE = 10000

/**
 * Mapping between custom benchmark ID (either default "current", or "2021"/"2020")
 * which are the only three supported options.
 */
export const CENSUS_BENCHMARK_CURRENT = '4'
export const CENSUS_BENCHMARK = {
	'current': CENSUS_BENCHMARK_CURRENT,
	'2021': '8',
	'2020': '2020'
} as { [id: string]: string }

export const CENSUS_GEOGRAPHY_CURRENT = '4'
export const CENSUS_GEOGRAPHY = {
	'current': CENSUS_GEOGRAPHY_CURRENT,
	'2010': '410',
	'2017': '417',
	'2018': '418',
	'2019': '419',
	'2020': '420',
	'2021': '421'
} as { [id: string]: string }

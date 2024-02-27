import https from 'https'
import FormData from 'form-data'

import {
	GeocodeAddress,
	GeocodeRequest,
	GeocodeResponse,
	GeocoderResponseCache,
	GeocoderListenerMap,
	GeocodeListener,
	GeocodeAsyncListener,
	GeocodeAsyncListenerMap
} from './interface'

import {
	csvEscape,
	csvSplit,
	delay
} from './util'

import {
	CENSUS_GEOCODER_URL,
	MAX_BATCH_SIZE,
	CENSUS_BENCHMARK_CURRENT,
	CENSUS_BENCHMARK,
	CENSUS_GEOGRAPHY_CURRENT,
	CENSUS_GEOGRAPHY
} from './constant'

/**
 * @class 	Geocoder
 * @desc 	A Geocoder instance handles geocoding with the US Census Bureau batch geocoding API.
 */
export default class Geocoder {
	// A queue of geocoding requests
	private batch: Array<GeocodeRequest>
	// Cached responses
	private cache: GeocoderResponseCache
	// A set of IDs where there was no match for the request
	private missed: Set<string>

	private listener: GeocoderListenerMap
	private asyncListener: GeocodeAsyncListenerMap

	// Configuration options for geocode API
	private apiUrl: string
	private benchmark: string
	private geography?: string
	private shouldUseCache = true
	private idCounter = 0

	/**
	 * @constructor
	 * @desc 		Create a Geocoder instance
	 * @param 		{string} benchmark - the ID of the census database to use
	 * @param 		{string} vintage - selects a geography database for use with the geography API
	 */
	constructor(benchmark?: string, geography?: string) {
		this.batch = []
		this.listener = {}
		this.asyncListener = {}
		this.cache = {}
		this.missed = new Set<string>()

		// Set configuration options for the API
		this.benchmark = CENSUS_BENCHMARK[benchmark || 'current'] || CENSUS_BENCHMARK_CURRENT
		this.geography = geography ? (CENSUS_GEOGRAPHY[geography] || CENSUS_GEOGRAPHY_CURRENT) : undefined
		this.apiUrl = CENSUS_GEOCODER_URL + (geography ? 'geographies' : 'locations') + '/addressbatch'
	}

	/**
	 * @func 	geocode
	 * @desc 	Sends a batch of requests for geocoding and returns an array of responses
	 * 			where there was a match.
	 */
	async geocode(batchSize?: number): Promise<Array<GeocodeResponse>> {
		// Need at least one item to geocode
		if (! this.hasGeocodeBatch())
			return []
		if (batchSize == null)
			batchSize = MAX_BATCH_SIZE

		// Get up to the max batch size from the batch queue
		const batch = this.batch.slice(0, batchSize)
		this.batch = this.batch.slice(batchSize)

		// Generate a CSV input for the batch API
		const csv = batch.map((request) => ('"' + [
			csvEscape(request.id),
			request.address ? csvEscape(request.address) : '',
			request.city ? csvEscape(request.city) : '',
			request.state ? csvEscape(request.state) : '',
			request.zip ? csvEscape(request.zip) : ''
		].join('","') + '"')).join('\n')

		// Generate a form to encapsulate the request
		// const form = new FormData()
		// form.append('addressFile', Buffer.from(csv), 'geocode.csv')
		// form.append('benchmark', this.benchmark)
		// if (this.geography)
		// 	form.append('vintage', this.geography)
		//
		// // Make a POST request to the census geocoder endpoint
		// const response = await axios.post(this.apiUrl, form, {
		// 	headers: form.getHeaders(),
		// 	timeout: 10000 //600000
		// })

		const rows = await this.makeRequest(csv, 60000)

		// Array of responses from the CSV output
		const geoResponses: Array<GeocodeResponse> = []

		// Split the CSV output by lines
		// const rows = response.data.toString('utf-8').split('\n')
		for (let i = 0 ; i < rows.length ; i++) {
			const row = rows[i] //csvSplit(rows[i])
			if (row.length > 0) {
				// First column is always the ID
				const id = row[0]
				// Either Match, No_Match, or Tie
				const matchType = row[2]

				// Handle ties
				if (matchType === 'Tie') {
					// TODO
				}
				// If there was a match
				else if (matchType === 'Match') {
					// Get separate latitude/longitude
					const lonlat = row[5].split(',')

					// Geocoder response object
					const geoResponse: GeocodeResponse = {
						id,
						query: row[1],
						exact: row[3] === 'Exact',
						lat: parseFloat(lonlat[1]),
						lon: parseFloat(lonlat[0]),
						address: row[4],
						roadway: row[6],
						side: row[7]
					}

					// Geography API response
					if (row.length > 8) {
						geoResponse.state = row[8]
						geoResponse.district = row[9]
						geoResponse.tract = row[10]
						geoResponse.block = row[11]
					}

					// Cache response and trigger listeners
					geoResponses.push(geoResponse)
					await this.handleResponse(id, geoResponse)
				}
				// Record the ID as missed if caching responses
				else if (this.shouldUseCache)
					this.missed.add(id)
			}
		}

		return geoResponses
	}

	async makeRequest(csv: string, timeout: number = 60000): Promise<Array<Array<string>>> {
		// Generate a form to encapsulate the request
		const form = new FormData()
		form.append('addressFile', Buffer.from(csv), 'geocode.csv')
		form.append('benchmark', this.benchmark)
		if (this.geography)
			form.append('vintage', this.geography)

		let retry = 0, maxRetry = 3

		do {
			try {
				const data = await Geocoder.request(form, timeout)
				// Make a POST request to the census geocoder endpoint
				// const response = await axios.post(this.apiUrl, form, {
				// 	headers: form.getHeaders(),
				// 	timeout
				// })
				// const data = response.data.toString('utf-8')
				const rows: Array<string> = data.split('\n')
				return rows.map((row) => csvSplit(row))
			}
			catch (error) {
				console.log('error ' + retry, error.toString())
				console.log()
				await delay(timeout)
				retry++
			}
		}
		while (retry < maxRetry)

		throw {
			code: 'RequestError',
			csv,
			benchmark: this.benchmark,
			geography: this.geography,
			retries: maxRetry,
			timeout
		}
	}

	static async request(form: FormData, timeout: number): Promise<string> {
		return new Promise((resolve, reject) => {
			form.pipe(https.request({
				protocol: 'https:',
				port: 443,
				hostname: 'geocoding.geo.census.gov',
				path: '/geocoder/locations/addressbatch',
				headers: form.getHeaders(),
				method: 'POST',
				timeout
			}, (response) => {
				const data: string[] = []
				response.on('data', (chunk) => {
					data.push(chunk)
				})
				response.on('end', () => {
					resolve(data.join(''))
				})
				response.on('error', (error) => {
					reject(error)
				})
			})
			.on('error', (error) => {
				reject(error)
			}))
		})
	}

	/**
	 * @func 	add
	 * @desc 	Add a geocoding request for a given address, and an optional listener to handle
	 * 			geocoding responses.
	 * @param 	{string} id - the unique identifier of the request
	 * @param 	{GeocodeAddress} request - street/city/state/zip of the address to geocode
	 * @param 	{GeocodeListener?} listener - an optional listener that handles the geocoding response
	 */
	add(id: string, request: GeocodeAddress, listener?: GeocodeListener) {
		this.batch.push({
			id,
			...request
		})
		if (listener)
			this.addListener(id, listener)
	}

	/**
	 * @func 	addUnique
	 * @desc 	Add a geocoding request for a given address with an auto-generated unique ID,
	 * 			and an optional listener to handle geocoding responses.
	 * @param 	{GeocodeAddress} request - street/city/state/zip of the address to geocode
	 * @param 	{GeocodeListener?} listener - an optional listener that handles the geocoding response
	 */
	addUnique(request: GeocodeAddress, listener?: GeocodeListener) {
		this.add('' + this.idCounter, request, listener)
		this.idCounter++
	}

	/**
	 * @func 	addAsync
	 * @desc 	Add a geocoding request for a given address, and an optional async listener to handle
	 * 			geocoding responses.
	 * @param 	{string} id - the unique identifier of the request
	 * @param 	{GeocodeAddress} request - street/city/state/zip of the address to geocode
	 * @param 	{GeocodeListener?} listener - an optional listener that handles the geocoding response
	 */
	async addAsync(id: string, request: GeocodeAddress, listener: GeocodeAsyncListener) {
		this.batch.push({
			id,
			...request
		})

		// Add the required listener to the listener map
		this.addAsyncListener(id, listener)

		// Geocode if the max batch size is reached and clear listeners that were not fired
		if (this.batch.length >= MAX_BATCH_SIZE) {
			await this.geocode()
			this.resetAsyncListeners()
		}
	}

	/**
	 * @func 	get
	 * @desc	Retrieve the geocoding response for the given request ID
	 * @param 	{string} id - unique ID to check
	 */
	get(id: string): GeocodeResponse | undefined {
		return this.cache[id]
	}

	/**
	 * @func 	noMatch
	 * @desc	Returns true only if the geocoder requested this ID already and did not get a match in the response
	 * @param 	{string} id - unique ID to check
	 */
	noMatch(id: string): boolean {
		return this.missed.has(id)
	}

	/**
	 * @func	handleResponse
	 * @desc	Internal function for handling geocoding responses
	 */
	private async handleResponse(id: string, response: GeocodeResponse) {
		if (this.shouldUseCache)
			this.cache[id] = response
		if (this.listener[id])
			this.listener[id].forEach((listener) => listener(response))
		if (this.asyncListener[id])
			for (let i = 0 ; i < this.asyncListener[id].length ; i++)
				await this.asyncListener[id][i](response)
	}

	clearCache() {
		this.cache = {}
	}

	/**
	 * @func	addListener
	 * @desc
	 */
	addListener(id: string, listener: GeocodeListener) {
		if (! this.listener[id])
			this.listener[id] = []
		this.listener[id].push(listener)
		return this
	}

	/**
	 * @func	addAsyncListener
	 * @desc
	 */
	addAsyncListener(id: string, listener: GeocodeAsyncListener) {
		if (! this.asyncListener[id])
			this.asyncListener[id] = []
		this.asyncListener[id].push(listener)
		return this
	}

	/**
	 * @func 	clearListener
	 * @desc 	Remove a specific async listener
	 */
	clearListener(id: string, listener: GeocodeListener) {
		const listeners = this.listener[id]
		if (listeners) {
			const index = listeners.indexOf(listener)
			if (index >= 0) {
				if (listeners.length == 1)
					this.clearListeners(id)
				else
					listeners.splice(index, 1)
			}
		}
	}

	/**
	 * @func 	clearListeners
	 * @desc 	Remove all listeners for the given ID
	 */
	clearListeners(id: string) {
		delete this.listener[id]
	}

	/**
	 * @func 	resetListeners
	 * @desc 	Remove all listeners
	 */
	resetListeners() {
		this.listener = {}
	}

	/**
	 * @func 	clearAsyncListeners
	 * @desc 	Remove a specific async listener
	 */
	clearAsyncListener(id: string, listener: GeocodeAsyncListener) {
		const listeners = this.asyncListener[id]
		if (listeners) {
			const index = listeners.indexOf(listener)
			if (index >= 0) {
				if (listeners.length == 1)
					this.clearAsyncListeners(id)
				else
					listeners.splice(index, 1)
			}
		}
	}

	/**
	 * @func 	clearAsyncListeners
	 * @desc 	Remove all async listeners for the request ID
	 */
	clearAsyncListeners(id: string) {
		delete this.asyncListener[id]
	}

	/**
	 * @func 	resetAsyncListeners
	 * @desc 	Remove all async listeners
	 */
	resetAsyncListeners() {
		this.asyncListener = {}
	}

	/**
	 * @func 	hasGeocodeBatch
	 * @desc 	Returns true if there are addresses to geocode
	 */
	hasGeocodeBatch() {
		return this.batch.length > 0
	}

	/**
	 * @func 	currentBatchSize
	 * @desc 	The size of the current batch
	 */
	currentBatchSize() {
		return Math.min(this.batch.length, MAX_BATCH_SIZE)
	}

	/**
	 * @func 	maxBatchSize
	 * @desc 	Maximum batch size (currently 10,000)
	 */
	maxBatchSize() {
		return MAX_BATCH_SIZE
	}

	useCache(useCache?: boolean) {
		this.shouldUseCache = (useCache !== false)
	}

}

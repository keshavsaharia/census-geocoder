
export interface GeocodeAddress {
	address?: string
	city?: string
	state?: string
	zip?: string
}

export interface GeocodeRequest extends GeocodeAddress {
	id: string
}

export interface GeocodeResponse {
	id: string
	lat: number
	lon: number
	query: string
	address: string
	roadway: string
	side: string
	tie?: boolean
	exact?: boolean

	// FIPS codes
	// (Federal Information Processing Code)
	state?: string
	district?: string
	tract?: string
	block?: string
}

export type GeocoderResponseCache = { [id: string]: GeocodeResponse }
export type GeocoderListenerMap = { [id: string]: Array<GeocodeListener> }
export type GeocodeListener = (response: GeocodeResponse) => any
export type GeocodeAsyncListener = (response: GeocodeResponse) => Promise<any>
export type GeocodeAsyncListenerMap = { [id: string]: Array<GeocodeAsyncListener> }

import FormData from 'form-data';
import { GeocodeAddress, GeocodeResponse, GeocodeListener, GeocodeAsyncListener } from './interface';
/**
 * @class 	Geocoder
 * @desc 	A Geocoder instance handles geocoding with the US Census Bureau batch geocoding API.
 */
export default class Geocoder {
    private batch;
    private cache;
    private missed;
    private listener;
    private asyncListener;
    private apiUrl;
    private benchmark;
    private geography?;
    private shouldUseCache;
    private idCounter;
    /**
     * @constructor
     * @desc 		Create a Geocoder instance
     * @param 		{string} benchmark - the ID of the census database to use
     * @param 		{string} vintage - selects a geography database for use with the geography API
     */
    constructor(benchmark?: string, geography?: string);
    /**
     * @func 	geocode
     * @desc 	Sends a batch of requests for geocoding and returns an array of responses
     * 			where there was a match.
     */
    geocode(batchSize?: number): Promise<Array<GeocodeResponse>>;
    makeRequest(csv: string, timeout?: number): Promise<Array<Array<string>>>;
    static request(form: FormData, timeout: number): Promise<string>;
    /**
     * @func 	add
     * @desc 	Add a geocoding request for a given address, and an optional listener to handle
     * 			geocoding responses.
     * @param 	{string} id - the unique identifier of the request
     * @param 	{GeocodeAddress} request - street/city/state/zip of the address to geocode
     * @param 	{GeocodeListener?} listener - an optional listener that handles the geocoding response
     */
    add(id: string, request: GeocodeAddress, listener?: GeocodeListener): void;
    /**
     * @func 	addUnique
     * @desc 	Add a geocoding request for a given address with an auto-generated unique ID,
     * 			and an optional listener to handle geocoding responses.
     * @param 	{GeocodeAddress} request - street/city/state/zip of the address to geocode
     * @param 	{GeocodeListener?} listener - an optional listener that handles the geocoding response
     */
    addUnique(request: GeocodeAddress, listener?: GeocodeListener): void;
    /**
     * @func 	addAsync
     * @desc 	Add a geocoding request for a given address, and an optional async listener to handle
     * 			geocoding responses.
     * @param 	{string} id - the unique identifier of the request
     * @param 	{GeocodeAddress} request - street/city/state/zip of the address to geocode
     * @param 	{GeocodeListener?} listener - an optional listener that handles the geocoding response
     */
    addAsync(id: string, request: GeocodeAddress, listener: GeocodeAsyncListener): Promise<void>;
    /**
     * @func 	get
     * @desc	Retrieve the geocoding response for the given request ID
     * @param 	{string} id - unique ID to check
     */
    get(id: string): GeocodeResponse | undefined;
    /**
     * @func 	noMatch
     * @desc	Returns true only if the geocoder requested this ID already and did not get a match in the response
     * @param 	{string} id - unique ID to check
     */
    noMatch(id: string): boolean;
    /**
     * @func	handleResponse
     * @desc	Internal function for handling geocoding responses
     */
    private handleResponse;
    clearCache(): void;
    /**
     * @func	addListener
     * @desc
     */
    addListener(id: string, listener: GeocodeListener): this;
    /**
     * @func	addAsyncListener
     * @desc
     */
    addAsyncListener(id: string, listener: GeocodeAsyncListener): this;
    /**
     * @func 	clearListener
     * @desc 	Remove a specific async listener
     */
    clearListener(id: string, listener: GeocodeListener): void;
    /**
     * @func 	clearListeners
     * @desc 	Remove all listeners for the given ID
     */
    clearListeners(id: string): void;
    /**
     * @func 	resetListeners
     * @desc 	Remove all listeners
     */
    resetListeners(): void;
    /**
     * @func 	clearAsyncListeners
     * @desc 	Remove a specific async listener
     */
    clearAsyncListener(id: string, listener: GeocodeAsyncListener): void;
    /**
     * @func 	clearAsyncListeners
     * @desc 	Remove all async listeners for the request ID
     */
    clearAsyncListeners(id: string): void;
    /**
     * @func 	resetAsyncListeners
     * @desc 	Remove all async listeners
     */
    resetAsyncListeners(): void;
    /**
     * @func 	hasGeocodeBatch
     * @desc 	Returns true if there are addresses to geocode
     */
    hasGeocodeBatch(): boolean;
    /**
     * @func 	currentBatchSize
     * @desc 	The size of the current batch
     */
    currentBatchSize(): number;
    /**
     * @func 	maxBatchSize
     * @desc 	Maximum batch size (currently 10,000)
     */
    maxBatchSize(): number;
    useCache(useCache?: boolean): void;
}

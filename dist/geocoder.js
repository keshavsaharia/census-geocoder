"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const form_data_1 = __importDefault(require("form-data"));
const util_1 = require("./util");
const constant_1 = require("./constant");
/**
 * @class 	Geocoder
 * @desc 	A Geocoder instance handles geocoding with the US Census Bureau batch geocoding API.
 */
class Geocoder {
    /**
     * @constructor
     * @desc 		Create a Geocoder instance
     * @param 		{string} benchmark - the ID of the census database to use
     * @param 		{string} vintage - selects a geography database for use with the geography API
     */
    constructor(benchmark, geography) {
        this.shouldUseCache = true;
        this.idCounter = 0;
        this.batch = [];
        this.listener = {};
        this.asyncListener = {};
        this.cache = {};
        this.missed = new Set();
        // Set configuration options for the API
        this.benchmark = constant_1.CENSUS_BENCHMARK[benchmark || 'current'] || constant_1.CENSUS_BENCHMARK_CURRENT;
        this.geography = geography ? (constant_1.CENSUS_GEOGRAPHY[geography] || constant_1.CENSUS_GEOGRAPHY_CURRENT) : undefined;
        this.apiUrl = constant_1.CENSUS_GEOCODER_URL + (geography ? 'geographies' : 'locations') + '/addressbatch';
    }
    /**
     * @func 	geocode
     * @desc 	Sends a batch of requests for geocoding and returns an array of responses
     * 			where there was a match.
     */
    geocode(batchSize) {
        return __awaiter(this, void 0, void 0, function* () {
            // Need at least one item to geocode
            if (!this.hasGeocodeBatch())
                return [];
            if (batchSize == null)
                batchSize = constant_1.MAX_BATCH_SIZE;
            // Get up to the max batch size from the batch queue
            const batch = this.batch.slice(0, batchSize);
            this.batch = this.batch.slice(batchSize);
            // Generate a CSV input for the batch API
            const csv = batch.map((request) => ('"' + [
                (0, util_1.csvEscape)(request.id),
                request.address ? (0, util_1.csvEscape)(request.address) : '',
                request.city ? (0, util_1.csvEscape)(request.city) : '',
                request.state ? (0, util_1.csvEscape)(request.state) : '',
                request.zip ? (0, util_1.csvEscape)(request.zip) : ''
            ].join('","') + '"')).join('\n');
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
            const rows = yield this.makeRequest(csv, 60000);
            // Array of responses from the CSV output
            const geoResponses = [];
            // Split the CSV output by lines
            // const rows = response.data.toString('utf-8').split('\n')
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]; //csvSplit(rows[i])
                if (row.length > 0) {
                    // First column is always the ID
                    const id = row[0];
                    // Either Match, No_Match, or Tie
                    const matchType = row[2];
                    // Handle ties
                    if (matchType === 'Tie') {
                        // TODO
                    }
                    // If there was a match
                    else if (matchType === 'Match') {
                        // Get separate latitude/longitude
                        const lonlat = row[5].split(',');
                        // Geocoder response object
                        const geoResponse = {
                            id,
                            query: row[1],
                            exact: row[3] === 'Exact',
                            lat: parseFloat(lonlat[1]),
                            lon: parseFloat(lonlat[0]),
                            address: row[4],
                            roadway: row[6],
                            side: row[7]
                        };
                        // Geography API response
                        if (row.length > 8) {
                            geoResponse.state = row[8];
                            geoResponse.district = row[9];
                            geoResponse.tract = row[10];
                            geoResponse.block = row[11];
                        }
                        // Cache response and trigger listeners
                        geoResponses.push(geoResponse);
                        yield this.handleResponse(id, geoResponse);
                    }
                    // Record the ID as missed if caching responses
                    else if (this.shouldUseCache)
                        this.missed.add(id);
                }
            }
            return geoResponses;
        });
    }
    makeRequest(csv, timeout = 60000) {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate a form to encapsulate the request
            const form = new form_data_1.default();
            form.append('addressFile', Buffer.from(csv), 'geocode.csv');
            form.append('benchmark', this.benchmark);
            if (this.geography)
                form.append('vintage', this.geography);
            let retry = 0, maxRetry = 3;
            do {
                try {
                    const data = yield Geocoder.request(form, timeout);
                    // Make a POST request to the census geocoder endpoint
                    // const response = await axios.post(this.apiUrl, form, {
                    // 	headers: form.getHeaders(),
                    // 	timeout
                    // })
                    // const data = response.data.toString('utf-8')
                    const rows = data.split('\n');
                    return rows.map((row) => (0, util_1.csvSplit)(row));
                }
                catch (error) {
                    console.log('error ' + retry, error.toString());
                    console.log();
                    yield (0, util_1.delay)(timeout);
                    retry++;
                }
            } while (retry < maxRetry);
            throw {
                code: 'RequestError',
                csv,
                benchmark: this.benchmark,
                geography: this.geography,
                retries: maxRetry,
                timeout
            };
        });
    }
    static request(form, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                form.pipe(https_1.default.request({
                    protocol: 'https:',
                    port: 443,
                    hostname: 'geocoding.geo.census.gov',
                    path: '/geocoder/locations/addressbatch',
                    headers: form.getHeaders(),
                    method: 'POST',
                    timeout
                }, (response) => {
                    const data = [];
                    response.on('data', (chunk) => {
                        data.push(chunk);
                    });
                    response.on('end', () => {
                        resolve(data.join(''));
                    });
                    response.on('error', (error) => {
                        reject(error);
                    });
                })
                    .on('error', (error) => {
                    reject(error);
                }));
            });
        });
    }
    /**
     * @func 	add
     * @desc 	Add a geocoding request for a given address, and an optional listener to handle
     * 			geocoding responses.
     * @param 	{string} id - the unique identifier of the request
     * @param 	{GeocodeAddress} request - street/city/state/zip of the address to geocode
     * @param 	{GeocodeListener?} listener - an optional listener that handles the geocoding response
     */
    add(id, request, listener) {
        this.batch.push(Object.assign({ id }, request));
        if (listener)
            this.addListener(id, listener);
    }
    /**
     * @func 	addUnique
     * @desc 	Add a geocoding request for a given address with an auto-generated unique ID,
     * 			and an optional listener to handle geocoding responses.
     * @param 	{GeocodeAddress} request - street/city/state/zip of the address to geocode
     * @param 	{GeocodeListener?} listener - an optional listener that handles the geocoding response
     */
    addUnique(request, listener) {
        this.add('' + this.idCounter, request, listener);
        this.idCounter++;
    }
    /**
     * @func 	addAsync
     * @desc 	Add a geocoding request for a given address, and an optional async listener to handle
     * 			geocoding responses.
     * @param 	{string} id - the unique identifier of the request
     * @param 	{GeocodeAddress} request - street/city/state/zip of the address to geocode
     * @param 	{GeocodeListener?} listener - an optional listener that handles the geocoding response
     */
    addAsync(id, request, listener) {
        return __awaiter(this, void 0, void 0, function* () {
            this.batch.push(Object.assign({ id }, request));
            // Add the required listener to the listener map
            this.addAsyncListener(id, listener);
            // Geocode if the max batch size is reached and clear listeners that were not fired
            if (this.batch.length >= constant_1.MAX_BATCH_SIZE) {
                yield this.geocode();
                this.resetAsyncListeners();
            }
        });
    }
    /**
     * @func 	get
     * @desc	Retrieve the geocoding response for the given request ID
     * @param 	{string} id - unique ID to check
     */
    get(id) {
        return this.cache[id];
    }
    /**
     * @func 	noMatch
     * @desc	Returns true only if the geocoder requested this ID already and did not get a match in the response
     * @param 	{string} id - unique ID to check
     */
    noMatch(id) {
        return this.missed.has(id);
    }
    /**
     * @func	handleResponse
     * @desc	Internal function for handling geocoding responses
     */
    handleResponse(id, response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.shouldUseCache)
                this.cache[id] = response;
            if (this.listener[id])
                this.listener[id].forEach((listener) => listener(response));
            if (this.asyncListener[id])
                for (let i = 0; i < this.asyncListener[id].length; i++)
                    yield this.asyncListener[id][i](response);
        });
    }
    clearCache() {
        this.cache = {};
    }
    /**
     * @func	addListener
     * @desc
     */
    addListener(id, listener) {
        if (!this.listener[id])
            this.listener[id] = [];
        this.listener[id].push(listener);
        return this;
    }
    /**
     * @func	addAsyncListener
     * @desc
     */
    addAsyncListener(id, listener) {
        if (!this.asyncListener[id])
            this.asyncListener[id] = [];
        this.asyncListener[id].push(listener);
        return this;
    }
    /**
     * @func 	clearListener
     * @desc 	Remove a specific async listener
     */
    clearListener(id, listener) {
        const listeners = this.listener[id];
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index >= 0) {
                if (listeners.length == 1)
                    this.clearListeners(id);
                else
                    listeners.splice(index, 1);
            }
        }
    }
    /**
     * @func 	clearListeners
     * @desc 	Remove all listeners for the given ID
     */
    clearListeners(id) {
        delete this.listener[id];
    }
    /**
     * @func 	resetListeners
     * @desc 	Remove all listeners
     */
    resetListeners() {
        this.listener = {};
    }
    /**
     * @func 	clearAsyncListeners
     * @desc 	Remove a specific async listener
     */
    clearAsyncListener(id, listener) {
        const listeners = this.asyncListener[id];
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index >= 0) {
                if (listeners.length == 1)
                    this.clearAsyncListeners(id);
                else
                    listeners.splice(index, 1);
            }
        }
    }
    /**
     * @func 	clearAsyncListeners
     * @desc 	Remove all async listeners for the request ID
     */
    clearAsyncListeners(id) {
        delete this.asyncListener[id];
    }
    /**
     * @func 	resetAsyncListeners
     * @desc 	Remove all async listeners
     */
    resetAsyncListeners() {
        this.asyncListener = {};
    }
    /**
     * @func 	hasGeocodeBatch
     * @desc 	Returns true if there are addresses to geocode
     */
    hasGeocodeBatch() {
        return this.batch.length > 0;
    }
    /**
     * @func 	currentBatchSize
     * @desc 	The size of the current batch
     */
    currentBatchSize() {
        return Math.min(this.batch.length, constant_1.MAX_BATCH_SIZE);
    }
    /**
     * @func 	maxBatchSize
     * @desc 	Maximum batch size (currently 10,000)
     */
    maxBatchSize() {
        return constant_1.MAX_BATCH_SIZE;
    }
    useCache(useCache) {
        this.shouldUseCache = (useCache !== false);
    }
}
exports.default = Geocoder;

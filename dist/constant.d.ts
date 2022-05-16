/**
 * Endpoint for batch address geocoding with the US Census Geocoder
 */
export declare const CENSUS_GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/";
export declare const MAX_BATCH_SIZE = 10000;
/**
 * Mapping between custom benchmark ID (either default "current", or "2021"/"2020")
 * which are the only three supported options.
 */
export declare const CENSUS_BENCHMARK_CURRENT = "4";
export declare const CENSUS_BENCHMARK: {
    [id: string]: string;
};
export declare const CENSUS_GEOGRAPHY_CURRENT = "4";
export declare const CENSUS_GEOGRAPHY: {
    [id: string]: string;
};

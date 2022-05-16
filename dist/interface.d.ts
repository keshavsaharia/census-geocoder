export interface GeocodeAddress {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
}
export interface GeocodeRequest extends GeocodeAddress {
    id: string;
}
export interface GeocodeResponse {
    id: string;
    lat: number;
    lon: number;
    query: string;
    address: string;
    roadway: string;
    side: string;
    tie?: boolean;
    exact?: boolean;
    state?: string;
    district?: string;
    tract?: string;
    block?: string;
}
export declare type GeocoderResponseCache = {
    [id: string]: GeocodeResponse;
};
export declare type GeocoderListenerMap = {
    [id: string]: Array<GeocodeListener>;
};
export declare type GeocodeListener = (response: GeocodeResponse) => any;
export declare type GeocodeAsyncListener = (response: GeocodeResponse) => Promise<any>;
export declare type GeocodeAsyncListenerMap = {
    [id: string]: Array<GeocodeAsyncListener>;
};

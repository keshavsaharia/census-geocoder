# US Census Geocoder

This TypeScript module provides a `Geocoder` class that geocodes United States addresses with the free [U.S. Census Geocoder](https://geocoding.geo.census.gov/geocoder/). It uses the batch API to process up to 10,000 addresses at a time, and provides convenient methods for large-scale batch processing of address records.

## Usage

1. Create a `Geocoder` instance. The most straightforward example is shown below, which queries the most recent census database.

```typescript
const geocoder = new Geocoder()
```

The first parameter selects the census database to use (either `current`, `2021`, or `2020`). For example, `new Geocoder('2020')` queries address locations in the 2020 database.

You can also get the FIPS codes for the state, district, census block, and census tract, a second parameter selects the geography year to use (possible values are `current`, `2010`, `2017`, `2018`, `2019`, `2020`, and `2021`).

For example, this geocoder searches using the most recent location database, and returns FIPS codes for the state/district/census tract/census block for the year 2018.

```typescript
const geocoder = new Geocoder('current', '2018')
```

To retrieve the most recent results for geocoding requests, use `current` for both parameters.

```typescript
new Geocoder('current', 'current')
```

For most use cases, basic geocoding is all that is required for retrieving latitude/longitude - it will be a bit faster to only retrieve FIPS codes if you really need them.

2. Add addresses to geocode with the `.add` function. You can add any number of addresses to the queue, and the geocoder will automatically batch them into appropriately sized requests to the U.S. Census API.

First argument is a unique ID for the address, i.e. it should be unique from all other IDs passed to `.add`.

```typescript
const geocoder = new Geocoder()

// Add a fully-specified address
geocoder.add('some-id', {
	address: '123 Drury Lane',
	city: 'Gumdrop Forest',
	state: 'CA',
	zip: '12345'
})

// Not all address parts need to be specified
geocoder.add('another-id', {
	address: '123 Drury Lane',
	city: 'Gumdrop Forest',
	state: 'CA'
})

// Many addresses can still be geocoded with only an address and city
geocoder.add('something-else', {
	address: '123 Drury Lane',
	city: 'Gumdrop Forest'
})
```

3. Call the `async` function `geocode` to submit a batch of up to 10,000 addresses.

```typescript
await geocoder.geocode()
```

If you are geocoding more than 10,000 addresses, you should either call `geocode` repeatedly until `.hasGeocodeBatch()` returns `false`, or use the stream pattern shown in the basic usage pattern below.

## Stream pattern

The simplest usage pattern is shown below.

```typescript
import { Geocoder, Address } from 'us-census-geocoder'

async function runGeocoding() {
	const geocoder = new Geocoder()

	// Get a list of addresses for geocoding
	const addresses: Array<Address> = [ /* {}, {}, ... */ ]
	const counter = 0

	// Give each address a unique sequential ID
	for (const address in addresses) {
		geocoder.add('' + counter, address)
		counter++
	}

	// Submit a single batch of geocoding requests if less than 10,000 addresses
	const results = await geocoder.geocode()
	console.log(results[0])
	/**
		{
			"id": "unique-id",
			"lat": "32.49839",
			"lon": "-129.29839",
			"query": "123 Drury Lane, Gumdrop Forest, CA, 12345",
			"address": "123 DRURY LN, GUMDROP FOREST, CA, 12345-9876",
			"roadway": "4242424242",
			"side": "L",
			"exact": true
		}
	*/

	// You can also retrieve request responses by ID
	const specificResult = geocoder.get('15')

	// If geocoding more than 10,000 requests, use a loop to sequentially process batches of requests
	while (geocoder.hasGeocodeBatch()) {
		const batchResult = await geocoder.geocode()
		// ... process batch of results, or retrieve from cache after finishing geocoding
	}
}
```

### Stream processing

When processing large numbers of records, the geocoding cache can grow unnecessarily large. The best pattern for processing large number of records is to call `useCache(false)` when initializing the geocoder, and processing each individual batch of results as they come in.

```typescript
import { Geocoder } from 'us-census-geocoder'
import { v4 as uuid } from 'uuid'

const geocoder = new Geocoder()
geocoder.useCache(false)

const addressSource = [ /* ... */ ]

// Keep looping until break is called
while(true) {
	const sourceComplete = false

	// Get a full batch of geocoding requests
	while (geocoder.currentBatchSize() < geocoder.maxBatchSize()) {
		// Add addresses to the geocoder somehow (array stub shown)
		if (addressSource.length > 0) {
			geocoder.add(uuid(), { /* ... */ })
		}
		// If there are no more source addresses, set a flag to true
		else {
			sourceComplete = true
		}
	}

	const results = await geocoder.geocode()
	// ... process results

	// Break the loop after processing the final batch of results
	if (sourceComplete)
		break
}
```

## Links

- [Census Geocoder User Guide](https://www2.census.gov/geo/pdfs/maps-data/data/Census_Geocoder_User_Guide.pdf)
- [Batch address form](https://geocoding.geo.census.gov/geocoder/locations/addressbatch?form)

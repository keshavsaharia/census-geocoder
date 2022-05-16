import { Geocoder } from '../src'

describe('Basic geocoding', () => {

	test('construct Geocoder instances', () => {
		const g1 = new Geocoder()
		const g2 = new Geocoder('current')
		const g3 = new Geocoder('current', 'current')
		const g4 = new Geocoder('current', '2017')
		const g5 = new Geocoder('current', '2020')
	})

	test('geocode known address', async () => {
		const g = new Geocoder()
		g.add('white-house-approx', {
			address: '1600 Pennsylvania Ave',
			zip: '20500'
		})

		g.add('white-house-exact', {
			address: '1600 Pennsylvania Avenue NW',
			city: 'Washington',
			state: 'DC',
			zip: '20500'
		})

		const result = await g.geocode()
		const whiteHouse = g.get('white-house-exact')
		const whiteHouseApprox = g.get('white-house-approx')

		if (whiteHouse) {
			expect(whiteHouse.lat).toBe(38.898754)
			expect(whiteHouse.lon).toBe(-77.03534)
			expect(whiteHouse.exact).toBe(true)
		}

		if (whiteHouseApprox) {
			expect(whiteHouseApprox.lat).toBe(38.898754)
			expect(whiteHouseApprox.lon).toBe(-77.03534)
			expect(whiteHouseApprox.exact).toBe(false)
		}

		if (whiteHouse && whiteHouseApprox) {
			expect(whiteHouse.address).toBe(whiteHouseApprox.address)
		}
	})

})

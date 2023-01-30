import { Registry } from '../../registry'

export default { getServiceUrls }

function getServiceUrls(data: Registry, autnum: number) {
	for (const service of data.services) {
		const [entries, uris] = service
		const ranges = entries.map(entry => entry.split('-').map(Number))

		for (const range of ranges) {
			if (range.length == 1) {
				if (autnum == range[0]) {
					return uris
				}
			} else {
				const [min, max] = range
				if (autnum >= min && autnum <= max) {
					return uris
				}
			}
		}
	}

	return []
}
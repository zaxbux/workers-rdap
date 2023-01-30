import type { Registry } from '../../registry'

export default { getServiceUrls }

export function getServiceUrls(data: Registry, domain: string) {
	const labels = domain.split('.')
	const forward = labels[labels.length - 1]

	for (const service of data.services) {
		const [entries, uris] = service;

		let idx = 0;
		while (idx != -1) {
			if (entries.find(entry => entry == forward.substring(idx))) {
				return uris;
			}

			idx = forward.indexOf('.', idx);
			if (idx != -1) {
				idx++;
			}
		}
	}

	return []
}
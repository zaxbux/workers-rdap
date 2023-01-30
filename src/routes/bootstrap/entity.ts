import { Registry } from '../../registry'

export default { getServiceUrls }

export function getServiceUrls(data: Registry<[string[], string[], string[]]>, entity: string): string[] {
	for (const service of data.services) {
		const [contacts, entries, uris] = service

		if (entries.find(entry => entry === entity)) {
			return uris
		}
	}

	return []
}
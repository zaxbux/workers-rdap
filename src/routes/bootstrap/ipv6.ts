import { Address6 } from 'ip-address'
import { Registry } from '../../registry'

export default { getServiceUrls, resolvePointer }

/**
 * Convert a PTR record to an IPv6 address
 * @param domain IPv6 address in `.ip6.arpa` format
 * @returns IPv6 address
 */
export function resolvePointer(domain: string): { network: string; subnet?: string; interface?: string } {
	let words = domain.split('.')
	console.debug('words', words)
	// Remove the `.ip6.arpa` suffix and map elements to numbers
	let nibbles = words.slice(0, words.length - 2)/* .map(s => parseInt(s, 16)) */
	nibbles.reverse()
	console.debug('nibbles', nibbles)

	// let hextets = [];
	// for (let i = 0; i < nibbles.length; i += 4) {
	// 	hextets.push(nibbles.slice(i, i + 4).join(''))
	// }
	let hextets = nibbles.reduce((acc: string[], _, i, array) => {
		if (i % 4 === 0) {
			acc.push(array.slice(i, i + 4).join(''))
		}

		return acc
	}, [])

	console.debug('hextets', hextets)
	console.debug({ network: hextets.slice(0, 3).join(':'), subnet: hextets[4], interface: hextets.slice(5, 8).join(':') })

	return { network: hextets.slice(0, 3).join(':'), subnet: hextets[4], interface: hextets.slice(5, 8).join(':') }
}

export function getServiceUrls(data: Registry, prefix: string, prefixLength?: number): string[] {
	let start = new Address6(prefix)

	if (prefixLength) {
		start = new Address6(`${prefix}/${prefixLength}`)
	}

	for (const service of data.services) {
		const [entries, uris] = service

		for (const entry of entries) {
			const range = new Address6(entry)

			if (start.isInSubnet(range) && range.subnetMask) {
				return uris
			}
		}
	}

	return []
}
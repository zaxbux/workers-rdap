import { Address4 } from 'ip-address'
import { Registry } from '../../registry'

export default { getServiceUrls, resolvePointer }

/**
 * Convert a PTR record to an IPv4 address and prefix length
 * @param domain IPv4 address in `.in-addr.arpa` format
 * @returns IPv4 address and prefix length
 */
export function resolvePointer(domain: string) {
	let words = domain.split('.')
	// Remove the `.in-addr.arpa` suffix and map elements to numbers
	let octets = words.slice(0, words.length - 2).map(Number)
	octets.reverse()
	// Fill the missing octets with 0
	octets.splice(octets.length, 4, ...Array(4 - octets.length).fill(0))

	// calculate the CIDR prefix length (/8, /16, /24, or /32)
	const prefixLength = octets.length * 8;

	return { address: octets.join('.'), prefixLength }
}

export function getServiceUrls(data: Registry, prefix: string, prefixLength?: number): string[] {
	let start = new Address4(prefix)

	if (prefixLength) {
		start = new Address4(`${prefix}/${prefixLength}`)
	}

	for (const service of data.services) {
		const [entries, uris] = service

		for (const entry of entries) {
			const range = new Address4(entry)

			if (start.isInSubnet(range) && range.subnetMask) {
				return uris
			}
		}
	}

	return []
}
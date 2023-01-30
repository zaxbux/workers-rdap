import { Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from '../..';
import { BadRequestError } from '../../error';
import { RDAP_Level_0 } from '../../json/response';
import { getRegistry, getRegistryWithMetadata, RegistryFile } from '../../registry';
import AutNum from './autnum';
import Domain from './domain';
import Entity from './entity';
import IPv4 from './ipv4';
import IPv6 from './ipv6';
import { handleRedirect } from './redirect';

const QUERY_RE_ASN = new RegExp(/^[0-9]+$/)
/** Between 1 and 4 octets of (0-255) */
const QUERY_RE_IPv4 = new RegExp(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){0,3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
const QUERY_RE_IPv4_MASK = new RegExp(/^(?:3[0-2]|[1-2]?[0-9])$/)
/** Between 1 and 8 hex */
const QUERY_RE_IPv6 = new RegExp(/^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/)
const QUERY_RE_IPv6_MASK = new RegExp(/^(?:12[0-8]|1[0-1][0-9]|[1-9]?[0-9])$/)
/** Between 1 and 4 octets of (0-255) */
const QUERY_RE_IPv4_PTR = new RegExp(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){1,4}in-addr\.arpa$/)
/** Between 6 and 32 labels of a single hexadecimal digit */
const QUERY_RE_IPv6_PTR = new RegExp(/^(?:[0-9a-f]\.){6,32}ip6\.arpa$/)
/** Basic domain name validation, allows A-label and U-label IDNs */
const QUERY_RE_DOMAIN = new RegExp(/^[0-9\p{L}\-]+(?:\.(?:[0-9\p{L}\-])+)*$/u)

const bootstrap = new Hono<{ Bindings: Env }>()

bootstrap.use('/*', (c, next) => {
	return cors({
		origin: c.env.CORS_ORIGINS ? c.env.CORS_ORIGINS.split(',') : '*',
		allowMethods: ['GET'],
	})(c, next)
})

// https://datatracker.ietf.org/doc/html/rfc9082#section-3.1.1
bootstrap.get('/ip/:prefix/:prefixLength?', handleRedirect(async c => {
	if (c.req.param('prefixLength')) {
		c.set('query', `ip/${c.req.param('prefix')}/${c.req.param('prefixLength')}`)
	} else {
		c.set('query', `ip/${c.req.param('prefix')}`)
	}

	const prefix = c.req.param('prefix').toLowerCase()
	const prefixLength = c.req.param('prefixLength')

	try {
		if (QUERY_RE_IPv4.test(prefix)) {
			const data = getRegistry(RegistryFile.IPv4, c.env)

			if (!prefixLength) {
				return IPv4.getServiceUrls(await data, prefix)
			} else if (QUERY_RE_IPv4_MASK.test(prefixLength)) {
				return IPv4.getServiceUrls(await data, prefix, Number(prefixLength))
			}
		}

		if (QUERY_RE_IPv6.test(prefix)) {
			const data = getRegistry(RegistryFile.IPv6, c.env)

			if (!prefixLength) {
				return IPv6.getServiceUrls(await data, prefix)
			} else if (QUERY_RE_IPv6_MASK.test(prefixLength)) {
				return IPv6.getServiceUrls(await data, prefix, Number(prefixLength))
			}
		}
	} catch {
		// IP address parse error
	}

	throw new BadRequestError('A valid IPv4 or IPv6 address is required.')
}))

// https://datatracker.ietf.org/doc/html/rfc9082#section-3.1.2
bootstrap.get('/autnum/:autnum', handleRedirect(async c => {
	c.set('query', `autnum/${c.req.param('autnum')}`)
	const autnum = c.req.param('autnum')

	if (QUERY_RE_ASN.test(autnum)) {
		const asn = Number(autnum)
		// autonomous system numbers are 32-bit integers
		if (asn >= 0 && asn < 2 ** 32) {
			return AutNum.getServiceUrls(await getRegistry(RegistryFile.AS, c.env), asn)
		}
	}

	throw new BadRequestError('A valid AS number is required.')
}))

// https://datatracker.ietf.org/doc/html/rfc9082#section-3.1.3
bootstrap.get('/domain/:domain', handleRedirect(async c => {
	c.set('query', `domain/${c.req.param('domain')}`)
	const domain = stripTrailingDot(c.req.param('domain'))

	return handleDomain(c, domain)
}))

// https://datatracker.ietf.org/doc/html/rfc9082#section-3.1.4
bootstrap.get('/nameserver/:nameserver', handleRedirect(async c => {
	c.set('query', `nameserver/${c.req.param('nameserver')}`)
	const domain = stripTrailingDot(c.req.param('nameserver'))

	return handleDomain(c, domain)
}))

// https://datatracker.ietf.org/doc/html/rfc9082#section-3.1.5
bootstrap.get('/entity/:entity', handleRedirect(async c => {
	c.set('query', `entity/${c.req.param('entity')}`)
	const entity = c.req.param('entity')

	const i = entity.lastIndexOf('-')
	if (i != -1 && i + 1 < entity.length) {
		return Entity.getServiceUrls(await getRegistry(RegistryFile.ObjectTags, c.env), entity.substring(i + 1))
	}

	return []
}))

// https://datatracker.ietf.org/doc/html/rfc9082#section-3.1.6
bootstrap.get('/help', async c => {
	const response: RDAP_Level_0 = {
		rdapConformance: [
			"rdap_level_0",
		],
		notices: [
			{
				title: '',
				description: [],
				links: [
					{
						value: '',
						rel: 'alternate',
						type: 'text/html',
						href: '',
					}
				]
			}
		],
	}

	for (const [key, file] of Object.entries(RegistryFile)) {
		const { value, metadata } = await getRegistryWithMetadata(file, c.env)

		if (value && metadata) {
			response.notices.push({
				title: `${key} Bootstrap File Modified and Published Dates`,
				description: [
					// ISO 8601
					metadata.modified,
					value?.publication,
				]
			})
		}
	}

	return c.json(response, 200, {
		'Content-Type': 'application/rdap+json',
	})
})

export default bootstrap

async function handleDomain<P extends string = string>(c: Context<P, { Bindings: Env }>, domain: string) {
	if (domain.endsWith('.in-addr.arpa') || domain.endsWith('.ip6.arpa')) {
		try {
			if (QUERY_RE_IPv4_PTR.test(domain)) {
				const { address, prefixLength } = IPv4.resolvePointer(domain)
				return IPv4.getServiceUrls(await getRegistry(RegistryFile.IPv4, c.env), address, prefixLength)
			}

			if (QUERY_RE_IPv6_PTR.test(domain)) {
				const { network, subnet } = IPv6.resolvePointer(domain)
				const prefix = subnet ? `${network}:${subnet}::` : `${network}::`
				return IPv6.getServiceUrls(await getRegistry(RegistryFile.IPv6, c.env), prefix)
			}
		} catch {
			// IP address parse error
		}
	} else {
		if (QUERY_RE_DOMAIN.test(domain)) {
			return Domain.getServiceUrls(await getRegistry(RegistryFile.Domain, c.env), domain)
		}
	}

	throw new BadRequestError('A valid domain name is required.')
}

function stripTrailingDot(s: string): string {
	if (s.endsWith('.')) {
		return s.substring(0, s.length - 1)
	}

	return s
}
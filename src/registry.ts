import { Env } from '.';

/**
 * RDAP Bootstrap Service Registry
 * 
 * @see {@link https://www.rfc-editor.org/rfc/rfc7484#section-10.2 RFC 7484, section 10.2}
 */
export interface Registry<S = Service> {
	/**
	 * The format version of the registry.
	 * 
	 * Currently `1.0`
	 */
	version: string;

	/**
	 * The latest update date of the registry by IANA.
	 * 
	 * The value conforms to {@link https://www.rfc-editor.org/rfc/rfc3339 RFC 3339}.
	 */
	publication: string;

	/**
	 * Optional comment regarding the content of the bootstrap object.
	 */
	description?: string;

	/**
	 * Services array
	 */
	services: S[];
}

/**
 * Entry member
 */
export type Entry = string

/**
 * Service URL member
 * 
 * Base RDAP URLs will have a trailing `/`.
 */
export type ServiceURL = string

/**
 * Service member
 * 
 * Contains two arrays, in order:
 * 1. Array containing {@link Entry} members.
 * 2. Array containing {@link ServiceURL} members.
 */
export type Service = [Entry[], ServiceURL[]];

export enum RegistryFile {
	//Default = 'default.json',
	AS = 'asn.json',
	IPv4 = 'ipv4.json',
	IPv6 = 'ipv6.json',
	Domain = 'dns.json',
	//Entity = 'entity.json',
	ObjectTags = 'object-tags.json',
}

export const iana_bootstrap_urls = {
	asn: 'https://data.iana.org/rdap/asn.json',
	ipv4: 'https://data.iana.org/rdap/ipv4.json',
	ipv6: 'https://data.iana.org/rdap/ipv6.json',
	dns: 'https://data.iana.org/rdap/dns.json',
	object_tags: 'https://data.iana.org/rdap/object-tags.json',
}

export interface RegistryFileMetadata {
	modified: string;
}

async function _getRegistry<S = Service>(file: RegistryFile, env: Env, withMetadata: boolean): Promise<{ value: Registry<S>; metadata: RegistryFileMetadata | null }> {
	const { value, metadata } = withMetadata
		? await env.REGISTRIES.getWithMetadata<Registry<S>, RegistryFileMetadata>(file, { type: "json" })
		: { value: await env.REGISTRIES.get<Registry<S>>(file, { type: "json" }), metadata: null }

	if (value) {
		return { value, metadata }
	}

	console.info(`Bootstrap file "${file}" not in KV, downloading...`)

	return await downloadBootstrapFile<S>(file, env)
}

export async function getRegistry<S = Service>(file: RegistryFile, env: Env): Promise<Registry<S>> {
	const { value } = await _getRegistry<S>(file, env, false)

	return value
}

export async function getRegistryWithMetadata<S = Service>(file: RegistryFile, env: Env): Promise<{ value: Registry<S>; metadata: RegistryFileMetadata | null }> {
	return _getRegistry<S>(file, env, true)
}

/**
 * Fetch a bootstrap file from the cache, or fetch a copy from IANA if it does not exist.
 * 
 * @param file 
 * @param kv 
 * @returns 
 */
export async function downloadBootstrapFile<S = Service>(file: RegistryFile, env: Env): Promise<{ value: Registry<S>; metadata: RegistryFileMetadata }> {
	const response = await fetch(bootstrapFileUrl(file, env))

	if (!response.ok) {
		throw new Error('Error fetching bootstrap file')
	}

	const metadata = {
		// Use the `Last-Modified` header from the server is available, otherwise default to now.
		modified: new Date(response.headers.get('Last-Modified') ?? Date.now()).toISOString(),
	}

	const value = await response.json<Registry<S>>()

	await env.REGISTRIES.put(file, JSON.stringify(value), {
		metadata,
		// Use the `Expires` header to determine how long to store the key, otherwise default to 24 hours.
		expiration: Math.round(new Date(response.headers.get('Expires') ?? new Date().getTime() + 86400000).getTime() / 1000),
	})

	return { value, metadata }
}

function bootstrapFileUrl(file: RegistryFile, env: Env) {
	const urls = {
		...iana_bootstrap_urls,
		...JSON.parse(env.DOWNLOAD_BOOTSTRAP_FILE_URLS ?? '{}'),
	}

	switch (file) {
		case RegistryFile.AS:
			return urls['asn']
		case RegistryFile.Domain:
			return urls['dns']
		case RegistryFile.IPv4:
			return urls['ipv4']
		case RegistryFile.IPv6:
			return urls['ipv6']
		case RegistryFile.ObjectTags:
			return urls['object_tags']
	}
}

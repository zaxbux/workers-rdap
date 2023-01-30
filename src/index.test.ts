import { unstable_dev } from "wrangler";
import type { UnstableDevWorker } from "wrangler";
import { describe, expect, it, beforeAll, afterAll, test } from "vitest";

describe("Worker", () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev("src/index.ts", {
			experimental: { disableExperimentalWarning: true },
			inspect: true,
			persist: true,
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it("should return 404 Not Found", async () => {
		const resp = await worker.fetch();
		if (resp) {
			const text = await resp.text();
			expect(text).toMatchInlineSnapshot(`"404 Not Found"`);
		}
	});

	// Test redirects
	test.each([
		['domain', 'google.com'],
		['domain', 'google.foo'],
		['domain', 'xn--flw351e'],
		['domain', '2.in-addr.arpa'],
		['domain', '15.in-addr.arpa'],
		['domain', '0.0.e.0.1.0.0.2.ip6.arpa'],

		['nameserver', 'a.iana-servers.net'],
		['nameserver', '48.175.192.in-addr.arpa'], // Direct Delegation AS112 Service
		['nameserver', '8.f.4.0.0.0.2.6.2.ip6.arpa'], // Direct Delegation AS112 Service

		['ip', '2.0.0.0/8'],
		['ip', '15.0.0.0/8'],
		['ip', '2c00::/12'],
		['ip', '2c00::/13'],
		['ip', '2001:db8:3333:4444:5555:6666:1.2.3.4'],

		['ip', '2001:db8::123.123.123.123'],
		['ip', '2001:db8::1234:5678:5.6.7.8'],
		['ip', '2001:db8::'],
		['ip', '2001:db8:3333:4444:5555:6666:7777:8888'],
		['ip', '2001:db8:3333:4444:CCCC:DDDD:EEEE:FFFF'],

		['ip', '2001:db8::'],

		['ip', '2001:db8::1234:5678'],
		['ip', '2001:0db8:0001:0000:0000:0ab9:C0A8:0102'],

		['autnum', '1'],
		['autnum', '272796'],

		['entity', 'ARINN-ARIN'],
		['entity', 'IRT-APNIC-APNIC'],
	])('GET /bootstrap/%s/%s -> 302 Found', async (path, query) => {
		const resp = await worker.fetch(`/bootstrap/${path}/${query}`, {
			redirect: 'manual',
		});
		if (resp) {
			expect(resp.status).toBe(302);
			expect(resp.headers.get('Location')).toMatch(new RegExp(`\\/${path}\\/${query.replaceAll('.', '[.]')}$`));
		}
	})


	// Test invalid queries
	test.each([
		['nameserver', 'ns1.15.in-addr.arpa'], // Invalid PTR format
		['nameserver', 'z.0.1.0.0.2.ip6.arpa'], // Invalid PTR format
		['ip', '2001:0db8:0001:0000:0000:0ab9:C0A8:0102%1234'], // Includes a local-scope
		['autnum', '1.2'], // AS numbers are unsigned 32-bit numbers
		['autnum', '-1'],
		['autnum', '4294967296'],
		['autnum', 'AS1234'],
	])('GET /bootstrap/%s/%s -> 400', async (path, query) => {
		const resp = await worker.fetch(`/bootstrap/${path}/${query}`, {
			redirect: 'manual',
		});
		if (resp) {
			expect(resp.status).toBe(400);
		}
	})

	// Test valid, but non-existent queries
	test.each([
		['ip', '::11.22.33.44'], // IPv4 mapped address
		['ip', '::1234:5678:91.123.4.56'],
		['ip', '::1234:5678:1.2.3.4'],
		['ip', '::'], // missing network
		['ip', '::1234:5678'], // missing network
		['ip', '10.0.0.0'], // Private IP
		['ip', '3c00::/12'], // Currently a reserved IPv6 block (not allocated to any RIR)
		['nameserver', '10.in-addr.arpa'],
		['entity', 'ATTW'], // No RIR suffix
	])('GET /bootstrap/%s/%s -> 404', async (path, query) => {
		const resp = await worker.fetch(`/bootstrap/${path}/${query}`, {
			redirect: 'manual',
		});
		if (resp) {
			expect(resp.status).toBe(404);
		}
	})
});

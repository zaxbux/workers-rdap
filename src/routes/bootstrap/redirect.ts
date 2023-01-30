import { Context, Handler } from 'hono';
import { Env } from '../..';
import { NotFoundError } from '../../error';

export declare type RedirectHandler<P extends string = string> = (c: Context<P, { Bindings: Env }>) => string[] | Promise<string[]>;

export function handleRedirect(handler: RedirectHandler): Handler<string, { Bindings: Env }> {
	return async (c) => {
		const urls = await handler(c)
		const query = c.get<string>('query')
		const requestUrl = new URL(c.req.url)
		const url = getRedirectUrl(urls, requestUrl, Boolean(c.env.MATCH_PROTOCOL))

		if (url) {
			return c.redirect(`${url}${query}`, 302)
		} else if (urls.length > 0) {
			console.info(`Found service URLs (${urls.join()}) for query "${query}" but none matching current request protocol '${requestUrl.protocol}'`)
		}

		const [base, value] = query.split('/', 2)

		switch (base) {
			case 'domain':
				throw new NotFoundError(`The domain you are seeking as '${value}' is not here.`)
			case 'nameserver':
				throw new NotFoundError(`The nameserver you are seeking as '${value}' is not here.`)
			case 'ip':
				throw new NotFoundError(`The IP address you are seeking as '${value}' is not here.`)
			case 'autnum':
				throw new NotFoundError(`The AS you are seeking as '${value}' is not here.`)
			case 'entity':
				throw new NotFoundError(`The entity you are seeking as '${value}' is not here.`)
		}
	}
}

const getHttpUrl = (urls: string[]) => urls.find(url => url.startsWith(`http://`))
const getHttpsUrl = (urls: string[]) => urls.find(url => url.startsWith(`https://`))

function getRedirectUrl(urls: string[], requestUrl: URL, matchProtocolOnRedirect: boolean) {
	if (urls.length > 0) {
		return matchProtocolOnRedirect
			? (urls.find(url => url.startsWith(`${requestUrl.protocol}//`)) ?? urls[0])
			: (getHttpsUrl(urls) ?? getHttpUrl(urls))
	}
}
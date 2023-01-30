import { Hono } from 'hono';
import { RDAPError } from './error';
import { defaultNotice } from './json/response';
import bootstrap from './routes/bootstrap';

export interface Env {
	CORS_ORIGINS?: string;
	/** URLs of the bootstrap files (defaults to IANA) */
	DOWNLOAD_BOOTSTRAP_FILE_URLS?: string;
	/** Match the protocol http/https on redirect */
	MATCH_PROTOCOL?: string;
	REGISTRIES: KVNamespace;
}

const app = new Hono()
app.route('/bootstrap', bootstrap)

app.onError((error, c) => {
	if (error instanceof RDAPError) {
		error.addNotice(defaultNotice(c.req.url))

		return c.json(error.json(), error.errorCode, {
			'Content-Type': 'application/rdap+json',
		})
	}

	return c.text('Internal Server Error', 500)
})

export default app
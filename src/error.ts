import { StatusCode, getStatusText } from 'hono/utils/http-status';
import { Notice, NRO_RDAP_Profile_0 } from './json/response';

export interface RDAPError {
	title: string;
	description: string[];
	errorCode: StatusCode;
	notices: Notice[];
}

export class RDAPError extends Error {
	constructor(code: StatusCode, description: string | string[]) {
		super()
		this.errorCode = code
		this.title = getStatusText(this.errorCode)
		this.description = Array.isArray(description) ? description : [description]
		this.notices = []
	}

	addNotice(notice: Notice) {
		this.notices.push(notice)
		return this
	}

	json(): NRO_RDAP_Profile_0 {
		return {
			rdapConformance: [
				'rdap_level_0',
				'nro_rdap_profile_0',
			],
			notices: this.notices,
			errorCode: this.errorCode,
			title: this.title,
			description: this.description,
		}
	}
}

export class BadRequestError extends RDAPError {
	constructor(description: string | string[]) {
		super(400, description)
	}
}

export class NotFoundError extends RDAPError {
	constructor(description: string | string[]) {
		super(404, description)
	}
}
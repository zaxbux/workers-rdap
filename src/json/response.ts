export interface Link {
	value: string;
	rel: string;
	type: string;
	href: string;
}

export interface Notice {
	title: string;
	description: string[];
	links?: Link[];
}

export interface RDAP_Level_0<C extends Array<string> = ['rdap_level_0']> {
	/**
	 * @see {@link https://www.rfc-editor.org/rfc/rfc7483#section-4.1}
	 */
	rdapConformance: C;
	notices: Notice[];
}

export interface NRO_RDAP_Profile_0 extends RDAP_Level_0<[...RDAP_Level_0['rdapConformance'], "nro_rdap_profile_0"]> {
	errorCode?: number;
	title?: string;
	description?: string[];
}



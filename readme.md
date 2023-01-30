# RDAP Bootstrap Service

A simple RDAP bootstrap service ([RFC 7484](https://tools.ietf.org/html/rfc7484)).

## Configuration

```sh
# Allowed CORS origins (defaults to *)
CORS_ORIGINS='example.com,example.net'

# URLs for each bootstrap file (defaults to IANA)
DOWNLOAD_BOOTSTRAP_FILE_URLS='{
	asn: "https://data.iana.org/rdap/asn.json",
	ipv4: "https://data.iana.org/rdap/ipv4.json",
	ipv6: "https://data.iana.org/rdap/ipv6.json",
	dns: "https://data.iana.org/rdap/dns.json",
	object_tags: "https://data.iana.org/rdap/object-tags.json"
}'

# By default, redirect URLs are preferred to be HTTPs. Set true to match the request protocol instead.
MATCH_PROTOCOL=false
```
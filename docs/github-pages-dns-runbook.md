# GitHub Pages DNS Runbook

Use this when a GitHub Pages custom domain looks configured but the site does not resolve, HTTPS will not issue, or DNS seems stuck after changing Namecheap records.

## Fast Diagnosis

Check GitHub Pages state:

```bash
gh api repos/philstilwell/xixteen/pages \
  --jq '{status: .status, html_url: .html_url, cname: .cname, https_certificate: .https_certificate, https_enforced: .https_enforced}'
```

Check public delegation and records:

```bash
dig @a.gtld-servers.net xixteen.com NS +noall +answer +authority +additional
dig @1.1.1.1 xixteen.com A +noall +answer +comments
dig @8.8.8.8 xixteen.com A +noall +answer +comments
dig @1.1.1.1 www.xixteen.com CNAME +noall +answer +comments
```

If the `.com` delegation points at old custom nameservers, or returns `SERVFAIL` / `No Reachable Authority`, do not keep editing host records yet. Fix nameservers first.

## Correct Namecheap Setup

In Namecheap, open `xixteen.com` -> Domain -> Nameservers.

Set Nameservers to:

```text
Namecheap BasicDNS
```

Then open Advanced DNS -> Host Records. Remove parked/default records such as:

```text
CNAME Record        www    free.park-your-domain.com.
URL Redirect Record @      http://www.xixteen.com/
```

Add these GitHub Pages records:

```text
A Record     @      185.199.108.153
A Record     @      185.199.109.153
A Record     @      185.199.110.153
A Record     @      185.199.111.153
AAAA Record  @      2606:50c0:8000::153
AAAA Record  @      2606:50c0:8001::153
AAAA Record  @      2606:50c0:8002::153
AAAA Record  @      2606:50c0:8003::153
CNAME Record www    philstilwell.github.io
```

TTL can stay `Automatic`.

## Cache Purge

If direct authoritative queries are correct but Cloudflare `1.1.1.1` still returns stale `SERVFAIL`, purge Cloudflare's public DNS cache:

```bash
curl -X POST 'https://one.one.one.one/api/v1/purge?domain=xixteen.com&type=NS'
curl -X POST 'https://one.one.one.one/api/v1/purge?domain=xixteen.com&type=A'
curl -X POST 'https://one.one.one.one/api/v1/purge?domain=xixteen.com&type=AAAA'
curl -X POST 'https://one.one.one.one/api/v1/purge?domain=www.xixteen.com&type=CNAME'
```

Then flush local macOS DNS:

```bash
dscacheutil -flushcache
killall -HUP mDNSResponder 2>/dev/null || true
```

## GitHub Pages Reset

Make sure the repo has a root `CNAME` file containing only:

```text
xixteen.com
```

Then re-save the custom domain in GitHub Pages settings, or use:

```bash
gh api -X PUT repos/philstilwell/xixteen/pages -f cname=xixteen.com
```

If the GitHub UI custom-domain field is blank even though the API reports `cname`, enter `xixteen.com` in Settings -> Pages -> Custom domain and click Save. This can trigger the DNS check and certificate job.

Once the certificate is approved, enforce HTTPS:

```bash
gh api -X PUT repos/philstilwell/xixteen/pages -F https_enforced=true
```

## Final Verification

```bash
curl -I https://xixteen.com/
curl -L -I http://xixteen.com/
curl -L -I http://www.xixteen.com/

dig @1.1.1.1 +short xixteen.com A
dig @1.1.1.1 +short xixteen.com AAAA
dig @1.1.1.1 +short www.xixteen.com CNAME
```

Expected result:

```text
https://xixteen.com/                 -> 200 OK
http://xixteen.com/                  -> 301 to https://xixteen.com/
https://www.xixteen.com/             -> 301 to https://xixteen.com/
GitHub Pages https_certificate.state -> approved
GitHub Pages https_enforced          -> true
```

If `http://xixteen.com/` still returns `200 OK` immediately after enabling HTTPS, check the `Age` header. GitHub/Fastly may be serving a cached pre-enforcement response for up to about 10 minutes. Wait for it to expire before changing settings again.

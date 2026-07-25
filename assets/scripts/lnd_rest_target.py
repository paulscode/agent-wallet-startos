#!/usr/bin/env python3
"""Pick an LND REST URL that the pinned TLS cert actually validates for.

The app pins LND's self-signed cert (LND_TLS_CERT) instead of trusting system
CAs, but pinning does not exempt the connection from hostname verification: the
cert still has to vouch for the name being dialed. StartOS 0.4.0's LND issues a
cert whose SANs are IP addresses only, with no `lnd.startos` DNS entry, so
`https://lnd.startos:8080` fails with "Hostname mismatch" against the correct
cert. The address the hostname resolves to *is* in the SANs, so dialing that
address verifies cleanly with no loss of security.

Prints the URL to use (the input URL unchanged when it is already valid, or when
anything about the check is inconclusive — never fail closed on a guess).
"""
import base64
import os
import socket
import ssl
import sys
import tempfile
from urllib.parse import urlsplit, urlunsplit


def san_entries(cert_pem: str):
    """Return (dns_names, ip_addresses) from the cert's subjectAltName."""
    path = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False) as f:
            f.write(cert_pem)
            path = f.name
        san = ssl._ssl._test_decode_cert(path).get("subjectAltName", ())
    finally:
        if path:
            try:
                os.unlink(path)
            except OSError:
                pass
    dns = {v.lower() for k, v in san if k == "DNS"}
    ips = {v for k, v in san if k == "IP Address"}
    return dns, ips


def main() -> int:
    url = os.environ.get("LND_REST_URL", "")
    cert_b64 = os.environ.get("LND_TLS_CERT", "")
    if not url or not cert_b64:
        print(url)
        return 0

    parts = urlsplit(url)
    host = parts.hostname or ""
    dns, ips = san_entries(base64.b64decode(cert_b64).decode())

    # Already covered (or the cert names no hosts at all, in which case swapping
    # to an address would not help either) — leave it alone.
    if host.lower() in dns or (not dns and not ips):
        print(url)
        return 0

    # A hostname the cert does not cover: fall back to the address, but only if
    # the cert actually vouches for that address.
    addr = socket.gethostbyname(host)
    if addr not in ips:
        print(url)
        return 0

    netloc = addr if parts.port is None else "%s:%d" % (addr, parts.port)
    print(urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment)))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        # Any surprise (private ssl API gone, DNS down, malformed cert) leaves
        # the caller's URL untouched rather than inventing a target.
        print(os.environ.get("LND_REST_URL", ""))
        sys.exit(0)

#!/usr/bin/env python3
"""Dev static server for the prototypes: http.server plus `Cache-Control: no-cache`.

Bare `python3 -m http.server` sends no cache headers, so browsers apply heuristic
caching to ES modules. After a code change that adds an export, a client can then
load a fresh main.js against a day-old dependency and die with
"module does not provide an export" — a hard refresh does not reliably clear
module-map/iframe copies. `no-cache` forces revalidation on every request
(cheap 304s while files are unchanged), so new code is always picked up.

Usage: python3 research/tools/serve.py [port]   (default 8123, serves CWD)
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    server = ThreadingHTTPServer(('0.0.0.0', port), NoCacheHandler)
    print(f'serving {port} with Cache-Control: no-cache')
    server.serve_forever()

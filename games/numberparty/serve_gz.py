import http.server, socketserver

class GzipHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.endswith('.gz'):
            self.send_header('Content-Encoding', 'gzip')
            if self.path.endswith('.wasm.gz'):
                self.send_header('Content-Type', 'application/wasm')
            elif self.path.endswith('.js.gz'):
                self.send_header('Content-Type', 'application/javascript')
        super().end_headers()

PORT = 8000
with socketserver.TCPServer(("", PORT), GzipHTTPRequestHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()

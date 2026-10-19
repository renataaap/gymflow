"""Exercise the actual hosted start command and persistence across restarts."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

from test_api import Client

PROJECT = Path(__file__).resolve().parents[1]


class HostedStartup(unittest.TestCase):
    def start(self, db_path, secure=False):
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 0))
            port = probe.getsockname()[1]
        env = {**os.environ, 'PORT': str(port), 'GYMFLOW_DB': str(db_path),
               'GYMFLOW_DEMO': '1', 'GYMFLOW_SECURE_COOKIE': '1' if secure else '0'}
        process = subprocess.Popen(
            [sys.executable, 'app/server.py', '--host', '0.0.0.0', '--seed-demo'],
            cwd=PROJECT, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(self.stop, process)
        base = f'http://127.0.0.1:{port}'
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if process.poll() is not None:
                stdout, stderr = process.communicate()
                self.fail(f'O processo de hospedagem encerrou: {stdout} {stderr}')
            try:
                with urllib.request.urlopen(base + '/api/health', timeout=1) as response:
                    self.assertEqual(json.load(response), {'status': 'ok'})
                return process, base
            except (OSError, urllib.error.URLError):
                time.sleep(0.05)
        self.fail('O servidor não ficou saudável no prazo.')

    @staticmethod
    def stop(process):
        if process.poll() is None:
            process.terminate()
        process.communicate(timeout=5)

    def test_hosted_port_database_restart_and_https_cookie(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'persistent-volume' / 'gymflow.sqlite3'
            process, base = self.start(path)
            client = Client(base)
            state = client.login('admin@gymflow.demo')
            self.assertEqual(len(state['students']), 15)
            code, result = client.call('profile', 'PUT',
                                       {'name': 'Administrador Persistente', 'phone': ''})
            self.assertEqual(code, 200, result)
            self.stop(process)
            self.assertTrue(path.is_file())

            restarted, base = self.start(path)
            after = Client(base).login('admin@gymflow.demo')
            self.assertEqual(after['user']['name'], 'Administrador Persistente')
            self.assertEqual(len(after['students']), 15, 'Reiniciar não deve duplicar o seed.')
            self.stop(restarted)

            secure, base = self.start(path, secure=True)
            request = urllib.request.Request(base + '/api/login', method='POST',
                headers={'Content-Type': 'application/json'},
                data=json.dumps({'email': 'admin@gymflow.demo',
                                 'password': 'GymFlow@2026!'}).encode())
            with urllib.request.urlopen(request) as response:
                cookie = response.headers['Set-Cookie']
                for flag in ['HttpOnly', 'SameSite=Strict', 'Secure']:
                    self.assertIn(flag, cookie)
            self.assertEqual(Client(base).call('state')[0], 401)
            self.stop(secure)


if __name__ == '__main__':
    unittest.main(verbosity=2)

"""Synthetic Linux containment regression; no network, credentials or AI calls."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest


@unittest.skipUnless(sys.platform == "linux", "requires Linux subreaper support")
class SupervisorTest(unittest.TestCase):
    def test_abrupt_scan_crash_stops_detached_browser(self):
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / "ticks"
            pid_file = Path(directory) / "pid"
            browser = (
                "import os,time; from pathlib import Path; "
                f"Path({str(pid_file)!r}).write_text(str(os.getpid())); "
                f"p=Path({str(marker)!r}); p.write_text('started'); "
                "exec(\"while True:\\n p.write_text(p.read_text()+'.')\\n time.sleep(.01)\")"
            )
            scan = (
                "import os,signal,subprocess,sys,time; from pathlib import Path; "
                f"subprocess.Popen([sys.executable,'-c',{browser!r}],start_new_session=True); "
                f"exec(\"while not Path({str(marker)!r}).exists():\\n time.sleep(.01)\"); "
                "os.kill(os.getpid(),signal.SIGKILL)"
            )
            try:
                completed = subprocess.run(
                    [sys.executable, str(Path(__file__).with_name("scan-supervisor.py")), sys.executable, "-c", scan],
                    timeout=10, check=False,
                )
                self.assertNotEqual(completed.returncode, 0)
                stopped = marker.read_text()
                time.sleep(.1)
                self.assertEqual(marker.read_text(), stopped)
            finally:
                if pid_file.exists():
                    try:
                        os.kill(int(pid_file.read_text()), signal.SIGKILL)
                    except ProcessLookupError:
                        pass


if __name__ == "__main__":
    unittest.main()

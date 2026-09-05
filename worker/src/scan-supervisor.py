"""Linux scan supervisor: adopt and terminate browsers orphaned by a crashed scan."""
import ctypes
import os
from pathlib import Path
import signal
import subprocess
import sys
import time


def cleanup_children():
    deadline = time.monotonic() + 5
    while True:
        # Adopted grandchildren become our direct children after their parent dies.
        children = Path(f"/proc/self/task/{os.getpid()}/children").read_text().split()
        for value in children:
            try:
                os.kill(int(value), signal.SIGKILL)
            except ProcessLookupError:
                pass
        try:
            while os.waitpid(-1, os.WNOHANG)[0]:
                pass
        except ChildProcessError:
            return
        if time.monotonic() >= deadline:
            raise RuntimeError("could not confirm scan descendant cleanup")
        time.sleep(.01)


def main():
    libc = ctypes.CDLL(None, use_errno=True)
    # PR_SET_CHILD_SUBREAPER: detached Chromium processes are adopted here, not PID 1.
    if libc.prctl(36, 1, 0, 0, 0) != 0:
        raise OSError(ctypes.get_errno(), "cannot enable scan subreaper")
    channel = os.environ.get("NODE_CHANNEL_FD")
    passed = (int(channel),) if channel is not None else ()
    child = subprocess.Popen(sys.argv[1:], pass_fds=passed)
    if channel is not None:
        os.close(int(channel))
    try:
        return_code = child.wait()
    finally:
        cleanup_children()
    return return_code if return_code >= 0 else 128 - return_code


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"scan supervisor failed: {error}", file=sys.stderr)
        sys.exit(70)

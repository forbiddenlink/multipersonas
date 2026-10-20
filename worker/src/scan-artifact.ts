import * as fs from "node:fs";
import * as path from "node:path";

const MAX_ARTIFACT_BYTES = 20 * 1024 * 1024;

function openedPath(fd: number, requested: string): string | null {
  try {
    // On Linux the descriptor's own link names the file actually opened, so a path swapped
    // after open cannot change what is checked. Elsewhere fall back to the requested path.
    return process.platform === "linux" ? fs.readlinkSync(`/proc/self/fd/${fd}`) : fs.realpathSync(requested);
  } catch {
    return null;
  }
}

/**
 * Read a file the scan reported (a screenshot path), only if it is a regular file inside the
 * job's own output directory. The scan result is untrusted (SEC-001): a compromised scan can
 * report any path, such as /proc/self/environ, and the worker would read its own service-role
 * key and upload it as a "screenshot". A final-component symlink is refused at open, a FIFO
 * cannot block the open, and the opened descriptor's real path is checked against the root.
 */
export function readScanArtifact(root: string, file: string): Buffer | null {
  let realRoot: string;
  let fd: number;
  try {
    realRoot = fs.realpathSync(root);
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  } catch {
    return null;
  }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_ARTIFACT_BYTES) return null;
    const opened = openedPath(fd, file);
    if (!opened) return null;
    const relative = path.relative(realRoot, opened);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
    return fs.readFileSync(fd);
  } catch {
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

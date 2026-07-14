const fs = require("node:fs");

const originalReadlink = fs.readlink;
const originalReadlinkSync = fs.readlinkSync;

function shouldIgnoreReadlinkError(error) {
  return process.platform === "win32" && (error?.code === "EISDIR" || error?.code === "EINVAL");
}

fs.readlink = function patchedReadlink(path, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }

  return originalReadlink.call(fs, path, options, (error, linkString) => {
    if (error && shouldIgnoreReadlinkError(error)) {
      callback(null, path);
      return;
    }

    callback(error, linkString);
  });
};

fs.readlinkSync = function patchedReadlinkSync(path, options) {
  try {
    return originalReadlinkSync.call(fs, path, options);
  } catch (error) {
    if (shouldIgnoreReadlinkError(error)) return path;
    throw error;
  }
};

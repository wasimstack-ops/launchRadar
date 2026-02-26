function info(message, meta) {
  if (meta) {
    console.log(`[INFO] ${message}`, meta);
    return;
  }
  console.log(`[INFO] ${message}`);
}

function error(message, meta) {
  if (meta) {
    console.error(`[ERROR] ${message}`, meta);
    return;
  }
  console.error(`[ERROR] ${message}`);
}

module.exports = {
  info,
  error,
};

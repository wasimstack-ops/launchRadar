function serializeValue(value) {
  if (value instanceof Error) {
    const serialized = {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };

    if (value.cause !== undefined) {
      serialized.cause = serializeValue(value.cause);
    }

    for (const [key, item] of Object.entries(value)) {
      if (serialized[key] !== undefined) continue;
      serialized[key] = serializeValue(item);
    }

    return serialized;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeValue(item)])
    );
  }

  return value;
}

function write(level, message, meta, writer) {
  const timestamp = new Date().toISOString();

  if (meta !== undefined) {
    writer(`[${level}] ${timestamp} ${message}`, serializeValue(meta));
    return;
  }

  writer(`[${level}] ${timestamp} ${message}`);
}

function info(message, meta) {
  write('INFO', message, meta, console.log);
}

function warn(message, meta) {
  write('WARN', message, meta, console.warn);
}

function error(message, meta) {
  write('ERROR', message, meta, console.error);
}

module.exports = {
  info,
  warn,
  error,
};

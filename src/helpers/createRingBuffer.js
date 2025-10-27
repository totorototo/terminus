const createRingBuffer = (length, initialState = []) => {
  if (!Number.isInteger(length) || length <= 0)
    throw new Error("Buffer length must be a positive integer.");

  const buffer = new Array(length);
  let pointer = 0;
  let size = 0;

  // Initialize buffer with initialState if provided
  const initLen = Math.min(length, initialState.length);
  for (let i = 0; i < initLen; i++) {
    buffer[i] = initialState[i];
  }
  pointer = initLen < length ? initLen : 0;
  size = initLen;

  function incPointer(p) {
    return p + 1 < length ? p + 1 : 0;
  }

  function decPointer(p) {
    return p > 0 ? p - 1 : length - 1;
  }

  const push = (item) => {
    buffer[pointer] = item;
    pointer = incPointer(pointer);
    if (size < length) size++;
    return item;
  };

  const get = (index) => {
    if (size === 0) return undefined;

    let pos;
    if (index < 0) {
      pos = pointer + index;
      if (pos < 0) pos += length;
    } else if (index >= size) {
      pos = index - size + pointer;
      if (pos >= length) pos -= length;
    } else {
      pos = index;
    }
    return buffer[pos];
  };

  const prev = () => {
    pointer = decPointer(pointer);
    return buffer[pointer];
  };

  const next = () => {
    if (size === 0) return undefined;
    pointer = incPointer(pointer);
    return buffer[pointer];
  };

  const flush = () => {
    pointer = 0;
    size = 0;
  };

  const dump = (targetArray) => {
    const out = targetArray || new Array(size);
    let start = pointer - size;
    if (start < 0) start += length;
    for (let i = 0, src = start; i < size; i++) {
      out[i] = buffer[src];
      src = incPointer(src);
    }
    return out;
  };

  const peek = () => (size > 0 ? buffer[decPointer(pointer)] : undefined);
  const isFull = () => size === length;
  const isEmpty = () => size === 0;
  const count = () => size;

  return { push, get, prev, next, flush, dump, peek, isFull, isEmpty, count };
};

export default createRingBuffer;

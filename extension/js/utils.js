export const isFirefox = navigator.userAgent.includes('Firefox/');

export function localStorageSetWithExpiry(key, value, ttl) {
  const now = new Date();
  localStorage.setItem(
    key,
    JSON.stringify({
      value,
      expiry: now.getTime() + ttl,
    }),
  );
}

export function localStorageGetWithExpiry(key) {
  const item = localStorage.getItem(key);
  if (!item) {
    return null;
  }
  const data = JSON.parse(item);
  const now = new Date();
  if (now.getTime() > data.expiry) {
    localStorage.removeItem(key);
    return null;
  }
  return data.value;
}

export function flatten(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.reduce((a, b) => {
    if (!b) {
      return a;
    } else if (b.constructor === Array) {
      return a.concat(b);
    } else {
      return a.concat([b]);
    }
  }, []);
}

export function toObject(arr) {
  const obj = {};
  arr.forEach((e) => {
    obj[e[0]] = e[1];
  });
  return obj;
}

export function fmt_filesize(bytes, digits = 2) {
  const units = ['B', 'kiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let i = 0;
  let size = bytes;
  while (size > 1024 && i < units.length) {
    size = size / 1024;
    i++;
  }
  if (i < 3) {
    digits = 0;
  }
  if (i > 0) {
    size = size.toFixed(digits);
  }
  return `${size} ${units[i]}`;
}

export function $() {
  const elements = document.querySelectorAll.apply(document, arguments);
  if (arguments[0][0] === '#') {
    return elements[0];
  } else {
    return elements;
  }
}

export function getDocumentTitle() {
  return new Promise((resolve, reject) => {
    chrome.tabs.executeScript(
      {
        code: `(function(){ return document.title; })()`,
      },
      (data) => {
        resolve(data[0]);
      },
    );
  });
}

export async function fetchDOM(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unexpected response code: ${response.status}`);
  }
  const body = await response.text();
  const doc = new DOMParser().parseFromString(body, 'text/html');
  return doc;
}

export function extract_filename(url) {
  url = url.replace(/\?.+/, '');
  return url.substr(url.lastIndexOf('/') + 1).replace(/[?#].*/, '');
}

export function extract_extension(url) {
  const fn = extract_filename(url);
  const dot = fn.lastIndexOf('.');
  if (dot !== -1) {
    return fn.substr(dot + 1).toLowerCase();
  }
}

export function add_param(url, param) {
  if (url.includes('?')) {
    return `${url}&${param}`;
  } else {
    return `${url}?${param}`;
  }
}

export function parse_pt(pt) {
  const ret = /^PT(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?$/.exec(pt);
  if (ret === null) return 0;
  let duration = 0;
  if (ret[1]) {
    duration += 60 * 60 * parseInt(ret[1], 10);
  }
  if (ret[2]) {
    duration += 60 * parseInt(ret[2], 10);
  }
  if (ret[3]) {
    duration += parseFloat(ret[3]);
  }
  return duration;
}

export function get_json(response) {
  console.log(response);
  if (response.ok) {
    return response.json();
  }
  throw response;
}

export function get_text(response) {
  console.log(response);
  if (response.ok) {
    return response.text();
  }
  throw response;
}

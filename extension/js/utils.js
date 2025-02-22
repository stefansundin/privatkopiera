// TODO: Get rid of this import!
import { tab_id } from './popup.js';

export const isFirefox = navigator.userAgent.includes('Firefox/');
export const isAndroid = navigator.userAgent.includes('Android');

export function localStorageSetWithExpiry(key, value, ttl) {
  localStorage.setItem(
    key,
    JSON.stringify({
      value,
      expiry: Date.now() + ttl,
    }),
  );
}

export function localStorageGetWithExpiry(key) {
  const item = localStorage.getItem(key);
  if (!item) {
    return null;
  }
  const data = JSON.parse(item);
  if (Date.now() > data.expiry) {
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

export async function getDocumentTitle(tab_id) {
  const injectionResult = await chrome.scripting.executeScript({
    target: { tabId: tab_id },
    func: () => document.title,
  });
  if (injectionResult[0].error) {
    throw injectionResult[0].error;
  } else if (injectionResult[0].result === null) {
    throw new Error('Script error.');
  }
  return injectionResult[0].result;
}

export async function fetchDOM(url, ...args) {
  // The `url` argument passed to the site function is a URL and not a string, so when it is used here it causes an error in Chrome.
  // TODO: Refactor stuff to make this less weird.
  if (url instanceof URL) {
    url = url.toString();
  }

  const injectionResult = await chrome.scripting.executeScript({
    target: { tabId: tab_id },
    func: async (...args) => {
      try {
        const response = await fetch(...args);
        if (!response.ok) {
          return {
            error: `Invalid response: ${
              response.status
            } ${await response.text()}`,
          };
        }
        return { result: await response.text() };
      } catch (err) {
        return { error: err.message };
      }
    },
    args: [url, ...args],
  });
  console.debug('injectionResult', injectionResult);
  if (injectionResult[0].error) {
    throw injectionResult[0].error;
  } else if (injectionResult[0].result === null) {
    throw new Error('Script error.');
  } else if (injectionResult[0].result.error) {
    throw new Error(injectionResult[0].result.error);
  }

  const body = injectionResult[0].result.result;
  const doc = new DOMParser().parseFromString(body, 'text/html');
  return doc;
}

export async function fetchPageData(url, id='__NEXT_DATA__') {
  // We always want to perform a network request rather than executing a script to pull the page's data, since that
  // has a chance of fetching old data if the user has navigated around on the website before opening the extension.
  const doc = await fetchDOM(url);
  const element = doc.getElementById(id);
  if (!element) {
    throw new Error(`${id} not found on page`);
  }
  const data = JSON.parse(element.textContent);
  console.debug(data);
  return data;
}

export async function fetchText(...args) {
  const injectionResult = await chrome.scripting.executeScript({
    target: { tabId: tab_id },
    func: async (...args) => {
      try {
        const response = await fetch(...args);
        if (!response.ok) {
          return {
            error: `Invalid response: ${
              response.status
            } ${await response.text()}`,
          };
        }
        return { result: await response.text() };
      } catch (err) {
        return { error: err.message };
      }
    },
    args,
  });
  console.debug('injectionResult', injectionResult);
  if (injectionResult[0].error) {
    throw injectionResult[0].error;
  } else if (injectionResult[0].result === null) {
    throw new Error('Script error.');
  } else if (injectionResult[0].result.error) {
    throw new Error(injectionResult[0].result.error);
  }
  return injectionResult[0].result.result;
}

export async function fetchJson(...args) {
  const injectionResult = await chrome.scripting.executeScript({
    target: { tabId: tab_id },
    func: async (...args) => {
      try {
        const response = await fetch(...args);
        if (!response.ok) {
          return {
            error: `Invalid response: ${
              response.status
            } ${await response.text()}`,
          };
        }
        return { result: await response.json() };
      } catch (err) {
        return { error: err.message };
      }
    },
    args,
  });
  console.debug('injectionResult', injectionResult);
  if (injectionResult[0].error) {
    throw injectionResult[0].error;
  } else if (injectionResult[0].result === null) {
    throw new Error('Script error.');
  } else if (injectionResult[0].result.error) {
    throw new Error(injectionResult[0].result.error);
  }
  return injectionResult[0].result.result;
}

export function extract_filename(url) {
  url = url.replace(/\?.+/, '');
  return url.substring(url.lastIndexOf('/') + 1).replace(/[?#].*/, '');
}

export function extract_extension(url) {
  const fn = extract_filename(url);
  const dot = fn.lastIndexOf('.');
  if (dot !== -1) {
    return fn.substring(dot + 1).toLowerCase();
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

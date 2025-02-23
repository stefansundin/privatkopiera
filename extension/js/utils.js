export let tab;
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

export function toObject(arr) {
  const obj = {};
  arr.forEach((e) => {
    obj[e[0]] = e[1];
  });
  return obj;
}

export function $() {
  const elements = document.querySelectorAll.apply(document, arguments);
  if (arguments[0][0] === '#') {
    return elements[0];
  } else {
    return elements;
  }
}

export async function getTab() {
  if (tab) {
    return tab;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  tab = tabs[0];
  return tab;
}

export async function getDocumentTitle() {
  const tab = await getTab();
  const injectionResult = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
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

  const tab = await getTab();
  const injectionResult = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
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
  const tab = await getTab();
  const injectionResult = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
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
  const tab = await getTab();
  const injectionResult = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
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

export function extractFilename(url) {
  url = url.replace(/\?.+/, '');
  return url.substring(url.lastIndexOf('/') + 1).replace(/[?#].*/, '');
}

export function extractExtension(url) {
  const filename = extractFilename(url);
  const dot = filename.lastIndexOf('.');
  if (dot !== -1) {
    return filename.substring(dot + 1).toLowerCase();
  }
}

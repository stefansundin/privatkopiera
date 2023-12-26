Website: https://stefansundin.github.io/privatkopiera/

Chrome Web Store: https://chrome.google.com/webstore/detail/privatkopiera/jhjhnecocacdbhlkjgpdacoibidhmgdf

Firefox Addons: https://addons.mozilla.org/addon/privatkopiera/

Icon: https://commons.wikimedia.org/wiki/File:VHS_diagonal.svg

## Development

The [extension](extension) directory contains the source code, which you can load directly in Chrome.

The [firefox](firefox) directory contains modifications necessary for the extension to run in Firefox (currently only the manifest file is different). You must run `./make-xpi.sh` to copy over the other files, after which you can load the extension in `about:debugging`.

### Bootstrap

To build the custom Bootstrap theme you need Node.js installed and then you can run:

```shell
cd bootstrap
npm install
npm run build
```

If you don't have Node.js or you don't want it, then you can get the default Bootstrap theme by running:

```shell
curl -f -o extension/css/bootstrap.min.css https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css
```

Or just download the file and put it there manually.

### Formatting

The JavaScript code is formatted with prettier. The HTML is formatted with the built-in VS Code formatter.

### Why are there more `executeScript` calls than seems necessary?

The extension performs all of its network requests through the host page, using `chrome.scripting.executeScript()`, for a number of reasons:

1. Any `POST` request made in the extension will cause Chrome to add an `Origin: chrome-extension://jhjhnecocacdbhlkjgpdacoibidhmgdf` header. This header is easy to detect and block by websites (see [#185](https://github.com/stefansundin/privatkopiera/issues/185)). By making the network request from the host page instead, the `Origin` header will look normal from the website's point of view. There's [a Chrome bug](https://bugs.chromium.org/p/chromium/issues/detail?id=966223) about this.
2. The extension can avoid asking for host permissions when the user uses Privatkopiera on a website for the first time. This makes for a better experience since granting new permissions is not foolproof and at least one user reported that they didn't understand how to proceed (see [#184](https://github.com/stefansundin/privatkopiera/issues/184)).
3. Some websites have permissive CORS permissions initially, but then later make it more restrictive. This makes for an impossible situation since the only workaround would be to ask for host permissions prematurely, even though they may not be required at the time.

### `executeScript` error handling

Due to [a Chrome bug](https://bugs.chromium.org/p/chromium/issues/detail?id=1271527), it isn't possible to throw an exception inside of `chrome.scripting.executeScript()` and receive the exception outside of the script.

As a workaround, where appropriate, return values from `executeScript` are an object with `result` or `error` keys depending on what happened. This looks funky but will have to do until the Chrome bug is fixed.

This is not a problem in Firefox.

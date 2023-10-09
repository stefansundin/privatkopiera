Website: https://stefansundin.github.io/privatkopiera/

Chrome Web Store: https://chrome.google.com/webstore/detail/privatkopiera/jhjhnecocacdbhlkjgpdacoibidhmgdf

Firefox Addons: https://addons.mozilla.org/addon/privatkopiera/

Icon: https://commons.wikimedia.org/wiki/File:VHS_diagonal.svg

## Development

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

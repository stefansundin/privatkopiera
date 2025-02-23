#!/bin/bash -e

if [[ ! -f extension/css/bootstrap.min.css ]]; then
  echo "The bootstrap file is missing. Please follow the instructions in README.md."
  exit 1
fi

mkdir -p dist

set -x

cp -r extension/{js,img,css,*.html} firefox
# find firefox -type f -name '*.js' | xargs sed -i.bak '/console\.log/d'

V=$(cat firefox/manifest.json | jq -Mr .version)
rm -f "dist/privatkopiera-$V.xpi"
cd firefox
zip -r "../dist/privatkopiera-$V.xpi" . -x '*.git*' -x '*.DS_Store' -x '*Thumbs.db' -x '*.bak'

diff ../extension/manifest.json manifest.json

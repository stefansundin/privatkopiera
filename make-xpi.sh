#!/bin/bash -ex
cp -r extension/{js,img,css,popup.html} firefox

V=$(cat firefox/manifest.json | jq -Mr .version)
rm -f "privatkopiera-$V.xpi"
cd firefox
zip -r "../privatkopiera-$V.xpi" . -x '*.git*' -x '*.DS_Store' -x '*Thumbs.db'

diff ../extension/manifest.json manifest.json

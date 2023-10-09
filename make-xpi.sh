#!/bin/bash -ex
cp -r extension/{js,img,css,*.html} firefox
# find firefox -type f -name '*.js' | xargs sed -i.bak '/console\.log/d'

V=$(cat firefox/manifest.json | jq -Mr .version)
rm -f "privatkopiera-$V.xpi"
cd firefox
zip -r "../privatkopiera-$V.xpi" . -x '*.git*' -x '*.DS_Store' -x '*Thumbs.db' -x '*.bak'

diff ../extension/manifest.json manifest.json

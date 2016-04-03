#!/bin/bash -ex
V=$(cat firefox/manifest.json | grep '"version"' | grep -o "\d*\.\d*\.\d*")
coffeebar popup.coffee -o extension/js/popup.js

cp -r extension/{js,img,css,popup.html} firefox

rm -f "privatkopiera-$V.xpi"
cd firefox
zip -r "../privatkopiera-$V.xpi" . -x '*.git*' -x '*.DS_Store' -x '*Thumbs.db'

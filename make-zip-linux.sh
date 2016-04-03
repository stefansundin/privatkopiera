#!/bin/bash -ex
V=$(cat extension/manifest.json | grep '"version"' | grep -oP "\d+\.\d+\.\d+")
coffeebar popup.coffee -o extension/js/popup.js

rm -f "privatkopiera-$V.zip"
cd extension
zip -r "../privatkopiera-$V.zip" . -x '*.git*' -x '*.DS_Store' -x '*Thumbs.db'

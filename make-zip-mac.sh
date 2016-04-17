#!/bin/bash -ex
coffee -b -c extension/js/*.coffee

V=$(cat extension/manifest.json | grep '"version"' | grep -o "\d*\.\d*\.\d*")
rm -f "privatkopiera-$V.zip"
cd extension
zip -r "../privatkopiera-$V.zip" . -x '*.coffee' -x '*.git*' -x '*.DS_Store' -x '*Thumbs.db'

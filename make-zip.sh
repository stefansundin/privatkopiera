#!/bin/bash -ex
V=$(cat extension/manifest.json | jq -Mr .version)
rm -f "privatkopiera-$V.zip"
cd extension
zip -r "../privatkopiera-$V.zip" . -x '*.git*' -x '*.DS_Store' -x '*Thumbs.db'

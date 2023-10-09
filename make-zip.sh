#!/bin/bash -e

if [[ ! -f extension/css/bootstrap.min.css ]]; then
  echo "The bootstrap file is missing. Please follow the instructions in README.md."
  exit 1
fi

set -x
V=$(cat extension/manifest.json | jq -Mr .version)
rm -f "privatkopiera-$V.zip"
cd extension
zip -r "../privatkopiera-$V.zip" . -x '*.git*' -x '*.DS_Store' -x '*Thumbs.db'

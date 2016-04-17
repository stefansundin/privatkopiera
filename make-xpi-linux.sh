#!/bin/bash -ex
coffee -b -c extension/js/*.coffee
cp -r extension/{js,img,css,popup.html} firefox

V=$(cat firefox/manifest.json | grep '"version"' | grep -oP "\d+\.\d+\.\d+")
rm -f "privatkopiera-$V.xpi"
cd firefox
zip -r "../privatkopiera-$V.xpi" . -x '*.coffee' -x '*.git*' -x '*.DS_Store' -x '*Thumbs.db'

#!/bin/bash -ex

curl https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css -o extension/css/bootstrap.min.css
curl https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css -o extension/css/bootstrap-theme.min.css

npm install

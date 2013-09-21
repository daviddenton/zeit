#!/bin/sh

newVersion=$1
oldVersion=`./tools/jq .version package.json`
name=`./tools/jq .name package.json`
echo Publishing: $name version \"$newVersion\" \(was $oldVersion\)

./tools/jq .version=$newVersion package.json > package.json

git add package.json
git commit -m "upped version number to $newVersion"
git push

npm publish

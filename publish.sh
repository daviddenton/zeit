#!/bin/sh

newVersion=$1
oldVersion=`./tools/jq .version package.json`
name=`./tools/jq .name package.json`
echo Publishing: $name version $newVersion \(was $oldVersion\)

./tools/jq .version=\"$newVersion\" package.json > $newVersion.tmp

mv $newVersion.tmp package.json

git add package.json
git commit -m "released version $newVersion to npm"
git push

git tag -a $newVersion -m "released version $newVersion to npm"
git tag
git push origin $newVersion

npm publish

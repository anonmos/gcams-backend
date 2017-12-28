#!/usr/bin/env bash
SHARPLIBDIR=sharplib

#Check if local bcrypt lib directory exists.  If not, install install it.
if [ ! -d "$SHARPLIBDIR" ]; then

    echo "Sharp libs don't exist.  Downloading.."

    mkdir "$SHARPLIBDIR"
    curl -O "https://s3.amazonaws.com/gc-code-libs/sharp-0.18.4-aws-linux-build.tar.gz"
    mv sharp-0.18.4-aws-linux-build.tar.gz "$SHARPLIBDIR"
    tar -zxvf $SHARPLIBDIR/sharp-0.18.4-aws-linux-build.tar.gz -C $SHARPLIBDIR
else
echo "Found local sharp lib directory.  Skipping download."
fi

echo "Replacing system Sharp lib with AWS Sharp lib"
rm -rf node_modules/sharp
cp -r $SHARPLIBDIR/sharp node_modules/

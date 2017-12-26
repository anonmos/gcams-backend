#!/usr/bin/env bash

verbose=false
debug=false
production=false
stage="development"

function show_help {
    echo "-p for production, -v for verbose, -d for debug"
    exit 1;
}

# Check if config.env exists
filename="./config.env"
if [ ! -f ${filename} ]; then
    echo "Please copy sample.config.env to config.env and set your AWS credentials!"
fi

while getopts "h?vdp" opt; do
    case "$opt" in
    h|\?)
        show_help
        exit 0
        ;;
    v)  verbose=true
        ;;
    d)  debug=true
        ;;
    p)  production=true
        ;;
    esac
done

# Read in the config.env and set AWS keys accordingly
while IFS='' read -r line || [[ -n "$line" ]]; do
    export $line
done < "$filename"

# Pick the stage
if [ "$production" = true ]; then
    stage="production"
else
    stage="development"
fi

# Strip plugins from serverless.yml -- NOTE FIX THIS IF WE USE OTHER PLUGINS
cp serverless.yml serverless-orig.yml
node scripts/remove-serverless-plugins.js

# ˚Output console debugging information during deployment
if [ "$debug" = true ]; then
    echo "Setting up debug outputs.."
    export SLS_DEBUG=*
fi

if [ "$verbose" = true ]; then
    echo "Deploying verbosely.."
    eval "serverless deploy --verbose --stage $stage"
else
    eval "serverless deploy --stage $stage"
fi

# Return the original serverless YAML file
mv serverless-orig.yml serverless.yml

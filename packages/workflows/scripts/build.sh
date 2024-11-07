#!/usr/bin/env bash
set -e

for workflow in $(ls -d ./src/*); do
    echo "Building $workflow"
    mkdir -p ../../dist/${workflow##*/} && cp $workflow/definition.json ../../dist/${workflow##*/}/definition.json
done
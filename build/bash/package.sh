#!/usr/bin/env bash

# This script is called by the build pipeline. It packages the app and archives the build artifacts to S3
# The following environment variables will be used from the vars.sh script:
#   appName: the name of the npm package pulled from package.json
#   branch: the abbreviated, formatted branch name based on the story number, e.g. "abc1234" or "master"
#   s3Folder: the path to be used in the S3 bucket for storing artifacts
#              This is recommended to be structured something like this:
#                  ${appName}/${branch}/${releaseVersion}

# The following variable must be pre-defined by the build container:
#   ARTIFACTS_BUCKET: the name of the AWS S3 bucket to be used for storing build artifacts

# Ensures script execution halts on first error
set -o pipefail

source build/bash/vars.sh

# Testing to confirm that these variables are set.
[[ $appName ]]
[[ $branch ]]
[[ $s3Folder ]]
[[ $ARTIFACTS_BUCKET ]]

mkdir -p build/output

templateFile=microservice.sam.yml

if [[ ${branch} == "develop" ]] || [[ ${branch} == "master" ]]; then
    # master branch artifacts get synced to the "latest" artifact location
    templateFile=microservice.sam.dev.yml
fi

aws cloudformation package --template-file ${templateFile} --s3-bucket ${ARTIFACTS_BUCKET} --s3-prefix ${s3Folder}/lambda --output-template-file build/output/package.yml

# Archive the artifacts
aws s3 cp api-tests/module/*.json s3://${ARTIFACTS_BUCKET}/${s3Folder}/tests --no-progress --recursive
aws s3 cp api-tests/health/*.json s3://${ARTIFACTS_BUCKET}/${s3Folder}/tests --no-progress --recursive
aws s3 cp api-tests/smoke/*.json s3://${ARTIFACTS_BUCKET}/${s3Folder}/tests --no-progress --recursive
aws s3 cp api-tests/postman_environment/*.deployed.json s3://${ARTIFACTS_BUCKET}/${s3Folder}/tests --no-progress --recursive
aws s3 cp build/output/package.yml s3://${ARTIFACTS_BUCKET}/${s3Folder}/cfn/package.yml --no-progress

# if [[ ${branch} == "develop" ]] || [[ ${branch} == "master" ]]; then
#     # master branch artifacts get synced to the "latest" artifact location
#     aws s3 sync s3://${ARTIFACTS_BUCKET}/${s3Folder} s3://${ARTIFACTS_BUCKET}/${appName}/${branch}/latest --no-progress --delete
# fi
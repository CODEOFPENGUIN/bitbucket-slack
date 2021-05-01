#!/usr/bin/env bash
# This script is called by the build pipeline. It deploys the CloudFormation stack for the microservice
# There are two parameters required for this script:
#   release_version: This is the version of the build to be output to the version.js file
#   environment: the simple name of the environment to which we'll deploy; e.g. "dev" or "stage" or "prod"
#
# The following environment variables will be used from the vars.sh script:
#   appName: the name of the npm package pulled from package.json
#   branch: the abbreviated, formatted branch name based on the story number, e.g. "abc1234" or "master"
#   ARTIFACTS_BUCKET: the name of the AWS S3 bucket to be used for storing build artifacts
#   s3Folder: the path to be used in the S3 bucket for storing artifacts, recommended to be structured something like this:
#              ${appName}/${branch}/${releaseVersion}

# Ensures script execution halts on first error
set -exo pipefail

readonly release_version=$1
readonly environment=$2

source build/bash/vars.sh

# Testing to confirm that these variables are set.
[[ $release_version ]]
[[ $environment ]]
[[ $appName ]]
[[ $branch ]]
[[ $ARTIFACTS_BUCKET ]]
[[ $s3Folder ]]

readonly waitTime='15s'
stackName=${environment}-${appName}
featureBranchName=''

if [[ ${branch} != "develop" ]] && [[ ${branch} != "master" ]]; then
    # Feature, PR branches need a special indicator in the stack name
    stackName=${environment}-${appName}-feature-${branch}
    featureBranchName=${branch}
fi

# Get the domain name from the environments.config file
if [[ ${branch} != "develop" ]] && [[ ${branch} != "master" ]]; then
    # Feature, PR branches need to add branch name to domain name
    domainUrl=${branch}-$(grep "${environment}.${appName}.domain" config/environments.config | cut -d= -f2)
    echo "Domain url for feature or pr environment is set to '$domainUrl'"
fi
if [[ ${branch} == "develop" ]] || [[ ${branch} == "master" ]]; then
    domainUrl=$(grep "${environment}.${appName}.domain" config/environments.config | cut -d= -f2)
    echo "Domain url for $environment environment is set to '$domainUrl'"
fi

if [[ ${branch} != "develop" ]] && [[ ${branch} != "master" ]]; then
    securityUrl=https://${domain}/mockserver/security
fi

domain=$(echo ${domainUrl} | tr '_' '-')
echo "Domain for $environment environment is set to '$domain'"
acmArn=${hostAcmArn}

if [[ ${branch} != "develop" ]] || [[ ${branch} != "master" ]]; then
    workplaceUrl=https://${domain}/mockserver/workplace
    interfaceUrl=https://${domain}/mockserver/intf
fi

# set the db scheme name
scheme=$(grep "${appName}.scheme" config/environments.config | cut -d= -f2)
rdsScheme=${scheme}_${branch}

# Query for CFN stacks, filtering out the stacks that are in DELETE_COMPLETE status
# This makes the query run significantly faster
readonly filter="CREATE_IN_PROGRESS CREATE_FAILED CREATE_COMPLETE ROLLBACK_IN_PROGRESS ROLLBACK_FAILED ROLLBACK_COMPLETE DELETE_IN_PROGRESS DELETE_FAILED UPDATE_IN_PROGRESS UPDATE_COMPLETE_CLEANUP_IN_PROGRESS UPDATE_COMPLETE UPDATE_ROLLBACK_IN_PROGRESS UPDATE_ROLLBACK_FAILED UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS UPDATE_ROLLBACK_COMPLETE REVIEW_IN_PROGRESS"
readonly query="StackSummaries[?StackName=='$stackName'].StackStatus"

getStackStatus(){
    stackStatus=$(aws cloudformation list-stacks --stack-status-filter $filter --query $query --output text)
    
    echo "CloudFormation stack $stackName, current status: $stackStatus (non-existent if blank)"
}

# Get the status of the CFN stack that will be deployed
getStackStatus

# Wait until the stack status is no longer IN_PROGRESS
while [[ $stackStatus == *"IN_PROGRESS"* ]]
do
    echo "Sleeping for $waitTime to allow the stack progress to complete."
    sleep $waitTime
    getStackStatus
done

# Get rds endpoint
rdsDomain=$(echo ${rdsEndpoint} | awk -F ':' '{print $1}')

# if [[ ${branch} == "master" ]]; then
#     s3Folder=${appName}/${branch}/latest
# fi

if [[ ${environment} == "prod" ]]
then
    aws cloudformation deploy \
    --template-file build/output/package.yml \
    --stack-name ${stackName} \
    --no-fail-on-empty-changeset \
    --s3-bucket ${ARTIFACTS_BUCKET} \
    --s3-prefix "${s3Folder}/cfn" \
    --capabilities CAPABILITY_IAM \
    --role-arn ${role_arn} \
    --parameter-overrides paramEnvironment=${environment} paramReleaseVersion=${release_version} paramFeatureBranch=${featureBranchName} paramEnvironmentDomain=${domain} paramAcmCertificateArn=${acmArn} paramHostedZone=${hostedZone} paramLambdaSecurityGroupId=${LambdaSecurityGroupId} paramLambdaSubnetId1=${LambdaSubnetId1} paramLambdaSubnetId2=${LambdaSubnetId2} paramMariaDBhost=${rdsDomain} paramMariaDBpassword=${rdsPassword} paramMariaApppassword=${rdsAppPassword} paramMariaDBdatabase=${rdsScheme} paramKmsKeyArn=${kmsKeyArn} 
else
    aws cloudformation deploy \
    --template-file build/output/package.yml \
    --stack-name ${stackName} \
    --no-fail-on-empty-changeset \
    --s3-bucket ${ARTIFACTS_BUCKET} \
    --s3-prefix "${s3Folder}/cfn" \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides paramEnvironment=${environment} paramReleaseVersion=${release_version} paramFeatureBranch=${featureBranchName} paramEnvironmentDomain=${domain} paramAcmCertificateArn=${acmArn} paramHostedZone=${hostedZone} paramLambdaSecurityGroupId=${LambdaSecurityGroupId} paramLambdaSubnetId1=${LambdaSubnetId1} paramLambdaSubnetId2=${LambdaSubnetId2} paramMariaDBhost=${rdsDomain} paramMariaDBpassword=${rdsPassword} paramMariaApppassword=${rdsAppPassword} paramMariaDBdatabase=${rdsScheme} paramKmsKeyArn=${kmsKeyArn} 
fi

# export the stackName as an environment variable for the npm update:url command to use
export STACK_NAME=$stackName

# update:url must be ran from here or else the STACK_NAME variable is no longer set after the completion of this shell script.
npm run update:url

if [[ ${environment} == "prod" ]]; then
    BEFOREURI=$(grep "stage.${appName}.domain" config/environments.config | cut -d= -f2)
    APIURI=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text | awk -F "://" '{print $2}' ) 
    sed -i -e s/${BEFOREURI}/${APIURI}/g api-tests/postman_environment/*.deployed.json
fi

# if this script make develop, stage, or prod resources, protect the stack from deletion
if [[ ${branch} == "develop" ]] || [[ ${branch} == "master" ]]; then
    # non-feature branches get termination protection enabled
    aws cloudformation update-termination-protection --enable-termination-protection --stack-name $stackName
fi

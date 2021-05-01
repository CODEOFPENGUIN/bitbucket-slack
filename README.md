# lg-accelerator

An example API that build a Serverless app using the AWS SAM toolset

## General Project Structure

```bash
├─ .nyc_output/                     # Output location for NYC coverage tool
├─ .vscode/                         # Sharable IDE settings for vscode, such as debug settings
├─ api-tests/                       # API tests to be executed via HTTP against the deployed API
├─┬ build/
│ ├─ bash/                          # Directory for shell scripts that execute build and deploy processes
│ ├─ cfn/                           # Directory for CloudFormation Templates that support the initial project setup
│ ├─ codebuild/                     # Directory for buildspec files for AWS CodeBuild
│ └─ output/                        # Output location for SAM package command
├─ compiled_tests/                  # Output location for unit tests compiled from typescript to javascript
├─ config/                          # Project config for build, test, and deploy processes
├─ coverage/                        # Output location for unit test coverage reports
├─ dist/                            # Output location for webpack
├─ node_modules/                    # Project dependencies
├─┬ src
│ ├─ _lambda-handlers/              # Entry points for executing lambda functions
│ ├─ controllers/
│ ├─ config/                        # Project config for build, test, and deploy processes
│ ├─ errors/
│ ├─ helpers/
│ ├─ repositories/
│ └─ services/
|- bitbucket-pipelines.yml          # Pipeline definition specific to Bitbucket. May be removed if not using Bitbucket Pipelines.
|- Jenkinsfile                      # Example Jenkinsfile implementation. This is not yet fully functional.
|- microservice.sam.yml             # The SAM template that defines the API, functions, and database tables
```

## Required Tools

WINDOWS: If installing in Windows, first install the [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/install-win10), then install all of the below required tools into the Linux subsystem.

### AWS CLI

For your local development environment, you must install the AWS CLI:
<https://docs.aws.amazon.com/cli/latest/userguide/installing.html>

Tips: If on Mac OSX, be sure to install with python3/pip3

### SAM CLI

The accelerator is dependent on the AWS SAM CLI, general installation documentation is here:
<https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html>

The CLI can be installed using pip3 or alternatively via Homebrew on macOS
AWS SAM CLI 0.19.0 is required (There's an issue with 0.21.0).
For MacOS you can install using this command

`brew install https://github.com/awslabs/aws-sam-cli/releases/download/v0.19.0//aws-sam-cli-0.19.0.sierra.bottle.tar.gz`

The main website for SAM is here:
<https://aws.amazon.com/serverless/sam/>

### Docker

https://www.docker.com/products/docker-desktop

#### Windows Tips for Docker

Install the [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/install-win10)

Then install the above required tools into the Linux subsystem.

On Windows, to get your file directories mounted into the docker containers, you will need to mount the `C:` drive on `/c`, following these steps:

- Open Docker settings and set your C drive to "Shared"
- Open a Linux prompt and execute the following:

```bash
sudo mkdir /c
sudo mount --bind /mnt/c /c
cd /c/path/to/project
```

You can auto-mount C: at /c if you run this:

```bash
sudo echo "/mnt/c /c none bind" >> /etc/fstab
```

On Windows, you'll also need to put this in your ~/.bashrc

```bash
# Docker on Windows/Host
export DOCKER_HOST=tcp://127.0.0.1:2375
```

There may be another way as well using `wsl.conf`... but it looks like that doesn't work until build 17093.

### MariaDB Local

create a docker network named system-meta-mariadb

```bash
docker network create system-meta-mariadb
```

starts up a local mariadb container

```bash
npm run start:maria
```

delete the local mariadb container

```bash
npm run stop:maria
```

## Setup

Before you can deploy this solution, you need to do some setup:

### One-Time Setup in your AWS Account

Your project team lead or infrastructure engineer should execute these setup tasks. Once complete, you can remove this section from this README.

1. S3 Bucket

   - Create an S3 bucket in AWS where the lambda code will be uploaded. The default bucket name is sam-service-accelerator-artifacts. Create a bucket for your project where your artifacts will be stored. A recommended name for your bucket is something like "[product-name]-artifacts".

   - Open ./package.json of each repository for your product and appropriately modify any npm commands that define the ARTIFACTS_BUCKET variable.

2. AWS CLI Profile

   - When running locally, some requests make Internet requests to AWS services, such as SSM, Secrets Manager, or MariaDB. It is recommended to use your AWS profile configuration for this.

   - The SAM commands by default use an AWS CLI Profile named "aws-profile-name".

   - You can either run `aws configure --profile aws-profile-name` to create a local profile with that name, or you can remove the --profile tag from the "sam:package" and "sam:deploy" commands in the ./package.json file, so that the AWS CLI uses your default credentials. Whichever way you choose, encourage the whole team do use the same approach. So, each engineer may need to create a CLI profile of the same name for this project.

3. IAM Role For API Gateway Logging

   - API Gateway needs a specific IAM Role to be allowed permissions to write logs to CloudWatch. You can set this up with a CloudFormation template or via cli commands.

   - For CloudFormation, deploy the stack defined in the template file "build/cfn/sam-service-accelerator.account.yml". Use the stack name "sam-service-accelerator-account-setup".

   - For the CLI, execute the following commands:

   ```bash
   aws iam create-role --profile aws-profile-name --role-name api-gateway-logs --description "Allows API Gateway to push logs to CloudWatch Logs." --assume-role-policy-document "{\"Version\": \"2012-10-17\",\"Statement\": [{\"Sid\": \"\",\"Effect\": \"Allow\",\"Principal\": {\"Service\": \"apigateway.amazonaws.com\"},\"Action\": \"sts:AssumeRole\"}]}"
   ```

   ```bash
   aws iam attach-role-policy --profile aws-profile-name --role-name api-gateway-logs --policy-arn arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs
   ```

   ```bash
   export AWS_ACCOUNT_ID=`aws sts get-caller-identity --profile aws-profile-name --output text --query 'Account'`
   ```

   ```bash
   aws apigateway update-account --profile aws-profile-name --patch-operations "op='replace',path='/cloudwatchRoleArn',value='arn:aws:iam::$AWS_ACCOUNT_ID:role/api-gateway-logs'"
   ```

4. CodeBuild connection to Source Control

   - Have a priviledged user initiate the CodeBuild connection to source control

### Setup to be repeated for each Microservice

1. Secrets Management

   - The Setup for secrets management needs to be separate from the app itself, because the encryption keys must NOT be deleted, or else the secrets will never again be retrievable.

   - Deploy the CloudFormation KMS template to your AWS account, using the template file at build/cfn/sam-service-accelerator.kms.yml. Use the stack name of "kms-{serviceName}", where {serviceName} is the name of the microservice.

   - Create the SSM Parameters to hold the secret values (repeat this for each environment, replacing "dev" with the environment name). For example, the accelerator requires a secret named "dev-sam-service-accelerator-secret":

   ```bash
   aws ssm put-parameter --profile aws-profile-name --name dev-sam-service-accelerator-secret --description "Demonstration of secrets management for the SAM Service Accelerator" --value "Secret123" --type SecureString --key-id alias/sam-service-accelerator-secrets
   ```

2. GitHub Deploy Key (for GitHub only)

   - A script has been written to make this easy. See the Readme at [build/python/README.md](build/python/README.md)

3. Search/Replace terms in the source code of the microservice

   - "sam-service-accelerator" must be replaced with your new "service-name"

   - "aws-profile-name" must be replaced with the AWS CLI Profile name chosen for the team

   - "SamServiceAccelerator" must be replaced with your new "ServiceName"

   - "slalomdev.io" must be replaced with your base domain

4. Deploy the CI/CD Pipeline stack

   - Create the CloudFormation stack for the CI/CD pipeline from the template file at build/cfn/sam-service-accelerator.pipeline.yml

   - You'll need to collect the following parameters:

     - Artifacts S3 Bucket Name (from the S3 Console)

     - KMS Key Arn (from the KMS Console)

     - Source Code Repository URL (from your source control provider)

### Setup to be repeated for each Environment

1. Route53 DNS Configuration

   - Start with a root domain, such as myproject.net

   - You may want the root domain to be registered in your PROD AWS Account

   - Create separate PROD Hosted Zones for the front end and the backend, i.e.:

     - portal.myproject.net (front-end)

     - api.myproject.net (back-end)

   - Create separate Hosted Zones for each non-prod environment, e.g.:

     - dev.portal.myproject.net

     - stage.portal.myproject.net

     - dev.api.myproject.net

     - stage.api.myproject.net

   - Be sure to set up the root domain NS records for each of the subdomain Hosted Zones. (This needs more documentation)

2. TLS/SSL Certificate

   - Use the AWS Certificate Manager (ACM) to create a TLS cert for each of the hosted zones you've created.

   - THESE CERTS MUST BE CREATED IN THE "us-east-1" (N. Virginia) REGION!

   - Recommendation is to do at least two separate certs. One for prod and one for non-prod. These will require multiple names on the cert, e.g.:

   - Prod: portal.myproject.net, api.myproject.net

   - Non-Prod: dev.portal.myproject.net, _.dev.portal.myproject.net, stage.portal.myproject.net, _.stage.portal.myproject.net, dev.api.myproject.net, stage.api.myproject.net

3. API Gateway Custom Domain Name

   - This project supports a Custom Domain Name to be configured via the API Gateway Console.

   - Create the Custom Domain Name via CloudFormation, using the template provided at /build/cfn/sam-service-accelerator.domain.yml

   - Repeat for each environment (e.g. "dev", "stage", "prod")

   - Edit the file config/environments.config to modify the domain values with your custom domain name.

   - Alternatively,

     - you can disable the custom domain name by changing the parameter default value of "paramBuildBasePath" to false, in the microservice.sam.yml template.

     - If you decide to disable it, you'll need to get your default Stage url from the API Gateway Console or CLI, after the app is deployed.

## Development

### Build and Test

Build the project with the following commands:

```bash
npm install      # downloads dependencies
npm run build    # builds the application
npm run lint     # apply autofix formatting and code rules.
npm run test     # executes the unit tests without coverage
npm run coverage # executes the unit tests with coverage
```

#### `npm run lint` for applying autofix code formatting and code rules

**Note:** _Please use carefully. This will change your code. It's a good idea for you to check in advance in VSCode. Install `Prettier-Code formatter` and `ESLint` plugins for pre-check._

We are using ESLint for Typescript. https://github.com/typescript-eslint/typescript-eslint website is very helpful for understanding why we are using ESLint.
and integrated with Prettier because Prettier has more easy and powerful for formatting rule.
from https://prettier.io/docs/en/comparison.html you can find why we are using ESLint and Prettier together.
To support Typescript and React, several node modules are needed.

- eslint
- eslint-config-prettier
- eslint-plugin-prettier
- prettier
- @typescript-eslint/eslint-plugin
- @typescript-eslint/parser

and need two files for configurations. In .eslintrc.yaml file, There are several rules turned off in Oct/17/2019. We can improve the quality of our code by applying the rules one by one during development. Please check what kinds of rules are turned off in `.eslintrc.yaml`.

- `config/.eslintrc.yaml`
- `config/.prettierrc.yaml`

#### `npm run coverage` for check code coverage

Because we are using typescript, we refined `package.json` scripts for that. For checking code coverage there are some files related to it.

- `config/jasmine.json` is changed from`config/jasmine.runner.js` for typescript
- `src/helpers/jasmine.helper.ts` is called by `config/jasmine.json`
- `config/.nycrc.yaml` is needed for check code coverage

**Note:** _Coverage thresholds are blocked in `config/.nycrc.yaml`. Please check code coverage for yourself before you create pull request._

### Run the API Locally

The sam-service-accelerator api runs on localhost port 3000. Use these commands to fire it up. These are long running processes, so it's best to run each one in a separate terminal shell.

```bash
npm run watch        # Runs the webpack process with the -watch flag
npm run start        # Starts up the locally running API
```

Start the API with a specific CLI profile using this command:

```bash
npm run start:profile -- aws-profile-name
```

The first time you do this, Docker will download the required docker images to run lambda locally.
You can then hit the API endpoints in a browser, Postman, wget, or curl via http://127.0.0.1:3500/{endpoint-path}

To debug locally, use `npm run debug`. Debug support is provided for VS Code IDE by switching to the Debug panel and using the "Attach to SAM Local" configuration.

### Run a single Lambda function locally

If you'd like to test a single lambda function, you'll first need to create a sample event. You can use the SAM tools to generate an API Gateway event if your lambda function is
an api endpoint.

```bash
sam local generate-event apigateway aws-proxy > sample-event.json
```

Then modify the sample-event.json to include the endpoint url, http method and request body that you'd like to use in your test. The sample event must also include the "correlation-object" header. One of these events has been provided in the root directory of this project.
Once you have that ready, you can execute the lambda function directly with this command,
replacing "resLambdaHealthGet" with the logical ID (from the SAM file) of the lambda function you'd like to test:

```bash
sam local invoke --profile aws-profile-name --template microservice.sam.yml --event sample-event.json resLambdaHealthGet
```

The output of your function will go to the console where you executed this command. You can optionally specify the --log-file command flag to write output to a file.

Take it one step further and debug a single function by adding the --debug-port flag:

```bash
sam local invoke --debug-port 5858 --profile aws-profile-name --template microservice.sam.yml --event sample-event.json resLambdaHealthGet
```

### Execute the API Tests against the local API environment

To execute the API tests against a running localhost instance of the service, run

```bash
npm run test:api:local      # runs against the "local" environment configured in the framework
```

Other environments are also configurable in the test framework using the settings in /api-tests/config/env.config.json. The local environment is configured here, along with examples for dev and stage environments. There are example commands set up to correspond to the dev environment and feature branch deployments. You should replace the example.com URLs with your own values before running the commands.

```bash
npm run test:api:dev        # runs against the "dev" environment
```

The dev environment is also configured to allow testing against deployed branches within an environment via the "test:branch" command. This is helpful with feature branches inside a CI/CD pipeline. For example, if your branch has been deployed with branch name "abc-123", run:

```bash
BRANCH_NAME="abc123" npm run test:api:branch
```

This will append the branch name "abc123" to the environment URL before running the test.

### Deploy from local machine

- To deploy the service from your local machine to AWS, run the command:

```bash
npm run package-deploy
```

Once the deployment is finished, you will be able to see the newly-created stack in the AWS CloudFormation console. The console will provide you with the base URL for the new service.

- **If the deployment fails**: the stack will be rolled back to de-allocate resources and will be left in ROLLBACK*COMPLETE state. The rolled-back stack will \_not* go away on its own, and will _not_ be updated by subsequent package-deploy calls. You must manually delete it before trying again.

## Code Patterns

The entry points for the application are all handlers in the /src/\_lambda-handlers directory. Each handler gets built as a Lambda function. The handlers should have minimal code in them, following the principal of Single Responsibility.

_Controller_ classes are located in the /src/controllers directory. The responsibility of a Controller is to receive an HTTP request and parse the parameters. The Controller then hands off the processing of the request to a Service function.

_Service_ classes are located in the /src/services directory. The responsibility of a Service is to execute the business logic and system logic needed to process the request. Services may call other services to orchestrate the processing that needs to happen. Services may use Repositories to interact with data storage.

_Repository_ classes are located in the /src/repositories directory. Each Repository provides CRUD level operations on a single data source. There should be _no conditional logic_ in the Repository layer. The repository functions are simply an interface to an external storage facility. Adhering to this means that the repositories do not need unit tests.

_Inversion Of Control_ helper class provides functions for getting an object of a particular type. The "new" keyword should rarely be used in classes other than the IoC helper. An exception to this rule is that it is acceptable to use `new Error()` to throw an exception.

Custom error types are located in the /src/errors directory. These are used to be thrown when a specific type of error occurs.

## Adding a new API endpoint

To add a new API endpoint:

- Create the handler in the \_lambda-handlers directory
- Create a Controller function to process the request from the handler
- Create any new Service and Repository functions that are needed
- Add bindings for all new classes in src/config/ioc.container.ts
- Create the Models that are needed
- Add unit tests in the appropriate .spec files (side by side with implementation classes)
- Add API tests that map to the API endpoint Acceptance Criteria
- Add the Lambda Function definition to the infrastructure SAM yaml file (in microservice.sam.yml)
- Add the API endpoint to the swagger definition in the same SAM yaml file

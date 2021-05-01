#!groovy
library ('PipelineUtils@develop') // This requires the snippet to be configured in the Jenkins server settings
def isFeatureBranch = !(BRANCH_NAME == 'develop' || BRANCH_NAME == 'master')
def branch        = BRANCH_NAME
def build_id      = env.build_id
def slack_channel = '#jenkinspipeline' // SETUP: This must be a valid slack channel for the configured Slack integration

def TERRAFORM_VERSION = "0.12.18"

def release       = build_id // eventually this will parse from the package.json, but we'll just call it the build number for now
env.environment
env.DOMAINURL
env.role_arn
env.ARTIFACTS_BUCKET
env.releaseVersion = env.build_id
// env.submitter = 'song,mgch,jgikim,tkay369,dongjin1005,eun'
env.submitter = 'nmy2511,olive,kugar,jay,spoc'

// Reusable Commands
npm_install     = "npm install"
npm_build       = "NODE_OPTIONS=--max_old_space_size=2048 npm run build"
npm_lint        = "NODE_OPTIONS=--max_old_space_size=2048 npm run lint"
npm_module_test = "npm run test:module:deployed"
npm_unit_test   = "npm run test:unit:coverage" 
npm_health_check = "npm run test:health-check"
npm_smoke_test  = "npm run test:smoke"

// Let's check for a feature branch
// If not processing master, parse the feature branch and set a variable
if (isFeatureBranch){
  validateBranchName(branch)
}

pipeline {
  agent { node { label 'ecs-slaves' } }
  options {
    ansiColor('xterm')
    timestamps()
    timeout(time: 24, unit: 'HOURS')
  }
  post {
    always {
      script {
        notifyBitbucket()
        build_status =  currentBuild.result
        echo "build_status = " + build_status

        subject = "${build_status}: Job '${env.JOB_NAME} [Build ${env.BUILD_NUMBER}]'"
        summary = "${subject} (${env.BUILD_URL})"

        if (build_status == 'SUCCESS') {
          colorCode = '#00FF00'       // GREEN
        } else {
          colorCode = '#FF0000'       // RED
        }
        if (BRANCH_NAME == 'develop' || BRANCH_NAME == 'master') {
          slackSend (channel: slack_channel, color: colorCode, message: summary)
        }
      }
    }
  }

  stages {
    stage ("Pull Bitbucket Repository") {
      steps { 
        checkout scm 
      }
    }

    stage ("Feature or PR or Develop branch") {
      when { expression { BRANCH_NAME != 'master' }}
      stages {
        stage("[DEV] Set Environment") {
          steps {
            script {
              env.service_name  = getNpmPkgProperty('name')   // defined here and set once we've checked out source
              env.environment = 'dev'
              env.role_arn = 'arn:aws:iam::754860697973:role/IAM-DEV-JKS-SLAVE-AssumeRole'
              env.DOMAINURL = sh(returnStdout: true, script: "grep ${env.environment}.${env.service_name}.domain config/environments.config | cut -d= -f2").trim()
              env.ARTIFACTS_BUCKET = 'application-artifacts-754860697973'
              env.branchId    = sh ( script: 'bash ./build/bash/get-current-branch.sh', returnStdout: true ).trim()
            }
          }
        }

        stage("[DEV] NPM install") { steps { sh "${npm_install}" } }
        stage("[DEV] NPM lint") { steps { sh "${npm_lint}" } }
        stage("[DEV] NPM unit test") { steps { sh "${npm_unit_test}" } }
        stage("[DEV] NPM Build Project") { steps { sh "${npm_build}" } }

        stage("[DEV] Package and Deploy") {
          steps {
            script {
              awsAssumeRole(role_arn)
              env.rdsEndpoint = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/endpoint' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.rdsPassword = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/password' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.LambdaSecurityGroupId = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/lambdaSecurityGroupId' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.LambdaSubnetId1 = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/privateSubnet1' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.LambdaSubnetId2 = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/privateSubnet2' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.kmsKeyArn = sh(returnStdout: true, script: "aws ssm get-parameter --name '/kms/PARAMETER/kmsArn' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()              
              env.hostAcmArn = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/acmArn' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.hostedZone = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/hostedZone' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.Scheme= sh(returnStdout: true, script: "grep ${env.service_name}.scheme config/environments.config | cut -d= -f2").trim()
              env.rdsScheme= env.Scheme + "_" + env.branchId
              env.userSql = 'V0_0_000__Init_DB_User.sql'
              
              sh ('aws configure set region ap-northeast-2')
              sh ('aws sts get-caller-identity')
              // package and deploy flyway then execute the flyway lambda
              sh ("ARTIFACTS_BUCKET=${env.ARTIFACTS_BUCKET} bash ./build/bash/flyway_deploy.sh ${env.releaseVersion} ${env.environment}")
              if (BRANCH_NAME == 'develop') {
                sh (returnStdout: true, script: "aws lambda invoke --function-name ${env.environment}_${env.service_name}_FlywayMigrate response.json")  
              } else {
                sh (returnStdout: true, script: "aws lambda invoke --function-name ${env.environment}${env.branchId}_${env.service_name}_FlywayMigrate response.json")
              }
              sh ("ARTIFACTS_BUCKET=${env.ARTIFACTS_BUCKET} bash ./build/bash/package.sh")
              sh ("ARTIFACTS_BUCKET=${env.ARTIFACTS_BUCKET} bash ./build/bash/deploy.sh ${env.releaseVersion} ${env.environment}")
              // cat out to verify the ApiUrl was output to the postman environment json.
              sh ('cat api-tests/postman_environment/*.deployed.json')
            }
          }
        }

        stage("[Feature|PR] Module test") {
          when { expression { BRANCH_NAME != 'develop' } }
          steps {
            //last_stage_name = env.STAGE_NAME
            sh ("bash ./build/bash/module-test.sh")
            // sh "${npm_module_test}"
          }
        }

        // stage("[DEV] After deploy test") {
        //   when { expression { BRANCH_NAME == 'develop' } }
        //   stages {
        //     stage("[DEV] Health Check") {
        //       steps {
        //         sh "${npm_health_test}"
        //       }
        //     }
        //     stage("[DEV] Smoke test") {
        //       steps {
        //         sh "${npm_smoke_test}"                
        //       }
        //     }
        //   }
        // }
      }
    }

    stage("Master branch") {
      when { expression { BRANCH_NAME == 'master' } }
      stages {
        stage("[STAGE] Set Environment") {
          steps {
            script {
              env.service_name  = getNpmPkgProperty('name')   // defined here and set once we've checked out source
              env.environment = 'stage'
              env.role_arn = 'arn:aws:iam::995021333942:role/IAM-DEV-JKS-SLAVE-AssumeRole'
              env.DOMAINURL = sh(returnStdout: true, script: "grep ${env.environment}.${env.service_name}.domain config/environments.config | cut -d= -f2").trim()
              env.ARTIFACTS_BUCKET = 'application-artifacts-995021333942'
              env.branchId = sh ( script: 'bash ./build/bash/get-current-branch.sh', returnStdout: true ).trim()
            }
          }
        }

        stage("[STAGE] NPM install") { steps { sh "${npm_install}" } }
        stage("[STAGE] NPM lint") { steps { sh "${npm_lint}" } }
        stage("[STAGE] NPM unit test") { steps { sh "${npm_unit_test}" } }
        stage("[STAGE] NPM Build Project") { steps { sh "${npm_build}" } }

        stage("[STAGE] Package and Deploy") {
          steps {
            script {
              awsAssumeRole(role_arn)
              env.rdsEndpoint = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/endpoint' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.rdsPassword = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/password' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              // env.rdsEndpoint = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/workplace-endpoint' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              // env.rdsPassword = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/workplace-password' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.rdsAppPassword = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/workplace-app-password' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.rdsUserPassword = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/workplace-user-password' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()                            
              env.LambdaSecurityGroupId = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/lambdaSecurityGroupId' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.LambdaSubnetId1 = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/privateSubnet1' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.LambdaSubnetId2 = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/privateSubnet2' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.kmsKeyArn = sh(returnStdout: true, script: "aws ssm get-parameter --name '/kms/PARAMETER/kmsArn' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()              
              env.hostAcmArn = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/acmArn' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.hostedZone = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/hostedZone' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.Scheme= sh(returnStdout: true, script: "grep ${env.service_name}.scheme config/environments.config | cut -d= -f2").trim()
              env.rdsScheme= env.Scheme + "_" + env.branchId
              env.userSql = 'V0_0_000__Init_DB_User.sql'

              createDBUser(env.userSql,env.rdsAppPassword,env.rdsUserPassword,env.rdsScheme, 'sysmeta_app','sysmeta_user')

              sh ('aws configure set region ap-northeast-2')
              sh ('aws sts get-caller-identity')
              // package and deploy flyway then execute the flyway lambda
              sh ("ARTIFACTS_BUCKET=${env.ARTIFACTS_BUCKET} bash ./build/bash/flyway_deploy.sh ${env.releaseVersion} ${env.environment}")
              sh (returnStdout: true, script: "aws lambda invoke --function-name ${env.environment}_${env.service_name}_FlywayMigrate response.json") 
              sh ("ARTIFACTS_BUCKET=${env.ARTIFACTS_BUCKET} bash ./build/bash/package.sh")
              sh ("ARTIFACTS_BUCKET=${env.ARTIFACTS_BUCKET} bash ./build/bash/deploy.sh ${env.releaseVersion} ${env.environment}")
              // cat out to verify the ApiUrl was output to the postman environment json.
              sh ('cat api-tests/postman_environment/*.deployed.json')
            }
          }
        }

        // stage("[STAGE] Health Check") {
        //   steps {
        //     sh "${npm_health_test}"
        //   }
        // }
        // stage("[STAGE] Smoke test") {
        //   steps {
        //     sh "${npm_smoke_test}"                
        //   }
        // }

        stage("Approval Step to deploy Production from Stage") {
          when { expression { BRANCH_NAME == 'master' } }
          steps {
            input message : "Do you want to deploy Production?", submitter : "${submitter}"
          }
        }

        stage("[PROD] Set Environment") {
          steps {
            script {
              env.service_name  = getNpmPkgProperty('name')   // defined here and set once we've checked out source
              env.environment = 'prod'
              env.role_arn = 'arn:aws:iam::362820019109:role/IAM-DEV-JKS-SLAVE-AssumeRole'
              env.DOMAINURL = sh(returnStdout: true, script: "grep ${env.environment}.${env.service_name}.domain config/environments.config | cut -d= -f2").trim()
              env.ARTIFACTS_BUCKET = 'application-artifacts-362820019109'
              env.flyway_ARTIFACTS_BUCKET = 'application-artifacts-362820019109'
              env.branchId = sh ( script: 'bash ./build/bash/get-current-branch.sh', returnStdout: true ).trim()
            }
          }
        }

        stage("[PROD] NPM install") { steps { sh "${npm_install}" } }
        stage("[PROD] NPM lint") { steps { sh "${npm_lint}" } }
        stage("[PROD] NPM unit test") { steps { sh "${npm_unit_test}" } }
        stage("[PROD] NPM Build Project") { steps { sh "${npm_build}" } }

        stage("[PROD] Deploy") {
          steps {
            script {
              awsAssumeRoleWithBaseRole(role_arn)
              env.rdsEndpoint = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/endpoint' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.rdsPassword = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/password' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()              
              // env.rdsEndpoint = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/workplace-endpoint' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              // env.rdsPassword = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/workplace-password' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.rdsAppPassword = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/workplace-app-password' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.rdsUserPassword = sh(returnStdout: true, script: "aws ssm get-parameter --name '/${env.environment}/database/RDSPARAMETER/workplace-user-password' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.LambdaSecurityGroupId = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/lambdaSecurityGroupId' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              // env.LambdaSecurityGroupId = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/workplaceLambdaSecurityGroupId' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.LambdaSubnetId1 = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/privateSubnet1' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.LambdaSubnetId2 = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/privateSubnet2' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.kmsKeyArn = sh(returnStdout: true, script: "aws ssm get-parameter --name '/kms/PARAMETER/kmsArn' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()              
              env.hostAcmArn = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/acmArn' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.hostedZone = sh(returnStdout: true, script: "aws ssm get-parameter --name '/vpc/PARAMETER/hostedZone' --with-decryption --query 'Parameter.Value' | sed 's#\"##g'").trim()
              env.Scheme= sh(returnStdout: true, script: "grep ${env.service_name}.scheme config/environments.config | cut -d= -f2").trim()
              env.rdsScheme= env.Scheme + "_" + env.branchId
              env.userSql = 'V0_0_000__Init_DB_User.sql'

              createDBUser(env.userSql,env.rdsAppPassword,env.rdsUserPassword,env.rdsScheme, 'sysmeta_app','sysmeta_user')

              sh ('aws configure set region ap-northeast-2')
              sh ('aws sts get-caller-identity')
              // package and deploy flyway then execute the flyway lambda
              sh ("ARTIFACTS_BUCKET=${env.flyway_ARTIFACTS_BUCKET} bash ./build/bash/flyway_deploy.sh ${env.releaseVersion} ${env.environment}")
              sh (returnStdout: true, script: "aws lambda invoke --function-name ${env.environment}_${env.service_name}_FlywayMigrate response.json") 
              sh ("ARTIFACTS_BUCKET=${env.ARTIFACTS_BUCKET} bash ./build/bash/package.sh")
              sh ("ARTIFACTS_BUCKET=${env.ARTIFACTS_BUCKET} bash ./build/bash/deploy.sh ${env.releaseVersion} ${env.environment}")
              // cat out to verify the ApiUrl was output to the postman environment json.
              sh ('cat api-tests/postman_environment/*.deployed.json')
            }
          }
        }
        // stage("[PROD] Health Check") {
        //   steps {
        //     sh "${npm_health_test}"
        //   }
        // }
        // stage("[PROD] Smoke test") {
        //   steps {
        //     sh "${npm_smoke_test}"                
        //   }
        // }

      }
    }
  }
}

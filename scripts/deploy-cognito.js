const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Import AWS SDK v3 modules
const {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
  DescribeStacksCommand,
  waitUntilStackCreateComplete,
  waitUntilStackUpdateComplete,
} = require("@aws-sdk/client-cloudformation");

// Configuration
const STACK_NAME = process.env.STACK_NAME || "mcp-oauth-demo";
const REGION = process.env.AWS_REGION || "us-east-1";
const TEMPLATE_FILE = path.join(
  __dirname,
  "..",
  "infrastructure",
  "cloudformation",
  "cognito.yml"
);

// Initialize CloudFormation client
const cfn = new CloudFormationClient({ region: REGION });

async function deployCognitoStack() {
  try {
    console.log("Starting Cognito CloudFormation deployment...");

    // Read the CloudFormation template
    const templateBody = fs.readFileSync(TEMPLATE_FILE, "utf8");

    // Check if stack already exists
    let stackExists = false;
    try {
      const describeCommand = new DescribeStacksCommand({
        StackName: STACK_NAME,
      });
      await cfn.send(describeCommand);
      stackExists = true;
      console.log(`Stack "${STACK_NAME}" already exists. Will update...`);
    } catch (error) {
      // Stack doesn't exist, will create new
      console.log(`Stack "${STACK_NAME}" doesn't exist. Will create new...`);
    }

    // Create or update the stack
    const params = {
      StackName: STACK_NAME,
      TemplateBody: templateBody,
      Capabilities: ["CAPABILITY_IAM"],
      Parameters: [
        {
          ParameterKey: "UserPoolName",
          ParameterValue: process.env.USER_POOL_NAME || "MCPDemoUserPool",
        },
        {
          ParameterKey: "AppClientName",
          ParameterValue: process.env.APP_CLIENT_NAME || "MCPDemoClient",
        },
        {
          ParameterKey: "CallbackURL",
          ParameterValue:
            process.env.CALLBACK_URL || "http://localhost:3000/callback",
        },
        {
          ParameterKey: "LogoutURL",
          ParameterValue:
            process.env.LOGOUT_URL || "http://localhost:3000/logout",
        },
      ],
    };

    // Create or update the stack
    if (stackExists) {
      console.log("Updating stack...");
      try {
        const updateCommand = new UpdateStackCommand(params);
        await cfn.send(updateCommand);
        console.log("Waiting for stack update to complete...");
        await waitUntilStackUpdateComplete(
          { client: cfn, maxWaitTime: 600 },
          { StackName: STACK_NAME }
        );
        console.log("Stack update completed successfully!");
      } catch (error) {
        if (error.message.includes("No updates are to be performed")) {
          console.log("No updates are needed for the stack.");
        } else {
          throw error;
        }
      }
    } else {
      console.log("Creating stack...");
      const createCommand = new CreateStackCommand(params);
      await cfn.send(createCommand);
      console.log("Waiting for stack creation to complete...");

      try {
        await waitUntilStackCreateComplete(
          { client: cfn, maxWaitTime: 600 },
          { StackName: STACK_NAME }
        );
        console.log("Stack creation completed successfully!");
      } catch (error) {
        console.error("Stack creation failed!");
        // Get detailed error information
        const describeCommand = new DescribeStacksCommand({
          StackName: STACK_NAME,
        });
        try {
          const stackInfo = await cfn.send(describeCommand);
          const stack = stackInfo.Stacks[0];
          console.error(`Stack status: ${stack.StackStatus}`);
          console.error(`Stack status reason: ${stack.StackStatusReason}`);
        } catch (describeError) {
          console.error(
            "Could not get detailed error information:",
            describeError
          );
        }
        throw new Error(
          "Stack creation failed. Check AWS CloudFormation console for details."
        );
      }
    }

    // Get stack outputs
    console.log("Getting stack outputs...");
    const describeCommand = new DescribeStacksCommand({
      StackName: STACK_NAME,
    });
    const stackInfo = await cfn.send(describeCommand);
    const outputs = stackInfo.Stacks[0].Outputs;

    // Format and display outputs
    console.log("\nStack deployment successful! Here are the details:");
    console.log("=================================================");

    const outputMap = {};
    outputs.forEach((output) => {
      console.log(`${output.OutputKey}: ${output.OutputValue}`);
      outputMap[output.OutputKey] = output.OutputValue;
    });

    // Create .env files for client and server
    createEnvFiles(outputMap);

    console.log("\nDeployment complete! Environment files have been created.");
  } catch (error) {
    console.error("Error deploying stack:", error);
    process.exit(1);
  }
}

function createEnvFiles(outputs) {
  // Get values from outputs
  const userPoolId = outputs.UserPoolId;
  const clientId = outputs.UserPoolClientId;
  const clientSecret = outputs.UserPoolClientSecret;
  const userPoolDomain = outputs.UserPoolDomain;

  // Create client .env file
  const clientEnv = `# Client Configuration
PORT=3000
CLIENT_URL=http://localhost:3000

# MCP Server URL
MCP_SERVER_URL=http://localhost:3001

# Cognito Configuration
COGNITO_REGION=${REGION}
COGNITO_USER_POOL_ID=${userPoolId}
COGNITO_CLIENT_ID=${clientId}
COGNITO_CLIENT_SECRET=${clientSecret}
COGNITO_DOMAIN=${userPoolDomain}

# OAuth Configuration
OAUTH_REDIRECT_URI=http://localhost:3000/callback
OAUTH_SCOPE=openid profile email
`;

  // Create server .env file
  const serverEnv = `# Server Configuration
PORT=3001

# Cognito Configuration
COGNITO_REGION=${REGION}
COGNITO_USER_POOL_ID=${userPoolId}
COGNITO_CLIENT_ID=${clientId}
COGNITO_CLIENT_SECRET=${clientSecret}
COGNITO_DOMAIN=${userPoolDomain}
`;

  const basePath = path.dirname(__dirname);

  // Ensure directories exist
  if (!fs.existsSync(path.join(basePath, "src", "client"))) {
    fs.mkdirSync(path.join(basePath, "src", "client"), { recursive: true });
  }

  if (!fs.existsSync(path.join(basePath, "src", "mcp-server"))) {
    fs.mkdirSync(path.join(basePath, "src", "mcp-server"), {
      recursive: true,
    });
  }

  // Write the .env files
  fs.writeFileSync(path.join(basePath, "src", "client", ".env"), clientEnv);
  fs.writeFileSync(path.join(basePath, "src", "mcp-server", ".env"), serverEnv);

  console.log("Created .env files for client and server");
}

// Run the deployment
deployCognitoStack().catch(console.error);

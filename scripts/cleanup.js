// cleanup.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import AWS SDK v3 modules
const { 
  CloudFormationClient, 
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand
} = require('@aws-sdk/client-cloudformation');

// Configuration
const STACK_NAME = process.env.STACK_NAME || 'mcp-oauth-demo';
const REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize CloudFormation client
const cfn = new CloudFormationClient({ region: REGION });

async function cleanupResources() {
  try {
    console.log(`Starting cleanup for stack: ${STACK_NAME}`);
    
    // Check if stack exists
    try {
      const describeCommand = new DescribeStacksCommand({ StackName: STACK_NAME });
      await cfn.send(describeCommand);
      
      // List resources for information purposes
      console.log('Listing resources that will be deleted:');
      try {
        const listResourcesCommand = new ListStackResourcesCommand({ StackName: STACK_NAME });
        const resources = await cfn.send(listResourcesCommand);
        
        if (resources.StackResourceSummaries && resources.StackResourceSummaries.length > 0) {
          resources.StackResourceSummaries.forEach(resource => {
            console.log(`- ${resource.ResourceType}: ${resource.PhysicalResourceId}`);
          });
        } else {
          console.log('No resources found in stack.');
        }
      } catch (listError) {
        console.warn('Could not list stack resources:', listError.message);
      }
      
      // Confirm deletion
      if (process.env.SKIP_CONFIRMATION !== 'true') {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        await new Promise((resolve) => {
          readline.question(`Are you sure you want to delete stack "${STACK_NAME}" and all its resources? (y/N): `, (answer) => {
            readline.close();
            if (answer.toLowerCase() !== 'y') {
              console.log('Cleanup cancelled.');
              process.exit(0);
            }
            resolve();
          });
        });
      }
      
      // Delete the stack
      console.log(`Deleting stack: ${STACK_NAME}`);
      const deleteCommand = new DeleteStackCommand({ StackName: STACK_NAME });
      await cfn.send(deleteCommand);
      
      console.log('Stack deletion initiated. This process may take several minutes.');
      console.log('You can check the status in the AWS CloudFormation console.');
      
      console.log('Waiting for stack deletion to complete...');
      
      // Poll for stack deletion status
      let deleted = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts, 10 seconds each = 5 minutes max wait time
      
      while (!deleted && attempts < maxAttempts) {
        try {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds between checks
          await cfn.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
          console.log(`Stack deletion in progress... (${attempts + 1}/${maxAttempts})`);
          attempts++;
        } catch (error) {
          // If we get an error saying the stack doesn't exist, it's been successfully deleted
          if (error.name === 'ValidationError' && error.message.includes('does not exist')) {
            deleted = true;
            console.log('Stack deletion completed successfully!');
          } else {
            throw error;
          }
        }
      }
      
      if (!deleted) {
        console.log('Stack deletion is taking longer than expected.');
        console.log('The deletion will continue in the background.');
        console.log('You can check the status in the AWS CloudFormation console.');
      }
      
    } catch (error) {
      // If stack doesn't exist
      if (error.name === 'ValidationError' && error.message.includes('does not exist')) {
        console.log(`Stack "${STACK_NAME}" does not exist. Nothing to clean up.`);
      } else {
        throw error;
      }
    }
    
    console.log('Cleanup process completed.');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupResources().catch(console.error);
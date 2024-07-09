#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { FileProcessingWorkflowStack } from '../lib/file-processing-workflow-stack';

const app = new App();
new FileProcessingWorkflowStack(app, 'FileProcessingWorkflowStack');

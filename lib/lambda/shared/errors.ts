export class StepFunctionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StepFunctionError';
  }
}
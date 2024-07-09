exports.lambdaHandler = async (event) => {
  const { bucket, key } = event;
  // Validate the file (e.g., check file type and size)
  const isValid = true; // Replace with actual validation logic

  if (!isValid) {
      throw new Error('Invalid file');
  }

  return { bucket, key };
};

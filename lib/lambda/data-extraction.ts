exports.lambdaHandler = async (event) => {
  const { bucket, key } = event;
  // Extract data from the file
  const data = []; // Replace with actual data extraction logic

  return { bucket, key, data };
};

exports.lambdaHandler = async (event) => {
  const { bucket, key, data } = event;
  // Transform the extracted data
  const transformedData = data; // Replace with actual data transformation logic

  return { bucket, key, data: transformedData };
};

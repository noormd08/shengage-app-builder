const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

async function main(params) {
  const { id, data, LOG_LEVEL } = params;
  const logger = Core.Logger('main', { level: LOG_LEVEL || 'info' });

  try {
    logger.info('Calling the postComment main action');

    if (!id || !data) {
      logger.warn('ID and/or Data not found');
      return {
        statusCode: 400,
        body: { payload: 'Data mismatch' },
      };
    }

    const files = await filesLib.init();
    const jsonData = JSON.stringify(data);
    await files.write(`comments/${id}.json`, jsonData);

    logger.info(`Data successfully written to ${id}.json file`);
    
    const response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { payload: JSON.parse(jsonData) },
    };

    logger.info(`Response returned for ${id}.json file`);
    return response;
  } catch (error) {
    logger.error('An error occurred while processing the request', { error });
    return {
      statusCode: 500,
      body: { payload: 'Internal Server Error' },
    };
  }
}

exports.main = main;

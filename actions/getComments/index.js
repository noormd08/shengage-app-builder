const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

async function main(params) {
  const { id, LOG_LEVEL } = params;
  const logger = Core.Logger('main', { level: LOG_LEVEL || 'info' });

  try {
    logger.info('Calling the getComments main action');

    if (!id) {
      logger.warn('ID not found');
      return {
        statusCode: 400,
        body: { payload: 'ID not found' },
      };
    }

    const files = await filesLib.init();
    const data = await files.read(`comments/${id}.json`);
    const response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { payload: JSON.parse(data) },
    };

    logger.info(`Data successfully read from ${id}.json file`);
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

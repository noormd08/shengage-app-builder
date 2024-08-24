const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

/**
 * Checks if a file exists in the specified directory.
 *
 * @param {Object} files - The files library instance.
 * @param {string} filePath - The path of the file to check.
 * @returns {Promise<boolean>} True if the file exists, otherwise false.
 */
async function checkFilePath(files, filePath) {
  try {
    const fileList = await files.list('/comments/');
    return fileList.some(item => item.name === filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Main function to retrieve comments for a specific story.
 *
 * @param {Object} params - The parameters for the main function.
 * @param {string} params.storyId - The ID of the story to retrieve comments for.
 * @param {string} [params.LOG_LEVEL='info'] - The logging level.
 * @returns {Object} The HTTP response object.
 */
async function main(params) {
  const { storyId, LOG_LEVEL } = params;
  const logger = Core.Logger('main', { level: LOG_LEVEL || 'info' });

  try {
    logger.info('Starting the getComments action');

    if (!storyId) {
      logger.warn('Story ID not provided');
      return {
        statusCode: 400,
        body: {
          status: 'failure',
          message: 'Story ID not provided'
        }
      };
    }

    const commentsPath = `comments/${storyId}.json`;
    const files = await filesLib.init();
    const fileExists = await checkFilePath(files, commentsPath);

    if (fileExists) {
      const commentsData = await files.read(commentsPath);
      if (commentsData) {
        const data = JSON.parse(commentsData);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            status: 'success',
            message: 'Data retrieved successfully',
            data: data
          }
        };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        status: 'success',
        message: 'No comments added yet',
        data: []
      }
    };

  } catch (error) {
    logger.error('An error occurred while processing the request', { error });
    return {
      statusCode: 500,
      body: {
        status: 'failure',
        message: 'Internal Server Error'
      }
    };
  }
}

exports.main = main;
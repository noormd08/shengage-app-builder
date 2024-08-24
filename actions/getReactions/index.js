const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

/**
 * Finds the reaction name for a given story and user.
 *
 * @param {Object[]} data - The array of story data.
 * @param {string} storyId - The ID of the story.
 * @param {string} userId - The ID of the user.
 * @returns {string|null} The name of the reaction if found, otherwise null.
 */
function getReactionName(data, storyId, userId) {
  const story = data.find(story => story.storyId === storyId);

  if (!story) {
    return null; // Story not found
  }

  const reactionWithUser = story.reactions.find(reaction =>
    reaction.users.includes(userId)
  );

  return reactionWithUser ? reactionWithUser.name : null; // Return reaction name or null
}

/**
 * Checks if a file exists in the specified directory.
 *
 * @param {Object} files - The files library instance.
 * @param {string} filePath - The path of the file to check.
 * @returns {Promise<boolean>} True if the file exists, otherwise false.
 */
async function checkFilePath(files, filePath) {
  try {
    const fileList = await files.list('/reactions/');
    return fileList.some(item => item.name === filePath);
  } catch (error) {
    console.error('Error retrieving file metadata:', error);
    return false;
  }
}

/**
 * Main function to retrieve the reaction name for a specific story and user.
 *
 * @param {Object} params - The parameters for the main function.
 * @param {string} params.userId - The ID of the user.
 * @param {string} params.storyId - The ID of the story.
 * @param {string} [params.LOG_LEVEL='info'] - The logging level.
 * @returns {Object} The HTTP response object.
 */
async function main(params) {
  const { userId, storyId, LOG_LEVEL } = params;
  const logger = Core.Logger('main', { level: LOG_LEVEL || 'info' });

  try {
    logger.info('Starting the getReactions action');

    if (!userId || !storyId) {
      logger.warn('User ID or Story ID not provided');
      return {
        statusCode: 400,
        body: {
          status: 'failure',
          message: 'User ID or Story ID not provided'
        }
      };
    }

    const reactionFilePath = 'reactions/reactions.json';
    const files = await filesLib.init();
    const fileExists = await checkFilePath(files, reactionFilePath);

    if (fileExists) {
      const dataString = await files.read(reactionFilePath);
      const data = JSON.parse(dataString);

      const reactionName = getReactionName(data, storyId, userId);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          status: 'success',
          message: 'Data retrieved successfully',
          data: {
            reaction_name: reactionName || ''
          }
        }
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        status: 'success',
        message: 'No reaction yet',
        data: {
          reaction_name: ''
        }
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

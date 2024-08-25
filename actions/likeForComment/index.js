const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

function findCommentById(comments, commentId) {
  for (let comment of comments) {
      if (comment.commentId === commentId) {
          return comment;
      }
      if (comment.replies && comment.replies.length > 0) {
          const result = findCommentById(comment.replies, commentId);
          if (result) {
              return result;
          }
      }
  }
  return null; // Return null if commentId is not found
}

/**
 * Updates the 'likedBy' array of a specific comment in the data.
 *
 * @param {Object[]} data - The array of comments.
 * @param {string} userId - The ID of the user interacting with the comment.
 * @param {string} commentId - The ID of the comment to update.
 * @param {boolean} userHasLiked - Indicates whether the user has liked the comment.
 * @returns {Object[]} The updated array of comments.
 */
function updateComment(data, userId, commentId, userHasLiked = false) {
  const commentObj = findCommentById(data, commentId);

  if (commentObj) {
      if (userHasLiked) {
          if (!commentObj.likedBy) {
              commentObj.likedBy = [];
          }
          if (!commentObj.likedBy.includes(userId)) {
              commentObj.likedBy.push(userId);
          }
      } else {
          const userIndex = commentObj.likedBy?.indexOf(userId);
          if (userIndex !== -1) {
              commentObj.likedBy.splice(userIndex, 1);
          }
      }
  }

  return data;
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
    const fileList = await files.list('/comments/');
    return fileList.some(item => item.name === filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Main function to handle the comment update process.
 *
 * @param {Object} params - The parameters for the main function.
 * @param {string} params.userId - The ID of the user interacting with the comment.
 * @param {string} params.storyId - The ID of the story containing the comment.
 * @param {string} params.commentId - The ID of the comment to update.
 * @param {boolean} params.userHasLiked - Indicates whether the user has liked the comment.
 * @param {string} [params.LOG_LEVEL='info'] - The logging level.
 * @returns {Object} The HTTP response object.
 */
async function main(params) {
  const { userId, storyId, commentId, userHasLiked, LOG_LEVEL } = params;
  const logger = Core.Logger('main', { level: LOG_LEVEL || 'info' });

  try {
    logger.info('Starting comment update process.');

    if (!userId || !storyId || !commentId) {
      logger.warn('User ID, story ID, or comment ID is missing.');
      return {
        statusCode: 400,
        body: {
          status: 'failure',
          message: 'User ID, story ID, or comment ID is missing.'
        }
      };
    }

    const path = `comments/${storyId}.json`;
    const files = await filesLib.init();
    const isFileExists = await checkFilePath(files, path);

    if (!isFileExists) {
      logger.warn('File not found:', path);
      return {
        statusCode: 404,
        body: {
          status: 'failure',
          message: 'File not found.'
        }
      };
    }

    const data = await files.read(path);
    if (!data) {
      logger.warn('File is empty:', path);
      return {
        statusCode: 404,
        body: {
          status: 'failure',
          message: 'File is empty.'
        }
      };
    }

    const parsedData = JSON.parse(data);
    const updatedData = updateComment(parsedData, userId, commentId, userHasLiked);
    await files.write(path, JSON.stringify(updatedData));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        status: 'success',
        message: 'Data updated successfully.',
        data: updatedData
      }
    };
  } catch (error) {
    logger.error('An error occurred while processing the request:', error);
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

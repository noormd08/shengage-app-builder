const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

/**
 * Updates an existing comment or adds a new comment to the data.
 *
 * @param {Object[]} data - The array of comment data.
 * @param {Object} newData - The new comment data to update or add.
 * @param {string} newData.commentId - The ID of the comment.
 * @param {string} newData.commentText - The text of the comment.
 * @param {string[]} newData.likedBy - List of users who liked the comment.
 * @param {string} newData.postedBy - The ID of the user who posted the comment.
 * @param {string} newData.postedDate - The date when the comment was posted.
 * @param {Object[]} newData.replies - List of replies to the comment.
 * @returns {Object[]} The updated array of comment data.
 */
function updateComment(data, newData) {
  const { commentId } = newData;
  const commentIndex = data.findIndex(item => item.commentId === commentId);

  if (commentIndex !== -1) {
    data[commentIndex] = { ...data[commentIndex], ...newData };
  } else {
    data.push(newData);
  }
  return data;
}

/**
 * Checks if a file exists at the specified path.
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
    console.error('Error retrieving file metadata:', error);
    return false;
  }
}

/**
 * Main function to handle the posting or updating of a comment.
 *
 * @param {Object} params - The parameters for the main function.
 * @param {string} params.storyId - The ID of the story.
 * @param {string} params.commentId - The ID of the comment.
 * @param {string} params.commentText - The text of the comment.
 * @param {Object} params.postedBy - The user who posted the comment.
 * @param {string} params.postedBy.id - The ID of the user.
 * @param {string} params.postedDate - The date when the comment was posted.
 * @param {string} [params.LOG_LEVEL='info'] - The logging level.
 * @returns {Object} The HTTP response object.
 */
async function main(params) {
  const { storyId, commentId, commentText, postedBy, postedDate, LOG_LEVEL } = params;
  const logger = Core.Logger('main', { level: LOG_LEVEL || 'info' });

  const newData = {
    commentId,
    commentText,
    likedBy: [],
    postedBy,
    postedDate,
    replies: []
  };

  try {
    logger.info('Starting the postComment action');

    if (!storyId || !commentId || !postedBy?.id) {
      logger.warn('Story ID, Comment ID, or Posted By ID not found');
      return {
        statusCode: 400,
        body: {
          status: 'failure',
          message: 'Parameter missing'
        }
      };
    }

    const commentsPath = `comments/${storyId}.json`;
    const files = await filesLib.init();
    const fileExists = await checkFilePath(files, commentsPath);

    if (fileExists) {
      const commentsData = await files.read(commentsPath);
      if (commentsData) {
        const commentsJsonData = JSON.parse(commentsData);
        const updatedData = updateComment(commentsJsonData, newData);
        await files.write(commentsPath, JSON.stringify(updatedData));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            status: 'success',
            message: 'Data updated successfully.',
            data: updatedData
          }
        };
      }
    } else {
      const data = [newData];
      await files.write(commentsPath, JSON.stringify(data));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          status: 'success',
          message: 'Data created successfully.',
          data: data
        }
      };
    }
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

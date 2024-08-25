const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

/**
 * Updates or adds a new comment in the data structure based on the provided commentId.
 * 
 * @param {Array} data - The array of comments representing the hierarchical structure.
 * @param {Object} newComment - The new comment data to be added or used for updating.
 * @param {string} newComment.commentId - The ID of the comment to be updated or added.
 * @param {string} newComment.commentText - The text of the comment.
 * 
 * @returns {Array} The updated data structure with the comment added or replaced.
 */
function updateComment(data, newComment) {
  /**
   * Recursively searches for a comment with the given commentId and updates it.
   * Excludes the 'replies' property to preserve existing nested comments.
   * 
   * @param {Array} comments - The current level of comments being searched.
   * @param {Object} newComment - The new comment data to update.
   * @returns {boolean} True if the comment was found and updated; otherwise, false.
   */
  function findAndUpdate(comments, newComment) {
    for (let comment of comments) {
      if (comment.commentId === newComment.commentId) {
        // Exclude 'replies' and likedBy from newComment to preserve existing replies
        const { replies, likedBy, ...updatedFields } = newComment;
        Object.assign(comment, updatedFields);
        return true;
      }

      if (comment.replies && findAndUpdate(comment.replies, newComment)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Recursively searches for a parent comment with the given parentId.
   * 
   * @param {Array} comments - The current level of comments being searched.
   * @param {string} parentId - The ID of the parent comment.
   * @returns {Object|null} The parent comment object if found; otherwise, null.
   */
  function findParent(comments, parentId) {
    for (let comment of comments) {
      if (comment.commentId === parentId) {
        return comment;
      }

      if (comment.replies) {
        const parent = findParent(comment.replies, parentId);
        if (parent) {
          return parent;
        }
      }
    }
    return null;
  }

  // Attempt to find and update the existing comment
  const updated = findAndUpdate(data, newComment);

  if (!updated) {
    // Comment not found; determine where to add it
    const lastDotIndex = newComment.commentId.lastIndexOf('.');
    let parentId = '';

    if (lastDotIndex !== -1) {
      parentId = newComment.commentId.substring(0, lastDotIndex);
    }

    if (parentId === '') {
      // No parentId implies a top-level comment
      data.push(newComment);
    } else {
      // Find the parent comment to add the new comment as a reply
      const parentComment = findParent(data, parentId);

      if (parentComment) {
        if (!parentComment.replies) {
          parentComment.replies = [];
        }
        parentComment.replies.push(newComment);
      } else {
        // Parent not found; handle as needed (e.g., add as top-level or throw an error)
        console.warn(`Parent comment with ID '${parentId}' not found. Adding as top-level comment.`);
        data.push(newComment);
      }
    }
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

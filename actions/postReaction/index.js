const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

/**
 * Replaces or adds a reaction for a given story and user.
 *
 * @param {Object[]} data - The array of story data.
 * @param {string} storyId - The ID of the story.
 * @param {string} user - The ID of the user.
 * @param {string} newReaction - The new reaction to be added or replaced.
 * @returns {Object[]} The updated array of story data.
 */
function replaceReaction(data, storyId, user, newReaction) {
  const story = data.find(story => story.storyId === storyId);
    
  if (story) {
    const existingReactionIndex = story.reactions.findIndex(reaction => reaction.users.includes(user));
    const newReactionIndex = story.reactions.findIndex(reaction => reaction.name === newReaction);

    if (existingReactionIndex !== -1) {
      const users = story.reactions[existingReactionIndex].users;
      const userIndex = users.indexOf(user);
      if (userIndex !== -1) {
        users.splice(userIndex, 1);
      }

      if (newReactionIndex !== -1) {
        story.reactions[newReactionIndex].users.push(user);
      } else {
        story.reactions.push({ name: newReaction, users: [user] });
      }
    } else if (newReactionIndex !== -1) {
      story.reactions[newReactionIndex].users.push(user);
    } else {
      story.reactions.push({ name: newReaction, users: [user] });
    }
    return data;
  } else {
    const newStory = {
      storyId: storyId,
      reactions: [{ name: newReaction, users: [user] }]
    };
    data.push(newStory);
    return data;
  }
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
 * Main function to add or replace a reaction for a specific story and user.
 *
 * @param {Object} params - The parameters for the main function.
 * @param {string} params.userId - The ID of the user.
 * @param {string} params.storyId - The ID of the story.
 * @param {string} params.reaction - The reaction to be added or replaced.
 * @param {string} [params.LOG_LEVEL='info'] - The logging level.
 * @returns {Object} The HTTP response object.
 */
async function main(params) {
  const { userId, storyId, reaction, LOG_LEVEL } = params;
  const logger = Core.Logger('main', { level: LOG_LEVEL || 'info' });

  try {
    logger.info('Starting the postReaction action');

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

    let response;

    if (fileExists) {
      const reactionsData = await files.read(reactionFilePath);
      if (reactionsData) {
        const reactionsJsonData = JSON.parse(reactionsData);
        const updatedData = replaceReaction(reactionsJsonData, storyId, userId, reaction);
        await files.write(reactionFilePath, JSON.stringify(updatedData));

        response = {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            status: 'success',
            message: 'Reaction added successfully.'
          }
        };
      }
    } else {
      const newReactionData = [{
        storyId: storyId,
        reactions: [{ name: reaction, users: [userId] }]
      }];
      await files.write(reactionFilePath, JSON.stringify(newReactionData));

      response = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          status: 'success',
          message: 'File created and reaction added successfully.'
        }
      };
    }

    return response;

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

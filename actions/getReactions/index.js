const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

function getReactionName(data, storyId, userId) {
  const story = data.find(story => story.story_id === storyId);

  if (!story) {
    return null;
  }

  const reactionWithUser = story.reactions.find(reaction => 
      reaction.users.includes(userId)
  );

  if (reactionWithUser) {
      return reactionWithUser.name;
  }

  return null;
}

async function checkFile(files, filePath) {
  try {
    const fileMetadata = await files.getMetadata(filePath);
    if (fileMetadata) {
      return fileMetadata.name;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error retrieving file metadata:', error);
    return false;
  }
}

async function main(params) {
  const { user_id, story_id, LOG_LEVEL } = params;
  const logger = Core.Logger('main', { level: LOG_LEVEL || 'info' });

  try {
    logger.info('Calling the getReactions main action');

    if (!user_id && !story_id) {
      logger.warn('User ID / Story ID not found');
      return {
        statusCode: 400,
        body: { payload: 'User ID / Story ID not found' },
      };
    }

    const reactionFilePath = 'reactions/reactions.json';
    const files = await filesLib.init();
    const file = checkFile(files, reactionFilePath);
    if (file) {
      const dataString = await files.read(reactionFilePath);
      const data = JSON.parse(dataString);
  
      if (data) {
        const reactionName = getReactionName(data, story_id, user_id);
        const response = {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { 
            payload: {
              reaction_name: reactionName
            }
          }
        };
        return response;
      }   
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { 
        payload: {
          reaction_name: null
        }
      }
    };
  } catch (error) {
    logger.error('An error occurred while processing the request', { error });
    return {
      statusCode: 500,
      body: { payload: 'Internal Server Error' },
    };
  }
}

exports.main = main;

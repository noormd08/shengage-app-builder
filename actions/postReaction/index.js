const { Core } = require('@adobe/aio-sdk');
const filesLib = require('@adobe/aio-lib-files');

function replaceReaction(data, storyId, user, newReaction) {
  const story = data.find(story => story.story_id === storyId);
    
  if (story) {
    const reactionIndex1 = story.reactions.findIndex(reaction => reaction.users.includes(user));
    const reactionIndex2 = story.reactions.findIndex(reaction => reaction.name === newReaction);

    if (reactionIndex1 !== -1) {
      const users = story.reactions[reactionIndex1].users;
      const index = users.indexOf(user);
      if (index !== -1) {
        users.splice(index, 1);
      }
      if (reactionIndex2 !== -1) {
        story.reactions[reactionIndex2].users.push(user);
      }
      else {
        story.reactions.push({ name: newReaction, users: [user] });
      }       
    } else if (reactionIndex2 !== -1) {
      story.reactions[reactionIndex2].users.push(user);
    } else {
      story.reactions.push({ name: newReaction, users: [user] });
    }
    return data;
  } else {
    const jsonData = {
      "story_id": storyId,
      "reactions": [{
        "name": newReaction,
        "users": [user]
      }]
    };
    data.push(jsonData);
    return data;
  }
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
  const { user_id, story_id, reaction, LOG_LEVEL } = params;
  const logger = Core.Logger('main', { level: LOG_LEVEL || 'info' });

  try {
    logger.info('Calling the postReaction main action');

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
      const reactionsData = await files.read(reactionFilePath);
      if (reactionsData) {
        const reactionsJsonData = JSON.parse(reactionsData);
        const updatedData = replaceReaction(reactionsJsonData, story_id, user_id, reaction);
        const stringData = JSON.stringify(updatedData)
        await files.write(reactionFilePath, stringData);

        const response = {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { payload: "Reaction added successfully." },
        };
        return response;
      }
    }
    else {
      const users = [];
      users.push(user_id);
      const jsonData = [{
        "story_id": story_id,
        "reactions": [{
          "name": reaction,
          "users": users
        }]
      }];
      const stringData = JSON.stringify(jsonData)
      await files.write(reactionFilePath, stringData);
      const response = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { payload: "Reaction added successfully." },
      };
      return response;
    }
  } catch (error) {
    logger.error('An error occurred while processing the request', { error });
    return {
      statusCode: 500,
      body: { payload: 'Internal Server Error' },
    };
  }
}

exports.main = main;

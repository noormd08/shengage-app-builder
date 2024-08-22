const filesLib = require('@adobe/aio-lib-files')

async function main (params) {
  try {
    const data = JSON.stringify(params);
    const files = await filesLib.init();
    await files.write('comments/comments.json', data)
    return {
      statusCode: 200,
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: "Server Error"
    };
  }
}

exports.main = main

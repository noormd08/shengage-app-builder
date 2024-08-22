const filesLib = require('@adobe/aio-lib-files')

async function main (params) {
  try {
    const files = await filesLib.init()    
    const buffer = await files.read('comments/comments.json')
    const data = buffer.toString()
    const response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.parse(data)
    }
    return response
  } catch (error) {
    return {
      statusCode: 500,
      body: "Server Error"
    };
  }
}

exports.main = main
